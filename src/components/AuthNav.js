import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import '../Auth.css';

const AuthNav = () => {
  const [currentUser, setCurrentUser] = useState(undefined);
  
  useEffect(() => {
    try {
      const user = api.auth?.getCurrentUser?.();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error('사용자 정보 로딩 오류:', error);
    }
  }, []);
  
  const logOut = () => {
    try {
      api.auth?.logout?.();
      setCurrentUser(undefined);
      window.location.reload();
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };
  
  return (
    <div className="auth-nav">
      {currentUser ? (
        <div className="auth-nav-user">
          <Link to="/profile" className="auth-nav-link">
            {currentUser.username}
          </Link>
          <button onClick={logOut} className="auth-nav-button">
            로그아웃
          </button>
        </div>
      ) : (
        <div className="auth-nav-links">
          <Link to="/login" className="auth-nav-link">로그인</Link>
          <Link to="/register" className="auth-nav-link">회원가입</Link>
        </div>
      )}
    </div>
  );
};

export default AuthNav;