import uuid
import sqlalchemy as sa
from sqlalchemy import func
from sqlalchemy import Column, String, Date, Boolean
from app import db


class Term(db.Model):
    __tablename__ = "term"

    id = Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_archived = Column(Boolean, nullable=False, default=False)
    created_at = Column(db.DateTime(timezone=True), server_default=func.now())
