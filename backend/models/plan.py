from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from database.db import Base
from datetime import datetime

class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    subject_type = Column(String, nullable=False)  # coding / aiml / math / language / theory
    current_day = Column(Integer, default=1)        # which day they are on
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    total_xp = Column(Integer, default=0)
    total_lessons_done = Column(Integer, default=0)
    last_active_date = Column(DateTime, nullable=True)
    topics_seen = Column(Text, default="[]")        # JSON list to avoid repeats
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    lessons = relationship("Lesson", back_populates="subject", cascade="all, delete")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    day_number = Column(Integer, nullable=False)
    topic = Column(String, nullable=False)
    lesson_content = Column(Text, nullable=True)
    task_type = Column(String, default="quiz")       # quiz / code / problem
    task_content = Column(Text, nullable=True)       # full JSON
    is_completed = Column(Boolean, default=False)
    xp_earned = Column(Integer, default=0)
    is_extra = Column(Boolean, default=False)  # True = extra lesson same day
    extra_number = Column(Integer, default=0)  # 0=main, 1=extra1, 2=extra2...
    generated_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    subject = relationship("Subject", back_populates="lessons")
