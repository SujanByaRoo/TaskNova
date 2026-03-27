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
      <nav className="profile-nav">
        <div className="profile-nav-logo"><span>⚡</span> Task<b>Nova</b></div>
        <div className="profile-nav-links">
          <Link to="/dashboard">Home</Link>
          <Link to="/mood">Mood</Link>
          <Link to="/profile" className="active">Profile</Link>
        </div>
      </nav>

      <div className="profile-content">

        {/* ── USER CARD ── */}
        {user && (
          <div className="profile-header">
            <div className="profile-avatar">{user.name?.[0]?.toUpperCase()}</div>
            <div className="profile-info">
              <div className="profile-name">{user.name}</div>
              <div className="profile-email">{user.email}</div>
              <div className="profile-meta">{user.daily_study_hours}h/day · {user.study_style} style</div>
            </div>
          </div>
        )}

        {/* ── STATS ── */}
        {streak && (
          <div className="profile-card">
            <h3>Stats</h3>
            <div className="pf-stats-grid">
              <div className="pf-stat">
                <div className="pf-stat-val">{streak.current_streak}</div>
                <div className="pf-stat-lbl">🔥 Current Streak</div>
              </div>
              <div className="pf-stat">
                <div className="pf-stat-val">{streak.longest_streak}</div>
                <div className="pf-stat-lbl">🏆 Best Streak</div>
              </div>
              <div className="pf-stat">
                <div className="pf-stat-val">⚡ {streak.total_xp}</div>
                <div className="pf-stat-lbl">Total XP</div>
              </div>
              <div className="pf-stat">
                <div className="pf-stat-val">Lv {streak.level}</div>
                <div className="pf-stat-lbl">Level</div>
              </div>
            </div>
            <div className="pf-xp-section">
              <div className="pf-xp-row">
                <span className="pf-xp-lbl">XP Progress</span>
                <span className="pf-xp-num">{streak.xp_in_level} / 500</span>
              </div>
              <div className="pf-xp-track">
                <div className="pf-xp-fill" style={{ width: `${(streak.xp_in_level / 500) * 100}%` }}></div>
              </div>
            </div>
            {streak.badges?.length > 0 && (
              <div className="pf-badges">
                {streak.badges.map(b => <span key={b} className="pf-badge">{b}</span>)}
              </div>
            )}
          </div>
        )}

        {/* ── STUDY SUMMARY ── */}
        {summary && (
          <div className="profile-card">
            <h3>Study Summary</h3>
            <div className="pf-stats-grid two">
              <div className="pf-stat">
                <div className="pf-stat-val">{summary.total_sessions}</div>
                <div className="pf-stat-lbl">📚 Sessions</div>
              </div>
              <div className="pf-stat">
                <div className="pf-stat-val">{Math.round(summary.total_study_minutes / 60)}h</div>
                <div className="pf-stat-lbl">⏱ Total Study</div>
              </div>
            </div>
          </div>
        )}

        {/* ── MOOD HISTORY ── */}
        {moodHistory.length > 0 && (
          <div className="profile-card">
            <h3>Mood History</h3>
            <div className="pf-mood-list">
              {moodHistory.map((m, i) => (
                <div key={i} className="pf-mood-row">
                  <span className="pf-mood-emoji">{moodEmoji[m.mood] || '😐'}</span>
                  <span className="pf-mood-name">{m.mood}</span>
                  <span className="pf-mood-date">{m.date}</span>
                  {m.stress_detected && <span className="pf-stress-tag">stressed</span>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
