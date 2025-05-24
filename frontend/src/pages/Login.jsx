// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { auth } from '../utils/auth';
import VerifyEmail from '../components/VerifyEmail';
import { signInWithGoogle } from '../utils/googleAuth';
import '../styles/Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await auth.login(email, password);

      if (result.success) {
        toast.success('Login successful!');
        // Force page reload to ensure client-side state is reset
        setTimeout(() => {
          window.location.href = '/chat';
        }, 1000);
      } else {
        // Check if this is a verification issue
        if (result.message && result.message.toLowerCase().includes('verify')) {
          toast.info('Email verification required');
          await requestVerification();
        } else {
          toast.error(result.message || 'Login failed');
        }
      }
    } catch (error) {
      toast.error('An error occurred');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const requestVerification = async () => {
    try {
      const result = await auth.sendVerification(email);
      
      if (result.success) {
        setVerificationMode(true);
        toast.info('Verification code sent to your email');
      } else {
        toast.error(result.message || 'Failed to send verification code');
      }
    } catch (error) {
      toast.error('An error occurred');
      console.error(error);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.success) {
        toast.success('Login successful!');
        // Force reload to /chat for Google login as well
        setTimeout(() => {
          window.location.href = '/chat';
        }, 1000);
      } else if (result.requireSignup) {
        // New user - redirect to signup completion
        navigate('/complete-google-signup', { 
          state: { googleProfile: result.googleProfile }
        });
      } else {
        toast.error(result.message || 'Google sign-in failed');
      }
    } catch (error) {
      console.error("Google sign-in process error:", error);
      toast.error('Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (verificationMode) {
    return <VerifyEmail email={email} isLogin={true} onSuccess={() => navigate('/chat')} />;
  }
  
  return (
    <>
      <div className="auth-logo">
        Bharat AI
      </div>
      
      <div className="auth-header">
        <h2>Welcome Back</h2>
        <p>Log in to continue your conversations</p>
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
              placeholder="Enter your password"
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
              Logging in...
            </span>
          ) : 'Log In'}
        </button>
      </form>
      
      <div className="auth-helper">
        <button 
          onClick={() => email ? requestVerification() : toast.error('Please enter your email first')}
          className="auth-link"
        >
          Trouble logging in? Get verification code
        </button>
        
        <div className="divider">
          <span className="divider-text">Or</span>
        </div>
        
        <p className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" className="signup-link">
            Sign up
          </Link>
        </p>
      </div>
      
      {/* Add Google Sign-in Button */}
      <div className="google-signin-container">
        <div className="divider">
          <span className="divider-text">Or continue with</span>
        </div>
        
        <button 
          type="button"
          onClick={handleGoogleSignIn}
          className="google-signin-btn"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2a10.35 10.35 0 0 0-.17-1.84H9v3.5h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.64z"/>
            <path fill="#34A853" d="M9 18a8.6 8.6 0 0 0 6-2.18l-2.91-2.26a5.4 5.4 0 0 1-8.09-2.85h-3v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M4 10.71a5.37 5.37 0 0 1 0-3.42V4.96H1a9 9 0 0 0 0 8.08l3-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 1 4.96l3 2.33C4.62 5.13 6.62 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </>
  );
};

export default Login;