import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { completeGoogleSignup } from '../utils/googleAuth';
import '../styles/Auth.css';

const GoogleSignupCompletion = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get Google profile data passed from Login page
  const googleProfile = location.state?.googleProfile || {};
  
  if (!googleProfile.email) {
    // Redirect if no Google data available
    navigate('/login');
  }
  
  // Added state for name, pre-filled with Google-provided name
  const [name, setName] = useState(googleProfile.name || '');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91'); // Default to India
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
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
    
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    
    if (!phone) {
      toast.error('Phone number is required');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    // Validate phone number
    if (!/^\d{10}$/.test(phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    setLoading(true);
    
    try {
      // Complete the Google signup process with additional info
      const result = await completeGoogleSignup(googleProfile, {
        name: name, // Include the potentially updated name
        phoneNumber: `${countryCode}${phone}`,
        password: password
      });
      
      if (result.success) {
        if (result.existingUser) {
          toast.success('Account already exists! Logging you in...');
        } else {
          toast.success('Account created successfully!');
        }
        // Force reload to /chat after signup completion
        setTimeout(() => {
          window.location.href = '/chat';
        }, 1000);
      } else {
        toast.error(result.message || 'Failed to complete signup');
      }
    } catch (error) {
      toast.error('An error occurred');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#1A0933] flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-8 text-pink-400">Bharat AI (BHAAI)</h1>
        
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Complete Your Registration</h2>
          <p className="text-gray-300">Add your details to finish setting up your account</p>
        </div>
        
        <div className="bg-[#2A1347] rounded-lg p-6 shadow-lg mb-6">
          <div className="flex items-center mb-4">
            <img 
              src={googleProfile.photoURL || '/default-avatar.png'} 
              alt="Profile" 
              className="w-12 h-12 rounded-full mr-3 border-2 border-gray-600"
            />
            <div>
              <div className="text-sm text-gray-400">{googleProfile.email}</div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New name field */}
            <div>
              <label className="block text-sm mb-2">Your Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 bg-[#3D1C5A] rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Your full name"
                  required
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm mb-2">Phone Number</label>
              <div className="flex">
                <div className="w-1/4 mr-2">
                  <select 
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full p-3 bg-[#3D1C5A] rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="+91">+91 (IN)</option>
                    <option value="+1">+1 (US)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AU)</option>
                    <option value="+971">+971 (UAE)</option>
                    <option value="+65">+65 (SG)</option>
                  </select>
                </div>
                <div className="w-3/4">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full p-3 bg-[#3D1C5A] rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="10-digit number"
                    maxLength={10}
                    required
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm mb-2">Create Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-[#3D1C5A] rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="At least 6 characters"
                  required
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              
              {password && (
                <div className="mt-2">
                  <div className="h-1.5 w-full bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-300 ease-out"
                      style={{
                        width: `${passwordStrength}%`,
                        backgroundColor: getStrengthColor(passwordStrength)
                      }}
                    ></div>
                  </div>
                  <div className="text-xs mt-1 text-right" style={{color: getStrengthColor(passwordStrength)}}>
                    {getStrengthText(passwordStrength)}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 bg-[#3D1C5A] rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Confirm your password"
                  required
                />
                <div className="absolute right-3 top-3 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </div>
              ) : 'Complete Registration'}
            </button>
          </form>
        </div>
        
        
      </div>
    </div>
  );
};

export default GoogleSignupCompletion;
