import { auth } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.bhaai.org.in';

// Enhanced authentication with retry and clock skew handling
export const firebaseAuth = {
  // Sign up with Firebase
  signUp: async (email, password, fullName, phoneNumber) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update user profile with display name
      if (fullName) {
        await updateProfile(user, { displayName: fullName });
      }
      
      // Get ID token with retry mechanism
      const idToken = await getIdTokenWithRetry(user);
      
      // Register with backend
      const response = await fetch(`${API_BASE_URL}/api/auth/firebase-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phoneNumber
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          user: data.user,
          firebaseUser: user
        };
      } else {
        throw new Error(data.message || 'Backend registration failed');
      }
    } catch (error) {
      console.error('Firebase signup error:', error);
      return {
        success: false,
        message: error.message || 'Failed to create account'
      };
    }
  },

  // Sign in with Firebase
  signIn: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get ID token with retry mechanism
      const idToken = await getIdTokenWithRetry(user);
      
      // Verify with backend
      const response = await fetch(`${API_BASE_URL}/api/auth/firebase-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          idToken
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          user: data.user,
          firebaseUser: user
        };
      } else {
        throw new Error(data.message || 'Backend verification failed');
      }
    } catch (error) {
      console.error('Firebase signin error:', error);
      return {
        success: false,
        message: error.message || 'Failed to sign in'
      };
    }
  },

  // Sign out
  signOut: async () => {
    try {
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Firebase signout error:', error);
      return {
        success: false,
        message: error.message || 'Failed to sign out'
      };
    }
  },

  // Get current user
  getCurrentUser: () => {
    return auth.currentUser;
  },

  // Listen for auth state changes
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  },

  // Get ID token for API calls
  getIdToken: async () => {
    const user = auth.currentUser;
    if (user) {
      return await getIdTokenWithRetry(user);
    }
    return null;
  }
};

// Helper function to get ID token with retry and clock skew handling
async function getIdTokenWithRetry(user, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Force refresh token to avoid clock skew issues
      const forceRefresh = attempt > 1;
      const idToken = await user.getIdToken(forceRefresh);
      
      // Add a small delay between retries to allow for time synchronization
      if (attempt > 1) {
        console.log(`Token retry attempt ${attempt}, using force refresh`);
      }
      
      return idToken;
    } catch (error) {
      console.warn(`Token generation attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait with exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export default firebaseAuth;
