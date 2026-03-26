import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import MoodCheck from './pages/MoodCheck'
import Profile from './pages/Profile'
import SubjectPage from './pages/Subject'
import { A11yProvider } from './components/AccessibilityToolbar'

function AuthedApp() {
  return (
    <A11yProvider>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/subject/:subjectId" element={<SubjectPage />} />
        <Route path="/mood" element={<MoodCheck />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </A11yProvider>
  )
}

function App() {
  const userId = localStorage.getItem('user_id')

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={userId ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/*" element={<AuthedApp />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
