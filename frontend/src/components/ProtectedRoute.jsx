// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { auth } from '../utils/auth';

const ProtectedRoute = () => {
  const isAuthenticated = auth.isAuthenticated();
  
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;