from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database.db import get_db
from models.session import StudySession
from models.streak import Streak
from datetime import datetime

router = APIRouter()

class StartSessionRequest(BaseModel):
    user_id: int
    subject: str
    task_id: Optional[int] = None

class EndSessionRequest(BaseModel):
    session_id: int
    avg_response_time: Optional[float] = None

@router.post("/start")
def start_session(req: StartSessionRequest, db: Session = Depends(get_db)):
    session = StudySession(
        user_id=req.user_id,
        task_id=req.task_id,
        subject=req.subject,
        started_at=datetime.utcnow()
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"session_id": session.id, "started_at": session.started_at}

@router.post("/end")
def end_session(req: EndSessionRequest, db: Session = Depends(get_db)):
    session = db.query(StudySession).filter(StudySession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.ended_at = datetime.utcnow()
    duration = (session.ended_at - session.started_at).total_seconds() / 60
    session.duration_minutes = round(duration, 2)
    session.avg_response_time = req.avg_response_time

    xp = min(int(duration * 0.5), 100)
    session.xp_earned = xp

    streak = db.query(Streak).filter(Streak.user_id == session.user_id).first()
    if streak:
        streak.total_xp += xp
        db.commit()

    db.commit()

    stress_flag = False
    if req.avg_response_time and req.avg_response_time > 8.0:
        stress_flag = True

    return {
        "duration_minutes": session.duration_minutes,
        "xp_earned": xp,
        "stress_flag": stress_flag,
        "message": f"Session complete! +{xp} XP"
    }

@router.get("/{user_id}/summary")
def get_summary(user_id: int, db: Session = Depends(get_db)):
    sessions = db.query(StudySession).filter(StudySession.user_id == user_id).all()
    total_time = sum(s.duration_minutes or 0 for s in sessions)
    total_xp = sum(s.xp_earned or 0 for s in sessions)

    subject_time = {}
    for s in sessions:
        subject_time[s.subject] = subject_time.get(s.subject, 0) + (s.duration_minutes or 0)

    return {
        "total_sessions": len(sessions),
        "total_study_minutes": round(total_time, 1),
        "total_xp": total_xp,
        "by_subject": subject_time
    }
