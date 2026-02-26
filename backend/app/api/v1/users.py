from flask import Blueprint, request, jsonify
from sqlalchemy import or_

from app import db, bcrypt
from app.models import User, UserRole
from app.utils.auth import require_auth, require_role


users_bp = Blueprint("users_bp", __name__, url_prefix="/api/v1/users")


def _user_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


@users_bp.route("/", methods=["GET"])
@require_auth
@require_role("admin")
def list_users():
    role = request.args.get("role")
    q = request.args.get("q")

    query = User.query
    if role:
        try:
            role_enum = UserRole(role)
        except ValueError:
            return jsonify({"error": "Invalid role"}), 400
        query = query.filter(User.role == role_enum)
    if q:
        ilike_q = f"%{q}%"
        query = query.filter(
            or_(User.full_name.ilike(ilike_q), User.email.ilike(ilike_q))
        )
    users = query.order_by(User.full_name).all()
    return jsonify([_user_dict(u) for u in users]), 200


@users_bp.route("/", methods=["POST"])
@require_auth
@require_role("admin")
def create_user():
    data = request.get_json() or {}
    full_name = data.get("full_name")
    email = data.get("email")
    role = data.get("role")
    password = data.get("password")

    if not full_name or not email or not role or not password:
        return jsonify({"error": "full_name, email, role, password are required"}), 400

    try:
        role_enum = UserRole(role)
    except ValueError:
        return jsonify({"error": "Invalid role"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already in use"}), 409

    pw_hash = bcrypt.generate_password_hash(password).decode("utf-8")
    user = User(full_name=full_name, email=email, role=role_enum, password_hash=pw_hash)
    db.session.add(user)
    db.session.commit()
    return jsonify(_user_dict(user)), 201


@users_bp.route("/<uuid:user_id>", methods=["PATCH"])
@require_auth
@require_role("admin")
def update_user(user_id):
    user = User.query.get(str(user_id))
    if user is None:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    full_name = data.get("full_name")
    email = data.get("email")
    is_active = data.get("is_active")

    if full_name is not None:
        user.full_name = full_name
    if email is not None and email != user.email:
        existing = User.query.filter(User.email == email, User.id != user.id).first()
        if existing:
            return jsonify({"error": "Email already in use"}), 409
        user.email = email
    if is_active is not None:
        user.is_active = bool(is_active)

    db.session.commit()
    return jsonify(_user_dict(user)), 200
