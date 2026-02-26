import uuid
import enum
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, ForeignKey
from sqlalchemy import Enum as SAEnum
from app import db


class DisplayMode(enum.Enum):
    percentage = "percentage"
    letter = "letter"
    gpa = "gpa"


class GradingConfig(db.Model):
    __tablename__ = "grading_config"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    display_mode = Column(SAEnum(DisplayMode, name="displaymode"), nullable=False)
    effective_from_term_id = Column(UUID(as_uuid=True), ForeignKey("term.id"), nullable=False)
    created_at = Column(db.DateTime(timezone=True), server_default=func.now())
