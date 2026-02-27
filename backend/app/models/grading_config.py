import uuid
import enum
import sqlalchemy as sa
from sqlalchemy import func
from sqlalchemy import Column, ForeignKey
from app import db


class DisplayMode(enum.Enum):
    percentage = "percentage"
    letter = "letter"
    gpa = "gpa"


class GradingConfig(db.Model):
    __tablename__ = "grading_config"

    id = Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    display_mode = Column(sa.String(50), nullable=False)
    effective_from_term_id = Column(sa.String(36), ForeignKey("term.id"), nullable=False)
    created_at = Column(db.DateTime(timezone=True), server_default=func.now())
