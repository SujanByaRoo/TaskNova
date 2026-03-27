from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.streak import Streak
#from models.plan import SubjectStreak
from datetime import datetime, date

router = APIRouter()

@router.get("/{user_id}")
def get_streak(user_id: int, db: Session = Depends(get_db)):
    streak = db.query(Streak).filter(Streak.user_id == user_id).first()
    if not streak:
        raise HTTPException(status_code=404, detail="Streak not found")

    level = (streak.total_xp // 500) + 1
    xp_in_level = streak.total_xp % 500

    badges = []
    if streak.current_streak >= 3:
        badges.append("3-Day Streak 🔥")
    if streak.current_streak >= 7:
        badges.append("Week Warrior ⚔️")
    if streak.total_xp >= 500:
        badges.append("XP Hunter ⚡")
    if streak.longest_streak >= 10:
        badges.append("10-Day Champion 🏆")

    return {
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "total_xp": streak.total_xp,
        "level": level,
        "xp_in_level": xp_in_level,
        "xp_to_next_level": 500 - xp_in_level,
        "streak_freeze_available": streak.streak_freeze_available,
        "badges": badges
    }


@router.post("/{user_id}/update")
def update_overall_streak(user_id: int, xp_to_add: int = 30, db: Session = Depends(get_db)):
    streak = db.query(Streak).filter(Streak.user_id == user_id).first()
    if not streak:
        raise HTTPException(status_code=404, detail="Streak not found")

    today = date.today()
    last_active = streak.last_active_date.date() if streak.last_active_date else None

    if last_active is None or (today - last_active).days > 1:
        streak.current_streak = 1
    elif last_active == today:
        pass  # already updated today, just add XP
    else:
        streak.current_streak += 1

    streak.total_xp += xp_to_add
    streak.last_active_date = datetime.utcnow()

    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak

    db.commit()

    return {
        "current_streak": streak.current_streak,
        "total_xp": streak.total_xp,
        "message": f"+{xp_to_add} XP earned!"
    }


@router.get("/leaderboard/global")
def get_global_leaderboard(db: Session = Depends(get_db)):
    """Return top 10 users by XP/streak for the global leaderboard"""
    from models.user import User
    streaks = db.query(Streak).order_by(Streak.total_xp.desc()).limit(10).all()
    result = []
    for s in streaks:
        user = db.query(User).filter(User.id == s.user_id).first()
        result.append({
            "user_id": s.user_id,
            "username": user.name if user else f"User{s.user_id}",
            "current_streak": s.current_streak,
            "total_xp": s.total_xp,
            "longest_streak": s.longest_streak
        })
    return {"leaderboard": result}
