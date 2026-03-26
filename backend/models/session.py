from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from database.db import Base
from datetime import datetime

class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, nullable=True) 
    subject = Column(String, nullable=False)
    duration_minutes = Column(Float, default=0)
    xp_earned = Column(Integer, default=0)
    avg_response_time = Column(Float, nullable=True)  # for stress detection
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="sessions")
