import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import axios from 'axios'
import './Subject.css'
import { useTTS, useSTT } from '../components/AccessibilityToolbar'

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
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [visualDiagram, setVisualDiagram] = useState(null)
  const [visualLoading, setVisualLoading] = useState(false)
  const mermaidRef = useRef(null)

  // Topic Selector
  const [suggestedTopics, setSuggestedTopics] = useState([])
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [customTopic, setCustomTopic] = useState('')
  const [showTopicPicker, setShowTopicPicker] = useState(false)

  // Skip/Test-out
  const [skipTest, setSkipTest] = useState(null)
  const [skipAnswers, setSkipAnswers] = useState({})
  const [skipSubmitted, setSkipSubmitted] = useState(false)
  const [skipScore, setSkipScore] = useState(null)
  const [skipLoading, setSkipLoading] = useState(false)
  const [showSkipTest, setShowSkipTest] = useState(false)

  // Doubt Chat
  const [doubtOpen, setDoubtOpen] = useState(false)
  const [doubtMessages, setDoubtMessages] = useState([])
  const [doubtInput, setDoubtInput] = useState('')
  const [doubtLoading, setDoubtLoading] = useState(false)
  const chatEndRef = useRef(null)

  // Language feature
  const [selectedLang, setSelectedLang] = useState('English')
  const [translating, setTranslating] = useState(false)
  const [translatedContent, setTranslatedContent] = useState(null)
  const [showLangPicker, setShowLangPicker] = useState(false)
  const LANGUAGES = ['English','Tamil','Hindi','Telugu','Kannada','Malayalam','Bengali','French','German','Spanish','Arabic','Japanese','Chinese']

  const { speak, ttsEnabled } = useTTS()
  const { listening, startListening, stopListening, sttEnabled } = useSTT(text => setCodeAnswer(prev => prev + text))

  const translateLesson = async (lang) => {
    if (!lesson) return
    if (lang === 'English') { setTranslatedContent(null); setSelectedLang('English'); setShowLangPicker(false); return }
    setTranslating(true); setShowLangPicker(false); setSelectedLang(lang)
    try {
      const td = lesson.task_data || {}
      const textToTranslate = [td.introduction, td.concept, (td.keypoints||[]).join('. ')].filter(Boolean).join('\n\n')
      const res = await axios.post(`${API}/plan/translate`, { content: textToTranslate, target_language: lang })
      setTranslatedContent({ text: res.data.translated, language: lang })
    } catch { setTranslatedContent({ text: 'Translation failed. Please try again.', language: lang }) }
    setTranslating(false)
  }

  const readLesson = () => {
    const td = lesson?.task_data || {}
    const text = [td.topic, td.introduction, td.concept, (td.keypoints || []).join('. ')].filter(Boolean).join('. ')
    speak(text)
  }

  const fetchSummary = async () => {
    if (!lesson) return
    setSummaryLoading(true); setSummary(null)
    try {
      const td = lesson.task_data || {}
      const text = [td.introduction, td.concept].filter(Boolean).join(' ')
      const res = await axios.post(`${API}/plan/summarize`, { text })
      setSummary(res.data.bullets)
    } catch { setSummary(['Could not generate summary. Try again.']) }
    setSummaryLoading(false)
  }

  const fetchVisual = async () => {
    if (!lesson) return
    setVisualLoading(true)
    setVisualDiagram(null)
    try {
      const td = lesson.task_data || {}
      const res = await axios.post(`${API}/plan/visual`, {
        topic: td.topic || lesson.topic || '',
        concept: (td.introduction || '') + ' ' + (td.concept || ''),
        subject_type: subject?.subject_type || 'theory'
      })
      setVisualDiagram(res.data.diagram)
    } catch { setVisualDiagram('ERROR') }
    setVisualLoading(false)
  }

  useEffect(() => { setSummary(null) }, [lesson])
  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }) }, [doubtMessages])
  useEffect(() => { setVisualDiagram(null) }, [lesson])

  // Render mermaid whenever diagram changes
  useEffect(() => {
    if (!visualDiagram || !mermaidRef.current) return
    const el = mermaidRef.current
    el.removeAttribute('data-processed')
    el.innerHTML = visualDiagram
    if (window.mermaid) {
      try {
        window.mermaid.initialize({ startOnLoad: false, theme: 'default', flowchart: { htmlLabels: true, curve: 'basis' } })
        window.mermaid.init(undefined, el)
      } catch (e) {
        el.innerHTML = '<p style="color:#e74c3c;font-size:13px">⚠️ Could not render diagram. Try generating again.</p>'
      }
    }
  }, [visualDiagram])

  useEffect(() => {
    if (!userId) { navigate('/login'); return }
    fetchSubject(); fetchHistory(); fetchWeekly()
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
      setLesson(null); setIsExtra(false); setExtraNum(0)
      setView('home'); setSubmitted(false); setScore(null); setLessonDone(false)
      setShowTopicPicker(false); setSuggestedTopics([])
    } catch {}
  }

  const openTopicPicker = async () => {
    setShowTopicPicker(true); setSelectedTopic(null); setCustomTopic(''); setLoadingTopics(true)
    try {
      const res = await axios.post(`${API}/plan/subject/${subjectId}/suggest-topics?user_id=${userId}`)
      setSuggestedTopics(res.data.topics || [])
    } catch { setSuggestedTopics([]) }
    setLoadingTopics(false)
  }

  const generateWithTopic = async () => {
    const topic = customTopic.trim() || selectedTopic
    if (!topic) return
    setGenerating(true); setCompleteError(''); setShowTopicPicker(false)
    try {
      const res = await axios.post(
        `${API}/plan/subject/${subjectId}/generate-lesson-topic?user_id=${userId}`,
        { topic }
      )
      setLesson(res.data); setIsExtra(false); setExtraNum(0)
      setView('lesson'); setAnswers({}); setCodeAnswer('')
      setSubmitted(false); setScore(null); setLessonDone(false)
    } catch (err) { alert(err.response?.data?.detail || 'Failed to generate.') }
    setGenerating(false)
  }

  const generateLesson = async () => {
    setGenerating(true); setCompleteError('')
    try {
      const res = await axios.post(`${API}/plan/subject/${subjectId}/generate-lesson?user_id=${userId}`)
      setLesson(res.data); setIsExtra(false); setExtraNum(0)
      setView('lesson'); setAnswers({}); setCodeAnswer('')
      setSubmitted(false); setScore(null); setLessonDone(false)
    } catch (err) { alert(err.response?.data?.detail || 'Failed to generate.') }
    setGenerating(false)
  }

  const generateExtraLesson = async () => {
    setGenerating(true); setCompleteError('')
    try {
      const res = await axios.post(`${API}/plan/subject/${subjectId}/extra-lesson?user_id=${userId}`)
      setLesson(res.data); setIsExtra(true); setExtraNum(res.data.extra_number || extraNum + 1)
      setView('lesson'); setAnswers({}); setCodeAnswer('')
      setSubmitted(false); setScore(null); setLessonDone(false)
    } catch (err) { alert(err.response?.data?.detail || 'Failed to generate extra lesson.') }
    setGenerating(false)
  }

  const loadSkipTest = async () => {
    setSkipLoading(true); setShowSkipTest(true)
    setSkipAnswers({}); setSkipSubmitted(false); setSkipScore(null); setSkipTest(null)
    try {
      const res = await axios.post(`${API}/plan/subject/${subjectId}/skip-test?user_id=${userId}`)
      setSkipTest(res.data)
    } catch { setSkipTest({ error: 'Could not load test. Try again.' }) }
    setSkipLoading(false)
  }

  const submitSkipTest = async () => {
    const qs = skipTest?.questions || []
    let correct = 0
    qs.forEach((q, i) => { if (skipAnswers[i] === q.answer) correct++ })
    const passed = correct / qs.length >= 0.8
    setSkipScore({ correct, total: qs.length, passed }); setSkipSubmitted(true)
    if (passed) {
      try {
        await axios.post(`${API}/plan/subject/${subjectId}/skip-test/submit?user_id=${userId}`, { answers: skipAnswers })
        await fetchSubject()
      } catch {}
    }
  }

  const sendDoubt = async () => {
    const q = doubtInput.trim()
    if (!q || doubtLoading) return
    const td = lesson?.task_data || {}
    const lessonContext = [td.topic, td.introduction, td.concept, (td.keypoints || []).join('. ')].filter(Boolean).join('\n')
    setDoubtMessages(prev => [...prev, { role: 'user', text: q }])
    setDoubtInput(''); setDoubtLoading(true)
    try {
      const res = await axios.post(`${API}/plan/doubt`, { question: q, lesson_context: lessonContext, language: selectedLang })
      setDoubtMessages(prev => [...prev, { role: 'ai', text: res.data.answer }])
    } catch {
      setDoubtMessages(prev => [...prev, { role: 'ai', text: 'Could not get answer. Try again.' }])
    }
    setDoubtLoading(false)
  }

  const handleAnswer = (qi, opt) => { if (submitted) return; setAnswers({ ...answers, [qi]: opt }) }

  const submitQuiz = () => {
    const qs = lesson.task_data?.questions || []
    let correct = 0
    qs.forEach((q, i) => { if (answers[i] === q.answer) correct++ })
    setScore({ correct, total: qs.length }); setSubmitted(true)
  }

  const markComplete = async () => {
    setCompleting(true); setCompleteError('')
    try {
      await axios.post(`${API}/plan/lesson/${lesson.lesson_id}/complete`, { user_id: userId, code_answer: codeAnswer || null })
      await fetchSubject(); await fetchHistory(); await fetchWeekly()
      setLessonDone(true)
    } catch (err) { setCompleteError(err.response?.data?.detail || 'Error completing lesson') }
    setCompleting(false)
  }

  // Strip fenced code blocks from syntax text (```python ... ```)
  const stripCodeFences = (text) => {
    if (!text) return ''
    return text.replace(/^```[\w]*\n?/gm, '').replace(/^```$/gm, '').trim()
  }

  // Render markdown: handles **bold**, *italic*, `inline code`, numbered/bullet lists
  const renderMd = (text) => {
    if (!text) return null
    // Split into lines to handle lists and paragraphs
    const lines = text.split('\n')
    const elements = []
    let key = 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      if (!trimmed) { elements.push(<br key={key++} />); continue }
      // Numbered list: "1. text" or "1) text"
      const numMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/)
      if (numMatch) { elements.push(<div key={key++} style={{paddingLeft:'16px',marginBottom:'4px'}}><span style={{fontWeight:700,marginRight:'6px'}}>{numMatch[1]}.</span>{renderInline(numMatch[2])}</div>); continue }
      // Bullet list: "- text" or "* text" or "• text"
      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/)
      if (bulletMatch) { elements.push(<div key={key++} style={{paddingLeft:'16px',marginBottom:'4px',display:'flex',gap:'8px'}}><span style={{color:'#7c6ff7',flexShrink:0}}>•</span><span>{renderInline(bulletMatch[1])}</span></div>); continue }
      elements.push(<span key={key++}>{renderInline(trimmed)}{i < lines.length - 1 ? ' ' : ''}</span>)
    }
    return elements
  }

  const renderInline = (text) => {
    if (!text) return null
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2,-2)}</strong>
      if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1,-1)}</em>
      if (part.startsWith('`') && part.endsWith('`')) return <code key={i} style={{background:'rgba(79,110,247,0.12)',padding:'1px 6px',borderRadius:'4px',fontFamily:'JetBrains Mono,monospace',fontSize:'0.88em',color:'#4f6ef7'}}>{part.slice(1,-1)}</code>
      return part
    })
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
    lesson.task_type === 'code' ? codeAnswer.trim().length >= 10 : true
  )
  const rottenLevel = !subject ? 0 : subject.days_inactive >= 5 ? 3 : subject.days_inactive >= 3 ? 2 : subject.days_inactive >= 2 ? 1 : 0

  if (!subject) return (
    <div className="sn-loading">
      <div className="sn-loader-ring"></div>
      <span>Loading...</span>
    </div>
  )

  return (
    <div className="sn-wrap">
      <div className="sn-cursor-blob" id="snCursorBlob"></div>

      <nav className="sn-nav">
        <div className="sn-nav-logo">
          <span className="sn-logo-bolt">⚡</span>
          <span className="sn-logo-txt">Task<b>Nova</b></span>
        </div>
        <div className="sn-nav-links">
          <Link to="/dashboard" className="sn-nav-a">← Home</Link>
          <Link to="/mood" className="sn-nav-a">Mood</Link>
          <Link to="/profile" className="sn-nav-a">Profile</Link>
        </div>
      </nav>

      <div className="sn-body">
        {rottenLevel >= 2 && (
          <div className={`sn-rotten-banner rotten-${rottenLevel}`}>
            {rottenLevel === 3 ? '💀 Critical decay — 5+ days without studying!' : '⚠️ Getting rusty — come back before you forget!'}
          </div>
        )}

        <div className="sn-header" style={{ '--c': color }}>
          <div className="sn-header-top">
            <div>
              <div className="sn-subj-name" style={{ color }}>{subject.name}</div>
              <div className="sn-subj-type">{subject.subject_type}</div>
            </div>
            {rottenLevel > 0 && (
              <div className={`sn-rotten-pill rp-${rottenLevel}`}>
                {rottenLevel === 1 ? '😐 1d idle' : rottenLevel === 2 ? '😟 3d idle' : '💀 5d+ idle'}
              </div>
            )}
          </div>

          <div className="sn-stats-grid">
            {[
              { icon: '🔥', val: subject.current_streak, lbl: 'Streak' },
              { icon: '⚡', val: subject.total_xp, lbl: 'XP' },
              { icon: '📚', val: subject.total_lessons_done, lbl: 'Done' },
              { icon: '📅', val: `Day ${subject.current_day}`, lbl: 'Current' },
            ].map((s, i) => (
              <div className="sn-stat" key={i} style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="sn-stat-ico">{s.icon}</div>
                <div className="sn-stat-val" style={{ color }}>{s.val}</div>
                <div className="sn-stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>

          <div className="sn-xp-track">
            <div className="sn-xp-fill" style={{ width: `${Math.min((subject.total_xp % 300) / 300 * 100, 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }}></div>
          </div>
          <div className="sn-xp-lbl">{subject.total_xp % 300} / 300 XP to next badge</div>
        </div>

        {weekly.length > 0 && (
          <div className="sn-weekly">
            <div className="sn-weekly-ttl">📊 This Week</div>
            <div className="sn-weekly-bars">
              {weekly.map((w, i) => {
                const pct = (w.lessons_done / maxLessons) * 100
                const prev = i > 0 ? (weekly[i - 1].lessons_done / maxLessons) * 100 : pct
                const diff = pct - prev
                return (
                  <div key={i} className={`sn-wk-col${w.is_today ? ' today' : ''}`}>
                    <div className="sn-wk-bar-wrap">
                      {w.is_today && i > 0 && (
                        <div className={`sn-diff ${diff >= 0 ? 'up' : 'dn'}`}>
                          {diff >= 0 ? `+${Math.round(diff)}%` : `${Math.round(diff)}%`}
                        </div>
                      )}
                      <div className="sn-wk-track">
                        <div className="sn-wk-fill" style={{ height: `${Math.max(pct, 4)}%`, background: w.is_today ? color : '#2a2a4a' }}></div>
                      </div>
                    </div>
                    <div className="sn-wk-lbl">{w.day_name}</div>
                    <div className="sn-wk-cnt">{w.lessons_done}</div>
                  </div>
                )
              })}
            </div>
            {weekly.length > 1 && (() => {
              const t = weekly[weekly.length - 1], y = weekly[weekly.length - 2]
              const d = t.lessons_done - y.lessons_done
              if (t.lessons_done === 0 && y.lessons_done === 0) return null
              if (d < 0) return <div className="sn-msg warn">⚠️ {Math.abs(d)} lesson{Math.abs(d) > 1 ? 's' : ''} behind yesterday!</div>
              if (d > 0) return <div className="sn-msg good">🔥 {d} lesson{d > 1 ? 's' : ''} ahead of yesterday!</div>
              return <div className="sn-msg neutral">📊 Same as yesterday. Push harder!</div>
            })()}
          </div>
        )}

        <div className="sn-tabs">
          {[['home', 'Today'], ['history', 'History']].map(([t, label]) => (
            <button key={t} className={`sn-tab${view === t ? ' active' : ''}`}
              style={view === t ? { borderColor: color, color } : {}}
              onClick={() => setView(t)}>{label}</button>
          ))}
          {lesson && (
            <button className={`sn-tab${view === 'lesson' ? ' active' : ''}`}
              style={view === 'lesson' ? { borderColor: color, color } : {}}
              onClick={() => setView('lesson')}>
              {isExtra ? `Extra ${extraNum}` : 'Lesson'}
            </button>
          )}
        </div>

        {view === 'home' && (
          <div className="sn-home">
            {subject.lesson_completed ? (
              <div className="sn-done-today">
                <div className="sn-done-emoji">🎉</div>
                <h3>Day {subject.current_day} Complete!</h3>
                <p>Come back tomorrow for Day {subject.current_day + 1}</p>
                <div className="sn-streak-fire" style={{ color }}>🔥 {subject.current_streak} day streak!</div>
                <button className="sn-btn-primary" style={{ '--bc': color }} onClick={generateExtraLesson} disabled={generating}>
                  {generating ? <span className="sn-spin"></span> : '⚡ Next Extra Lesson'}
                </button>
              </div>
            ) : (
              <div className="sn-gen-section">
                <div className="sn-day-badge" style={{ background: color + '22', color }}>Day {subject.current_day}</div>
                <h2>Ready to learn?</h2>
                <p className="sn-gen-sub">Every lesson builds your streak. Let's go.</p>
                <Link to="/mood" className="sn-mood-link" style={{ color, borderColor: color + '55' }}>😊 Log Today's Mood</Link>

                {!lesson && (
                  <button className="sn-skip-trigger" onClick={loadSkipTest}>
                    💡 I already know this — test out →
                  </button>
                )}

                {lesson ? (
                  <div className="sn-lesson-actions">
                    <button className="sn-btn-primary" style={{ '--bc': color }} onClick={() => setView('lesson')}>▶ Continue Lesson</button>
                    <button className="sn-btn-ghost" onClick={resetLesson}>↺ Regenerate</button>
                  </div>
                ) : (
                  <div className="sn-gen-btns">
                    <button className="sn-btn-primary" style={{ '--bc': color }} onClick={generateLesson} disabled={generating}>
                      {generating ? <><span className="sn-spin"></span> Generating...</> : '▶ Generate Lesson'}
                    </button>
                    <button className="sn-btn-outline" style={{ '--bc': color }} onClick={openTopicPicker} disabled={generating}>
                      🎯 Pick a Topic
                    </button>
                  </div>
                )}
                {generating && <p className="sn-gen-hint">AI is cooking... (~5-10s)</p>}
              </div>
            )}
          </div>
        )}

        {showTopicPicker && (
          <div className="sn-overlay" onClick={() => setShowTopicPicker(false)}>
            <div className="sn-modal" onClick={e => e.stopPropagation()}>
              <div className="sn-modal-head">
                <h3>🎯 Pick Today's Topic</h3>
                <button className="sn-modal-x" onClick={() => setShowTopicPicker(false)}>✕</button>
              </div>
              <p className="sn-modal-sub">AI suggested these for you, or type your own</p>

              {loadingTopics ? (
                <div className="sn-loading-row">
                  <span className="sn-spin lg" style={{ borderTopColor: color }}></span>
                  <span>Thinking of topics...</span>
                </div>
              ) : (
                <div className="sn-topic-chips">
                  {suggestedTopics.map((t, i) => (
                    <button key={i}
                      className={`sn-chip${selectedTopic === t ? ' sel' : ''}`}
                      style={selectedTopic === t ? { background: color + '22', borderColor: color, color } : {}}
                      onClick={() => { setSelectedTopic(t); setCustomTopic('') }}>
                      <span className="sn-chip-n">{i + 1}</span>
                      {t}
                    </button>
                  ))}
                </div>
              )}

              <div className="sn-divider"><span>or type your own</span></div>

              <input className="sn-topic-inp" placeholder="e.g. Binary Search Trees, Recursion..."
                value={customTopic}
                onChange={e => { setCustomTopic(e.target.value); setSelectedTopic(null) }}
                style={{ '--fc': color }} />

              <div className="sn-modal-foot">
                <button className="sn-btn-ghost sm" onClick={() => setShowTopicPicker(false)}>Cancel</button>
                <button className="sn-btn-primary sm" style={{ '--bc': color }}
                  onClick={generateWithTopic}
                  disabled={(!selectedTopic && !customTopic.trim()) || generating}>
                  {generating ? <span className="sn-spin"></span> : '⚡ Generate'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSkipTest && (
          <div className="sn-overlay" onClick={() => !skipLoading && setShowSkipTest(false)}>
            <div className="sn-modal wide" onClick={e => e.stopPropagation()}>
              <div className="sn-modal-head">
                <h3>⚡ Test Out — Day {subject.current_day}</h3>
                <button className="sn-modal-x" onClick={() => setShowSkipTest(false)}>✕</button>
              </div>
              <p className="sn-modal-sub">Score 80%+ to skip to the next day</p>

              {skipLoading ? (
                <div className="sn-loading-row">
                  <span className="sn-spin lg" style={{ borderTopColor: color }}></span>
                  <span>Generating test...</span>
                </div>
              ) : skipTest?.error ? (
                <div className="sn-err-box">{skipTest.error}</div>
              ) : skipTest ? (
                <div className="sn-skip-qs">
                  {(skipTest.questions || []).map((q, i) => (
                    <div key={i} className="sn-q-block">
                      <p className="sn-q-text">{i + 1}. {q.q}</p>
                      <div className="sn-q-opts">
                        {(q.options || []).map(opt => {
                          let cls = 'sn-opt'
                          if (skipSubmitted) {
                            if (opt === q.answer) cls += ' correct'
                            else if (skipAnswers[i] === opt) cls += ' wrong'
                          } else if (skipAnswers[i] === opt) cls += ' picked'
                          return <div key={opt} className={cls} onClick={() => !skipSubmitted && setSkipAnswers({ ...skipAnswers, [i]: opt })}>{opt}</div>
                        })}
                      </div>
                    </div>
                  ))}

                  {!skipSubmitted && (
                    <button className="sn-btn-primary full" style={{ '--bc': color }}
                      disabled={Object.keys(skipAnswers).length < (skipTest.questions || []).length}
                      onClick={submitSkipTest}>Submit Test</button>
                  )}

                  {skipSubmitted && skipScore && (
                    <div className={`sn-skip-result ${skipScore.passed ? 'pass' : 'fail'}`}>
                      <div className="sn-skip-ico">{skipScore.passed ? '🚀' : '📚'}</div>
                      <h4>{skipScore.passed ? `Passed! ${skipScore.correct}/${skipScore.total}` : `Not quite — ${skipScore.correct}/${skipScore.total}`}</h4>
                      <p>{skipScore.passed ? `Day ${subject.current_day} skipped!` : 'Need 80% to skip. Study the lesson first!'}</p>
                      {skipScore.passed
                        ? <button className="sn-btn-primary sm" style={{ '--bc': color }} onClick={() => { setShowSkipTest(false); fetchSubject() }}>Continue →</button>
                        : <button className="sn-btn-ghost sm" onClick={() => setShowSkipTest(false)}>Got it, I'll study</button>}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        )}

        {view === 'lesson' && lesson && (
          <div className="sn-lesson">
            <div className="sn-lesson-topbar">
              {isExtra ? <span className="sn-extra-badge" style={{ background: color + '22', color }}>⚡ Extra {extraNum}</span> : <div />}
              <button className="sn-btn-ghost xs" onClick={resetLesson}>↺ Regenerate</button>
            </div>

            {lesson.mood_adjusted && <div className="sn-mood-banner">😌 Lighter lesson — stress mode active</div>}

            <div className="sn-lesson-day" style={{ background: color + '22', color }}>
              {isExtra ? `Day ${lesson.day} — Extra ${extraNum}` : `Day ${lesson.day}`}
            </div>
            <h2 className="sn-lesson-topic">{td.topic || lesson.topic}</h2>

            <div className="sn-lesson-acts">
              {ttsEnabled && <button className="sn-act-chip" onClick={readLesson}>🔊 Read</button>}
              <button className="sn-act-chip" onClick={fetchSummary} disabled={summaryLoading}>
                {summaryLoading ? '⏳' : '🧠 Summarize'}
              </button>
              <button className="sn-act-chip" onClick={fetchVisual} disabled={visualLoading}>
                {visualLoading ? '⏳' : '📊 Visual'}
              </button>
              <div className="sn-lang-wrap">
                <button className="sn-act-chip" onClick={() => setShowLangPicker(o => !o)} disabled={translating}>
                  {translating ? '⏳' : `🌐 ${selectedLang}`}
                </button>
                {showLangPicker && (
                  <div className="sn-lang-drop">
                    {LANGUAGES.map(l => (
                      <button key={l} className={`sn-lang-opt${selectedLang === l ? ' active' : ''}`}
                        style={selectedLang === l ? { color, borderColor: color } : {}}
                        onClick={() => translateLesson(l)}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {visualDiagram && visualDiagram !== 'ERROR' && (
              <div className="sn-visual-block">
                <div className="sn-blk-lbl">📊 Visual Diagram</div>
                <div className="sn-mermaid-wrap">
                  <div className="mermaid" ref={mermaidRef}>{visualDiagram}</div>
                </div>
              </div>
            )}
            {visualDiagram === 'ERROR' && (
              <div className="sn-visual-block">
                <p style={{color:'#e74c3c',fontSize:'13px'}}>⚠️ Could not generate diagram. Try again.</p>
              </div>
            )}

            {summary && (
              <div className="sn-summary">
                <h4>📌 Quick Summary</h4>
                <ul>{summary.map((b, i) => <li key={i}>{b}</li>)}</ul>
              </div>
            )}

            {td.introduction && <div className="sn-blk intro"><div className="sn-blk-lbl">🎯 Introduction</div><p>{renderMd(td.introduction)}</p></div>}
            {td.concept && <div className="sn-blk concept"><div className="sn-blk-lbl">📖 Concept</div><p>{renderMd(td.concept)}</p></div>}
            {td.syntax && <div className="sn-blk code"><div className="sn-blk-lbl">💻 Syntax & Example</div><pre>{stripCodeFences(td.syntax)}</pre></div>}
            {td.worked_example && <div className="sn-blk worked"><div className="sn-blk-lbl">✏️ Worked Example</div><p>{renderMd(td.worked_example)}</p></div>}
            {td.keypoints?.length > 0 && (
              <div className="sn-blk keys"><div className="sn-blk-lbl">🔑 Key Points</div><ul>{td.keypoints.map((pt, i) => <li key={i}>{pt}</li>)}</ul></div>
            )}

            {translatedContent && (
              <div className="sn-blk" style={{ borderLeft: `3px solid ${color}`, background: color + '0d' }}>
                <div className="sn-blk-lbl">🌐 Translated — {translatedContent.language}</div>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>{translatedContent.text}</p>
                <button className="sn-act-chip" style={{ marginTop: '8px' }} onClick={() => { setTranslatedContent(null); setSelectedLang('English') }}>✕ Clear Translation</button>
              </div>
            )}

            {lesson.task_type === 'quiz' && (
              <div className="sn-task">
                <h4>🧠 Quiz — Need 60% to pass</h4>
                {questions.map((q, i) => (
                  <div key={i} className="sn-q-block">
                    <p className="sn-q-text">{i + 1}. {q.q}</p>
                    <div className="sn-q-opts">
                      {(q.options || []).map(opt => {
                        let cls = 'sn-opt'
                        if (submitted) { if (opt === q.answer) cls += ' correct'; else if (answers[i] === opt) cls += ' wrong' }
                        else if (answers[i] === opt) cls += ' picked'
                        return <div key={opt} className={cls} onClick={() => handleAnswer(i, opt)}>{opt}</div>
                      })}
                    </div>
                    {submitted && q.explanation && <div className="sn-expl">💡 {q.explanation}</div>}
                  </div>
                ))}
                {!submitted && <button className="sn-btn-primary" style={{ '--bc': color }} disabled={!allAnswered} onClick={submitQuiz}>Submit Quiz</button>}
                {submitted && score && (
                  <div className={`sn-score ${score.correct === score.total ? 'perfect' : passingScore ? 'good' : 'retry'}`}>
                    {score.correct === score.total ? '🎉 Perfect!' : passingScore ? `👍 ${score.correct}/${score.total} — Good!` : `❌ ${score.correct}/${score.total} — Need 60%`}
                  </div>
                )}
                {submitted && !passingScore && (
                  <button className="sn-btn-ghost" onClick={() => { setSubmitted(false); setAnswers({}); setScore(null) }}>🔄 Retry</button>
                )}
              </div>
            )}

            {lesson.task_type === 'code' && (
              <div className="sn-task">
                <h4>💻 Coding Challenge</h4>
                <div className="sn-challenge">
                  <p>{renderMd(td.challenge)}</p>
                  {td.hint && <div className="sn-hint">💡 {renderMd(td.hint)}</div>}
                </div>
                <textarea className="sn-code-box" placeholder="Write your code here..." value={codeAnswer} onChange={e => setCodeAnswer(e.target.value)} disabled={submitted} />
                {sttEnabled && !submitted && (
                  <button className={`sn-stt${listening ? ' listening' : ''}`} onClick={listening ? stopListening : startListening}>
                    🎤 {listening ? 'Listening...' : 'Speak Answer'}
                  </button>
                )}
                {!submitted && <button className="sn-btn-primary" style={{ '--bc': color }} disabled={codeAnswer.trim().length < 10} onClick={() => setSubmitted(true)}>Submit Code</button>}
                {submitted && td.solution && <div className="sn-solution"><strong>✅ Example Solution:</strong><pre>{stripCodeFences(td.solution)}</pre></div>}
                {completeError && <div className="sn-err">{completeError}</div>}
              </div>
            )}

            {lesson.task_type === 'problem' && (
              <div className="sn-task">
                <h4>🔢 Practice Problems</h4>
                {(td.problems || []).map((p, i) => (
                  <div key={i} className="sn-q-block">
                    <p className="sn-q-text">{i + 1}. {p.q}</p>
                    {submitted && <div className="sn-answer-reveal">✅ {p.answer}</div>}
                  </div>
                ))}
                {!submitted && <button className="sn-btn-primary" style={{ '--bc': color }} onClick={() => setSubmitted(true)}>Show Answers</button>}
              </div>
            )}

            {submitted && !lesson.is_completed && !lessonDone && (
              <div className="sn-complete-area">
                {completeError && <div className="sn-err">{completeError}</div>}
                {canComplete && (
                  <button className="sn-btn-complete" style={{ '--bc': color }} onClick={markComplete} disabled={completing}>
                    {completing ? <span className="sn-spin"></span> : '✅ Complete & Earn 30 XP'}
                  </button>
                )}
              </div>
            )}

            {lessonDone && (
              <div className="sn-lesson-done">
                <div className="sn-done-confetti">🎉</div>
                <h3>{isExtra ? `Extra ${extraNum} Complete!` : `Day ${lesson.day} Complete!`}</h3>
                <p>+30 XP earned</p>
                {!isExtra && <p className="sn-done-sub">Come back tomorrow for Day {lesson.day + 1}</p>}
                <button className="sn-btn-primary" style={{ '--bc': color }} onClick={generateExtraLesson} disabled={generating}>
                  {generating ? <span className="sn-spin"></span> : '⚡ Next Extra Lesson'}
                </button>
                <button className="sn-btn-ghost" onClick={() => { setView('home'); setLessonDone(false) }}>Back to Home</button>
              </div>
            )}

            {lesson.is_completed && !lessonDone && (
              <div className="sn-complete-area">
                <div className="sn-already-done">✅ Already completed</div>
                <button className="sn-btn-primary" style={{ '--bc': color }} onClick={generateExtraLesson} disabled={generating}>
                  {generating ? <span className="sn-spin"></span> : '⚡ Next Extra Lesson'}
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'history' && (
          <div className="sn-history">
            <h3>Lesson History</h3>
            {history.length === 0 && <p className="sn-no-hist">No lessons completed yet.</p>}
            {history.map((h, i) => (
              <div key={i} className={`sn-hist-row${h.is_completed ? ' done' : ''}`}>
                <div className="sn-hist-day" style={{ color }}>{h.is_extra ? `Day ${h.day} Extra` : `Day ${h.day}`}</div>
                <div className="sn-hist-topic">{h.topic}</div>
                <div className="sn-hist-right">
                  {h.is_completed ? <span className="sn-hist-done">+{h.xp} XP ✅</span> : <span className="sn-hist-pend">Not done</span>}
                  {h.date && <span className="sn-hist-date">{h.date}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lesson && view === 'lesson' && (
        <>
          <button className="sn-doubt-fab" style={{ '--bc': color }} onClick={() => setDoubtOpen(o => !o)}>
            <span className="sn-fab-ico">{doubtOpen ? '✕' : '💬'}</span>
            {!doubtOpen && <span className="sn-fab-lbl">Ask a doubt</span>}
          </button>

          {doubtOpen && (
            <div className="sn-doubt-panel">
              <div className="sn-doubt-head" style={{ '--c': color }}>
                <div>
                  <div className="sn-doubt-ttl">💬 Lesson Doubt</div>
                  <div className="sn-doubt-sub">
                    Reply in:&nbsp;
                    <select className="sn-doubt-lang-sel" value={selectedLang} onChange={e => setSelectedLang(e.target.value)}>
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <button className="sn-doubt-x" onClick={() => setDoubtOpen(false)}>✕</button>
              </div>
              <div className="sn-doubt-msgs">
                {doubtMessages.length === 0 && (
                  <div className="sn-doubt-empty">
                    <div style={{ fontSize: '32px' }}>🤔</div>
                    <p>Got a question about this lesson? Ask me!</p>
                  </div>
                )}
                {doubtMessages.map((m, i) => (
                  <div key={i} className={`sn-dmsg ${m.role}`}>
                    <div className="sn-dmsg-bubble" style={m.role === 'ai' ? { borderColor: color + '44' } : {}}>{m.text}</div>
                  </div>
                ))}
                {doubtLoading && (
                  <div className="sn-dmsg ai">
                    <div className="sn-dmsg-bubble typing">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="sn-doubt-inp-row">
                <input className="sn-doubt-inp" placeholder="What's confusing you?"
                  value={doubtInput}
                  onChange={e => setDoubtInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendDoubt()}
                  style={{ '--fc': color }} />
                <button className="sn-doubt-send" style={{ '--bc': color }} onClick={sendDoubt} disabled={!doubtInput.trim() || doubtLoading}>
                  {doubtLoading ? '⏳' : '↑'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
