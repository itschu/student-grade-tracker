from flask import Blueprint, request, jsonify, g
from sqlalchemy import and_

from app import db
from app.models import Enrollment, User, Assignment, Grade, Course
from app.utils.auth import (
    require_auth,
    require_role,
    assert_teacher_owns_course,
    assert_student_enrolled,
)
from app.services.grade_calculator import (
    compute_final_grade,
    get_effective_config,
    convert_to_display,
)

grades_bp = Blueprint("grades_bp", __name__, url_prefix="/api/v1/grades")


@grades_bp.route("/", methods=["GET"])
@require_auth
@require_role("admin", "teacher")
def list_grades():
    assignment_id = request.args.get("assignment_id")
    course_id = request.args.get("course_id")
    if not assignment_id or not course_id:
        return jsonify({"error": "assignment_id and course_id are required"}), 400

    assignment = Assignment.query.get(assignment_id)
    if assignment is None:
        return jsonify({"error": "Assignment not found"}), 404

    # Verify assignment belongs to the provided course_id
    if str(assignment.course_id) != course_id:
        return jsonify({"error": "Assignment not found"}), 404

    if g.current_user and g.current_user.role.value == "teacher":
        # Use the assignment's course_id for validation, not the request body course_id
        assert_teacher_owns_course(str(g.current_user.id), str(assignment.course_id))

    rows = (
        db.session.query(User, Grade)
        .select_from(Enrollment)
        .join(User, Enrollment.student_id == User.id)
        .outerjoin(
            Grade,
            and_(
                Grade.student_id == User.id,
                Grade.assignment_id == assignment_id,
            ),
        )
        .filter(Enrollment.course_id == course_id)
        .all()
    )

    students = []
    for user, grade in rows:
        final_grade_percentage = compute_final_grade(course_id, str(user.id))
        students.append(
            {
                "student_id": str(user.id),
                "full_name": user.full_name,
                "earned_points": float(grade.earned_points)
                if grade and grade.earned_points is not None
                else None,
                "final_grade_percentage": final_grade_percentage,
            }
        )

    return jsonify({"students": students}), 200


@grades_bp.route("/bulk", methods=["PUT"])
@require_auth
@require_role("teacher")
def bulk_grades():
    data = request.get_json() or {}
    assignment_id = data.get("assignment_id")
    course_id = data.get("course_id")
    grades_list = data.get("grades")

    if not assignment_id or not course_id or not isinstance(grades_list, list):
        return jsonify({"error": "assignment_id, course_id and grades list are required"}), 400

    assignment = Assignment.query.get(assignment_id)
    if assignment is None:
        return jsonify({"error": "Assignment not found"}), 404

    # Verify assignment belongs to the provided course_id
    if str(assignment.course_id) != course_id:
        return jsonify({"error": "Assignment not found"}), 404

    # Use the assignment's course_id for validation, not the request body course_id
    assert_teacher_owns_course(str(g.current_user.id), str(assignment.course_id))

    # Validate each grade entry has a non-empty student_id and that the student is enrolled
    for entry in grades_list:
        student_id = entry.get("student_id")
        if not student_id:
            return jsonify({"error": "Each grade entry must include a student_id"}), 400

        # Check that the student is enrolled in the assignment's course
        enrollment = Enrollment.query.filter_by(
            course_id=str(assignment.course_id),
            student_id=student_id
        ).first()
        if enrollment is None:
            return jsonify({"error": f"Student {student_id} is not enrolled in this course"}), 422

    # validate
    for entry in grades_list:
        earned_val = entry.get("earned_points")
        # allow explicit nulls; they represent cleared grades and need no numeric
        # validation (write loop handles None correctly)
        if earned_val is None:
            continue
        try:
            earned = float(earned_val)
        except (TypeError, ValueError):
            return jsonify({"error": "earned_points must be numeric"}), 400
        if earned > float(assignment.max_points):
            return jsonify({"error": "earned_points exceeds max_points for one or more students"}), 422

    try:
        for entry in grades_list:
            sid = entry.get("student_id")
            earned = entry.get("earned_points")
            existing = Grade.query.filter_by(
                assignment_id=assignment_id,
                student_id=sid,
            ).first()
            if existing:
                existing.earned_points = earned
            else:
                db.session.add(
                    Grade(
                        assignment_id=assignment_id,
                        student_id=sid,
                        earned_points=earned,
                    )
                )
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to save grades"}), 500

    updated = Grade.query.filter_by(assignment_id=assignment_id).all()
    return jsonify({"grades": [
        {"student_id": str(g.student_id), "earned_points": float(g.earned_points) if g.earned_points is not None else None}
        for g in updated
    ]}), 200


@grades_bp.route("/student", methods=["GET"])
@require_auth
def student_grades():
    course_id = request.args.get("course_id")
    student_id = request.args.get("student_id")
    if not course_id or not student_id:
        return jsonify({"error": "course_id and student_id are required"}), 400

    role = g.current_user.role.value if g.current_user else None
    if role == "admin":
        pass
    elif role == "teacher":
        assert_teacher_owns_course(str(g.current_user.id), course_id)
    elif role == "student":
        if str(g.current_user.id) != student_id:
            return jsonify({"error": "Forbidden"}), 403
        assert_student_enrolled(student_id, course_id)
    else:
        return jsonify({"error": "Forbidden"}), 403

    assignments = Assignment.query.filter_by(course_id=course_id).order_by(Assignment.created_at).all()
    result_assignments = []
    for a in assignments:
        grade_row = Grade.query.filter_by(assignment_id=str(a.id), student_id=student_id).first()
        result_assignments.append(
            {
                "assignment_id": str(a.id),
                "name": a.name,
                "type": a.type.value,
                "max_points": float(a.max_points),
                "due_date": a.due_date.isoformat() if a.due_date else None,
                "earned_points": float(grade_row.earned_points) if grade_row and grade_row.earned_points is not None else None,
            }
        )

    final_grade_percentage = compute_final_grade(course_id, student_id)
    course = Course.query.get(course_id)
    config = None
    display_grade = f"{final_grade_percentage:.1f}%"
    if course and course.term_id:
        config = get_effective_config(str(course.term_id))
        if config:
            display_grade = convert_to_display(final_grade_percentage, config)

    return jsonify(
        {
            "assignments": result_assignments,
            "final_grade_percentage": final_grade_percentage,
            "display_grade": display_grade,
        }
    ), 200
