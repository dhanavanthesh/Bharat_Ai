// src/pages/Profile.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { auth } from '../utils/auth';
import { profileApi } from '../utils/profileApi';
import '../styles/Profile.css';

const Profile = () => {
  // Add state variables for the form inputs
  const [user, setUser] = useState(auth.getCurrentUser());
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Profile image states
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const [photoUrlFallback, setPhotoUrlFallback] = useState(user?.photoURL || user?.photo_url || '');

  // Password reset states
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Confirmation modal state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const user = auth.getCurrentUser();
    if (user) {
      // Set displayName properly
      if (user.name && user.name.trim()) {
        setDisplayName(user.name);
      } else if (user.email) {
        setDisplayName(user.email.split('@')[0]);
      } else {
        setDisplayName('User');
      }
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      console.log("Fetching profile image for user:", user.id);
      // Try to fetch profile image
      fetch(`${profileApi.getBaseUrl()}/api/profile/image/${user.id}`)
        .then(response => {
          console.log("Profile image response:", {
            ok: response.ok,
            status: response.status,
            contentType: response.headers.get('content-type'),
            url: response.url
          });
          
          // If content type is image, use it directly
          if (response.ok && response.headers.get('content-type')?.includes('image/')) {
            console.log("Received proper image response");
            setProfileImageUrl(response.url);
            return null;
          } 
          // If JSON response, try to extract photo URL
          else if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
            console.log("Received JSON response for profile image");
            return response.json();
          } 
          // For HTML or other unexpected responses, don't set profile image URL
          else {
            console.log("Received HTML or unexpected response - will use fallbacks");
            return null;
          }
        })
        .then(data => {
          console.log("Processed profile image data:", data);
          if (data && data.usePhotoUrl && data.photoUrl) {
            console.log("Using photoUrl fallback from API response:", data.photoUrl);
            setPhotoUrlFallback(data.photoUrl);
          }
        })
        .catch(err => console.error('Error fetching profile image:', err));
    
    // Use photo_url from user as fallback if available
    console.log("Setting photoUrlFallback from user data:", {
      photoURL: user.photoURL,
      photo_url: user.photo_url,
      firebase_uid: user.firebase_uid
    });
    
    // If we have a photo_url in the user object, use it
    if (user.photo_url) {
      setPhotoUrlFallback(user.photo_url);
    } else if (user.photoURL) {
      setPhotoUrlFallback(user.photoURL);
    }
  }
}, [user]);

  // Update state if user data changes
  useEffect(() => {
    if (user) {
      setDisplayName(user.name || '');
      setEmail(user.email || '');
      setPhotoUrlFallback(user.photoURL || user.photo_url || photoUrlFallback);
    }
  }, [user]);

  // Refresh user data on component mount
  useEffect(() => {
    const refreshUserData = async () => {
      if (user?.id) {
        console.log("Refreshing user data for:", user.id);
        try {
          const freshUserData = await profileApi.refreshUserData(user.id);
          console.log("Received fresh user data:", freshUserData);
          
          // Force photo_url detection from MongoDB
          if (freshUserData) {
            // Update user state with the fresh data
            setUser(freshUserData);
            
            // Check if we have a photo_url in the fresh data
            console.log("Checking for photo_url in fresh data:", {
              photoURL: freshUserData.photoURL,
              photo_url: freshUserData.photo_url,
              firebase_uid: freshUserData.firebase_uid
            });
            
            // Set photo URL fallback with proper precedence
            if (freshUserData.photo_url) {
              console.log("Using photo_url from fresh data:", freshUserData.photo_url);
              setPhotoUrlFallback(freshUserData.photo_url);
            } else if (freshUserData.photoURL) {
              console.log("Using photoURL from fresh data:", freshUserData.photoURL);
              setPhotoUrlFallback(freshUserData.photoURL);
            }
          }
        } catch (error) {
          console.error("Error in refreshUserData:", error);
        }
      }
    };
    
    refreshUserData();
  }, [user?.id]); // Remove photoUrlFallback from dependencies to avoid loops
  
  const handleLogout = () => {
    auth.logout();
    toast.info('You have been logged out');
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
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
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
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

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log("Selected file for upload:", {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`
    });

    // Optional: validate file type and size here
    setUploadingImage(true);
    try {
      const result = await profileApi.uploadProfileImage(user.id, file);
      console.log("Profile image upload result:", result);
      
      if (result.success) {
        toast.success('Profile image updated successfully!');
        // Update profile image URL with cache buster to force reload
        const newImageUrl = profileApi.getProfileImageUrl(user.id) + '?t=' + new Date().getTime();
        console.log("Setting new profile image URL:", newImageUrl);
        setProfileImageUrl(newImageUrl);
      } else {
        toast.error(result.message || 'Failed to upload profile image');
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      toast.error('An error occurred while uploading profile image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Update the avatar placeholder to use email when name isn't available
  const getInitialLetter = () => {
    if (name && name.trim()) {
      return name.charAt(0).toUpperCase();
    }
    if (email && email.trim()) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="profile-container">
      {/* Simple background without particles */}
      <div className="profile-bg"></div>

      <div className="profile-content">
        <div className="profile-title">
          Bharat AI (BHAAI)
        </div>

        <div className="profile-subtitle">
          Account Settings
        </div>

        <div className="profile-card">
          <div className="profile-header">
            {/* Update all avatar displays with new logic */}
            <div className="profile-avatar" onClick={handleImageClick}>
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt="Profile"
                  className="profile-image"
                />
              ) : photoUrlFallback ? (
                <img
                  src={photoUrlFallback}
                  alt="Profile"
                  className="profile-image"
                />
              ) : (
                <div className="avatar-placeholder">
                  {getInitialLetter()}
                </div>
              )}
              {!uploadingImage && (
                <div className="avatar-overlay">
                  <span>Change</span>
                </div>
              )}
              {uploadingImage && (
                <div className="uploading-overlay">
                  <div className="spinner"></div>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImageChange}
            />
            
            <div className="profile-user-info">
              <h2>{name || 'User Profile'}</h2>
              <p>{user?.email || 'No email available'}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-section">
              <h3>Personal Information</h3>
              
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
                  <span className="btn-content">
                    <svg className="loading-spinner" viewBox="0 0 24 24">
                      <path opacity="0.25" d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke="currentColor" strokeWidth="4"/>
                      <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  <span className="btn-content">Save Changes</span>
                )}
              </button>
            </div>
          </form>

          <div className="profile-section-divider"></div>

          {!showPasswordReset ? (
            <div className="password-section">
              <h3>Security</h3>
              <p className="section-info">Change your password to keep your account secure</p>
              <button 
                className="profile-password-btn" 
                onClick={() => setShowPasswordReset(true)}
              >
                <span>Change Password</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordReset} className="profile-form password-reset-form">
              <div className="form-section-title">
                <button 
                  type="button" 
                  className="back-button"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"></path>
                  </svg>
                </button>
                <span>Change Password</span>
              </div>
              
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="profile-input"
                    placeholder="Enter current password"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="profile-input"
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </span>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="profile-input"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="input-error">Passwords do not match</p>
                )}
              </div>

              <div className="password-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading || (confirmPassword && newPassword !== confirmPassword)}
                  className="profile-submit-btn"
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          )}

          <div className="profile-footer">
            <div className="profile-action-btns">
              <button
                onClick={() => navigate('/chat')}
                className="profile-back-btn"
              >
                Return to Chat
              </button>

              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="profile-logout-btn"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Simplified Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Sign Out</h3>
            </div>
            <div className="modal-content">
              <p>Are you sure you want to sign out?</p>
            </div>
            <div className="modal-footer">
              <button 
                className="modal-cancel-btn" 
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-confirm-btn" 
                onClick={handleLogout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
