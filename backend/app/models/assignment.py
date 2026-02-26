import uuid
import enum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, ForeignKey, Numeric, Date
from sqlalchemy import Enum as SAEnum
from app import db


class AssignmentType(enum.Enum):
    quiz = "quiz"
    exam = "exam"
    homework = "homework"
    project = "project"


class Assignment(db.Model):
    __tablename__ = "assignment"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("course.id"), nullable=False)
    name = Column(String(255), nullable=False)
    type = Column(SAEnum(AssignmentType, name="assignmenttype"), nullable=False)
    max_points = Column(Numeric(10, 2), nullable=False)
    due_date = Column(Date, nullable=True)
    created_at = Column(db.DateTime(timezone=True), server_default=func.now())
