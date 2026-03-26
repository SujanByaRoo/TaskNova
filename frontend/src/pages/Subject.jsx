import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import axios from 'axios'
import './Subject.css'

const API = 'http://localhost:8000/api'

export default function SubjectPage() {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const userId = parseInt(localStorage.getItem('user_id'))

  const [subject, setSubject] = useState(null)
  const [lesson, setLesson] = useState(null)
  const [history, setHistory] = useState([])
  const [weekly, setWeekly] = useState([])
  const [generating, setGenerating] = useState(false)
  const [answers, setAnswers] = useState({})
  const [codeAnswer, setCodeAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState('')
  const [lessonDone, setLessonDone] = useState(false)
  const [view, setView] = useState('home')
  const [isExtra, setIsExtra] = useState(false)
  const [extraNum, setExtraNum] = useState(0)

  useEffect(() => {
    if (!userId) { navigate('/login'); return }
    fetchSubject()
    fetchHistory()
    fetchWeekly()
  }, [subjectId])

  const fetchSubject = async () => {
    try {
      const res = await axios.get(`${API}/plan/${userId}/subjects`)
      const found = res.data.subjects.find(s => s.id === parseInt(subjectId))
      if (!found) { navigate('/dashboard'); return }
      setSubject(found)
    } catch { navigate('/dashboard') }
  }

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/plan/subject/${subjectId}/history`)
      setHistory(res.data.lessons)
    } catch {}
  }

  const fetchWeekly = async () => {
    try {
      const res = await axios.get(`${API}/plan/${userId}/weekly?subject_id=${subjectId}`)
      setWeekly(res.data.week)
    } catch {}
  }

  const resetLesson = async () => {
    try {
      await axios.delete(`${API}/plan/subject/${subjectId}/reset-lesson`)
      setLesson(null)
      setIsExtra(false)
      setExtraNum(0)
      setView('home')
      setSubmitted(false)
      setScore(null)
      setLessonDone(false)
    } catch {}
  }

  const generateLesson = async () => {
    setGenerating(true)
    setCompleteError('')
    try {
      const res = await axios.post(`${API}/plan/subject/${subjectId}/generate-lesson?user_id=${userId}`)
      setLesson(res.data)
      setIsExtra(false)
      setExtraNum(0)
      setView('lesson')
      setAnswers({})
      setCodeAnswer('')
      setSubmitted(false)
      setScore(null)
      setLessonDone(false)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate.')
    }
    setGenerating(false)
  }

  const generateExtraLesson = async () => {
    setGenerating(true)
    setCompleteError('')
    try {
      const res = await axios.post(`${API}/plan/subject/${subjectId}/extra-lesson?user_id=${userId}`)
      setLesson(res.data)
      setIsExtra(true)
      setExtraNum(res.data.extra_number || extraNum + 1)
      setView('lesson')
      setAnswers({})
      setCodeAnswer('')
      setSubmitted(false)
      setScore(null)
      setLessonDone(false)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to generate extra lesson.')
    }
    setGenerating(false)
  }

  const handleAnswer = (qi, opt) => {
    if (submitted) return
    setAnswers({ ...answers, [qi]: opt })
  }

  const submitQuiz = () => {
    const qs = lesson.task_data?.questions || []
    let correct = 0
    qs.forEach((q, i) => { if (answers[i] === q.answer) correct++ })
    setScore({ correct, total: qs.length })
    setSubmitted(true)
  }

  const markComplete = async () => {
    setCompleting(true)
    setCompleteError('')
    try {
      await axios.post(`${API}/plan/lesson/${lesson.lesson_id}/complete`, {
        user_id: userId,
        code_answer: codeAnswer || null
      })
      await fetchSubject()
      await fetchHistory()
      await fetchWeekly()
      setLessonDone(true)
    } catch (err) {
      setCompleteError(err.response?.data?.detail || 'Error completing lesson')
    }
    setCompleting(false)
  }

  const TYPE_COLOR = { coding: '#7c6ff7', aiml: '#00bcd4', math: '#ff9800', language: '#4caf50', theory: '#f06292' }
  const color = subject ? TYPE_COLOR[subject.subject_type] : '#7c6ff7'
  const maxLessons = Math.max(...weekly.map(w => w.lessons_done), 1)
  const td = lesson?.task_data || {}
  const questions = td.questions || []
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length
  const passingScore = score && score.correct / score.total >= 0.6
  const canComplete = lesson && !lesson.is_completed && submitted && (
    lesson.task_type === 'quiz' ? passingScore :
    lesson.task_type === 'code' ? codeAnswer.trim().length >= 10 :
    true
  )
  const rottenLevel = !subject ? 0 : subject.days_inactive >= 5 ? 3 : subject.days_inactive >= 3 ? 2 : subject.days_inactive >= 2 ? 1 : 0

  if (!subject) return <div className="loading-screen">Loading...</div>

  return (
    <div className="subject-container">
      <nav className="navbar">
        <div className="nav-logo">⚡ TaskNova</div>
        <div className="nav-links">
          <Link to="/dashboard">← Home</Link>
          <Link to="/mood">Mood</Link>
          <Link to="/profile">Profile</Link>
        </div>
      </nav>

      <div className="subject-content">

        {rottenLevel >= 2 && (
          <div className={`rotten-banner rotten-${rottenLevel}`}>
            {rottenLevel === 3 ? '💀 Dying! You have not studied in 5+ days!' : '😟 Getting rusty. Come back before you forget!'}
          </div>
        )}

        <div className="subject-header" style={{ borderColor: color + '55' }}>
          <div className="subject-title-row">
            <div>
              <div className="subject-title" style={{ color }}>{subject.name}</div>
              <div className="subject-type-tag">{subject.subject_type}</div>
            </div>
            {rottenLevel > 0 && (
              <div className={`rotten-badge rotten-badge-${rottenLevel}`}>
                {rottenLevel === 1 ? '😐 1 day idle' : rottenLevel === 2 ? '😟 3 days idle' : '💀 5+ days idle'}
              </div>
            )}
          </div>
          <div className="subject-stats">
            <div className="s-stat"><div className="s-val" style={{color}}>🔥 {subject.current_streak}</div><div className="s-lbl">Streak</div></div>
            <div className="s-stat"><div className="s-val" style={{color}}>{subject.total_xp}</div><div className="s-lbl">XP</div></div>
            <div className="s-stat"><div className="s-val" style={{color}}>{subject.total_lessons_done}</div><div className="s-lbl">Done</div></div>
            <div className="s-stat"><div className="s-val" style={{color}}>Day {subject.current_day}</div><div className="s-lbl">Current</div></div>
          </div>
          <div className="sub-xp-bar"><div className="sub-xp-fill" style={{width:`${Math.min((subject.total_xp%300)/300*100,100)}%`,background:color}}></div></div>
          <div className="sub-xp-label">{subject.total_xp%300} / 300 XP to next badge</div>
        </div>

        {weekly.length > 0 && (
          <div className="weekly-card">
            <div className="weekly-title">📊 This Week</div>
            <div className="weekly-bars">
              {weekly.map((w,i) => {
                const pct = (w.lessons_done/maxLessons)*100
                const prev = i>0 ? (weekly[i-1].lessons_done/maxLessons)*100 : pct
                const diff = pct - prev
                return (
                  <div key={i} className={`week-col ${w.is_today?'today':''}`}>
                    <div className="week-bar-wrap">
                      {w.is_today && i>0 && <div className={`diff-tag ${diff>=0?'up':'down'}`}>{diff>=0?`+${Math.round(diff)}%`:`${Math.round(diff)}%`}</div>}
                      <div className="week-bar-track"><div className="week-bar-fill" style={{height:`${Math.max(pct,4)}%`,background:w.is_today?color:'#2a2a4a'}}></div></div>
                    </div>
                    <div className="week-label">{w.day_name}</div>
                    <div className="week-count">{w.lessons_done}</div>
                  </div>
                )
              })}
            </div>
            {weekly.length>1 && (() => {
              const t=weekly[weekly.length-1], y=weekly[weekly.length-2]
              const d=t.lessons_done-y.lessons_done
              if(t.lessons_done===0&&y.lessons_done===0) return null
              if(d<0) return <div className="behind-msg">⚠️ {Math.abs(d)} lesson{Math.abs(d)>1?'s':''} behind yesterday. Catch up!</div>
              if(d>0) return <div className="ahead-msg">🔥 {d} lesson{d>1?'s':''} ahead of yesterday!</div>
              return <div className="same-msg">📊 Same as yesterday. Push harder!</div>
            })()}
          </div>
        )}

        <div className="tab-row">
          <button className={`tab-btn ${view==='home'?'active':''}`} style={view==='home'?{borderColor:color,color}:{}} onClick={()=>setView('home')}>Today</button>
          {lesson && <button className={`tab-btn ${view==='lesson'?'active':''}`} style={view==='lesson'?{borderColor:color,color}:{}} onClick={()=>setView('lesson')}>{isExtra ? `Extra ${extraNum}` : 'Lesson'}</button>}
          <button className={`tab-btn ${view==='history'?'active':''}`} style={view==='history'?{borderColor:color,color}:{}} onClick={()=>setView('history')}>History</button>
        </div>

        {view==='home' && (
          <div className="home-view">
            {subject.lesson_completed ? (
              <div className="done-today">
                <div className="done-icon">✅</div>
                <h3>Day {subject.current_day} Complete!</h3>
                <p style={{color:'#888',marginBottom:'8px'}}>Come back tomorrow for Day {subject.current_day + 1}</p>
                <div className="streak-celebration" style={{color,marginBottom:'20px'}}>🔥 {subject.current_streak} day streak!</div>
                <button className="generate-btn" style={{background:color}} onClick={generateExtraLesson} disabled={generating}>
                  {generating ? '⏳ Generating...' : '⚡ Next Extra Lesson'}
                </button>
                <p style={{color:'#666',fontSize:'12px',marginTop:'8px'}}>Extra lessons go deeper into today's topic</p>
              </div>
            ) : (
              <div className="generate-section">
                <div className="day-badge" style={{background:color+'22',color}}>Day {subject.current_day}</div>
                <h2>Ready to learn?</h2>
                <p className="gen-sub">Log your mood first for a personalized lesson</p>
                <Link to="/mood" className="mood-link" style={{color,borderColor:color+'55'}}>😊 Log Today's Mood</Link>
                {lesson ? (
                  <div style={{display:'flex',gap:'10px',flexDirection:'column',alignItems:'center',width:'100%'}}>
                    <button className="generate-btn" style={{background:color}} onClick={()=>setView('lesson')}>▶ Continue Lesson</button>
                    <button onClick={resetLesson} style={{background:'transparent',border:'1px solid #444',color:'#888',padding:'8px 20px',borderRadius:'8px',cursor:'pointer',fontSize:'13px'}}>↺ Regenerate</button>
                  </div>
                ) : (
                  <button className="generate-btn" style={{background:color}} onClick={generateLesson} disabled={generating}>
                    {generating ? '⏳ Generating your lesson...' : '▶ Generate Today\'s Lesson'}
                  </button>
                )}
                {generating && <p className="gen-hint">Usually 5-10 seconds...</p>}
              </div>
            )}
          </div>
        )}

        {view==='lesson' && lesson && (
          <div className="lesson-view">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              {isExtra ? (
                <div className="extra-tag" style={{background:color+'22',color,padding:'4px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:'700'}}>
                  ⚡ Extra Lesson {extraNum}
                </div>
              ) : <div/>}
              <button onClick={resetLesson} style={{background:'transparent',border:'1px solid #2a2a4a',color:'#888',padding:'5px 12px',borderRadius:'6px',fontSize:'12px',cursor:'pointer'}}>↺ Regenerate</button>
            </div>

            {lesson.mood_adjusted && (
              <div className="mood-adjusted-banner">😌 Lighter lesson — stress mode active</div>
            )}

            <div className="lesson-day-tag" style={{background:color+'22',color}}>
              {isExtra ? `Day ${lesson.day} — Extra Lesson ${extraNum}` : `Day ${lesson.day}`}
            </div>
            <h2 className="lesson-topic">{td.topic || lesson.topic}</h2>

            {td.introduction && <div className="lesson-block intro-block"><h4>🎯 Introduction</h4><p>{td.introduction}</p></div>}
            {td.concept && <div className="lesson-block concept-block"><h4>📖 Concept</h4><p>{td.concept}</p></div>}
            {td.syntax && <div className="lesson-block code-block"><h4>💻 Syntax & Example</h4><pre>{td.syntax}</pre></div>}
            {td.worked_example && <div className="lesson-block worked-block"><h4>✏️ Worked Example</h4><p>{td.worked_example}</p></div>}
            {td.keypoints?.length > 0 && (
              <div className="lesson-block keypoints-block">
                <h4>🔑 Key Points</h4>
                <ul>{td.keypoints.map((pt,i)=><li key={i}>{pt}</li>)}</ul>
              </div>
            )}

            {lesson.task_type==='quiz' && (
              <div className="task-area">
                <h4>🧠 Quiz — Need 60% to pass</h4>
                {questions.map((q,i)=>(
                  <div key={i} className="question-block">
                    <p className="q">{i+1}. {q.q}</p>
                    <div className="opts">
                      {(q.options||[]).map(opt=>{
                        let cls='opt'
                        if(submitted){if(opt===q.answer)cls+=' correct';else if(answers[i]===opt)cls+=' wrong';}
                        else if(answers[i]===opt) cls+=' picked'
                        return <div key={opt} className={cls} onClick={()=>handleAnswer(i,opt)}>{opt}</div>
                      })}
                    </div>
                    {submitted&&q.explanation&&<div className="explanation">💡 {q.explanation}</div>}
                  </div>
                ))}
                {!submitted && <button className="action-btn" style={{background:color}} disabled={!allAnswered} onClick={submitQuiz}>Submit Quiz</button>}
                {submitted && score && (
                  <div className={`score-box ${score.correct===score.total?'perfect':passingScore?'good':'retry'}`}>
                    {score.correct===score.total?'🎉 Perfect!':passingScore?`👍 ${score.correct}/${score.total} — Good!`:`❌ ${score.correct}/${score.total} — Need 60%`}
                  </div>
                )}
                {submitted && !passingScore && (
                  <button className="retry-btn" onClick={()=>{setSubmitted(false);setAnswers({});setScore(null)}}>🔄 Retry</button>
                )}
              </div>
            )}

            {lesson.task_type==='code' && (
              <div className="task-area">
                <h4>💻 Coding Challenge</h4>
                <div className="challenge-card">
                  <p>{td.challenge}</p>
                  {td.hint && <div className="hint-line">💡 {td.hint}</div>}
                </div>
                <textarea className="code-box" placeholder="Write your code here..." value={codeAnswer} onChange={e=>setCodeAnswer(e.target.value)} disabled={submitted} />
                {!submitted && <button className="action-btn" style={{background:color}} disabled={codeAnswer.trim().length<10} onClick={()=>setSubmitted(true)}>Submit Code</button>}
                {submitted && td.solution && <div className="solution-box"><strong>✅ Example Solution:</strong><pre>{td.solution}</pre></div>}
                {completeError && <div className="complete-error">{completeError}</div>}
              </div>
            )}

            {lesson.task_type==='problem' && (
              <div className="task-area">
                <h4>🔢 Practice Problems</h4>
                {(td.problems||[]).map((p,i)=>(
                  <div key={i} className="question-block">
                    <p className="q">{i+1}. {p.q}</p>
                    {submitted && <div className="answer-line">✅ {p.answer}</div>}
                  </div>
                ))}
                {!submitted && <button className="action-btn" style={{background:color}} onClick={()=>setSubmitted(true)}>Show Answers</button>}
              </div>
            )}

            {submitted && !lesson.is_completed && !lessonDone && (
              <div className="result-area">
                {completeError && <div className="complete-error">{completeError}</div>}
                {canComplete ? (
                  <button className="complete-btn" style={{background:color}} onClick={markComplete} disabled={completing}>
                    {completing ? 'Saving...' : '✅ Complete & Earn 30 XP'}
                  </button>
                ) : lesson.task_type==='quiz' && !passingScore ? null : null}
              </div>
            )}

            {lessonDone && (
              <div className="lesson-done-screen">
                <div style={{fontSize:'48px',marginBottom:'12px'}}>🎉</div>
                <h3>{isExtra ? `Extra Lesson ${extraNum} Complete!` : `Day ${lesson.day} Complete!`}</h3>
                <p style={{color:'#888',margin:'8px 0'}}>+30 XP earned</p>
                {!isExtra && <p style={{color:'#888',fontSize:'13px',marginBottom:'16px'}}>Come back tomorrow for Day {lesson.day + 1}</p>}
                <div style={{display:'flex',gap:'10px',flexDirection:'column',width:'100%'}}>
                  <button style={{background:color,border:'none',color:'#fff',padding:'13px',borderRadius:'10px',fontSize:'15px',fontWeight:'700',cursor:'pointer'}} onClick={generateExtraLesson} disabled={generating}>
                    {generating ? '⏳ Generating...' : '⚡ Next Extra Lesson'}
                  </button>
                  <button style={{background:'transparent',border:'1px solid #2a2a4a',color:'#aaa',padding:'10px',borderRadius:'10px',fontSize:'14px',cursor:'pointer'}} onClick={()=>{setView('home');setLessonDone(false);}}>
                    Back to Home
                  </button>
                </div>
              </div>
            )}

            {lesson.is_completed && !lessonDone && (
              <div className="result-area">
                <div className="already-done">✅ Already completed</div>
                <button style={{background:color,border:'none',color:'#fff',padding:'12px',borderRadius:'10px',fontSize:'14px',fontWeight:'600',cursor:'pointer',width:'100%',marginTop:'10px'}} onClick={generateExtraLesson} disabled={generating}>
                  {generating ? '⏳ Generating...' : '⚡ Next Extra Lesson'}
                </button>
              </div>
            )}
          </div>
        )}

        {view==='history' && (
          <div className="history-view">
            <h3>Lesson History</h3>
            {history.length===0 && <p className="no-history">No lessons completed yet.</p>}
            {history.map((h,i)=>(
              <div key={i} className={`history-row ${h.is_completed?'done':'pending'}`}>
                <div className="h-day" style={{color}}>{h.is_extra ? `Day ${h.day} Extra` : `Day ${h.day}`}</div>
                <div className="h-topic">{h.topic}</div>
                <div className="h-right">
                  {h.is_completed?<span className="h-done">+{h.xp} XP ✅</span>:<span className="h-pending">Not done</span>}
                  {h.date&&<span className="h-date">{h.date}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
