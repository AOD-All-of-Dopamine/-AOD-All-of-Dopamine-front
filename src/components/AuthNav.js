import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../Auth.css';

const AuthNav = () => {
  const { currentUser, logout } = useAuth();

  const handleLogout = () => {
    logout();
    // 페이지 새로고침 제거 - Context가 상태를 관리하므로 불필요
  };

  return (
    <div className="auth-nav">
      {currentUser ? (
        <div className="auth-nav-user">
          <Link to="/profile" className="auth-nav-link">
            {currentUser.username}
          </Link>
          <button onClick={handleLogout} className="auth-nav-button">
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