import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { logMood } from '../services/api'
import './Mood.css'

const MOODS = [
  { score: 1, emoji: '😰', label: 'Stressed' },
  { score: 2, emoji: '😴', label: 'Tired' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '😊', label: 'Good' },
  { score: 5, emoji: '🔥', label: 'Great' },
]

export default function MoodCheck() {
  const navigate = useNavigate()
  const userId = parseInt(localStorage.getItem('user_id'))
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!selected) return
    setLoading(true)
    try {
      const res = await logMood({ user_id: userId, mood_score: selected, note })
      setResult(res.data)
    } catch {}
    setLoading(false)
  }

  return (
    <div className="mood-container">
      <nav className="navbar">
        <div className="nav-logo">⚡ TaskNova</div>
        <div className="nav-links">
          <Link to="/dashboard">Home</Link>
          <Link to="/planner">Planner</Link>
          <Link to="/mood">Mood</Link>
          <Link to="/profile">Profile</Link>
        </div>
      </nav>

      <div className="mood-content">
        {!result ? (
          <>
            <h1>How are you feeling?</h1>
            <p className="sub">Your study plan adjusts based on your mood</p>

            <div className="mood-grid">
              {MOODS.map(m => (
                <div
                  key={m.score}
                  className={`mood-btn ${selected === m.score ? 'selected' : ''}`}
                  onClick={() => setSelected(m.score)}
                >
                  <div className="mood-emoji">{m.emoji}</div>
                  <div className="mood-label">{m.label}</div>
                </div>
              ))}
            </div>

            <textarea
              placeholder="Optional note... (how's your day going?)"
              value={note}
              onChange={e => setNote(e.target.value)}
            />

            <button onClick={submit} disabled={!selected || loading}>
              {loading ? 'Logging...' : 'Log Mood'}
            </button>
          </>
        ) : (
          <div className="result-box">
            <div className="result-emoji">
              {MOODS.find(m => m.label.toLowerCase() === result.mood)?.emoji}
            </div>
            <h2>Mood logged: {result.mood}</h2>
            <p>{result.message}</p>
            {result.stress_detected && (
              <div className="stress-alert">
                ⚠️ Stress detected — today's plan has been made lighter for you.
              </div>
            )}
            <div className="result-actions">
              <button onClick={() => navigate('/dashboard')}>View Plan</button>
              <button className="secondary" onClick={() => navigate('/dashboard')}>Dashboard</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
