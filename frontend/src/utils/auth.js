// src/utils/auth.js

// User authentication state
let currentUser = JSON.parse(localStorage.getItem('user')) || null;

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
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
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
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, fullName, password }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Verify email with OTP
  verifyEmail: async (email, code) => {
    try {
      const response = await fetch('http://localhost:5000/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });
      
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
      const response = await fetch('http://localhost:5000/api/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      return await response.json();
    } catch (error) {
      console.error('Send verification error:', error);
      return { success: false, message: 'Network error' };
    }
  },
  
  // Login
  login: async (email, password) => {
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
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