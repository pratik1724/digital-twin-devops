import React from 'react';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }) {
  const isAuthenticated = localStorage.getItem('dmr_authenticated') === 'true' || localStorage.getItem('smr_authenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
}