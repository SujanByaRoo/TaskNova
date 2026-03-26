import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import './Planner.css'

const API = 'http://localhost:8000/api'

export default function Planner() {
  const navigate = useNavigate()
  const userId = parseInt(localStorage.getItem('user_id'))
  const [plan, setPlan] = useState(null)
  const [subjectStreaks, setSubjectStreaks] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [subjects, setSubjects] = useState('')
  const [examDate, setExamDate] = useState('')
  const [error, setError] = useState('')
  const [activeSub, setActiveSub] = useState(null)
  const [activeLesson, setActiveLesson] = useState(null)
  const [answers, setAnswers] = useState({})
  const [codeAnswer, setCodeAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)

  useEffect(() => {
    if (!userId) { navigate('/login'); return }
    fetchPlan()
    fetchSubjectStreaks()
  }, [])

  const fetchPlan = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/plan/${userId}/active`)
      setPlan(res.data)
      setActiveSub(Object.keys(res.data.subjects)[0])
      setActiveLesson(null)
    } catch { setPlan(null) }
    setLoading(false)
  }

  const fetchSubjectStreaks = async () => {
    try {
      const res = await axios.get(`${API}/plan/${userId}/subject-streaks`)
      setSubjectStreaks(res.data.streaks)
    } catch {}
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!subjects.trim()) { setError('Enter at least one subject'); return }
    setGenerating(true)
    setError('')
    try {
      const subList = subjects.split(',').map(s => s.trim()).filter(Boolean)
      await axios.post(`${API}/plan/generate`, { user_id: userId, subjects: subList, exam_date: examDate || null })
      await fetchPlan()
      await fetchSubjectStreaks()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate. Make sure Ollama is running.')
    }
    setGenerating(false)
  }

  const openLesson = (task) => {
    if (!task.is_unlocked) return
    setActiveLesson(task)
    setAnswers({})
    setCodeAnswer('')
    setSubmitted(false)
    setScore(null)
  }

  const handleAnswer = (qIndex, option) => {
    if (submitted) return
    setAnswers({ ...answers, [qIndex]: option })
  }

  const submitQuiz = () => {
    const questions = activeLesson.task_data?.questions || []
    let correct = 0
    questions.forEach((q, i) => { if (answers[i] === q.answer) correct++ })
    setScore({ correct, total: questions.length })
    setSubmitted(true)
  }

  const markComplete = async () => {
    try {
      await axios.post(`${API}/plan/task/${activeLesson.id}/complete`, { user_id: userId })
      await axios.post(`${API}/streak/${userId}/update?xp_to_add=30`)
      await fetchPlan()
      await fetchSubjectStreaks()
      setActiveLesson(null)
      setSubmitted(false)
      setScore(null)
    } catch (err) {
      alert(err.response?.data?.detail || 'Error')
    }
  }

  const currentTasks = plan && activeSub ? plan.subjects[activeSub] : null

  return (
    <div className="planner-container">
      <nav className="navbar">
        <div className="nav-logo">⚡ TaskNova</div>
        <div className="nav-links">
          <Link to="/dashboard">Home</Link>
          <Link to="/planner">Planner</Link>
          <Link to="/mood">Mood</Link>
          <Link to="/profile">Profile</Link>
        </div>
      </nav>

      <div className="planner-content">
        <div className="generate-box">
          <h3>Generate New Plan</h3>
          <form onSubmit={handleGenerate}>
            <input placeholder="Subjects (e.g. DSA, AIML, Maths, English)" value={subjects} onChange={e => setSubjects(e.target.value)} />
            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} />
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" disabled={generating}>{generating ? '⏳ Generating lessons...' : '🚀 Generate Plan'}</button>
          </form>
        </div>

        {loading && <div className="loading">Loading your plan...</div>}

        {subjectStreaks.length > 0 && (
          <div className="streak-row">
            {subjectStreaks.map(s => (
              <div key={s.subject} className="streak-chip">
                <span className="streak-sub">{s.subject.toUpperCase()}</span>
                <span className="streak-fire">🔥 {s.current_streak} day streak</span>
                <span className="streak-days">{s.total_days} completed</span>
              </div>
            ))}
          </div>
        )}

        {plan && !activeLesson && (
          <div className="plan-box">
            <div className="sub-tabs">
              {Object.keys(plan.subjects).map(sub => (
                <button key={sub} className={`sub-tab ${activeSub === sub ? 'active' : ''}`} onClick={() => setActiveSub(sub)}>{sub}</button>
              ))}
            </div>

            {currentTasks && (
              <div className="day-grid">
                {Object.entries(currentTasks).map(([day, task]) => (
                  <div key={day} className={`day-card ${task.is_completed ? 'done' : ''} ${!task.is_unlocked ? 'locked' : ''}`} onClick={() => openLesson(task)}>
                    <div className="day-num">Day {day}</div>
                    <div className="day-topic">{task.topic}</div>
                    <div className="day-status">{task.is_completed ? '✅' : task.is_unlocked ? '▶ Start' : '🔒'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeLesson && (
          <div className="lesson-box">
            <button className="back-btn" onClick={() => { setActiveLesson(null); setSubmitted(false); setScore(null) }}>← Back to Plan</button>

            <div className="lesson-header">
              <div className="lesson-subject-tag">{activeSub}</div>
              <h2>{activeLesson.topic}</h2>
            </div>

            <div className="lesson-content">
              <h3>📖 Today's Lesson</h3>
              <p>{activeLesson.lesson}</p>
            </div>

            {activeLesson.task_type === 'quiz' && (
              <div className="task-section">
                <h3>🧠 Quiz Time</h3>
                {(activeLesson.task_data?.questions || []).map((q, i) => (
                  <div key={i} className="question">
                    <p className="q-text">{i + 1}. {q.q}</p>
                    <div className="options">
                      {q.options.map(opt => {
                        let cls = 'option'
                        if (submitted) {
                          if (opt === q.answer) cls += ' correct'
                          else if (answers[i] === opt && opt !== q.answer) cls += ' wrong'
                        } else if (answers[i] === opt) cls += ' selected'
                        return <div key={opt} className={cls} onClick={() => handleAnswer(i, opt)}>{opt}</div>
                      })}
                    </div>
                  </div>
                ))}
                {!submitted && (
                  <button className="submit-btn" onClick={submitQuiz} disabled={Object.keys(answers).length < (activeLesson.task_data?.questions?.length || 0)}>
                    Submit Quiz
                  </button>
                )}
              </div>
            )}

            {activeLesson.task_type === 'code' && (
              <div className="task-section">
                <h3>💻 Coding Challenge</h3>
                <div className="challenge-box">
                  <p>{activeLesson.task_data?.challenge}</p>
                  <div className="hint-box">💡 Hint: {activeLesson.task_data?.hint}</div>
                </div>
                <textarea className="code-editor" placeholder="Write your code here..." value={codeAnswer} onChange={e => setCodeAnswer(e.target.value)} disabled={submitted} />
                {submitted && activeLesson.task_data?.example_solution && (
                  <div className="example-solution">
                    <strong>Example Solution:</strong>
                    <pre>{activeLesson.task_data.example_solution}</pre>
                  </div>
                )}
                {!submitted && <button className="submit-btn" onClick={() => { setSubmitted(true); setScore({ correct: 1, total: 1 }) }} disabled={!codeAnswer.trim()}>Submit Code</button>}
              </div>
            )}

            {activeLesson.task_type === 'problem' && (
              <div className="task-section">
                <h3>🔢 Practice Problems</h3>
                {(activeLesson.task_data?.problems || []).map((p, i) => (
                  <div key={i} className="question">
                    <p className="q-text">{i + 1}. {p.q}</p>
                    {submitted && <div className="answer-reveal">✅ Answer: {p.answer}</div>}
                  </div>
                ))}
                {!submitted && <button className="submit-btn" onClick={() => { setSubmitted(true); setScore({ correct: 1, total: 1 }) }}>Show Answers</button>}
              </div>
            )}

            {submitted && (
              <div className="result-section">
                {score && activeLesson.task_type === 'quiz' && (
                  <div className={`score ${score.correct === score.total ? 'perfect' : score.correct >= score.total / 2 ? 'good' : 'retry'}`}>
                    {score.correct === score.total ? '🎉 Perfect score!' : score.correct >= score.total / 2 ? `👍 ${score.correct}/${score.total} — Good job!` : `📚 ${score.correct}/${score.total} — Review the lesson and try again`}
                  </div>
                )}
                {!activeLesson.is_completed && (
                  <button className="complete-btn" onClick={markComplete}>✅ Mark Complete & Earn 30 XP</button>
                )}
                {activeLesson.is_completed && <div className="already-done">✅ Already completed</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
