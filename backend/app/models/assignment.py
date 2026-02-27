import uuid
import enum
import sqlalchemy as sa
from sqlalchemy import func
from sqlalchemy import Column, String, ForeignKey, Numeric, Date
from app import db


class AssignmentType(enum.Enum):
    quiz = "quiz"
    exam = "exam"
    homework = "homework"
    project = "project"


class Assignment(db.Model):
    __tablename__ = "assignment"

    id = Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(sa.String(36), ForeignKey("course.id"), nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(sa.String(50), nullable=False)
    max_points = Column(Numeric(10, 2), nullable=False)
    due_date = Column(Date, nullable=True)
    created_at = Column(db.DateTime(timezone=True), server_default=func.now())
