import uuid
import sqlalchemy as sa
from sqlalchemy import func, UniqueConstraint
from sqlalchemy import Column, ForeignKey
from app import db


class Enrollment(db.Model):
    __tablename__ = "enrollment"
    __table_args__ = (UniqueConstraint("course_id", "student_id"),)

    id = Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id = Column(sa.String(36), ForeignKey("course.id"), nullable=False)
    student_id = Column(sa.String(36), ForeignKey("user.id"), nullable=False)
    enrolled_at = Column(db.DateTime(timezone=True), server_default=func.now())
