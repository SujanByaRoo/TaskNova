from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import plan, streak, mood, user, session

app = FastAPI(title="TaskNova API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router, prefix="/api/user", tags=["User"])
app.include_router(plan.router, prefix="/api/plan", tags=["Plan"])
app.include_router(streak.router, prefix="/api/streak", tags=["Streak"])
app.include_router(mood.router, prefix="/api/mood", tags=["Mood"])
app.include_router(session.router, prefix="/api/session", tags=["Session"])

@app.get("/")
def root():
    return {"message": "TaskNova API is running"}
