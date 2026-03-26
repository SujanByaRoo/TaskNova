from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database.db import get_db
from models.mood import MoodLog
from datetime import datetime

router = APIRouter()

MOOD_LABELS = {1: "stressed", 2: "tired", 3: "okay", 4: "good", 5: "great"}

class MoodRequest(BaseModel):
    user_id: int
    mood_score: int  # 1-5
    note: Optional[str] = None

@router.post("/log")
def log_mood(req: MoodRequest, db: Session = Depends(get_db)):
    if req.mood_score < 1 or req.mood_score > 5:
        raise HTTPException(status_code=400, detail="Mood score must be 1-5")

    stress_detected = 1 if req.mood_score <= 2 else 0

    log = MoodLog(
        user_id=req.user_id,
        mood_score=req.mood_score,
        mood_label=MOOD_LABELS[req.mood_score],
        note=req.note,
        stress_detected=stress_detected
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    response = {
        "logged": True,
        "mood": MOOD_LABELS[req.mood_score],
        "stress_detected": bool(stress_detected)
    }

    if stress_detected:
        response["message"] = "Stress detected. Today's plan has been adjusted to be lighter."
        response["plan_adjusted"] = True
    else:
        response["message"] = "Great! Let's get studying."
        response["plan_adjusted"] = False

    return response

@router.get("/{user_id}/history")
def get_mood_history(user_id: int, db: Session = Depends(get_db)):
    logs = db.query(MoodLog).filter(MoodLog.user_id == user_id).order_by(MoodLog.logged_at.desc()).limit(10).all()

    return {
        "history": [
            {
                "mood": log.mood_label,
                "score": log.mood_score,
                "stress_detected": bool(log.stress_detected),
                "date": log.logged_at.strftime("%Y-%m-%d"),
                "note": log.note
            }
            for log in logs
        ]
    }

@router.get("/{user_id}/latest")
def get_latest_mood(user_id: int, db: Session = Depends(get_db)):
    log = db.query(MoodLog).filter(MoodLog.user_id == user_id).order_by(MoodLog.logged_at.desc()).first()
    if not log:
        return {"mood": None}
    return {
        "mood": log.mood_label,
        "score": log.mood_score,
        "stress_detected": bool(log.stress_detected)
    }
