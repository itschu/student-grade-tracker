import uuid
import sqlalchemy as sa
from sqlalchemy import func, UniqueConstraint
from sqlalchemy import Column, ForeignKey, Numeric
from app import db


class Grade(db.Model):
    __tablename__ = "grade"
    __table_args__ = (UniqueConstraint("assignment_id", "student_id"),)

    id = Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignment_id = Column(sa.String(36), ForeignKey("assignment.id"), nullable=False)
    student_id = Column(sa.String(36), ForeignKey("user.id"), nullable=False)
    earned_points = Column(Numeric(10, 2), nullable=True)
    updated_at = Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
