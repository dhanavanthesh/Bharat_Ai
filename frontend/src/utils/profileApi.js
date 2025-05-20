// Get the API base URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

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
  }
};
