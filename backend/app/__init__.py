import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv
from sqlalchemy import exc as sqlalchemy_exc

# extensions
db = SQLAlchemy()
jwt = JWTManager()
bcrypt = Bcrypt()
migrate = Migrate()


def create_app(config=None):
    load_dotenv()
    app = Flask(__name__)
    app.url_map.strict_slashes = False

    # configuration from environment
    db_url = os.getenv("DATABASE_URL")
    # Flask-SQLAlchemy will treat a relative SQLite path as relative to
    # `app.instance_path`, but Alembic (used by `flask db upgrade`) bypasses
    # that shortcut and uses the raw value from config.  If the value is a
    # relative sqlite URL we resolve it here so both migrations and runtime
    # talk to the same file.
    if db_url and db_url.startswith("sqlite:///") and not db_url.startswith("sqlite:////"):
        # strip the leading scheme and re‑join against the instance folder
        rel_path = db_url[len("sqlite:///"):]
        abs_path = os.path.join(app.instance_path, rel_path)
        # ensure directory exists
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        db_url = "sqlite:///" + abs_path.replace("\\", "/")
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    jwt_key = os.getenv("JWT_SECRET_KEY", "")
    if len(jwt_key.encode("utf-8")) < 32:
        logging.getLogger(__name__).warning("JWT_SECRET_KEY is shorter than 32 bytes — this is insecure. Generate a strong key with: openssl rand -hex 32")
    app.config["DEBUG"] = os.getenv("FLASK_ENV") == "development"

    # If using SQLite locally, allow connections from multiple threads
    db_url = app.config.get("SQLALCHEMY_DATABASE_URI")
    if db_url and db_url.startswith("sqlite"):
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"connect_args": {"check_same_thread": False}}

    # initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    migrate.init_app(app, db)
    CORS(app, origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")])

    # ensure models are imported so that metadata is attached to db
    from . import models  # noqa: F401

    # bootstrap admin user from environment if not already created
    with app.app_context():
        try:
            from .models import User, UserRole
            logger = logging.getLogger(__name__)
            
            existing_admin = User.query.filter_by(role=UserRole.admin.value).first()
            if existing_admin:
                logger.info("Admin user already exists, skipping")
            else:
                admin_email = os.getenv("ADMIN_EMAIL")
                admin_password = os.getenv("ADMIN_PASSWORD")
                
                if admin_email and admin_password:
                    hashed = bcrypt.generate_password_hash(admin_password).decode("utf-8")
                    admin = User(
                        email=admin_email,
                        password_hash=hashed,
                        full_name="Admin",
                        role=UserRole.admin.value,
                        is_active=True,
                    )
                    db.session.add(admin)
                    db.session.commit()
                    logger.info("Admin user created from environment variables")
                else:
                    logger.warning(
                        "ADMIN_EMAIL/ADMIN_PASSWORD not set — no admin user created. "
                        "Set these env vars to bootstrap an admin."
                    )
        except (sqlalchemy_exc.ProgrammingError, sqlalchemy_exc.OperationalError) as e:
            # Schema not yet created (e.g., during flask db upgrade on first deploy)
            logger = logging.getLogger(__name__)
            logger.warning(
                "Database schema not ready — skipping admin bootstrap. "
                "This is expected during migrations. The admin will be created after schema migration completes."
            )
        except Exception as e:
            # Unexpected error, log but don't crash
            logger = logging.getLogger(__name__)
            logger.error(f"Error during admin bootstrap: {e}")

    # register blueprints
    from .api.v1 import api_v1
    from .api.v1.auth import auth_bp
    from .api.v1.config import config_bp
    from .api.v1.users import users_bp
    from .api.v1.terms import terms_bp
    from .api.v1.courses import courses_bp
    from .api.v1.assignments import assignments_bp
    from .api.v1.grades import grades_bp
    from .api.v1.analytics import analytics_bp
    from .api.v1.exports import exports_bp
    from .api.v1.student import student_bp

    app.register_blueprint(api_v1)
    app.register_blueprint(auth_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(terms_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(assignments_bp)
    app.register_blueprint(grades_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(exports_bp)
    app.register_blueprint(student_bp)

    # JSON error handlers for auth decorators
    @app.errorhandler(401)
    def _unauthorized(err):
        from flask import jsonify

        return jsonify({"error": "Unauthorized"}), 401

    @app.errorhandler(403)
    def _forbidden(err):
        from flask import jsonify

        return jsonify({"error": "Forbidden"}), 403

    return app
