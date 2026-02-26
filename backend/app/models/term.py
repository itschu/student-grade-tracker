import uuid
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import Column, String, Date, Boolean
from app import db


class Term(db.Model):
    __tablename__ = "term"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_archived = Column(Boolean, nullable=False, default=False)
    created_at = Column(db.DateTime(timezone=True), server_default=func.now())
