// src/pages/Signup.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { auth } from '../utils/auth';
import { signInWithGoogle } from '../utils/googleAuth';
import VerifyEmail from '../components/VerifyEmail';
import '../styles/Auth.css';

const Signup = () => {
  const location = useLocation();
  const googleUser = location.state?.googleUser;
  const fromGoogle = location.state?.fromGoogle;
  
  // Initialize state with Google data if available
  const [email, setEmail] = useState(googleUser?.email || '');
  const [fullName, setFullName] = useState(googleUser?.fullName || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91'); // Default to India
  const [loading, setLoading] = useState(false);
  
  // If coming from Google, we'll use the password-only flow
  const [verificationMethod, setVerificationMethod] = useState(fromGoogle ? 'password' : 'email');
  const [verificationNeeded, setVerificationNeeded] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const navigate = useNavigate();
  
  // Calculate password strength
  const calculatePasswordStrength = (password) => {
    if (!password) return 0;
    
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 10) strength += 15;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;
    
    return Math.min(100, strength);
  };
  
  const getStrengthColor = (strength) => {
    if (strength < 30) return '#FF4136'; // Red
    if (strength < 60) return '#FFDC00'; // Yellow
    return '#2ECC40'; // Green
  };
  
  const getStrengthText = (strength) => {
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };
  
  // Evaluate password strength
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);
  
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
    
    // Validate phone number
    if (phone && !/^\d{10}$/.test(phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    setLoading(true);
    
    try {
      const fullPhoneNumber = phone ? `${countryCode}${phone}` : '';
      
      // Different flow based on verification method
      if (verificationMethod === 'email') {
        // Email verification flow
        const result = await auth.register(email, fullName, password, fullPhoneNumber);
        
        if (result.success) {
          toast.success('Verification code sent to your email!');
          setVerificationNeeded(true);
        } else {
          toast.error(result.message || 'Signup failed');
        }
      } else {
        // Password-only flow (direct signup)
        const result = await auth.signup(email, password, fullName, fullPhoneNumber);
        
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
  
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const result = await signInWithGoogle();
      
      if (result.success) {
        toast.success('Logged in successfully!');
        navigate('/chat');
      } else if (result.requireSignup && result.googleProfile) {
        // User needs to complete signup with additional info
        navigate('/complete-google-signup', { 
          state: { googleProfile: result.googleProfile } 
        });
      } else {
        toast.error(result.message || 'Google sign-in failed');
      }
    } catch (error) {
      toast.error('An error occurred during Google sign-in');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  if (verificationNeeded) {
    return (
      <div className="auth-container">
        <div className="auth-bg"></div>
        <div className="auth-card">
          <VerifyEmail 
            email={email}
            fullName={fullName}
            password={password}
            onSuccess={() => navigate('/chat')}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="auth-container">
      <div className="auth-bg"></div>
      
      <div className="auth-title">Bharat AI</div>
      <div className="auth-subtitle">Experience next-generation AI, powered by India</div>
      
      <div className="auth-card">
        <div className="auth-logo">
          Bharat AI
        </div>
        
        <div className="auth-header">
          <h2>Create an Account</h2>
          <p>Join our AI-powered community today</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
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
                placeholder="Enter your full name"
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
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
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number (Optional)</label>
            <div className="phone-input-wrapper">
              <div className="country-code">
                <select 
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="country-code-select"
                >
                  <option value="+91">+91 (IN)</option>
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+61">+61 (AU)</option>
                  <option value="+971">+971 (UAE)</option>
                  <option value="+65">+65 (SG)</option>
                </select>
              </div>
              <div className="input-wrapper phone-number-input">
                <span className="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                </span>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="auth-input"
                  placeholder="10-digit number (optional)"
                  maxLength={10}
                />
              </div>
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
                placeholder="Create a strong password"
                required
              />
            </div>
            
            {password && (
              <div className="password-strength">
                <div className="strength-bar-container">
                  <div 
                    className="strength-bar" 
                    style={{
                      width: `${passwordStrength}%`,
                      backgroundColor: getStrengthColor(passwordStrength)
                    }}
                  ></div>
                </div>
                <div className="strength-text" style={{color: getStrengthColor(passwordStrength)}}>
                  {getStrengthText(passwordStrength)}
                </div>
              </div>
            )}
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
              <span className="loading-state">
                <svg className="loading-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path opacity="0.25" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="white" strokeWidth="4"/>
                  <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                </svg>
                Creating account...
              </span>
            ) : 'Create Account'}
          </button>
        </form>
        
        <div className="divider">
          <span className="divider-line"></span>
          <span className="divider-text">or</span>
          <span className="divider-line"></span>
        </div>
        
        <div className="google-signin-container">
          <button 
            onClick={handleGoogleSignIn} 
            disabled={loading} 
            className="google-signin-btn"
          >
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Sign up with Google
          </button>
        </div>
        
        <div className="auth-helper">
          <p>Already have an account? <a href="/login" className="auth-link">Login</a></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;