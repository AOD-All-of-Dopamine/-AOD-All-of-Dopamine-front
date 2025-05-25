import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 초기 인증 상태 확인
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (token && userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('인증 상태 확인 오류:', error);
      // 오류 시 로그아웃 처리
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.auth.login(username, password);
      
      if (response.token) {
        const user = { username, roles: response.roles || [] };
        setCurrentUser(user);
        setIsAuthenticated(true);
        return response;
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      throw error;
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.auth.register(username, email, password);
      return response;
    } catch (error) {
      console.error('회원가입 오류:', error);
      throw error;
    }
  };

  const logout = () => {
    api.auth.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    currentUser,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};