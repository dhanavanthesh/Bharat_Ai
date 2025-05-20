// Get the API base URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.bhaai.org.in';
//const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

// User authentication state
let currentUser = JSON.parse(localStorage.getItem('user')) || null;

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
      
      console.log('Response data:', data);

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

// Authentication functions
export const auth = {
  isAuthenticated: () => !!currentUser,
  getCurrentUser: () => currentUser,

  signup: async (email, password, fullName = '', phoneNumber = '') => {
    const data = await apiCall('/api/signup', 'POST', { 
      email, 
      password, 
      fullName,
      phoneNumber
    });
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
    return data;
  },

  register: async (email, fullName, password, phoneNumber = '') => {
    return await apiCall('/api/register', 'POST', { 
      email, 
      fullName, 
      password,
      phoneNumber
    });
  },

  verifyEmail: async (email, code) => {
    const data = await apiCall('/api/verify', 'POST', { email, code });
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
    return data;
  },

  sendVerification: async (email) => {
    return await apiCall('/api/send-verification', 'POST', { email });
  },

  login: async (email, password) => {
    const data = await apiCall('/api/login', 'POST', { email, password });
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
    return data;
  },

  logout: () => {
    currentUser = null;
    localStorage.removeItem('user');
  },

  // Check if the API is available
  checkApiHealth: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        return {
          available: true,
          status: data.status,
          database: data.database,
          timestamp: data.timestamp
        };
      }
      
      return { available: false };
    } catch (error) {
      console.error('API health check failed:', error);
      return { available: false, error: error.message };
    }
  }
};