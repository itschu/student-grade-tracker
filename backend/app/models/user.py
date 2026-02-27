import uuid
import enum
import sqlalchemy as sa
from sqlalchemy import func
from sqlalchemy import Column, String, Boolean
from app import db


class UserRole(enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


class User(db.Model):
    __tablename__ = "user"

    id = Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    role = Column(sa.String(50), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(db.DateTime(timezone=True), server_default=func.now())
