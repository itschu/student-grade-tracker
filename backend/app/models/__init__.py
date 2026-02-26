# package-level exports for SQLAlchemy models
# importing every model here ensures that db.metadata includes all tables when
# the application is imported (e.g. by Alembic during autogenerate).

from .user import User, UserRole
from .term import Term
from .course import Course
from .enrollment import Enrollment
from .assignment import Assignment, AssignmentType
from .grade import Grade
from .grading_config import GradingConfig, DisplayMode
from .grade_boundary import GradeBoundary

__all__ = [
    "User",
    "UserRole",
    "Term",
    "Course",
    "Enrollment",
    "Assignment",
    "AssignmentType",
    "Grade",
    "GradingConfig",
    "DisplayMode",
    "GradeBoundary",
]
