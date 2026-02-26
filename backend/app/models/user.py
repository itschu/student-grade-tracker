import uuid
import enum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, Boolean
from sqlalchemy import Enum as SAEnum
from app import db


class UserRole(enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


class User(db.Model):
    __tablename__ = "user"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    role = Column(SAEnum(UserRole, name="userrole"), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(db.DateTime(timezone=True), server_default=func.now())
