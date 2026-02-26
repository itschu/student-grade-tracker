from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

from app import db, bcrypt
from app.models import User
from app.utils.auth import require_auth, require_role


auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/v1/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    # validate inputs and return 400 if missing
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if user is None:
        return jsonify({"error": "Invalid credentials"}), 401
    if not bcrypt.check_password_hash(user.password_hash or "", password):
        return jsonify({"error": "Invalid credentials"}), 401
    if not user.is_active:
        return jsonify({"error": "Invalid credentials"}), 401
    token = create_access_token(
        identity=str(user.id),
        additional_claims={"user_id": str(user.id), "role": user.role.value},
    )
    return (
        jsonify({"access_token": token, "role": user.role.value, "user_id": str(user.id)}),
        200,
    )


@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"message": "logged out"}), 200


@auth_bp.route("/reset-password", methods=["POST"])
@require_auth
@require_role("admin")
def reset_password():
    data = request.get_json() or {}
    user_id = data.get("user_id")
    new_password = data.get("new_password")
    if not new_password:
        return jsonify({"error": "new_password is required"}), 400
    user = User.query.get(user_id)
    if user is None:
        return jsonify({"error": "User not found"}), 404
    user.password_hash = bcrypt.generate_password_hash(new_password).decode("utf-8")
    db.session.commit()
    return jsonify({"message": "Password updated"}), 200
