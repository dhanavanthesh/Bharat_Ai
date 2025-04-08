// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'highlight.js/styles/github-dark.css';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Chatbot from './pages/Chatbot';
import AuthLayout from './layouts/AuthLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';

// Context
import { SpeechProvider } from './context/SpeechContext';

function App() {
  return (
    <SpeechProvider>
      <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
          <Route path="/" element={<AuthLayout />}>
            <Route index element={<Navigate to="/login" />} />
            <Route path="signup" element={<Signup />} />
            <Route path="login" element={<Login />} />
          </Route>
          
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat" element={<Chatbot />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
        
        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
    </SpeechProvider>
  );
}

export default App;