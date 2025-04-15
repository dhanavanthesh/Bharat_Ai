import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { auth } from '../utils/auth';

const VerifyEmail = ({ email, fullName, password, onSuccess }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await auth.verifyEmail(email, code);
      
      if (result.success) {
        toast.success('Email verified successfully!');
        onSuccess();
      } else {
        toast.error(result.message || 'Verification failed');
      }
    } catch (error) {
      toast.error('An error occurred during verification');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      const result = await auth.register(email, fullName, password);
      
      if (result.success) {
        toast.success('New verification code sent to your email!');
      } else {
        toast.error(result.message || 'Failed to resend code');
      }
    } catch (error) {
      toast.error('An error occurred');
      console.error(error);
    }
  };

  return (
    <>
      <div className="auth-logo">
        Bharat AI
      </div>
      
      <div className="auth-header">
        <h2>Verify Your Email</h2>
        <p>Enter the verification code sent to {email}</p>
      </div>
      
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="code">Verification Code</label>
          <div className="input-wrapper">
            <span className="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM11 14H9V9H11V14ZM11 8H9V6H11V8Z" />
              </svg>
            </span>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="auth-input"
              placeholder="Enter 6-digit code"
              required
              maxLength={6}
              pattern="\d{6}"
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
              Verifying...
            </span>
          ) : 'Verify Email'}
        </button>
      </form>
      
      <div className="auth-helper">
        <button 
          onClick={handleResendCode}
          className="text-link"
          type="button"
          style={{
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: '8px'
          }}
        >
          Didn't receive the code? Send again
        </button>
      </div>
    </>
  );
};

export default VerifyEmail;