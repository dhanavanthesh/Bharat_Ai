// Get the API base URL from environment variables
//const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.bhaai.org.in';

// Common fetch options with CORS settings
const fetchOptions = {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

/**
 * Make an API call with error handling and retries
 */
const apiCall = async (endpoint, method, body, retries = 2) => {
  let attempts = 0;
  
  const makeRequest = async () => {
    attempts++;
    try {
      console.log(`Making ${method} request to ${endpoint} (attempt ${attempts}/${retries + 1})`, body);

      // Create request URL
      const url = `${API_BASE_URL}${endpoint}`;
      
      // Create request options
      const options = {
        ...fetchOptions,
        method,
        body: body ? JSON.stringify(body) : undefined,
      };

      // Set request timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      options.signal = controller.signal;
      
      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      console.log(`Response status: ${response.status}`);

      // Try to parse JSON response
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error('Invalid response format');
      }
      
      if (!response.ok) {
        throw new Error(data.message || data.error || `${method} request failed`);
      }

      return data;
    } catch (error) {
      // Handle AbortError (timeout) with retry logic
      if (error.name === 'AbortError') {
        console.error('Request timed out');
        if (attempts <= retries) {
          console.log(`Retrying... (attempt ${attempts}/${retries})`);
          return makeRequest();
        }
      }
      
      // General connection errors with retry logic
      if ((error.message === 'Failed to fetch' || error.message.includes('NetworkError')) && attempts <= retries) {
        console.error(`Network error: ${error.message}`);
        console.log(`Retrying... (attempt ${attempts}/${retries})`);
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
        return makeRequest();
      }
      
      throw error;
    }
  };
  
  try {
    return await makeRequest();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    return {
      success: false,
      message: error.message || 'Network error'
    };
  }
};

// Profile-related functions
export const profileApi = {
  /**
   * Reset user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - API response
   */
  resetPassword: async (userId, currentPassword, newPassword) => {
    return await apiCall('/api/reset-password', 'POST', {
      userId,
      currentPassword,
      newPassword
    });
  },

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} - API response
   */
  updateProfile: async (userId, profileData) => {
    return await apiCall('/api/update-profile', 'PUT', {
      userId,
      ...profileData
    });
  },

  /**
   * Upload profile image
   * @param {string} userId - User ID
   * @param {File} imageFile - Image file to upload
   * @returns {Promise<Object>} - API response
   */
  uploadProfileImage: async (userId, imageFile) => {
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('image', imageFile);

    try {
      const response = await fetch(`${API_BASE_URL}/api/profile/image`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Upload failed' };
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error uploading profile image:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  },

  /**
   * Update user profile information
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} - API response
   */
  updateUserProfile: async (userId, userData) => {
    try {
      // Use apiCall instead of direct fetch for consistency
      const data = await apiCall(`/api/profile/${userId}/update`, 'POST', userData);
      
      if (data.success && data.user) {
        // Update the user data in localStorage to keep it in sync
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = { ...currentUser, ...data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('Profile updated and stored in localStorage:', updatedUser);
      } else {
        console.error('Update profile API returned error:', data);
      }
      
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, message: 'Failed to update profile' };
    }
  },
  
  /**
   * Get the base URL for API calls
   * @returns {string} - API base URL
   */
  getBaseUrl: () => {
    return API_BASE_URL;
  },
  
  /**
   * Refresh user data from the backend
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - Refreshed user data or null if failed
   */
  refreshUserData: async (userId) => {
    try {
      // Use the API_BASE_URL to ensure correct endpoint
      const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`, {
        ...fetchOptions,
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh user data. Status: ${response.status}`);
      }
      
      // Check content type to avoid parsing HTML as JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Server returned non-JSON response:', contentType);
        // Try to get user data from local storage
        const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
        return cachedUser;
      }
      
      const data = await response.json();
      console.log("Raw API response for user data:", data);
      
      if (data.success && data.user) {
        // Make sure we preserve photo_url if it exists in the database
        const enhancedUser = data.user;
        
        // Store the updated user in localStorage
        localStorage.setItem('user', JSON.stringify(enhancedUser));
        return enhancedUser;
      }
      return null;
    } catch (error) {
      console.error("Error refreshing user data:", error);
      // Return cached user data as fallback when API fails
      try {
        const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
        return cachedUser;
      } catch (e) {
        return null;
      }
    }
  },
  
  /**
   * Get profile image URL with fallback
   * @param {string} userId - User ID
   * @returns {string} - URL to fetch profile image
   */
  getProfileImageUrl: (userId) => {
    // Update to use the API_BASE_URL
    return `${API_BASE_URL}/api/profile/image/${userId}`;
  }
};
