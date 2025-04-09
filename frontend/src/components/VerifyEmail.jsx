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
  }, []);

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
    <div className="space-y-6">
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-5 text-center border border-blue-100 dark:border-blue-800">
        <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-800 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
          Email Verification
        </h2>
        <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
          We've sent a verification code to <strong>{email}</strong>. 
          Please enter the 6-digit code below.
        </p>
      </div>
      
      <form onSubmit={handleVerify} className="space-y-6">
        <div className="flex justify-center">
          <div className="flex gap-2 sm:gap-3 justify-center" onPaste={handlePaste}>
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
                className={`w-11 h-14 text-center text-lg font-bold border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition ${
                  focusedIndex === index ? 'border-blue-500 dark:border-blue-400' : 'border-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending || countdown > 0}
            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 disabled:opacity-50 order-2 sm:order-1"
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
          </button>
          
          <button
            type="submit"
            disabled={loading || code.some(digit => !digit)}
            className="w-full sm:w-auto px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 order-1 sm:order-2"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </div>
      </form>
      
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <p>
          Didn't receive the code? Check your spam folder or click "Resend code".
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;