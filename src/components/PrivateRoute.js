import React from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api';

const PrivateRoute = ({ children }) => {
  let isAuthenticated = false;
  
  try {
    isAuthenticated = api.auth?.isAuthenticated?.() || false;
  } catch (error) {
    console.error('인증 상태 확인 오류:', error);
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

export default PrivateRoute;