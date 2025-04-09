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
    <div className="flex min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="m-auto w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">AI Chatbot</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">Your Multilingual AI Assistant</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;