// src/components/VerifyEmail.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { auth } from '../utils/auth';

const VerifyEmail = ({ email, fullName, password, onSuccess, isLogin = false }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = Array(6).fill(0).map(() => React.createRef());
  const navigate = useNavigate();

  useEffect(() => {
    let interval = null;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  useEffect(() => {
    // Focus the first input on component mount
    if (inputRefs[0]?.current) {
      inputRefs[0].current.focus();
    }
  }, [inputRefs]);

  const handleInputChange = (index, value) => {
    if (/^\d?$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);
      
      // Auto-focus to next input if a digit was entered
      if (value && index < 5) {
        inputRefs[index + 1].current.focus();
        setFocusedIndex(index + 1);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace to move to previous input
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs[index - 1].current.focus();
      setFocusedIndex(index - 1);
    }
    
    // Handle arrow keys for navigation between inputs
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1].current.focus();
      setFocusedIndex(index - 1);
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs[index + 1].current.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
    
    const newCode = [...code];
    digits.forEach((digit, index) => {
      if (index < 6) {
        newCode[index] = digit;
      }
    });
    
    setCode(newCode);
    
    // Focus the appropriate input based on how many digits were pasted
    const focusIndex = Math.min(digits.length, 5);
    if (inputRefs[focusIndex]?.current) {
      inputRefs[focusIndex].current.focus();
      setFocusedIndex(focusIndex);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    
    const verificationCode = code.join('');
    if (verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await auth.verifyEmail(email, verificationCode);
      
      if (result.success) {
        toast.success('Email verified successfully!');
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/chat');
        }
      } else {
        toast.error(result.message || 'Verification failed');
      }
    } catch (error) {
      toast.error('An error occurred');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setResending(true);
    
    try {
      let result;
      
      if (isLogin) {
        result = await auth.sendVerification(email);
      } else {
        // Re-register to get a new code
        result = await auth.register(email, fullName, password);
      }
      
      if (result.success) {
        toast.success('A new verification code has been sent to your email');
        setCountdown(60); // 1 minute cooldown
      } else {
        toast.error(result.message || 'Failed to resend code');
      }
    } catch (error) {
      toast.error('An error occurred');
      console.error(error);
    } finally {
      setResending(false);
    }
  };
  
  return (
    <div className="verification-container">
      <div className="auth-logo">
        Bharat AI
      </div>
      
      <div className="auth-header">
        <h2>Email Verification</h2>
        <p>
          We've sent a verification code to <span className="verification-email">{email}</span>
        </p>
      </div>
      
      <form onSubmit={handleVerify}>
        <div className="otp-inputs" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onFocus={() => setFocusedIndex(index)}
              className={`otp-input ${focusedIndex === index ? 'focused' : ''}`}
            />
          ))}
        </div>
        
        <div className="otp-actions">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending || countdown > 0}
            className="resend-btn"
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
          </button>
          
          <button
            type="submit"
            disabled={loading || code.some(digit => !digit)}
            className="submit-btn"
            style={{ width: 'auto', padding: '10px 20px', marginTop: 0 }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </div>
      </form>
      
      <div className="auth-helper" style={{ marginTop: '20px' }}>
        <p className="auth-footer">
          Didn't receive the code? Check your spam folder or click "Resend code".
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;