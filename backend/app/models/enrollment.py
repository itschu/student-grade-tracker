import uuid
from sqlalchemy import func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, ForeignKey
from app import db


class Enrollment(db.Model):
    __tablename__ = "enrollment"
    __table_args__ = (UniqueConstraint("course_id", "student_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("course.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    enrolled_at = Column(db.DateTime(timezone=True), server_default=func.now())
