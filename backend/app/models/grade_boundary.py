import uuid
from sqlalchemy import func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, ForeignKey, String, Numeric
from app import db


class GradeBoundary(db.Model):
    __tablename__ = "grade_boundary"
    __table_args__ = (UniqueConstraint("grading_config_id", "label"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    grading_config_id = Column(UUID(as_uuid=True), ForeignKey("grading_config.id"), nullable=False)
    label = Column(String(10), nullable=False)
    min_percentage = Column(Numeric(5, 2), nullable=False)
    max_percentage = Column(Numeric(5, 2), nullable=False)
    gpa_value = Column(Numeric(3, 2), nullable=True)
