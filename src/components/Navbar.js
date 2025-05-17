import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import '../App.css';

const Navbar = () => {
  const [currentUser, setCurrentUser] = useState(undefined);
  const navigate = useNavigate();
  
  useEffect(() => {
    const user = authAPI.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);
  
  const logOut = () => {
    authAPI.logout();
    setCurrentUser(undefined);
    navigate('/login');
  };
  
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo">
          콘텐츠 큐레이터
        </Link>
      </div>
      
      <div className="navbar-menu">
        <Link to="/" className="navbar-item">홈</Link>
        
        {currentUser ? (
          <>
            <Link to="/profile" className="navbar-item">
              {currentUser.username}
            </Link>
            <button onClick={logOut} className="navbar-item btn-link">
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-item">로그인</Link>
            <Link to="/register" className="navbar-item">회원가입</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;