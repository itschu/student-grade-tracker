from flask import Blueprint, request, jsonify

from app import db
from app.models import GradingConfig, GradeBoundary, Term, DisplayMode
from app.utils.auth import require_auth, require_role
from app.services.grade_calculator import get_effective_config


config_bp = Blueprint("config_bp", __name__, url_prefix="/api/v1/config")


def _serialize_config(config):
    """
    Serializes a GradingConfig instance to a dict suitable for JSON response.
    
    Args:
        config: GradingConfig instance
        
    Returns:
        dict with id, display_mode, effective_from_term_id, created_at, and boundaries list
    """
    boundaries = GradeBoundary.query.filter_by(grading_config_id=config.id).all()
    
    return {
        "id": str(config.id),
        "display_mode": config.display_mode.value,
        "effective_from_term_id": str(config.effective_from_term_id),
        "created_at": config.created_at.isoformat() if config.created_at else None,
        "boundaries": [
            {
                "id": str(b.id),
                "label": b.label,
                "min_percentage": float(b.min_percentage),
                "max_percentage": float(b.max_percentage),
                # explicitly check for None so that 0.0 is preserved
                "gpa_value": float(b.gpa_value) if b.gpa_value is not None else None,
            }
            for b in boundaries
        ],
    }


@config_bp.route("/", methods=["GET"])
@require_auth
@require_role("admin")
def list_configs():
    """
    GET /api/v1/config/
    
    Lists all grading configurations in descending order of creation.
    """
    configs = GradingConfig.query.order_by(GradingConfig.created_at.desc()).all()
    return jsonify([_serialize_config(c) for c in configs]), 200


@config_bp.route("/effective", methods=["GET"])
@require_auth
@require_role("admin")
def get_effective():
    """
    GET /api/v1/config/effective?term_id=<term_id>
    
    Retrieves the effective grading configuration for a given term.
    """
    term_id = request.args.get("term_id")
    if not term_id:
        return jsonify({"error": "term_id is required"}), 400
    
    config = get_effective_config(term_id)
    if config is None:
        return jsonify({"error": "No effective config found for this term"}), 404
    
    return jsonify(_serialize_config(config)), 200


@config_bp.route("/", methods=["POST"])
@require_auth
@require_role("admin")
def create_config():
    """
    POST /api/v1/config/
    
    Creates a new grading configuration with boundaries.
    
    Request body:
    {
        "display_mode": "percentage" | "letter" | "gpa",
        "effective_from_term_id": "<term_id>",
        "boundaries": [
            {
                "label": "A",
                "min_percentage": 90.0,
                "max_percentage": 100.0,
                "gpa_value": 4.0
            },
            ...
        ],
        "apply_to_all_historical": false  (optional)
    }
    """
    data = request.get_json() or {}
    
    # Validate required fields
    display_mode = data.get("display_mode")
    effective_from_term_id = data.get("effective_from_term_id")
    boundaries = data.get("boundaries")
    apply_to_all_historical = data.get("apply_to_all_historical", False)
    
    if not display_mode or not effective_from_term_id or boundaries is None:
        return jsonify({"error": "display_mode, effective_from_term_id, and boundaries are required"}), 400
    
    if not isinstance(boundaries, list):
        return jsonify({"error": "boundaries must be a list"}), 400
    
    # Validate display_mode is a valid DisplayMode
    try:
        display_mode_enum = DisplayMode[display_mode]
    except KeyError:
        return jsonify({"error": f"Invalid display_mode. Must be one of: {', '.join([m.value for m in DisplayMode])}"}), 400

    # GPA mode requires each boundary to specify a non-null gpa_value
    if display_mode_enum == DisplayMode.gpa:
        for b in boundaries:
            if b.get("gpa_value") is None:
                return jsonify({"error": "All boundaries must include a gpa_value when display_mode is gpa"}), 400
    
    # Handle apply_to_all_historical logic
    if apply_to_all_historical:
        earliest_term = Term.query.order_by(Term.start_date.asc()).first()
        if earliest_term is None:
            return jsonify({"error": "No terms exist to apply historical config"}), 400
        effective_from_term_id = str(earliest_term.id)
    
    # Verify effective_from_term_id refers to an existing term
    term = Term.query.get(effective_from_term_id)
    if term is None:
        return jsonify({"error": "effective_from_term_id does not refer to an existing term"}), 400
    
    # Validate boundary overlap
    if len(boundaries) > 1:
        sorted_boundaries = sorted(boundaries, key=lambda b: b.get("min_percentage", 0))
        for i in range(len(sorted_boundaries) - 1):
            current = sorted_boundaries[i]
            next_boundary = sorted_boundaries[i + 1]
            if current.get("max_percentage", 0) >= next_boundary.get("min_percentage", 0):
                return jsonify({"error": "Overlapping boundary ranges"}), 422
    
    # Create config and boundaries in a single transaction
    try:
        config = GradingConfig(
            display_mode=display_mode_enum,
            effective_from_term_id=effective_from_term_id
        )
        db.session.add(config)
        db.session.flush()  # Get config.id
        
        for boundary_data in boundaries:
            boundary = GradeBoundary(
                grading_config_id=config.id,
                label=boundary_data.get("label"),
                min_percentage=boundary_data.get("min_percentage"),
                max_percentage=boundary_data.get("max_percentage"),
                gpa_value=boundary_data.get("gpa_value"),
            )
            db.session.add(boundary)
        
        db.session.commit()
        return jsonify(_serialize_config(config)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
