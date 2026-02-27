from flask import Blueprint, request, jsonify, g
from sqlalchemy import func, and_, case, desc

from app import db
from app.models import (
    Course,
    Term,
    Enrollment,
    Assignment,
    Grade,
    GradeBoundary,
    User,
    DisplayMode,
)
from app.utils.auth import require_auth, require_role, assert_teacher_owns_course
from app.services.grade_calculator import get_effective_config, convert_to_display


analytics_bp = Blueprint("analytics_bp", __name__, url_prefix="/api/v1/analytics")


@analytics_bp.route("/dashboard", methods=["GET"])
@require_auth
@require_role("admin", "teacher")
def dashboard():
    term_id = request.args.get("term_id")
    course_id = request.args.get("course_id")

    if not term_id:
        return jsonify({"error": "term_id is required"}), 400

    term = Term.query.get(term_id)
    if term is None:
        return jsonify({"error": "Term not found"}), 404

    is_teacher = g.current_user and g.current_user.role == "teacher"
    if is_teacher and course_id:
        assert_teacher_owns_course(str(g.current_user.id), course_id)

    teacher_id = str(g.current_user.id) if is_teacher else None

    # build base course query scope
    course_query = Course.query.filter(Course.term_id == term_id)
    if teacher_id:
        course_query = course_query.filter(Course.teacher_id == teacher_id)
    if course_id:
        course_query = course_query.filter(Course.id == course_id)

    total_courses = course_query.count()

    # total students
    student_q = (
        db.session.query(func.count(func.distinct(Enrollment.student_id)))
        .join(Course, Enrollment.course_id == Course.id)
        .filter(Course.term_id == term_id)
    )
    if teacher_id:
        student_q = student_q.filter(Course.teacher_id == teacher_id)
    if course_id:
        student_q = student_q.filter(Course.id == course_id)
    total_students = student_q.scalar() or 0

    # average grade (include all enrolled students so ungraded work counts as zero)
    avg_q = (
        db.session.query(
            func.sum(func.coalesce(Grade.earned_points, 0)).label("earned"),
            # total max points replicated per enrollment row
            func.sum(Assignment.max_points).label("total"),
        )
        .select_from(Course)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .join(Assignment, Assignment.course_id == Course.id)
        .outerjoin(
            Grade,
            and_(
                Grade.assignment_id == Assignment.id,
                Grade.student_id == Enrollment.student_id,
            ),
        )
        .filter(Course.term_id == term_id)
    )
    if teacher_id:
        avg_q = avg_q.filter(Course.teacher_id == teacher_id)
    if course_id:
        avg_q = avg_q.filter(Course.id == course_id)
    avg_res = avg_q.one()
    if avg_res.total is None or avg_res.total == 0:
        average_grade = 0.0
    else:
        average_grade = float(avg_res.earned) / float(avg_res.total) * 100

    # grade distribution
    config = get_effective_config(term_id)
    bands = []
    if config is None or config.display_mode == DisplayMode.percentage.value:
        bands = [("A", 90, 100), ("B", 80, 89), ("C", 70, 79), ("D", 60, 69), ("F", 0, 59)]
    else:
        # custom boundaries
        boundaries = (
            GradeBoundary.query.filter(GradeBoundary.grading_config_id == config.id)
            .order_by(GradeBoundary.min_percentage.desc())
            .all()
        )
        for b in boundaries:
            bands.append((b.label, b.min_percentage, b.max_percentage))

    # compute per enrollment final grades
    enrollment_q = (
        db.session.query(
            Enrollment.student_id,
            Enrollment.course_id,
            case(
                    (
                        func.sum(Assignment.max_points) > 0,
                        func.sum(func.coalesce(Grade.earned_points, 0))
                        / func.sum(Assignment.max_points)
                        * 100,
                    ),
                else_=0,
            ).label("final_grade"),
        )
        .join(Course, Enrollment.course_id == Course.id)
        .join(Assignment, Assignment.course_id == Course.id)
        .outerjoin(
            Grade,
            and_(Grade.assignment_id == Assignment.id, Grade.student_id == Enrollment.student_id),
        )
        .filter(Course.term_id == term_id)
        .group_by(Enrollment.student_id, Enrollment.course_id)
    )
    if teacher_id:
        enrollment_q = enrollment_q.filter(Course.teacher_id == teacher_id)
    if course_id:
        enrollment_q = enrollment_q.filter(Course.id == course_id)

    grade_rows = enrollment_q.all()

    # initialize distribution counts
    distribution = {label: 0 for label, _, _ in bands}
    for row in grade_rows:
        fg = float(row.final_grade)
        for label, low, hi in bands:
            if low <= fg <= hi:
                distribution[label] += 1
                break

    grade_distribution = [
        {"band": label, "count": distribution.get(label, 0)} for label, _, _ in bands
    ]

    # course rankings
    ranking_q = (
        db.session.query(
            Course.id.label("course_id"),
            Course.name,
            (func.sum(func.coalesce(Grade.earned_points, 0))
             / func.nullif(func.sum(Assignment.max_points), 0)
             * 100).label("avg_grade"),
        )
        .join(Enrollment, Enrollment.course_id == Course.id)
        .join(Assignment, Assignment.course_id == Course.id)
        .outerjoin(
            Grade,
            and_(
                Grade.assignment_id == Assignment.id,
                Grade.student_id == Enrollment.student_id,
            ),
        )
        .filter(Course.term_id == term_id)
        .group_by(Course.id, Course.name)
        .order_by(desc("avg_grade"))
    )
    if teacher_id:
        ranking_q = ranking_q.filter(Course.teacher_id == teacher_id)
    rankings = [
        {"course_id": str(r.course_id), "name": r.name, "average_grade": float(r.avg_grade) if r.avg_grade is not None else 0.0}
        for r in ranking_q.all()
    ]

    # trend line across terms
    trend_q = (
        db.session.query(
            Term.name.label("term_name"),
            Term.start_date,
            (func.sum(func.coalesce(Grade.earned_points, 0))
             / func.nullif(func.sum(Assignment.max_points), 0)
             * 100).label("avg_grade"),
        )
        .join(Course, Course.term_id == Term.id)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .join(Assignment, Assignment.course_id == Course.id)
        .outerjoin(
            Grade,
            and_(
                Grade.assignment_id == Assignment.id,
                Grade.student_id == Enrollment.student_id,
            ),
        )
        .group_by(Term.id, Term.name, Term.start_date)
        .order_by(Term.start_date.asc())
    )
    if teacher_id:
        trend_q = trend_q.filter(Course.teacher_id == teacher_id)
    trend_rows = trend_q.all()
    trend = [
        {"term_name": r.term_name, "average_grade": float(r.avg_grade) if r.avg_grade is not None else 0.0}
        for r in trend_rows
    ]

    # assignment averages when course_id provided
    assignment_averages = []
    if course_id:
        avg_assign_q = (
            db.session.query(
                Assignment.id.label("assignment_id"),
                Assignment.name,
                Assignment.max_points,
                (func.sum(func.coalesce(Grade.earned_points, 0))
                 / func.nullif(func.count(Enrollment.student_id), 0)).label("avg_score"),
            )
            .join(Enrollment, Enrollment.course_id == Assignment.course_id)
            .outerjoin(
                Grade,
                and_(Grade.assignment_id == Assignment.id, Grade.student_id == Enrollment.student_id),
            )
            .filter(Assignment.course_id == course_id)
            .group_by(Assignment.id, Assignment.name, Assignment.max_points)
            .order_by(Assignment.created_at.asc())
        )
        for a in avg_assign_q.all():
            assignment_averages.append(
                {
                    "assignment_id": str(a.assignment_id),
                    "name": a.name,
                    "average_score": float(a.avg_score) if a.avg_score is not None else 0.0,
                    "max_points": float(a.max_points),
                }
            )

    return jsonify(
        {
            "summary": {
                "total_students": total_students,
                "total_courses": total_courses,
                "average_grade": average_grade,
            },
            "grade_distribution": grade_distribution,
            "course_rankings": rankings,
            "trend": trend,
            "assignment_averages": assignment_averages,
        }
    ), 200
