import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBl3JFf-WYnQ4eFnMsHrL2kmrw6f5wsfaM",
  authDomain: "bhaai-01.firebaseapp.com",
  projectId: "bhaai-01",
  storageBucket: "bhaai-01.firebasestorage.app",
  messagingSenderId: "665136777890",
  appId: "1:665136777890:web:f2f67a018c9581a38f65fb",
  measurementId: "G-86DS5CP87R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);

export { auth, analytics };
export default app;
