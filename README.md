🚀 TaskNova – AI Powered Smart Study Planner
TaskNova is an AI-driven productivity platform designed to help students manage their study workflow intelligently.
It combines task planning, mood tracking, streak monitoring, and AI assistance to create a structured and adaptive learning environment.
Instead of manually planning study sessions, TaskNova analyzes inputs and generates optimized study plans while keeping users motivated through progress tracking.
🎯 Project Vision:
Many students struggle with:

• Disorganized study schedules
• Lack of consistency
• Burnout and poor motivation
• No visibility into progress
At the same time, many disabled learners lack accessible study tools.
TaskNova solves this by combining AI planning with accessibility-focused design.
The platform helps users:

✅ Plan studies intelligently
✅ Track learning consistency
✅ Monitor emotional state during learning
✅ Access inclusive UI tools for disabled users
✨ Key Features
🤖 AI Study Planner

Generate optimized study plans using AI based on subjects and priorities.
📊 Study Streak Tracking
Motivates users by tracking learning consistency.
😊 Mood Check System

Users can log mood during study sessions to detect productivity patterns.

❓ Ask a Doubt

Built-in AI assistant for resolving academic doubts quickly.
♿ Accessibility Toolbar
Designed for disabled users with tools like:

• font scaling
• contrast adjustment
• easier navigation
• accessible layout design

🔐 Secure Authentication
User login and signup system to manage personal progress data.
🏗 System Architecture
           +----------------------+
           |      Frontend        |
           |  React + Vite UI    |
           +----------+----------+
                      |
                      | REST API
                      |
           +----------v----------+
           |       Backend       |
           |      FastAPI        |
           +----------+----------+
                      |
                      |
           +----------v----------+
           |      PostgreSQL     |
           |       Database      |
           +----------+----------+
                      |
                      |
           +----------v----------+
           |      Groq AI API    |
           |  Study Plan Engine  |
           +---------------------+
🛠 Tech Stack
Frontend

⚛️ React
⚡ Vite
🎨 CSS
🔗 Axios

Backend

🐍 Python
⚡ FastAPI
🔗 REST APIs

Database

🐘 PostgreSQL
AI Integration
🧠 Groq API

Development Tools

🧰 Git
💻 VS Code
🌐 GitHub

📂 Project Structure
TaskNova
│
├── backend
│   ├── models
│   ├── routes
│   ├── database
│   ├── ai
│   └── main.py
│
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── pages
│   │   ├── services
│   │   └── assets
│   │
│   └── index.html
│
└── README.md

⚙️ Installation Guide
1️⃣ Clone Repository
git clone https://github.com/yourusername/tasknova.git
cd tasknova

Backend Setup
cd backend
pip install -r requirements.txt

Create .env

GROQ_API_KEY=your_api_key
DATABASE_URL=your_database_url

Run backend server:
uvicorn main:app --reload
Frontend Setup
cd frontend
npm install
npm run dev

Frontend runs at:
http://localhost:5173

🌍 Accessibility Focus
TaskNova is designed not only for students but also for people with disabilities.
Accessibility considerations include:
• readable UI design
• adjustable font sizes
• better contrast modes
• simple navigation patterns
• inclusive interaction design

The goal is to ensure learning tools remain usable by everyone.


👨‍💻 Author

Team Intelliforge.

⭐ Support

If you find this project useful, please give it a star ⭐ on GitHub.

It helps the project reach more learners and developers.
