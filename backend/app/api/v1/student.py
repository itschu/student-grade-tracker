from flask import Blueprint, request, jsonify, g

from app import db
from app.models import Term, Course, Enrollment, User
from app.utils.auth import require_auth, require_role

student_bp = Blueprint("student_bp", __name__, url_prefix="/api/v1/student")


@student_bp.route("/terms", methods=["GET"])
@require_auth
@require_role("student")
def list_terms():
    # only include terms for which the current student is enrolled in at least one course
    rows = (
        db.session.query(Term)
        .join(Course, Course.term_id == Term.id)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(Enrollment.student_id == str(g.current_user.id))
        .order_by(Term.start_date.desc())
        .distinct()
        .all()
    )
    return jsonify([
        {
            "id": str(t.id),
            "name": t.name,
            "start_date": t.start_date.isoformat() if t.start_date else None,
            "end_date": t.end_date.isoformat() if t.end_date else None,
            "is_archived": t.is_archived,
        }
        for t in rows
    ]), 200


@student_bp.route("/courses", methods=["GET"])
@require_auth
@require_role("student")
def list_courses():
    term_id = request.args.get("term_id")
    if not term_id:
        return jsonify({"error": "term_id is required"}), 400

    # join Enrollment->Course->User (teacher)
    rows = (
        db.session.query(Course, User)
        .join(User, Course.teacher_id == User.id)
        .join(Enrollment, Enrollment.course_id == Course.id)
        .filter(
            Enrollment.student_id == str(g.current_user.id),
            Course.term_id == term_id,
        )
        .all()
    )

    result = []
    for course, teacher in rows:
        result.append(
            {
                "id": str(course.id),
                "name": course.name,
                "term_id": str(course.term_id) if course.term_id else None,
                "teacher_name": teacher.full_name,
            }
        )
    return jsonify(result), 200
