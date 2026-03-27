import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { logMood } from '../services/api'
import './Mood.css'

const MOODS = [
  { score: 1, emoji: '🤯', label: 'Stressed' },
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
      <nav className="mood-nav">
        <div className="mood-nav-logo">⚡ Task<span>Nova</span></div>
        <div className="mood-nav-links">
          <Link to="/dashboard">Home</Link>
          <Link to="/mood">Mood</Link>
          <Link to="/profile">Profile</Link>
        </div>
      </nav>

      <div className="mood-content">
        {!result ? (
          <>
            <h1 className="mood-title">How are you feeling?</h1>
            <p className="mood-sub">Your study plan adjusts based on your mood</p>

            <div className="mood-grid">
              {MOODS.map(m => (
                <div
                  key={m.score}
                  className={`mood-card-btn${selected === m.score ? ' mood-card-btn--sel' : ''}`}
                  onClick={() => setSelected(m.score)}
                >
                  <span className="mood-card-emoji">{m.emoji}</span>
                  <span className="mood-card-label">{m.label}</span>
                </div>
              ))}
            </div>

            <textarea
              className="mood-textarea"
              placeholder="Optional note... (how's your day going?)"
              value={note}
              onChange={e => setNote(e.target.value)}
            />

            <button
              className="mood-submit-btn"
              onClick={submit}
              disabled={!selected || loading}
            >
              {loading ? 'Logging...' : 'Log Mood'}
            </button>
          </>
        ) : (
          <div className="mood-result">
            <div className="mood-result__emoji">
              {MOODS.find(m => m.score === selected)?.emoji}
            </div>
            <h2 className="mood-result__title">Mood logged!</h2>
            <p className="mood-result__msg">{result.message}</p>
            {result.stress_detected && (
              <div className="mood-stress-alert">
                ⚠️ Stress detected — today's lesson has been made lighter for you.
              </div>
            )}
            <button className="mood-submit-btn" style={{marginTop: '20px'}} onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
