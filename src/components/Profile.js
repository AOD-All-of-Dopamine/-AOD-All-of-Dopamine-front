import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api';
import '../Auth.css';

const Profile = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const user = api.auth.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    setLoading(false);
  }, []);
  
  if (loading) {
    return <div className="loading">로딩 중...</div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>내 프로필</h2>
        <div className="profile-info">
          <div>
            <strong>아이디:</strong> {currentUser.username}
          </div>
          <div>
            <strong>권한:</strong> {currentUser.roles && currentUser.roles.length > 0 
              ? currentUser.roles.join(', ') 
              : '일반 사용자'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;