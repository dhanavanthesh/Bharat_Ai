// src/layouts/AuthLayout.jsx
import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { auth } from '../utils/auth';

const AuthLayout = () => {
  // If user is already authenticated, redirect to chat
  if (auth.isAuthenticated()) {
    return <Navigate to="/chat" />;
  }
  
  return (
    <div className="auth-container">
     
      <div className="auth-card">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;