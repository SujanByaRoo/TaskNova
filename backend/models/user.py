from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.orm import relationship
from database.db import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    daily_study_hours = Column(Float, default=2.0)
    study_style = Column(String, default="balanced")  # visual / reading / practice
    disability = Column(String, default="")  # comma-separated: visual,hearing,cognitive
    created_at = Column(DateTime, default=datetime.utcnow)

    streaks = relationship("Streak", back_populates="user")
    mood_logs = relationship("MoodLog", back_populates="user")
    sessions = relationship("StudySession", back_populates="user")
