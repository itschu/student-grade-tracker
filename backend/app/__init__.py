import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_cors import CORS
from dotenv import load_dotenv

# extensions
db = SQLAlchemy()
jwt = JWTManager()
bcrypt = Bcrypt()
migrate = Migrate()


def create_app(config=None):
    load_dotenv()
    app = Flask(__name__)

    # configuration from environment
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    app.config["DEBUG"] = os.getenv("FLASK_ENV") == "development"

    # initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    migrate.init_app(app, db)
    CORS(app, origins=["http://localhost:5173"])

    # ensure models are imported so that metadata is attached to db
    from . import models  # noqa: F401

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
