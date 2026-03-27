import { createContext, useContext, useState, useEffect, useRef } from 'react'
import './AccessibilityToolbar.css'

const A11yContext = createContext(null)

export function useA11y() {
  return useContext(A11yContext)
}

export function A11yProvider({ children }) {
  const [tts, setTts] = useState(false)
  const [stt, setStt] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [fontSize, setFontSize] = useState('normal') // normal | large | xlarge
  const [focusMode, setFocusMode] = useState(false)
  const [open, setOpen] = useState(false)

  // Auto-enable features based on disability profile saved at login
  useEffect(() => {
    const raw = localStorage.getItem('user_disability') || ''
    const tags = raw.split(',').map(s => s.trim()).filter(Boolean)
    if (tags.includes('visual')) {
      setTts(true)
      setHighContrast(true)
      setFontSize('large')
    }
    if (tags.includes('hearing')) {
      setStt(true)
    }
    if (tags.includes('cognitive')) {
      setFocusMode(true)
      setFontSize(prev => prev === 'normal' ? 'large' : prev)
    }
  }, [])

  // Apply global classes
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('a11y-high-contrast', highContrast)
    root.classList.toggle('a11y-focus-mode', focusMode)
    root.classList.remove('a11y-font-normal', 'a11y-font-large', 'a11y-font-xlarge')
    root.classList.add(`a11y-font-${fontSize}`)
  }, [highContrast, focusMode, fontSize])

  // Stop TTS when toggled off
  useEffect(() => {
    if (!tts) window.speechSynthesis?.cancel()
  }, [tts])

  return (
    <A11yContext.Provider value={{ tts, stt, highContrast, focusMode, fontSize }}>
      {children}
      <AccessibilityToolbar
        open={open} setOpen={setOpen}
        tts={tts} setTts={setTts}
        stt={stt} setStt={setStt}
        highContrast={highContrast} setHighContrast={setHighContrast}
        fontSize={fontSize} setFontSize={setFontSize}
        focusMode={focusMode} setFocusMode={setFocusMode}
      />
    </A11yContext.Provider>
  )
}

function AccessibilityToolbar({ open, setOpen, tts, setTts, stt, setStt,
  highContrast, setHighContrast, fontSize, setFontSize, focusMode, setFocusMode }) {

  return (
    <div className={`a11y-panel ${open ? 'a11y-panel--open' : ''}`}>
      <button
        className="a11y-fab"
        onClick={() => setOpen(o => !o)}
        aria-label="Accessibility settings"
        title="Accessibility"
      >
        ♿
      </button>

      {open && (
        <div className="a11y-menu" role="dialog" aria-label="Accessibility options">
          <div className="a11y-menu__header">Accessibility</div>

          {(() => {
            const raw = localStorage.getItem('user_disability') || ''
            const tags = raw.split(',').filter(Boolean)
            if (!tags.length) return null
            const map = { visual: '👁️ Visual', hearing: '👂 Hearing', cognitive: '🧠 Cognitive' }
            return (
              <div className="a11y-profile-badge">
                Auto-configured for: {tags.map(t => map[t] || t).join(', ')}
              </div>
            )
          })()}

          <div className="a11y-section-label">Visual</div>

          <div className="a11y-toggle-row">
            <span className="a11y-toggle-label">Text-to-Speech</span>
            <label className="a11y-toggle">
              <input type="checkbox" checked={tts} onChange={e => setTts(e.target.checked)} />
              <span className="a11y-toggle__slider" />
            </label>
          </div>

          <div className="a11y-divider" />

          <div className="a11y-toggle-row">
            <span className="a11y-toggle-label">High Contrast</span>
            <label className="a11y-toggle">
              <input type="checkbox" checked={highContrast} onChange={e => setHighContrast(e.target.checked)} />
              <span className="a11y-toggle__slider" />
            </label>
          </div>

          <div className="a11y-divider" />

          <div className="a11y-font-row">
            <span className="a11y-font-label">Font Size</span>
            <div className="a11y-font-btns">
              {['normal', 'large', 'xlarge'].map(s => (
                <button
                  key={s}
                  className={`a11y-font-btn ${fontSize === s ? 'active' : ''}`}
                  onClick={() => setFontSize(s)}
                >
                  {s === 'normal' ? 'A' : s === 'large' ? 'A+' : 'A++'}
                </button>
              ))}
            </div>
          </div>

          <div className="a11y-section-label">Hearing</div>

          <div className="a11y-toggle-row">
            <span className="a11y-toggle-label">Speech-to-Text Input</span>
            <label className="a11y-toggle">
              <input type="checkbox" checked={stt} onChange={e => setStt(e.target.checked)} />
              <span className="a11y-toggle__slider" />
            </label>
          </div>

          <div className="a11y-section-label">Cognitive</div>

          <div className="a11y-toggle-row">
            <span className="a11y-toggle-label">Focus Mode</span>
            <label className="a11y-toggle">
              <input type="checkbox" checked={focusMode} onChange={e => setFocusMode(e.target.checked)} />
              <span className="a11y-toggle__slider" />
            </label>
          </div>

        </div>
      )}
    </div>
  )
}

// ── Utility hooks ──────────────────────────────────────────────────────────────

/** Call speak(text) to read text aloud when TTS is on */
export function useTTS() {
  const { tts } = useA11y()

  const speak = (text) => {
    if (!tts || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.95
    window.speechSynthesis.speak(utt)
  }

  const stop = () => window.speechSynthesis?.cancel()

  return { speak, stop, ttsEnabled: tts }
}

/** Returns { transcript, listening, startListening, stopListening } */
export function useSTT(onResult) {
  const { stt } = useA11y()
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)

  const startListening = () => {
    if (!stt) return
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech Recognition not supported in this browser. Use Chrome.'); return }
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = e => onResult(e.results[0][0].transcript)
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  const stopListening = () => {
    recRef.current?.stop()
    setListening(false)
  }

  return { listening, startListening, stopListening, sttEnabled: stt }
}
