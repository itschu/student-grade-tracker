import uuid
import sqlalchemy as sa
from sqlalchemy import func
from sqlalchemy import Column, String, ForeignKey
from app import db


class Course(db.Model):
    __tablename__ = "course"

    id = Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    term_id = Column(sa.String(36), ForeignKey("term.id"), nullable=False)
    teacher_id = Column(sa.String(36), ForeignKey("user.id"), nullable=False)
    created_at = Column(db.DateTime(timezone=True), server_default=func.now())
