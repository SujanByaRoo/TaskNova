import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../services/api'
import './Auth.css'

const DISABILITIES = [
  {
    key: 'visual',
    icon: '👁️',
    label: 'Visual Impairment',
    desc: 'Blind or low vision — enables Text-to-Speech, high contrast, larger fonts'
  },
  {
    key: 'hearing',
    icon: '👂',
    label: 'Hearing Impairment',
    desc: 'Deaf or hard of hearing — enables Speech-to-Text input, visual cues'
  },
  {
    key: 'cognitive',
    icon: '🧠',
    label: 'Cognitive Disability',
    desc: 'Dyslexia, ADHD, etc. — enables Focus Mode, larger text, lesson summarization'
  }
]

export default function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    daily_study_hours: 2, study_style: 'balanced'
  })
  const [disabilities, setDisabilities] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const toggleDisability = (key) => {
    setDisabilities(prev =>
      prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await registerUser({
        ...form,
        daily_study_hours: parseFloat(form.daily_study_hours),
        disability: disabilities.join(',')
      })
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-box auth-box--wide">
        <div className="auth-logo">⚡ Task<span>Nova</span></div>
        <h2>Create account</h2>
        <p className="auth-sub">Start your study journey today</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={submit}>
          <input name="name" placeholder="Full Name" value={form.name} onChange={handle} required />
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handle} required />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handle} required />
          <label>Daily study hours</label>
          <input name="daily_study_hours" type="number" min="1" max="12" step="0.5" value={form.daily_study_hours} onChange={handle} />
          <label>Study style</label>
          <select name="study_style" value={form.study_style} onChange={handle}>
            <option value="balanced">Balanced</option>
            <option value="visual">Visual</option>
            <option value="reading">Reading</option>
            <option value="practice">Practice-based</option>
          </select>

          <div className="disability-section">
            <div className="disability-heading">
              ♿ Accessibility needs
              <span className="disability-optional">optional</span>
            </div>
            <p className="disability-sub">
              Select any that apply — we'll automatically enable the right tools for you after login.
            </p>
            <div className="disability-cards">
              {DISABILITIES.map(d => (
                <label
                  key={d.key}
                  className={"disability-card" + (disabilities.includes(d.key) ? ' selected' : '')}
                >
                  <input
                    type="checkbox"
                    checked={disabilities.includes(d.key)}
                    onChange={() => toggleDisability(d.key)}
                  />
                  <span className="disability-icon">{d.icon}</span>
                  <span className="disability-label">{d.label}</span>
                  <span className="disability-desc">{d.desc}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  )
}
