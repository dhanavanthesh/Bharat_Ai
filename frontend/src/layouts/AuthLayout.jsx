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
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="m-auto w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">AI Chatbot</h1>
          <p className="text-gray-600 dark:text-gray-300">Powered by LLaMA models</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;