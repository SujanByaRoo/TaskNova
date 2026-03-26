import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../services/api'
import './Auth.css'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', daily_study_hours: 2, study_style: 'balanced' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await registerUser({ ...form, daily_study_hours: parseFloat(form.daily_study_hours) })
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    }
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
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
          <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  )
}
