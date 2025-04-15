// Get the API base URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.bhaai.org.in';  // Changed from http://localhost:5000

// User authentication state
let currentUser = JSON.parse(localStorage.getItem('user')) || null;

// Common fetch options with CORS settings
const fetchOptions = {
  credentials: 'include',  // Include credentials for CORS
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// Authentication functions
export const auth = {
  // Check if user is logged in
  isAuthenticated: () => {
    return !!currentUser;
  },
  
  // Get current user
  getCurrentUser: () => {
    return currentUser;
  },
  
  // Register new user (this was called signup in your original code)
  signup: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        ...fetchOptions,
        method: 'POST',
        body: JSON.stringify({ email, password }),  
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Signup failed' };
      }
      
      const data = await response.json();
      
      if (data.success) {
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
        return { success: true, user: currentUser };
      }
      
      return { success: false, message: data.message || 'Signup failed' };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Register with the new API (this will be used in the newer email verification flow)
  register: async (email, fullName, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        ...fetchOptions,
        method: 'POST',
        body: JSON.stringify({ email, fullName, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Registration failed' };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Verify email with OTP
  verifyEmail: async (email, code) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify`, {
        ...fetchOptions,
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Verification failed' };
      }
      
      const data = await response.json();
      
      if (data.success) {
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
      }
      
      return data;
    } catch (error) {
      console.error('Verification error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Request verification code for login
  sendVerification: async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/send-verification`, {
        ...fetchOptions,
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Send verification failed' };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Send verification error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Login
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        ...fetchOptions,
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message || 'Login failed' };
      }
      
      const data = await response.json();
      
      if (data.success) {
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
        return { success: true, user: currentUser };
      }
      
      return { success: false, message: data.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Logout
  logout: () => {
    currentUser = null;
    localStorage.removeItem('user');
  }
};