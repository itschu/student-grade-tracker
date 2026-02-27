from flask import Blueprint, request, jsonify, g
from app import db
from app.models import (
    Course,
    Term,
    User,
    Enrollment,
    Grade,
    Assignment,
)
from app.utils.auth import require_auth, require_role, assert_teacher_owns_course


courses_bp = Blueprint("courses_bp", __name__, url_prefix="/api/v1/courses")


def _course_dict(course: Course) -> dict:
    return {
        "id": str(course.id),
        "name": course.name,
        "term_id": str(course.term_id),
        "teacher_id": str(course.teacher_id),
        "created_at": course.created_at.isoformat() if course.created_at else None,
    }


def _student_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "is_active": user.is_active,
    }


@courses_bp.route("/", methods=["GET"])
@require_auth
@require_role("admin", "teacher")
def list_courses():
    term_id = request.args.get("term_id")
    query = Course.query
    if term_id:
        query = query.filter(Course.term_id == term_id)
    if g.current_user and g.current_user.role == "teacher":
        query = query.filter(Course.teacher_id == str(g.current_user.id))
    courses = query.all()
    return jsonify([_course_dict(c) for c in courses]), 200


@courses_bp.route("/", methods=["POST"])
@require_auth
@require_role("admin")
def create_course():
    data = request.get_json() or {}
    name = data.get("name")
    term_id = data.get("term_id")
    teacher_id = data.get("teacher_id")

    if not name or not term_id or not teacher_id:
        return jsonify({"error": "name, term_id, teacher_id are required"}), 400

    term = Term.query.get(term_id)
    if term is None:
        return jsonify({"error": "Term not found"}), 404
    teacher = User.query.get(teacher_id)
    if teacher is None or teacher.role != "teacher":
        return jsonify({"error": "Teacher user not found or invalid"}), 400

    course = Course(name=name, term_id=term_id, teacher_id=teacher_id)
    db.session.add(course)
    db.session.commit()
    return jsonify(_course_dict(course)), 201


@courses_bp.route("/<uuid:course_id>", methods=["DELETE"])
@require_auth
@require_role("admin")
def delete_course(course_id):
    course = Course.query.get(str(course_id))
    if course is None:
        return jsonify({"error": "Course not found"}), 404

    exists = (
        Grade.query.join(Assignment, Grade.assignment_id == Assignment.id)
        .filter(Assignment.course_id == str(course_id))
        .first()
    )
    if exists:
        return (
            jsonify({
                "error": "Cannot delete course: grades have been entered for one or more assignments."
            }),
            409,
        )
    db.session.delete(course)
    db.session.commit()
    # return a JSON confirmation for consistency
    return jsonify({"message": "Course deleted"}), 200


@courses_bp.route("/<uuid:course_id>/students", methods=["GET"])
@require_auth
@require_role("admin", "teacher")
def list_students(course_id):
    course = Course.query.get(str(course_id))
    if course is None:
        return jsonify({"error": "Course not found"}), 404
    if g.current_user and g.current_user.role == "teacher":
        assert_teacher_owns_course(str(g.current_user.id), str(course_id))
    students = (
        User.query.join(Enrollment, User.id == Enrollment.student_id)
        .filter(Enrollment.course_id == str(course_id))
        .all()
    )
    return jsonify([_student_dict(s) for s in students]), 200


@courses_bp.route("/<uuid:course_id>/students", methods=["POST"])
@require_auth
@require_role("admin")
def add_students(course_id):
    course = Course.query.get(str(course_id))
    if course is None:
        return jsonify({"error": "Course not found"}), 404
    data = request.get_json() or {}
    student_ids = data.get("student_ids")
    if not isinstance(student_ids, list):
        return jsonify({"error": "student_ids list required"}), 400

    for sid in student_ids:
        user = User.query.get(sid)
        if not user or not user.is_active:
            continue
        existing = Enrollment.query.filter_by(course_id=str(course_id), student_id=sid).first()
        if existing:
            continue
        enrollment = Enrollment(course_id=str(course_id), student_id=sid)
        db.session.add(enrollment)
    db.session.commit()
    return jsonify({"message": "Enrollment updated"}), 200


@courses_bp.route("/<uuid:course_id>/students/<uuid:student_id>", methods=["DELETE"])
@require_auth
@require_role("admin")
def remove_student(course_id, student_id):
    course = Course.query.get(str(course_id))
    if course is None:
        return jsonify({"error": "Course not found"}), 404
    enrollment = Enrollment.query.filter_by(course_id=str(course_id), student_id=str(student_id)).first()
    if enrollment is None:
        return jsonify({"error": "Enrollment not found"}), 404
    db.session.delete(enrollment)
    db.session.commit()
    return jsonify({"message": "Enrollment removed"}), 200
