from flask import Blueprint

api_v1 = Blueprint("api_v1", __name__, url_prefix="/api/v1")

from . import health  # noqa: E402,F401
from . import auth  # noqa: E402,F401