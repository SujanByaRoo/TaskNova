import requests
import json
import re

GROQ_API_KEY = "********************"
GROQ_URL = "*******************"
MODEL = "llama-3.3-70b-versatile"


def call_groq_text(prompt: str, max_tokens: int = 1500) -> str:
    """Call Groq and return plain text - no JSON parsing here"""
    try:
        response = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": "You are a teacher. Be concise. Follow instructions exactly."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3,
                "max_tokens": max_tokens
            },
            timeout=30
        )
        return response.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"Groq error: {e}")
        return ""


def validate_subject(subject: str):
    """Use AI to validate and classify any subject dynamically"""
    raw = call_groq_text(
        f"""Is "{subject}" a real academic subject, field of study, or skill that can be learned?
Reply in exactly this format:
valid: yes or no
type: coding or aiml or math or language or theory

Rules for type:
- coding: software programming, CS algorithms, web/app development
- aiml: artificial intelligence, machine learning, data science
- math: mathematics, statistics, calculus, algebra
- language: spoken/written languages like English, Tamil, Hindi, French
- theory: everything else — science, engineering, medicine, history, business, art, music, hardware, electronics, etc.""",
        max_tokens=30
    )
    raw = raw.lower()
    if "valid: no" in raw or "valid:no" in raw:
        return None
    for t in ["coding", "aiml", "math", "language", "theory"]:
        if f"type: {t}" in raw or f"type:{t}" in raw:
            return t
    # If valid but type unclear default to theory
    if "valid: yes" in raw or "valid:yes" in raw:
        return "theory"
    return None


def generate_single_lesson(subject: str, subject_type: str, day: int, topics_seen: list, mood_score: int = 5) -> dict:
    seen = ", ".join(topics_seen[-5:]) if topics_seen else "none"
    is_stressed = mood_score <= 2

    # Build lesson using separate calls to avoid JSON issues
    difficulty = "beginner introduction" if day <= 2 else "intermediate" if day <= 5 else "advanced"
    mood_str = "stressed student - keep SHORT and SIMPLE" if is_stressed else "normal student - full lesson"

    # Get topic
    topic_raw = call_groq_text(
        f"What should a {difficulty} student learn in {subject} on Day {day}? Previously covered: {seen}. Give me ONLY the topic name, nothing else. 5 words max.",
        max_tokens=20
    )
    topic = topic_raw.strip().strip('"').strip("'") or f"{subject} Day {day} Basics"

    # Get introduction
    intro_raw = call_groq_text(
        f"Write a 2-sentence introduction for a lesson on '{topic}' in {subject}. Student mood: {mood_str}. Be direct and motivating.",
        max_tokens=100
    )

    # Get concept explanation
    if is_stressed:
        concept_raw = call_groq_text(
            f"Explain '{topic}' in {subject} in 2-3 simple sentences. Use a simple real-world analogy. Very easy to understand.",
            max_tokens=150
        )
    else:
        concept_raw = call_groq_text(
            f"Explain '{topic}' in {subject} in 4-5 sentences. Include: what it is, how it works, real-world analogy, why it matters.",
            max_tokens=250
        )

    # Get key points
    keypoints_raw = call_groq_text(
        f"List 3 key points about '{topic}' in {subject}. One per line. No numbering. Short phrases only.",
        max_tokens=80
    )
    keypoints = [p.strip().strip('-').strip('*').strip() for p in keypoints_raw.split('\n') if p.strip()][:3]
    if not keypoints:
        keypoints = [f"Understand {topic}", "Practice regularly", "Apply the concept"]

    if subject_type == "coding":
        # Get syntax example
        syntax_raw = call_groq_text(
            f"Show basic syntax/code example for '{topic}' in {subject}. Day {day} level. Include comments. 5-8 lines max.",
            max_tokens=200
        )

        # Get challenge - DIFFERENT for stressed vs normal
        if is_stressed:
            challenge_raw = call_groq_text(
                f"Give a VERY SIMPLE coding task for '{topic}' suitable for a stressed beginner. Just print something or assign variables. One line of code is enough. State the task clearly.",
                max_tokens=80
            )
            hint_raw = call_groq_text(
                f"Give a 1-sentence hint for this task: {challenge_raw}",
                max_tokens=50
            )
            solution_raw = call_groq_text(
                f"Write a simple 2-3 line solution for: {challenge_raw}",
                max_tokens=100
            )
        else:
            challenge_raw = call_groq_text(
                f"Give a specific Day {day} coding challenge for '{topic}' in {subject}. Include example: input and expected output. Clear and specific.",
                max_tokens=100
            )
            hint_raw = call_groq_text(
                f"Give 3 step-by-step hints for: {challenge_raw}",
                max_tokens=100
            )
            solution_raw = call_groq_text(
                f"Write a complete Python solution with comments for: {challenge_raw}",
                max_tokens=200
            )

        return {
            "topic": topic,
            "introduction": intro_raw,
            "concept": concept_raw,
            "syntax": syntax_raw,
            "keypoints": keypoints,
            "task_type": "code",
            "challenge": challenge_raw,
            "keywords": ["def", "print", "return"],
            "hint": hint_raw,
            "solution": solution_raw,
            "mood_adjusted": is_stressed
        }

    elif subject_type in ["aiml", "theory", "language"]:
        num_q = 2 if is_stressed else 3

        questions = []
        for i in range(num_q):
            q_raw = call_groq_text(
                f"Write quiz question {i+1} about '{topic}' in {subject}. Format: Q: [question] A: [correct answer] B: [wrong] C: [wrong] D: [wrong] Correct: A",
                max_tokens=100
            )
            lines = q_raw.strip().split('\n')
            q_text = ""
            options = []
            answer = "A. "
            explanation = ""
            for line in lines:
                if line.startswith("Q:"):
                    q_text = line[2:].strip()
                elif line.startswith("A:"):
                    options.append("A. " + line[2:].strip())
                    answer = "A. " + line[2:].strip()
                elif line.startswith("B:"):
                    options.append("B. " + line[2:].strip())
                elif line.startswith("C:"):
                    options.append("C. " + line[2:].strip())
                elif line.startswith("D:"):
                    options.append("D. " + line[2:].strip())
            if q_text and len(options) == 4:
                questions.append({"q": q_text, "options": options, "answer": answer, "explanation": f"The correct answer is {answer}"})

        if not questions:
            questions = [{"q": f"What is {topic}?", "options": [f"A. A concept in {subject}", "B. Unrelated concept", "C. Something else", "D. None of above"], "answer": f"A. A concept in {subject}", "explanation": f"{topic} is a key concept in {subject}"}]

        return {
            "topic": topic,
            "introduction": intro_raw,
            "concept": concept_raw,
            "keypoints": keypoints,
            "task_type": "quiz",
            "questions": questions,
            "mood_adjusted": is_stressed
        }

    else:  # math
        problems = []
        for i in range(2 if is_stressed else 3):
            p_raw = call_groq_text(
                f"Give a {'simple' if i==0 else 'medium'} practice problem for '{topic}' in {subject}. Format: Problem: [question] Solution: [step by step answer]",
                max_tokens=150
            )
            prob = ""
            sol = ""
            for line in p_raw.split('\n'):
                if line.startswith("Problem:"):
                    prob = line[8:].strip()
                elif line.startswith("Solution:"):
                    sol = line[9:].strip()
            if prob:
                problems.append({"q": prob, "answer": sol or "See worked example above"})

        if not problems:
            problems = [{"q": f"Solve a basic {topic} problem", "answer": "Apply the formula shown in the lesson"}]

        worked = call_groq_text(
            f"Show one complete worked example for '{topic}' in {subject}. Show every step.",
            max_tokens=200
        )

        return {
            "topic": topic,
            "introduction": intro_raw,
            "concept": concept_raw,
            "worked_example": worked,
            "keypoints": keypoints,
            "task_type": "problem",
            "problems": problems,
            "mood_adjusted": is_stressed
        }


def _fallback(subject, subject_type, day, is_stressed=False):
    if subject_type == "coding":
        return {
            "topic": f"Introduction to {subject}",
            "introduction": f"{subject} is a core computer science topic. Learning it will make you a better programmer.",
            "concept": f"{subject} helps organize and process data efficiently. Think of it like organizing files in folders — the better organized, the faster you find things.",
            "syntax": f"# Basic example\nprint('Learning {subject}')\nx = 10\nprint(x)",
            "keypoints": ["Understand first", "Then code", "Practice daily"],
            "task_type": "code",
            "challenge": "Write a program that prints 'Hello World' and your name on separate lines.",
            "keywords": ["print"],
            "hint": "Use print() twice — once for Hello World and once for your name.",
            "solution": "print('Hello World')\nprint('Your Name')",
            "mood_adjusted": is_stressed
        }
    return {
        "topic": f"{subject} Basics - Day {day}",
        "introduction": f"Today we start learning {subject}. This is an important subject with real-world applications.",
        "concept": f"{subject} covers many fascinating topics. Today we begin with the fundamentals that everything else builds on.",
        "keypoints": ["Read carefully", "Take notes", "Review after"],
        "task_type": "quiz",
        "questions": [{"q": f"Why is {subject} important?", "options": [f"A. It has real-world applications", "B. No reason", "C. Only for exams", "D. None"], "answer": f"A. It has real-world applications", "explanation": f"{subject} has many real-world uses."}],
        "mood_adjusted": is_stressed
    }
