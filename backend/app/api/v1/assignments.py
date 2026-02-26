from flask import Blueprint, request, jsonify, g
from sqlalchemy import and_
from datetime import date

from app import db
from app.models import Assignment, AssignmentType, Grade
from app.utils.auth import require_auth, require_role, assert_teacher_owns_course

assignments_bp = Blueprint("assignments_bp", __name__, url_prefix="/api/v1/assignments")


def _assignment_dict(a: Assignment) -> dict:
    return {
        "id": str(a.id),
        "course_id": str(a.course_id),
        "name": a.name,
        "type": a.type.value,
        "max_points": float(a.max_points),
        "due_date": a.due_date.isoformat() if a.due_date else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@assignments_bp.route("/", methods=["GET"])
@require_auth
@require_role("admin", "teacher")
def list_assignments():
    course_id = request.args.get("course_id")
    if not course_id:
        return jsonify({"error": "course_id is required"}), 400
    if g.current_user and g.current_user.role.value == "teacher":
        assert_teacher_owns_course(str(g.current_user.id), course_id)
    assignments = Assignment.query.filter_by(course_id=course_id).order_by(Assignment.created_at).all()
    return jsonify([_assignment_dict(a) for a in assignments]), 200


@assignments_bp.route("/", methods=["POST"])
@require_auth
@require_role("teacher")
def create_assignment():
    data = request.get_json() or {}
    name = data.get("name")
    type_val = data.get("type")
    max_points = data.get("max_points")
    course_id = data.get("course_id")
    
    # Validate required fields
    if not name or not type_val or max_points is None or not course_id:
        return jsonify({"error": "name, type, max_points, and course_id are required"}), 400
    
    # parse ISO string to date object since column is Date
    due_date_str = data.get("due_date")
    try:
        due_date = date.fromisoformat(due_date_str) if due_date_str else None
    except ValueError:
        return jsonify({"error": "due_date must be a valid ISO date"}), 400
    
    try:
        type_enum = AssignmentType(type_val)
    except ValueError:
        return jsonify({"error": "Invalid assignment type"}), 422

    assert_teacher_owns_course(str(g.current_user.id), course_id)

    assignment = Assignment(
        course_id=course_id,
        name=name,
        type=type_enum,
        max_points=max_points,
        due_date=due_date,
    )
    db.session.add(assignment)
    db.session.commit()
    return jsonify(_assignment_dict(assignment)), 201


@assignments_bp.route("/<uuid:assignment_id>", methods=["PATCH"])
@require_auth
@require_role("admin", "teacher")
def update_assignment(assignment_id):
    assignment = Assignment.query.get(str(assignment_id))
    if assignment is None:
        return jsonify({"error": "Assignment not found"}), 404

    if g.current_user and g.current_user.role.value == "teacher":
        assert_teacher_owns_course(str(g.current_user.id), str(assignment.course_id))

    data = request.get_json() or {}
    warnings = []

    if "name" in data:
        assignment.name = data.get("name")
    if "type" in data:
        try:
            assignment.type = AssignmentType(data.get("type"))
        except ValueError:
            return jsonify({"error": "Invalid assignment type"}), 422
    if "due_date" in data:
        # converting string to date or clearing
        due_date_str = data.get("due_date")
        try:
            assignment.due_date = date.fromisoformat(due_date_str) if due_date_str else None
        except ValueError:
            return jsonify({"error": "due_date must be a valid ISO date"}), 400
    if "max_points" in data:
        new_max = data.get("max_points")
        try:
            new_max_val = float(new_max)
        except (TypeError, ValueError):
            return jsonify({"error": "max_points must be a number"}), 400
        old_max_val = float(assignment.max_points)
        if new_max_val < old_max_val:
            affected = Grade.query.filter(
                Grade.assignment_id == str(assignment_id),
                Grade.earned_points != None,
                Grade.earned_points > new_max_val,
            ).all()
            for g_row in affected:
                g_row.earned_points = new_max_val
                warnings.append(str(g_row.student_id))
        assignment.max_points = new_max_val

    db.session.commit()
    result = _assignment_dict(assignment)
    result["warnings"] = warnings
    return jsonify(result), 200


@assignments_bp.route("/<uuid:assignment_id>", methods=["DELETE"])
@require_auth
@require_role("admin", "teacher")
def delete_assignment(assignment_id):
    assignment = Assignment.query.get(str(assignment_id))
    if assignment is None:
        return jsonify({"error": "Assignment not found"}), 404

    if g.current_user and g.current_user.role.value == "teacher":
        assert_teacher_owns_course(str(g.current_user.id), str(assignment.course_id))
        if Grade.query.filter_by(assignment_id=str(assignment_id)).first():
            return jsonify({"error": "Contact admin to delete graded assignments"}), 409
        db.session.delete(assignment)
        db.session.commit()
        return "", 204

    # admin path
    Grade.query.filter_by(assignment_id=str(assignment_id)).delete()
    db.session.delete(assignment)
    db.session.commit()
    return "", 204
