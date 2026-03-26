from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database.db import get_db
from models.user import User
from models.streak import Streak
import bcrypt

router = APIRouter()

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    daily_study_hours: float = 2.0
    study_style: str = "balanced"
    disability: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class CheckEmailRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str

@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    user = User(
        name=req.name,
        email=req.email,
        password_hash=hashed,
        daily_study_hours=req.daily_study_hours,
        study_style=req.study_style,
        disability=req.disability
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    streak = Streak(user_id=user.id)
    db.add(streak)
    db.commit()
    return {"message": "User registered", "user_id": user.id, "name": user.name}

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not bcrypt.checkpw(req.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Invalid password")
    return {
        "message": "Login successful",
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "daily_study_hours": user.daily_study_hours,
        "study_style": user.study_style,
        "disability": user.disability or ""
    }

@router.post("/check-email")
def check_email(req: CheckEmailRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found with this email")
    return {"message": "Email found"}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    user.password_hash = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    db.commit()
    return {"message": "Password updated"}

@router.get("/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "daily_study_hours": user.daily_study_hours,
        "study_style": user.study_style,
        "disability": user.disability or ""
    }
