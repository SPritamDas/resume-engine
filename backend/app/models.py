from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String)
    is_paid = Column(Boolean, default=False)
    paid_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class Resume(Base):
    __tablename__ = "resumes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    content_text = Column(Text)
    file_name = Column(String)
    score = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

class Usage(Base):
    __tablename__ = "usage"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True, index=True)
    scans_used = Column(Integer, default=0)
    jd_matches_used = Column(Integer, default=0)
    last_reset = Column(DateTime, server_default=func.now())
