import { auth } from '../firebase/config';
import { 
  GoogleAuthProvider, 
  signInWithPopup
} from 'firebase/auth';

// Create a Google auth provider
const googleProvider = new GoogleAuthProvider();
// Add scopes for additional profile info
googleProvider.addScope('profile');
googleProvider.addScope('email');

// Function to handle Google Sign-in
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    
    // Get user information from the Google account
    const user = result.user;
    const userInfo = {
      email: user.email,
      fullName: user.displayName || '',
      photoURL: user.photoURL || '',
      googleId: user.uid,
      emailVerified: user.emailVerified
    };
    
    return {
      success: true,
      user: userInfo
    };
  } catch (error) {
    console.error('Google sign-in error:', error);
    
    // Handle specific errors
    if (error.code === 'auth/popup-closed-by-user') {
      return { 
        success: false, 
        message: 'Sign-in was cancelled' 
      };
    }
    
    return {
      success: false,
      message: error.message || 'Failed to sign in with Google'
    };
  }
};

// Fix the export to avoid ESLint warning
const googleAuthService = { signInWithGoogle };
export default googleAuthService;
