// Get the API base URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.bhaai.org.in';

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


const apiCall = async (endpoint, method, body) => {
  try {
    console.log(`Making ${method} request to ${endpoint}`, body);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      method,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log(`Response status: ${response.status}`);

    const data = await response.json();
    console.log('Response data:', data);

    if (!response.ok) {
      throw new Error(data.message || `${method} request failed`);
    }

    return data;
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

  signup: async (email, password) => {
    const data = await apiCall('/api/signup', 'POST', { email, password });
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
    }
    return data;
  },

  register: async (email, fullName, password) => {
    return await apiCall('/api/register', 'POST', { email, fullName, password });
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
  }
};