// src/pages/Profile.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { auth } from '../utils/auth';
import { profileApi } from '../utils/profileApi';
import '../styles/Profile.css';

const Profile = () => {
  const user = auth.getCurrentUser();
  const navigate = useNavigate();
  
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  
  // Password reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const handleLogout = () => {
    auth.logout();
    toast.info('You have been logged out');
    navigate('/login');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Profile updates not implemented in the backend yet
      // In a real app, you would send a request to update the user profile
      const result = await profileApi.updateProfile(user.id, { name });
      
      if (result.success) {
        toast.success('Profile updated successfully!');
      } else {
        toast.error(result.message || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred while updating profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setPasswordLoading(true);
    
    try {
      const result = await profileApi.resetPassword(user.id, currentPassword, newPassword);
      
      if (result.success) {
        toast.success('Password reset successful!');
        // Clear form fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Hide password reset section
        setShowPasswordReset(false);
      } else {
        toast.error(result.message || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('An error occurred while resetting password');
      console.error(error);
    } finally {
      setPasswordLoading(false);
    }
  };
  
  if (!user) {
    navigate('/login');
    return null;
  }
  
  return (
    <div className="profile-container">
      {/* Unique particle background for profile page */}
      <div className="profile-bg"></div>
      
      <div className="profile-title">
        Bharat AI (BHAAI)
      </div>
      
      <div className="profile-subtitle">
        Manage your account settings
      </div>
      
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {name.charAt(0).toUpperCase()}
          </div>
          <h2>{name || 'User Profile'}</h2>
          <p>{user?.email || 'No email available'}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="profile-form">
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
                value={user?.email || ''}
                disabled
                className="profile-input"
                placeholder="Email address"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="name">Display Name</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </span>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="profile-input"
                placeholder="Your display name"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="profile-submit-btn"
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg className="loading-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }}>
                  <path opacity="0.25" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="white" strokeWidth="4"/>
                  <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                </svg>
                Saving Changes...
              </span>
            ) : 'Save Changes'}
          </button>
        </form>
        
        <div className="profile-section-divider">
          <span>Password Management</span>
        </div>
        
        {!showPasswordReset ? (
          <button 
            className="profile-password-btn" 
            onClick={() => setShowPasswordReset(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Reset Password
          </button>
        ) : (
          <form onSubmit={handlePasswordReset} className="profile-form password-reset-form">
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="profile-input"
                  placeholder="Enter your current password"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="profile-input"
                  placeholder="Enter your new password"
                  required
                  minLength={6}
                />
              </div>
              <p className="input-help">Password must be at least 6 characters long</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
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
                  className="profile-input"
                  placeholder="Confirm your new password"
                  required
                />
              </div>
            </div>
            
            <div className="password-reset-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowPasswordReset(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={passwordLoading}
                className="profile-submit-btn"
              >
                {passwordLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg className="loading-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }}>
                      <path opacity="0.25" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="white" strokeWidth="4"/>
                      <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                    </svg>
                    Resetting...
                  </span>
                ) : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
        
        <div className="profile-alert warning" style={{ marginTop: '30px' }}>
          <div className="profile-alert-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'rgb(252, 211, 77)' }}>
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Account Security
          </div>
          <p className="profile-alert-content">
            For additional security, you can update your password regularly and enable two-factor authentication when available.
          </p>
        </div>
        
        <div className="profile-action-btns">
          <button
            onClick={() => navigate('/chat')}
            className="profile-back-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Chat
          </button>
          
          <button
            onClick={handleLogout}
            className="profile-danger-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm7 5a1 1 0 00-1 1v6a1 1 0 102 0V9a1 1 0 00-1-1zm2-2a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;