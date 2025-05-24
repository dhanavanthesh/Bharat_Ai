// src/App.jsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'highlight.js/styles/github-dark.css';

import ProtectedRoute from './components/ProtectedRoute';
import Chatbot from './pages/Chatbot';
import AuthLayout from './layouts/AuthLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Home from './pages/Home';
import PdfSummarizer from './pages/PdfSummarizer';
import GoogleSignupCompletion from './pages/GoogleSignupCompletion';

import './styles/Home.css';

import { SpeechProvider } from './context/SpeechContext';

// Simple HOC to redirect authenticated users to /chat
const RedirectIfAuthenticated = ({ children }) => {
  const isAuthenticated = localStorage.getItem('user');
  
  useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/chat';
    }
  }, [isAuthenticated]);
  
  return isAuthenticated ? null : children;
};

function App() {
  return (
    <SpeechProvider>
      <Router>
        <Routes>
          {/* Home route */}
          <Route path="/" element={<Home />} />
          
          {/* Auth routes */}
          <Route path="/" element={<AuthLayout />}>
            <Route path="signup" element={<Signup />} />
            <Route path="login" element={<Login />} />
          </Route>
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat" element={<Chatbot />} />
            <Route path="/summarize" element={<PdfSummarizer />} />
          </Route>

          {/* Wrap the GoogleSignupCompletion in RedirectIfAuthenticated */}
          <Route path="/complete-google-signup" element={
            <RedirectIfAuthenticated>
              <GoogleSignupCompletion />
            </RedirectIfAuthenticated>
          } />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        
        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
    </SpeechProvider>
  );
}

export default App;