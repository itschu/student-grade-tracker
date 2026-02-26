from sqlalchemy import func, and_
from sqlalchemy.orm import aliased

from app import db
from app.models import Assignment, Grade, Term, GradingConfig, GradeBoundary, DisplayMode


def compute_final_grade(course_id, student_id) -> float:
    """
    Computes the final grade for a student in a course as a percentage.
    
    Aggregates all assignments for the course and calculates the total earned points
    divided by total max points, multiplied by 100.
    
    Args:
        course_id: UUID of the course
        student_id: UUID of the student
        
    Returns:
        float: Grade as a percentage (0-100), or 0.0 if no assignments or max_points is 0
    """
    result = db.session.query(
        func.sum(func.coalesce(Grade.earned_points, 0)).label("earned"),
        func.sum(Assignment.max_points).label("total")
    ).select_from(Assignment).outerjoin(
        Grade, and_(
            Grade.assignment_id == Assignment.id,
            Grade.student_id == student_id
        )
    ).filter(
        Assignment.course_id == course_id
    ).one()
    
    if result.total is None or result.total == 0:
        return 0.0
    
    return float(result.earned) / float(result.total) * 100


def get_effective_config(term_id) -> GradingConfig | None:
    """
    Retrieves the effective GradingConfig for a given term.
    
    Returns the most recent GradingConfig whose effective_from_term has a start_date
    less than or equal to the target term's start_date.
    
    Args:
        term_id: UUID of the term
        
    Returns:
        GradingConfig | None: The effective config, or None if not found or term doesn't exist
    """
    term = Term.query.get(term_id)
    if term is None:
        return None
    
    EffectiveTerm = aliased(Term)
    
    config = db.session.query(GradingConfig).join(
        EffectiveTerm,
        GradingConfig.effective_from_term_id == EffectiveTerm.id
    ).filter(
        EffectiveTerm.start_date <= term.start_date
    ).order_by(
        EffectiveTerm.start_date.desc()
    ).first()
    
    return config


def convert_to_display(percentage: float, config: GradingConfig) -> str:
    """
    Converts a percentage grade to the configured display format.
    
    Args:
        percentage: Grade as a percentage (0-100)
        config: GradingConfig specifying the display mode
        
    Returns:
        str: Formatted grade string (percentage, letter, or GPA)
    """
    if config.display_mode == DisplayMode.percentage:
        return f"{percentage:.1f}%"
    
    # Letter or GPA mode: find matching boundary
    boundary = db.session.query(GradeBoundary).filter(
        GradeBoundary.grading_config_id == config.id,
        GradeBoundary.min_percentage <= percentage,
        GradeBoundary.max_percentage >= percentage
    ).first()
    
    if boundary is None:
        return f"{percentage:.1f}%"
    
    if config.display_mode == DisplayMode.letter:
        return boundary.label
    
    if config.display_mode == DisplayMode.gpa:
        if boundary.gpa_value is None:
            # defensive fallback if a config was created incorrectly
            return f"{percentage:.1f}%"
        return f"{float(boundary.gpa_value):.1f}"
    
    # Fallback
    return f"{percentage:.1f}%"
