import './App.css'
import bg from './assets/img/signin.jpg'
import logo from './assets/img/maki_kape.jpg'

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../src/supabaseClient'

// ✅ react-icons
import {
  FaEnvelope,
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa'

function App() {
  const [showPassword, setShowPassword] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotError, setForgotError] = useState('')

  const navigate = useNavigate()

  // LOGIN / SIGNUP
  const handleSubmit = async () => {
    setErrorMsg('')
    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { username } }
      })

      if (error) {
        setErrorMsg(error.message || 'Signup failed.')
      } else if (data.user) {
        const { error: insertError } = await supabase
          .from('users')
          .insert([{ id: data.user.id, email: email.trim(), username }])

        if (insertError) {
          setErrorMsg('Signup succeeded, but failed to save user info.')
        } else {
          navigate('/menu')
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (error) {
        setErrorMsg(error.message || 'Login failed.')
      } else {
        navigate('/menu')
      }
    }
  }

  // FORGOT PASSWORD
  const handleForgotPassword = async () => {
    setForgotMsg('')
    setForgotError('')

    if (!forgotEmail) {
      setForgotError('Please enter your email')
      return
    }

const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
  redirectTo: window.location.origin + '/resetpassword'
})


    if (error) {
      setForgotError(error.message)
    } else {
      setForgotMsg('Check your email for the password reset link!')
    }
  }

  return (
    <div className="App" style={{ backgroundImage: `url(${bg})` }}>
      <div className="login_form">
        <img className="logo" src={logo} alt="logo" />

        <h2>{isSignup ? 'Create Account' : 'Login'}</h2>

        {errorMsg && <div className="error-message">{errorMsg}</div>}

        {/* EMAIL */}
        <div className="form-group">
          <label>Email:</label>
          <div className="input-group">
            <FaEnvelope className="icon-left" />
            <input
              type="email"
              placeholder="abc@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        {/* SIGNUP ONLY */}
        {isSignup && (
          <div className="form-group">
            <label>Username:</label>
            <div className="input-group">
              <FaUser className="icon-left" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* PASSWORD */}
        <div className="form-group">
          <label>Password:</label>
          <div className="input-group">
            <FaLock className="icon-left" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {/* Forgot Password */}
          {!isSignup && (
            <div className="forgot_container">
              <a
                href="#"
                className="forgot_password"
                onClick={e => {
                  e.preventDefault()
                  setShowForgot(true)
                }}
              >
                Forgot Password?
              </a>
            </div>
          )}
        </div>

        <button onClick={handleSubmit}>
          {isSignup ? 'Sign Up' : 'Login'}
        </button>

        <div className="create_acc">
          {isSignup ? (
            <p>
              Already have an account?{' '}
              <a href="#" onClick={() => setIsSignup(false)}>Login</a>
            </p>
          ) : (
            <p>
              Don&apos;t have an account?{' '}
              <a href="#" onClick={() => setIsSignup(true)}>Create Account</a>
            </p>
          )}
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgot && (
        <div className="forgot-modal">
          <div className="modal-content">
            <h3>Reset Password</h3>

            {forgotError && <p className="error">{forgotError}</p>}
            {forgotMsg && <p className="success">{forgotMsg}</p>}

            <input
              type="email"
              placeholder="Enter your email"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={handleForgotPassword}>Send Reset Link</button>
              <button
                onClick={() => {
                  setShowForgot(false)
                  setForgotEmail('')
                  setForgotMsg('')
                  setForgotError('')
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
