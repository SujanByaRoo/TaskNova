import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getUser, getStreak, getMoodHistory, getSessionSummary } from '../services/api'
import './Profile.css'

export default function Profile() {
  const navigate = useNavigate()
  const userId = localStorage.getItem('user_id')
  const [user, setUser] = useState(null)
  const [streak, setStreak] = useState(null)
  const [moodHistory, setMoodHistory] = useState([])
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (!userId) { navigate('/login'); return }
    getUser(userId).then(r => setUser(r.data)).catch(() => {})
    getStreak(userId).then(r => setStreak(r.data)).catch(() => {})
    getMoodHistory(userId).then(r => setMoodHistory(r.data.history || [])).catch(() => {})
    getSessionSummary(userId).then(r => setSummary(r.data)).catch(() => {})
  }, [])

  const moodEmoji = { stressed: '😰', tired: '😴', okay: '😐', good: '😊', great: '🔥' }

  return (
    <div className="profile-container">
      <nav className="navbar">
        <div className="nav-logo">⚡ TaskNova</div>
        <div className="nav-links">
          <Link to="/dashboard">Home</Link>
          <Link to="/planner">Planner</Link>
          <Link to="/mood">Mood</Link>
          <Link to="/profile">Profile</Link>
        </div>
      </nav>

      <div className="profile-content">
        <h1>Profile</h1>

        {user && (
          <div className="section">
            <div className="profile-header">
              <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
              <div>
                <h2>{user.name}</h2>
                <p>{user.email}</p>
                <p>{user.daily_study_hours}h/day · {user.study_style} style</p>
              </div>
            </div>
          </div>
        )}

        {streak && (
          <div className="section">
            <h3>Stats</h3>
            <div className="stats-grid">
              <div className="stat"><div className="stat-val">{streak.current_streak}</div><div className="stat-lbl">Current Streak</div></div>
              <div className="stat"><div className="stat-val">{streak.longest_streak}</div><div className="stat-lbl">Best Streak</div></div>
              <div className="stat"><div className="stat-val">{streak.total_xp}</div><div className="stat-lbl">Total XP</div></div>
              <div className="stat"><div className="stat-val">Lv {streak.level}</div><div className="stat-lbl">Level</div></div>
            </div>
            <div className="xp-bar-wrap">
              <div className="xp-bar-track">
                <div className="xp-bar-fill" style={{ width: `${(streak.xp_in_level / 500) * 100}%` }}></div>
              </div>
              <span>{streak.xp_in_level} / 500 XP to next level</span>
            </div>
            {streak.badges?.length > 0 && (
              <div className="badges">
                {streak.badges.map(b => <span key={b} className="badge">{b}</span>)}
              </div>
            )}
          </div>
        )}

        {summary && (
          <div className="section">
            <h3>Study Summary</h3>
            <div className="stats-grid">
              <div className="stat"><div className="stat-val">{summary.total_sessions}</div><div className="stat-lbl">Sessions</div></div>
              <div className="stat"><div className="stat-val">{Math.round(summary.total_study_minutes / 60)}h</div><div className="stat-lbl">Total Study</div></div>
            </div>
          </div>
        )}

        {moodHistory.length > 0 && (
          <div className="section">
            <h3>Mood History</h3>
            <div className="mood-history">
              {moodHistory.map((m, i) => (
                <div key={i} className="mood-row">
                  <span className="mh-emoji">{moodEmoji[m.mood]}</span>
                  <span className="mh-mood">{m.mood}</span>
                  <span className="mh-date">{m.date}</span>
                  {m.stress_detected && <span className="stress-dot">stressed</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
