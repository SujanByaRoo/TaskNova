import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import './Dashboard.css'

const API = 'http://localhost:8000/api'
const TYPE_COLOR = {coding:'#4f46e5',aiml:'#0284c7',math:'#d97706',language:'#059669',theory:'#db2777'}
const TYPE_BG    = {coding:'#eef2ff',aiml:'#e0f2fe',math:'#fef3c7',language:'#d1fae5',theory:'#fce7f3'}
const TYPE_ICON  = {coding:'💻',aiml:'🤖',math:'📐',language:'🗣',theory:'🔬'}
const TYPE_LABEL = {coding:'Coding',aiml:'AI / ML',math:'Mathematics',language:'Language',theory:'Theory'}

function rottenClass(d){return d>=5?'rotten-4':d>=3?'rotten-3':d>=2?'rotten-2':d>=1?'rotten-1':''}
function rottenInfo(d){
  if(d>=5) return {e:'💀',t:'Dying!'}
  if(d>=3) return {e:'😰',t:`${d}d gone`}
  if(d>=2) return {e:'😟',t:'Rusty'}
  if(d>=1) return {e:'😐',t:'Idle'}
  return null
}

export default function Dashboard(){
  const navigate  = useNavigate()
  const location  = useLocation()
  const userId    = localStorage.getItem('user_id')
  const userName  = localStorage.getItem('user_name')
  const [streak,   setStreak]   = useState(null)
  const [subjects, setSubjects] = useState([])
  const [newSub,   setNewSub]   = useState('')
  const [addErr,   setAddErr]   = useState('')
  const [adding,   setAdding]   = useState(false)
  const [xpW,      setXpW]      = useState(0)
  const [leaderboard, setLeaderboard] = useState([])

  useEffect(()=>{ if(!userId){navigate('/login');return} load() },[])
  useEffect(()=>{ if(streak) setTimeout(()=>setXpW((streak.xp_in_level/500)*100),300) },[streak])

  const load = async()=>{
    try{
      const [s,sub] = await Promise.all([
        axios.get(`${API}/streak/${userId}`),
        axios.get(`${API}/plan/${userId}/subjects`)
      ])
      setStreak(s.data); setSubjects(sub.data.subjects)
      try{ const lb = await axios.get(`${API}/streak/leaderboard/global`); setLeaderboard(lb.data.leaderboard || []) }catch{}
    }catch{}
  }

  const addSubject = async e=>{
    e.preventDefault(); if(!newSub.trim()) return
    setAdding(true); setAddErr('')
    try{
      await axios.post(`${API}/plan/subject/add`,{user_id:parseInt(userId),subject_name:newSub.trim()})
      setNewSub(''); await load()
    }catch(err){setAddErr(err.response?.data?.detail||'Failed to add')}
    setAdding(false)
  }

  const del = async(e,id)=>{
    e.stopPropagation()
    if(!window.confirm('Remove this subject?')) return
    try{await axios.delete(`${API}/plan/subject/${id}`);await load()}catch{}
  }

  const go = path => {
    document.body.style.opacity='0'
    document.body.style.transition='opacity .22s ease'
    setTimeout(()=>{
      document.body.style.opacity=''
      document.body.style.transition=''
      navigate(path)
    },220)
  }

  const logout=()=>{localStorage.clear();navigate('/login')}

  return(
    <div className="dash-container">
      <div className="app-layout">

        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">⚡</div>
            <div className="logo-text">Task<span>Nova</span></div>
          </div>
          <nav className="sidebar-nav">
            {[
              {path:'/dashboard', icon:'🏠', label:'Home'},
              {path:'/mood',      icon:'😊', label:'Mood'},
              {path:'/profile',   icon:'👤', label:'Profile'},
            ].map(({path,icon,label})=>(
              <button
                key={path}
                className={`nav-item${location.pathname===path?' active':''}`}
                onClick={()=>go(path)}
              >
                <span className="ni">{icon}</span>
                {label}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button className="logout-btn" onClick={logout}>
              <span className="ni">🚪</span> Logout
            </button>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="main-content">
          <div className="topbar">
            <h1>Hey, {userName} 👋</h1>
            <p>Keep the streak alive — every lesson counts.</p>
          </div>

          <div className="dash-content">

            {streak&&(
              <>
                <div className="stats-row">
                  {[
                    {icon:'🔥',val:streak.current_streak,lbl:'Streak'},
                    {icon:'⚡',val:streak.total_xp,lbl:'Total XP'},
                    {icon:'🏆',val:`Lv ${streak.level}`,lbl:'Level'},
                    {icon:'🎯',val:streak.longest_streak,lbl:'Best Streak'},
                  ].map((s,i)=>(
                    <div className="stat-card" key={i} style={{animationDelay:`${i*.07}s`,animation:'up .5s ease both'}}>
                      <span className="stat-icon">{s.icon}</span>
                      <div className="stat-val">{s.val}</div>
                      <div className="stat-lbl">{s.lbl}</div>
                    </div>
                  ))}
                </div>

                <div className="xp-section">
                  <div className="xp-top">
                    <span className="xp-level">🎮 Level {streak.level} — {streak.badges?.length>0?streak.badges[0]:''}</span>
                    <span className="xp-num">{streak.xp_in_level} / 500 XP · {500-streak.xp_in_level} to next level</span>
                  </div>
                  <div className="xp-track">
                    <div className="xp-fill" style={{width:`${xpW}%`}}></div>
                  </div>
                </div>
              </>
            )}

            <div className="add-box">
              <h3>Add a Subject</h3>
              <form onSubmit={addSubject}>
                <input
                  placeholder="DSA, Python, Maths, AIML, English, Biology..."
                  value={newSub}
                  onChange={e=>setNewSub(e.target.value)}
                />
                <button type="submit" disabled={adding}>{adding?'Adding...':'+ Add'}</button>
              </form>
              {addErr&&<div className="add-err">⚠ {addErr}</div>}
            </div>

            {subjects.length>0&&(
              <>
                <div className="subjects-label">{subjects.length} Subject{subjects.length!==1?'s':''} · keep learning</div>
                <div className="subjects-grid">
                  {subjects.map(sub=>{
                    const color=TYPE_COLOR[sub.subject_type]
                    const bg=TYPE_BG[sub.subject_type]
                    const xp=Math.min((sub.total_xp%300)/300*100,100)
                    const rc=rottenClass(sub.days_inactive)
                    const ri=rottenInfo(sub.days_inactive)
                    return(
                      <div
                        key={sub.id}
                        className={`sub-card ${rc}`}
                        style={{'--cc':color}}
                        onClick={()=>go(`/subject/${sub.id}`)}
                      >
                        {ri&&(
                          <div className="rotten-pill">
                            <span className="rotten-e">{ri.e}</span>
                            <span className="rotten-t">{ri.t}</span>
                          </div>
                        )}

                        <div className="sub-icon" style={{background:bg,color}}>{TYPE_ICON[sub.subject_type]}</div>

                        <div className="sub-body">
                          <div className="sub-name">{sub.name}</div>
                          <div className="sub-meta" style={{color}}>{TYPE_LABEL[sub.subject_type]} · Day {sub.current_day}</div>
                          <div className="sub-bar-bg">
                            <div className="sub-bar" style={{width:`${xp}%`,background:`linear-gradient(90deg,${color},${color}99)`}}></div>
                          </div>
                          <div className="sub-stats">
                            <span style={{color}}>🔥 {sub.current_streak}</span>
                            <span style={{color:'#9ca3af'}}>⚡ {sub.total_xp} XP</span>
                            <span style={{color:'#9ca3af'}}>📚 {sub.total_lessons_done}</span>
                          </div>
                        </div>

                        <div className="sub-right">
                          {sub.lesson_completed
                            ?<div className="sub-pill pill-done">✅ Done</div>
                            :sub.lesson_generated
                              ?<div className="sub-pill" style={{color,borderColor:color+'55',background:bg}}>▶ Continue</div>
                              :<div className="sub-pill" style={{background:color,color:'#fff',border:'none'}}>▶ Start</div>
                          }
                          <button className="del-btn" onClick={e=>del(e,sub.id)}>🗑</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {subjects.length===0&&(
              <div className="empty">
                <span className="empty-icon">📚</span>
                <p>No subjects yet. Add one above to begin!</p>
              </div>
            )}

            {leaderboard.length>0&&(
              <div className="lb-section">
                <div className="lb-header">
                  <div className="lb-title">🏆 Global Leaderboard</div>
                  <div className="lb-sub">Top learners this week</div>
                </div>
                <div className="lb-list">
                  {leaderboard.slice(0,10).map((entry,i)=>{
                    const isMe = entry.user_id===parseInt(userId)
                    const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':null
                    return(
                      <div key={i} className={`lb-row${isMe?' lb-me':''}`} style={isMe?{'--lbc':'#4f46e5'}:{}}>
                        <div className="lb-rank">{medal||`#${i+1}`}</div>
                        <div className="lb-name">
                          {entry.username}
                          {isMe&&<span className="lb-you-tag">you</span>}
                        </div>
                        <div className="lb-right">
                          <span className="lb-streak">🔥 {entry.current_streak}</span>
                          <span className="lb-xp">⚡ {entry.total_xp} XP</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}
