// src/pages/Signup.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { auth } from '../utils/auth';
import VerifyEmail from '../components/VerifyEmail';
import '../styles/Auth.css';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState('email'); // 'email' or 'password'
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      // Different flow based on verification method
      if (verificationMethod === 'email') {
        // Email verification flow
        const result = await auth.register(email, fullName, password);
        
        if (result.success) {
          toast.success('Verification code sent to your email!');
          setVerificationNeeded(true);
        } else {
          toast.error(result.message || 'Signup failed');
        }
      } else {
        // Password-only flow (direct signup)
        const result = await auth.signup(email, password);
        
        if (result.success) {
          toast.success('Account created successfully!');
          navigate('/chat');
        } else {
          toast.error(result.message || 'Signup failed');
        }
      }
    } catch (error) {
      toast.error('An error occurred');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  if (verificationNeeded) {
    return <VerifyEmail 
      email={email}
      fullName={fullName}
      password={password}
      onSuccess={() => navigate('/chat')}
    />;
  }
  
  return (
    <>
      <div className="auth-logo">
        Bharat AI
      </div>
      
      <div className="auth-header">
        <h2>Create Account</h2>
        <p>Sign up to start your AI conversations</p>
      </div>
      
      <div className="verification-method">
        <div className="method-title">Verification Method</div>
        <div className="method-buttons">
          <button
            type="button"
            onClick={() => setVerificationMethod('email')}
            className={`method-btn ${verificationMethod === 'email' ? 'active' : ''}`}
          >
            Email Verification
          </button>
          <button
            type="button"
            onClick={() => setVerificationMethod('password')}
            className={`method-btn ${verificationMethod === 'password' ? 'active' : ''}`}
          >
            Password Only
          </button>
        </div>
        <p className="method-description">
          {verificationMethod === 'email' 
            ? 'Email verification provides better security by confirming your identity.' 
            : 'Password-only signup is faster but less secure.'}
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>
        
        {verificationMethod === 'email' && (
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </span>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="auth-input"
                placeholder="Your full name"
                required={verificationMethod === 'email'}
              />
            </div>
          </div>
        )}
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </span>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              placeholder="At least 6 characters"
              required
            />
          </div>
          <p className="input-help">Password must be at least 6 characters</p>
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
            </span>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input"
              placeholder="Confirm your password"
              required
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="submit-btn"
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg className="loading-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }}>
                <path opacity="0.25" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="white" strokeWidth="4"/>
                <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="white" strokeWidth="4" strokeLinecap="round"/>
              </svg>
              Creating account...
            </span>
          ) : 'Sign Up'}
        </button>
      </form>
      
      <div className="auth-helper">
        <div className="divider">
          <span className="divider-text">Already have an account?</span>
        </div>
        
        <p className="auth-footer">
          <Link to="/login" className="signup-link">
            Login instead
          </Link>
        </p>
      </div>
    </>
  );
};

export default Signup;