from database.db import SessionLocal
from models.plan import Lesson, Subject

db = SessionLocal()
db.query(Lesson).delete()
db.commit()
print(f"All lessons cleared")
db.close()
