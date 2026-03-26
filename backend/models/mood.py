from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database.db import Base
from datetime import datetime

class MoodLog(Base):
    __tablename__ = "mood_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mood_score = Column(Integer, nullable=False)   # 1 (very stressed) to 5 (great)
    mood_label = Column(String, nullable=False)    # stressed / tired / okay / good / great
    note = Column(String, nullable=True)
    stress_detected = Column(Integer, default=0)   # 0 = no, 1 = yes
    logged_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="mood_logs")
