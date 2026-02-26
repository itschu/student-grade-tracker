import uuid
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, ForeignKey
from app import db


class Course(db.Model):
    __tablename__ = "course"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    term_id = Column(UUID(as_uuid=True), ForeignKey("term.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    created_at = Column(db.DateTime(timezone=True), server_default=func.now())
