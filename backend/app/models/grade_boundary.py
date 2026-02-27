import uuid
import sqlalchemy as sa
from sqlalchemy import func, UniqueConstraint
from sqlalchemy import Column, ForeignKey, String, Numeric
from app import db


class GradeBoundary(db.Model):
    __tablename__ = "grade_boundary"
    __table_args__ = (UniqueConstraint("grading_config_id", "label"),)

    id = Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    grading_config_id = Column(sa.String(36), ForeignKey("grading_config.id"), nullable=False)
    label = Column(String(10), nullable=False)
    min_percentage = Column(Numeric(5, 2), nullable=False)
    max_percentage = Column(Numeric(5, 2), nullable=False)
    gpa_value = Column(Numeric(3, 2), nullable=True)
