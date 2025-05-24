import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth as firebaseAuth } from '../firebase/config';
import apiClient from './apiClient';

// Create and configure the Google Auth Provider
const googleProvider = new GoogleAuthProvider();
// Add scopes for additional permissions
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
// Set prompt parameter to ensure user selects an account
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.bhaai.org.in';

/**
 * Sign in with Google using Firebase Authentication
 */
export const signInWithGoogle = async () => {
  try {
    console.log("Starting Google sign-in process");
    
    // Trigger Google sign-in popup
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    console.log("Google sign-in success:", result);
    
    // Get ID token from Firebase
    const idToken = await result.user.getIdToken();
    
    // Extract Google user info
    const googleUser = {
      email: result.user.email,
      name: result.user.displayName,
      photoURL: result.user.photoURL,
      firebaseUid: result.user.uid,
      idToken: idToken, // Include the idToken in the user profile
    };
    
    // First check if this Google user can directly sign in
    try {
      console.log("Attempting direct Google sign-in with backend");
      
      // Process Google sign-in with our backend
      const loginResponse = await apiClient.post('/api/auth/google-signin', {
        idToken
      });
      
      console.log("Backend response for google-signin:", loginResponse);
      
      if (loginResponse.success) {
        console.log("Google login successful, user exists in system");
        // Store user data in localStorage
        if (loginResponse.user) {
          localStorage.setItem('user', JSON.stringify(loginResponse.user));
        }
        
        return {
          success: true,
          user: loginResponse.user,
          redirectToChat: true // Add direct redirect instruction
        };
      } else if (loginResponse.requireSignup) {
        // Check if email exists in our system but with different auth method
        console.log("Backend reports user needs to complete registration, checking email exists");
        const checkResponse = await apiClient.post('/api/check-user-exists', {
          email: googleUser.email
        });
        
        console.log("Backend response for check-user-exists:", checkResponse);
        
        if (checkResponse.exists) {
          console.log("Email exists but cannot login with Google - possible auth method mismatch");
          return {
            success: false,
            message: "This email is registered but not with Google. Please use your original login method.",
            emailExists: true
          };
        }
        
        console.log("New Google user, proceeding to signup completion");
        return {
          success: false,
          requireSignup: true,
          googleProfile: googleUser
        };
      } else {
        console.warn("Unexpected backend response for google-signin:", loginResponse);
      }
    } catch (signInError) {
      console.error("Google sign-in attempt failed:", signInError);
      
      // Check if this is a "email already exists" error
      if (signInError.message && signInError.message.includes("Email already registered")) {
        console.log("Email already registered error detected");
        
        // Try the login once more with the token
        try {
          const retryLoginResponse = await apiClient.post('/api/auth/google-signin', {
            idToken,
            forceLogin: true // Add a flag to indicate we're retrying after failure
          });
          
          console.log("Retry login response:", retryLoginResponse);
          
          if (retryLoginResponse.success) {
            console.log("Retry login successful");
            if (retryLoginResponse.user) {
              localStorage.setItem('user', JSON.stringify(retryLoginResponse.user));
            }
            
            return {
              success: true,
              user: retryLoginResponse.user,
              redirectToChat: true
            };
          }
        } catch (retryError) {
          console.error("Retry login also failed:", retryError);
        }
      }
    }
    
    // If we get here, the user needs to complete registration
    console.log("User not registered or login failed, returning to signup flow");
    return {
      success: false,
      requireSignup: true,
      googleProfile: googleUser
    };
    
  } catch (error) {
    console.error('Google sign-in error:', error);
    return {
      success: false,
      message: error.message || 'Google sign-in failed'
    };
  }
};

/**
 * Complete the Google signup process with additional user data
 */
export const completeGoogleSignup = async (googleProfile, additionalData) => {
  try {
    if (!googleProfile || !googleProfile.email) {
      throw new Error('Google profile data is missing');
    }

    // Combine Google profile with additional data
    const userData = {
      email: googleProfile.email,
      name: additionalData.name || googleProfile.name, // Use provided name or fallback to Google name
      photoURL: googleProfile.photoURL,
      firebaseUid: googleProfile.firebaseUid,
      phoneNumber: additionalData.phoneNumber,
      password: additionalData.password
    };

    // Make API call to complete signup
    const response = await apiClient.post('/api/auth/complete-google-signup', userData);

    // Check response data correctly
    if (response.success) {
      // Store user data in localStorage
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      
      return {
        success: true,
        message: response.message || 'Account created successfully!',
        user: response.user,
        redirectToChat: true
      };
    } else if (response.existingUser) {
      // User already exists - can be directly logged in
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }
      
      return {
        success: true,
        message: 'You already have an account! Logging you in...',
        user: response.user,
        redirectToChat: true,
        existingUser: true
      };
    } else {
      return {
        success: false,
        message: response.message || 'Failed to complete registration'
      };
    }
  } catch (error) {
    console.error("Error completing Google signup:", error);
    
    // Handle "Email already registered" error by attempting login
    if (error.message && error.message.includes("Email already registered")) {
      try {
        // Use the idToken from the googleProfile object
        const idToken = googleProfile.idToken;
        
        if (!idToken) {
          return {
            success: false,
            message: "Cannot login: missing authentication token"
          };
        }
        
        console.log("Attempting direct login with idToken for existing user");
        const loginResponse = await apiClient.post('/api/auth/google-signin', {
          idToken
        });
        
        if (loginResponse.data && loginResponse.data.success) {
          // Store user data in localStorage before returning
          if (loginResponse.data.user) {
            localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
          }
          
          return {
            success: true,
            message: "Successfully logged in existing account",
            user: loginResponse.data.user,
            redirectToChat: true
          };
        } else {
          return {
            success: false,
            message: loginResponse.data?.message || "Login failed after detecting existing email"
          };
        }
      } catch (loginError) {
        console.error("Login error after existing email detected:", loginError);
        return {
          success: false,
          message: loginError.message || "Login failed after existing email detected"
        };
      }
    }
    
    return {
      success: false,
      message: error.message || 'Failed to complete registration'
    };
  }
};

export default { signInWithGoogle, completeGoogleSignup };
