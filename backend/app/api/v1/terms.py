from flask import Blueprint, request, jsonify
from datetime import date

from app import db
from app.models import Term
from app.utils.auth import require_auth, require_role


terms_bp = Blueprint("terms_bp", __name__, url_prefix="/api/v1/terms")


def _term_dict(term: Term) -> dict:
    return {
        "id": str(term.id),
        "name": term.name,
        "start_date": term.start_date.isoformat() if term.start_date else None,
        "end_date": term.end_date.isoformat() if term.end_date else None,
        "is_archived": term.is_archived,
        "created_at": term.created_at.isoformat() if term.created_at else None,
    }


@terms_bp.route("/", methods=["GET"])
@require_auth
@require_role("admin", "teacher")
def list_terms():
    terms = Term.query.order_by(Term.start_date.desc()).all()
    return jsonify([_term_dict(t) for t in terms]), 200


@terms_bp.route("/", methods=["POST"])
@require_auth
@require_role("admin")
def create_term():
    data = request.get_json() or {}
    name = data.get("name")
    start_str = data.get("start_date")
    end_str = data.get("end_date")

    if not name or not start_str or not end_str:
        return jsonify({"error": "name, start_date, end_date are required"}), 400

    try:
        start_date = date.fromisoformat(start_str)
        end_date = date.fromisoformat(end_str)
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    term = Term(name=name, start_date=start_date, end_date=end_date)
    db.session.add(term)
    db.session.commit()
    return jsonify(_term_dict(term)), 201


@terms_bp.route("/<uuid:term_id>", methods=["PATCH"])
@require_auth
@require_role("admin")
def update_term(term_id):
    term = Term.query.get(str(term_id))
    if term is None:
        return jsonify({"error": "Term not found"}), 404

    data = request.get_json() or {}
    name = data.get("name")
    start_str = data.get("start_date")
    end_str = data.get("end_date")
    is_archived = data.get("is_archived")

    if name is not None:
        term.name = name
    if start_str is not None:
        try:
            term.start_date = date.fromisoformat(start_str)
        except ValueError:
            return jsonify({"error": "Invalid date format"}), 400
    if end_str is not None:
        try:
            term.end_date = date.fromisoformat(end_str)
        except ValueError:
            return jsonify({"error": "Invalid date format"}), 400
    if is_archived is not None:
        term.is_archived = bool(is_archived)

    db.session.commit()
    return jsonify(_term_dict(term)), 200
