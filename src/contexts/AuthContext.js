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
  // 기존 상태 유지
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 초기 인증 상태 확인 (기존 로직 유지)
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
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  // 에러 메시지 안전하게 추출하는 헬퍼 함수
  const extractErrorMessage = (error) => {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error && error.response) {
      // axios 에러 응답
      if (typeof error.response.data === 'string') {
        return error.response.data;
      }
      if (error.response.data && error.response.data.message) {
        return error.response.data.message;
      }
      if (error.response.data) {
        return JSON.stringify(error.response.data);
      }
    }
    
    if (error && error.message) {
      return error.message;
    }
    
    return error?.toString() || '알 수 없는 오류가 발생했습니다.';
  };

  // 기존 login 메서드 (에러 처리 개선)
  const login = async (username, password) => {
    try {
      const response = await api.auth.login(username, password);
      if (response && response.token) {
        const user = { 
          username, 
          email: response.email,
          roles: response.roles || [],
          hasPreferences: response.hasPreferences || false
        };
        setCurrentUser(user);
        setIsAuthenticated(true);
        return response;
      }
      return response;
    } catch (error) {
      console.error('로그인 오류:', error);
      const errorMessage = extractErrorMessage(error);
      throw new Error(errorMessage);
    }
  };

  // 기존 register 메서드 (에러 처리 개선)
  const register = async (username, email, password) => {
    try {
      const response = await api.auth.register(username, email, password);
      return response;
    } catch (error) {
      console.error('회원가입 오류:', error);
      const errorMessage = extractErrorMessage(error);
      throw new Error(errorMessage);
    }
  };

  // 간단한 signup 메서드 (기존 register와 동일)
  const signup = async (userData) => {
    try {
      const response = await register(userData.username, userData.email, userData.password);
      return { success: true, data: response };
    } catch (error) {
      console.error('회원가입 오류:', error);
      const errorMessage = extractErrorMessage(error);
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  // 기존 logout 메서드 (그대로 유지)
  const logout = () => {
    api.auth.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // 사용자 정보 업데이트 (추천 시스템용 추가)
  const updateUser = (updatedUserData) => {
    const newUserData = { ...currentUser, ...updatedUserData };
    setCurrentUser(newUserData);
    localStorage.setItem('user', JSON.stringify(newUserData));
  };

  const value = {
    // 기존 프로퍼티들 (호환성 유지)
    isAuthenticated,
    currentUser,
    login,
    register,
    logout,
    loading,
    
    // 추천 시스템 호환을 위한 별칭들
    user: currentUser, // 추천 시스템에서 user로 접근
    token: localStorage.getItem('token'),
    signup, // 추천 시스템용 (기존 register와 동일)
    updateUser // 추천 시스템용
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };