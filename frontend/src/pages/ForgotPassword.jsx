import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './Auth.css'

const API = 'http://localhost:8000/api'

export default function ForgotPassword() {
  const [step, setStep] = useState('email') // email | reset | done
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const checkEmail = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await axios.post(`${API}/user/check-email`, { email })
      setStep('reset')
    } catch (err) {
      setError(err.response?.data?.detail || 'Email not found')
    }
    setLoading(false)
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    if (newPassword !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await axios.post(`${API}/user/reset-password`, { email, new_password: newPassword })
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed')
    }
    setLoading(false)
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-logo">⚡ Task<span>Nova</span></div>

        {step === 'email' && (
          <>
            <h2>Forgot password</h2>
            <p className="auth-sub">Enter your registered email to continue</p>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={checkEmail}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </form>
          </>
        )}

        {step === 'reset' && (
          <>
            <h2>Set new password</h2>
            <p className="auth-sub">Choose a new password for <strong>{email}</strong></p>
            {error && <div className="auth-error">{error}</div>}
            <form onSubmit={resetPassword}>
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <>
            <div style={{ fontSize: 48, textAlign: 'center', margin: '16px 0 8px' }}>✅</div>
            <h2 style={{ textAlign: 'center' }}>Password updated!</h2>
            <p className="auth-sub" style={{ textAlign: 'center' }}>
              Your password has been changed successfully.
            </p>
          </>
        )}

        <p className="auth-link">
          <Link to="/login">← Back to Login</Link>
        </p>
      </div>
    </div>
  )
}
