import uuid
from sqlalchemy import func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, ForeignKey, Numeric
from app import db


class Grade(db.Model):
    __tablename__ = "grade"
    __table_args__ = (UniqueConstraint("assignment_id", "student_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignment.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    earned_points = Column(Numeric(10, 2), nullable=True)
    updated_at = Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
