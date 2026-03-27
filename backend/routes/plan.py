from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database.db import get_db
from models.plan import Subject, Lesson
from models.mood import MoodLog
from models.streak import Streak
from ai.planner import validate_subject, generate_single_lesson, summarize_lesson, suggest_topics, generate_skip_test, answer_doubt, generate_visual_diagram, translate_lesson_content, answer_doubt_in_language, SUPPORTED_LANGUAGES
from datetime import datetime, date, timedelta
import json

router = APIRouter()

class AddSubjectRequest(BaseModel):
    user_id: int
    subject_name: str

class CompleteRequest(BaseModel):
    user_id: int
    code_answer: Optional[str] = None

class SummarizeRequest(BaseModel):
    text: str

class GenerateTopicRequest(BaseModel):
    topic: str

class DoubtRequest(BaseModel):
    question: str
    lesson_context: Optional[str] = ""
    language: Optional[str] = "English"

class TranslateRequest(BaseModel):
    content: str
    target_language: str

class SkipTestSubmitRequest(BaseModel):
    answers: dict


@router.delete("/subject/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    subject.is_active = False
    db.commit()
    return {"message": "Subject removed"}


@router.delete("/subject/{subject_id}/reset-lesson")
def reset_today_lesson(subject_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    # Delete ALL lessons for this subject to force fresh generation
    db.query(Lesson).filter(Lesson.subject_id == subject_id).delete()
    db.commit()
    return {"message": "Lesson reset"}


@router.post("/subject/add")
def add_subject(req: AddSubjectRequest, db: Session = Depends(get_db)):
    stype = validate_subject(req.subject_name)
    if not stype:
        raise HTTPException(status_code=400, detail=f"'{req.subject_name}' is not a recognized subject. Try: DSA, Python, Maths, English, Biology, etc.")

    existing = db.query(Subject).filter(
        Subject.user_id == req.user_id,
        Subject.name == req.subject_name.upper(),
        Subject.is_active == True
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Subject already added.")

    subject = Subject(user_id=req.user_id, name=req.subject_name.upper(), subject_type=stype, current_day=1)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return {"message": f"{req.subject_name.upper()} added", "subject_id": subject.id, "subject_type": stype}


@router.get("/{user_id}/subjects")
def get_subjects(user_id: int, db: Session = Depends(get_db)):
    subjects = db.query(Subject).filter(Subject.user_id == user_id, Subject.is_active == True).all()
    result = []
    today = date.today()

    for s in subjects:
        # Advance day if last completed lesson was on a previous calendar day
        last_completed = db.query(Lesson).filter(
            Lesson.subject_id == s.id,
            Lesson.is_completed == True
        ).order_by(Lesson.day_number.desc()).first()

        if last_completed and last_completed.completed_at:
            completed_date = last_completed.completed_at.date()
            if completed_date < today and last_completed.day_number == s.current_day:
                s.current_day += 1
                db.commit()

        today_lesson = db.query(Lesson).filter(
            Lesson.subject_id == s.id,
            Lesson.day_number == s.current_day
        ).first()

        days_inactive = 0
        if s.last_active_date:
            days_inactive = (datetime.utcnow() - s.last_active_date).days

        result.append({
            "id": s.id,
            "name": s.name,
            "subject_type": s.subject_type,
            "current_day": s.current_day,
            "current_streak": s.current_streak,
            "longest_streak": s.longest_streak,
            "total_xp": s.total_xp,
            "total_lessons_done": s.total_lessons_done,
            "lesson_generated": today_lesson is not None,
            "lesson_completed": today_lesson.is_completed if today_lesson else False,
            "last_active": s.last_active_date.strftime("%Y-%m-%d") if s.last_active_date else None,
            "days_inactive": days_inactive
        })

    return {"subjects": result}


@router.post("/subject/{subject_id}/generate-lesson")
def generate_today_lesson(subject_id: int, user_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    today = date.today()

    # Get today's mood
    mood_log = db.query(MoodLog).filter(
        MoodLog.user_id == subject.user_id,
        MoodLog.logged_at >= datetime.combine(today, datetime.min.time())
    ).order_by(MoodLog.logged_at.desc()).first()
    mood_score = mood_log.mood_score if mood_log else 5

    # Check if lesson already exists for current day
    existing = db.query(Lesson).filter(
        Lesson.subject_id == subject_id,
        Lesson.day_number == subject.current_day
    ).first()

    if existing:
        task_data = json.loads(existing.task_content) if existing.task_content else {}
        was_stressed = task_data.get("mood_adjusted", False)
        now_stressed = mood_score <= 2
        # Regenerate if mood changed significantly and lesson not completed yet
        if not existing.is_completed and now_stressed != was_stressed:
            db.delete(existing)
            db.commit()
            existing = None
        else:
            return {
                "lesson_id": existing.id,
                "day": existing.day_number,
                "topic": existing.topic,
                "lesson": existing.lesson_content,
                "task_type": existing.task_type,
                "task_data": task_data,
                "is_completed": existing.is_completed,
                "mood_adjusted": was_stressed
            }

    # Generate new lesson
    topics_seen = json.loads(subject.topics_seen) if subject.topics_seen else []
    lesson_data = generate_single_lesson(
        subject=subject.name,
        subject_type=subject.subject_type,
        day=subject.current_day,
        topics_seen=topics_seen,
        mood_score=mood_score
    )

    topic = lesson_data.get("topic", f"{subject.name} Day {subject.current_day}")
    lesson = Lesson(
        subject_id=subject_id,
        user_id=subject.user_id,
        day_number=subject.current_day,
        topic=topic,
        lesson_content=json.dumps(lesson_data),
        task_type=lesson_data.get("task_type", "quiz"),
        task_content=json.dumps(lesson_data)
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    return {
        "lesson_id": lesson.id,
        "day": lesson.day_number,
        "topic": lesson.topic,
        "lesson": lesson.lesson_content,
        "task_type": lesson.task_type,
        "task_data": lesson_data,
        "is_completed": lesson.is_completed,
        "mood_adjusted": lesson_data.get("mood_adjusted", False)
    }


@router.post("/lesson/{lesson_id}/complete")
def complete_lesson(lesson_id: int, req: CompleteRequest, db: Session = Depends(get_db)):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if lesson.is_completed:
        raise HTTPException(status_code=400, detail="Already completed")

    # Validate code answer - only check minimum length
    task_data = json.loads(lesson.task_content) if lesson.task_content else {}
    if lesson.task_type == "code" and req.code_answer:
        if len(req.code_answer.strip()) < 10:
            raise HTTPException(status_code=400, detail="Code too short. Write a proper solution.")

    lesson.is_completed = True
    lesson.completed_at = datetime.utcnow()
    lesson.xp_earned = 30

    subject = db.query(Subject).filter(Subject.id == lesson.subject_id).first()
    today = date.today()
    last = subject.last_active_date.date() if subject.last_active_date else None

    if last is None or (today - last).days > 1:
        subject.current_streak = 1
    elif last == today:
        pass
    else:
        subject.current_streak += 1

    if subject.current_streak > subject.longest_streak:
        subject.longest_streak = subject.current_streak

    subject.total_xp += 30
    subject.total_lessons_done += 1
    subject.last_active_date = datetime.utcnow()
    # NOTE: current_day advances tomorrow when user logs in next day

    seen = json.loads(subject.topics_seen)
    if lesson.topic not in seen:
        seen.append(lesson.topic)
    subject.topics_seen = json.dumps(seen)

    overall = db.query(Streak).filter(Streak.user_id == req.user_id).first()
    if overall:
        last_overall = overall.last_active_date.date() if overall.last_active_date else None
        if last_overall is None or (today - last_overall).days > 1:
            overall.current_streak = 1
        elif last_overall == today:
            pass
        else:
            overall.current_streak += 1
        overall.total_xp += 30
        overall.last_active_date = datetime.utcnow()
        if overall.current_streak > overall.longest_streak:
            overall.longest_streak = overall.current_streak

    db.commit()

    return {
        "message": "Lesson completed!",
        "xp_earned": 30,
        "subject_streak": subject.current_streak,
        "current_day": subject.current_day
    }


@router.post("/subject/{subject_id}/extra-lesson")
def generate_extra_lesson(subject_id: int, user_id: int, db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Check today main lesson is completed
    today_main = db.query(Lesson).filter(
        Lesson.subject_id == subject_id,
        Lesson.day_number == subject.current_day,
        Lesson.is_extra == False,
        Lesson.is_completed == True
    ).first()
    if not today_main:
        raise HTTPException(status_code=400, detail="Complete today main lesson first")

    # Count how many extras already done today
    extras_today = db.query(Lesson).filter(
        Lesson.subject_id == subject_id,
        Lesson.day_number == subject.current_day,
        Lesson.is_extra == True
    ).all()

    extra_num = len(extras_today) + 1

    # Check if last extra is completed
    if extras_today:
        last_extra = sorted(extras_today, key=lambda x: x.extra_number)[-1]
        if not last_extra.is_completed:
            # Return existing incomplete extra
            task_data = json.loads(last_extra.task_content) if last_extra.task_content else {}
            return {
                "lesson_id": last_extra.id,
                "day": last_extra.day_number,
                "extra_number": last_extra.extra_number,
                "topic": last_extra.topic,
                "lesson": last_extra.lesson_content,
                "task_type": last_extra.task_type,
                "task_data": task_data,
                "is_completed": last_extra.is_completed,
                "is_extra": True,
                "mood_adjusted": False
            }

    # Get all topics seen today including extras
    topics_seen = json.loads(subject.topics_seen) if subject.topics_seen else []
    extra_topics = [e.topic for e in extras_today]
    all_topics = topics_seen + extra_topics

    # Get mood
    today = date.today()
    mood_log = db.query(MoodLog).filter(
        MoodLog.user_id == subject.user_id,
        MoodLog.logged_at >= datetime.combine(today, datetime.min.time())
    ).order_by(MoodLog.logged_at.desc()).first()
    mood_score = mood_log.mood_score if mood_log else 5

    # Generate extra lesson - goes deeper than main lesson
    from ai.planner import generate_single_lesson
    lesson_data = generate_single_lesson(
        subject=subject.name,
        subject_type=subject.subject_type,
        day=subject.current_day,
        topics_seen=all_topics,
        mood_score=mood_score
    )

    topic = lesson_data.get("topic", f"{subject.name} Extra {extra_num}")
    lesson = Lesson(
        subject_id=subject_id,
        user_id=subject.user_id,
        day_number=subject.current_day,
        topic=topic,
        lesson_content=json.dumps(lesson_data),
        task_type=lesson_data.get("task_type", "quiz"),
        task_content=json.dumps(lesson_data),
        is_extra=True,
        extra_number=extra_num
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    return {
        "lesson_id": lesson.id,
        "day": lesson.day_number,
        "extra_number": extra_num,
        "topic": lesson.topic,
        "lesson": lesson.lesson_content,
        "task_type": lesson.task_type,
        "task_data": lesson_data,
        "is_completed": lesson.is_completed,
        "is_extra": True,
        "mood_adjusted": lesson_data.get("mood_adjusted", False)
    }


@router.get("/subject/{subject_id}/history")
def get_lesson_history(subject_id: int, db: Session = Depends(get_db)):
    lessons = db.query(Lesson).filter(Lesson.subject_id == subject_id).order_by(Lesson.day_number).all()
    return {
        "lessons": [
            {
                "day": l.day_number,
                "topic": l.topic,
                "is_completed": l.is_completed,
                "is_extra": l.is_extra,
                "extra_number": l.extra_number,
                "xp": l.xp_earned,
                "date": l.completed_at.strftime("%Y-%m-%d") if l.completed_at else None
            }
            for l in lessons
        ]
    }


@router.get("/{user_id}/weekly")
def get_weekly_progress(user_id: int, subject_id: int = None, db: Session = Depends(get_db)):
    today = date.today()
    week = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        query = db.query(Lesson).filter(
            Lesson.user_id == user_id,
            Lesson.is_completed == True,
            Lesson.completed_at >= datetime.combine(day, datetime.min.time()),
            Lesson.completed_at < datetime.combine(day + timedelta(days=1), datetime.min.time())
        )
        if subject_id:
            query = query.filter(Lesson.subject_id == subject_id)
        lessons_done = query.count()
        week.append({
            "date": day.strftime("%Y-%m-%d"),
            "day_name": day.strftime("%a"),
            "lessons_done": lessons_done,
            "is_today": i == 0
        })
    return {"week": week}


# ── NEW ENDPOINTS FOR REBUILT FRONTEND ────────────────────────────────────────

@router.post("/summarize")
def summarize_lesson_route(req: SummarizeRequest):
    """Summarize lesson text into bullet points"""
    points = summarize_lesson(req.text)
    return {"summary": points}


@router.post("/subject/{subject_id}/suggest-topics")
def suggest_topics_route(subject_id: int, user_id: int, db: Session = Depends(get_db)):
    """Return 5 AI-suggested topics the user can pick for their next lesson"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    topics_seen = json.loads(subject.topics_seen) if subject.topics_seen else []
    topics = suggest_topics(subject.name, subject.subject_type, topics_seen)
    return {"topics": topics}


@router.post("/subject/{subject_id}/generate-lesson-topic")
def generate_lesson_with_topic(subject_id: int, user_id: int, req: GenerateTopicRequest, db: Session = Depends(get_db)):
    """Generate a lesson for a user-chosen or AI-suggested topic"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    today = date.today()
    mood_log = db.query(MoodLog).filter(
        MoodLog.user_id == subject.user_id,
        MoodLog.logged_at >= datetime.combine(today, datetime.min.time())
    ).order_by(MoodLog.logged_at.desc()).first()
    mood_score = mood_log.mood_score if mood_log else 5

    topics_seen = json.loads(subject.topics_seen) if subject.topics_seen else []

    # Delete any existing incomplete lesson for this day before generating new one
    existing = db.query(Lesson).filter(
        Lesson.subject_id == subject_id,
        Lesson.day_number == subject.current_day,
        Lesson.is_extra == False
    ).first()
    if existing and not existing.is_completed:
        db.delete(existing)
        db.commit()

    lesson_data = generate_single_lesson(
        subject=subject.name,
        subject_type=subject.subject_type,
        day=subject.current_day,
        topics_seen=topics_seen,
        mood_score=mood_score,
        forced_topic=req.topic
    )

    topic = lesson_data.get("topic", req.topic)
    lesson = Lesson(
        subject_id=subject_id,
        user_id=subject.user_id,
        day_number=subject.current_day,
        topic=topic,
        lesson_content=json.dumps(lesson_data),
        task_type=lesson_data.get("task_type", "quiz"),
        task_content=json.dumps(lesson_data)
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    return {
        "lesson_id": lesson.id,
        "day": lesson.day_number,
        "topic": lesson.topic,
        "lesson": lesson.lesson_content,
        "task_type": lesson.task_type,
        "task_data": lesson_data,
        "is_completed": lesson.is_completed,
        "mood_adjusted": lesson_data.get("mood_adjusted", False)
    }


@router.post("/subject/{subject_id}/skip-test")
def get_skip_test(subject_id: int, user_id: int, db: Session = Depends(get_db)):
    """Generate a 5-question test; if user scores 80%+ they skip current day"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    topics_seen = json.loads(subject.topics_seen) if subject.topics_seen else []
    test_data = generate_skip_test(subject.name, subject.subject_type, subject.current_day, topics_seen)
    return test_data


@router.post("/subject/{subject_id}/skip-test/submit")
def submit_skip_test(subject_id: int, user_id: int, req: SkipTestSubmitRequest, db: Session = Depends(get_db)):
    """If user passed the skip test, advance their day"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    # Advance day — treat as a skipped completion
    subject.current_day += 1
    subject.last_active_date = datetime.utcnow()
    db.commit()

    return {"message": "Day skipped!", "new_day": subject.current_day}



class VisualRequest(BaseModel):
    topic: str
    concept: str
    subject_type: str

@router.post("/visual")
def generate_visual(req: VisualRequest):
    diagram = generate_visual_diagram(req.topic, req.concept, req.subject_type)
    return {"diagram": diagram}

@router.get("/supported-languages")
def get_supported_languages():
    """Return all supported languages for translation and doubt chat"""
    return {"languages": list(SUPPORTED_LANGUAGES.keys())}


@router.post("/translate")
def translate_content(req: TranslateRequest):
    """Translate lesson content to the target language"""
    if req.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {req.target_language}")
    translated = translate_lesson_content(req.content, req.target_language)
    return {"translated": translated, "language": req.target_language}


@router.post("/doubt")
def answer_doubt_route(req: DoubtRequest):
    """Answer a student doubt contextually in the chosen language"""
    language = req.language if req.language in SUPPORTED_LANGUAGES else "English"
    answer = answer_doubt_in_language(req.question, req.lesson_context or "", language)
    return {"answer": answer, "language": language}
