import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ContentPlatform from './ContentPlatform';
import ApiTester from './ApiTester';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import AuthNav from './components/AuthNav';
import PrivateRoute from './components/PrivateRoute';
import RecommendationPage from './components/recommendation/RecommendationPage';
import UserDashboard from './components/recommendation/UserDashboard';
import DynamicHomepage from './DynamicHomepage';
import './App.css';

const AppContent = () => {
  const { isAuthenticated, currentUser } = useAuth();

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <div className="header-top">
            <h1>DopamineOne</h1>
            <AuthNav />
          </div>
          <nav>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              홈
            </NavLink>
            <NavLink to="/movies" className={({ isActive }) => isActive ? 'active' : ''}>
              영화
            </NavLink>
            <NavLink to="/games" className={({ isActive }) => isActive ? 'active' : ''}>
              스팀게임
            </NavLink>
            <NavLink to="/webtoons" className={({ isActive }) => isActive ? 'active' : ''}>
              웹툰
            </NavLink>
            <NavLink to="/novels" className={({ isActive }) => isActive ? 'active' : ''}>
              웹소설
            </NavLink>
            <NavLink to="/ott" className={({ isActive }) => isActive ? 'active' : ''}>
              OTT 콘텐츠
            </NavLink>
            {currentUser && (
              <>
                <NavLink to="/recommendations" className={({ isActive }) => isActive ? 'active' : ''}>
                  맞춤 추천
                </NavLink>
              </>
            )}
          </nav>
        </header>
        <Routes>
          {/* 기존의 복잡한 JSX를 DynamicHomepage 컴포넌트로 교체 */}
          <Route path="/" element={<DynamicHomepage />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          
          <Route path="/contents" element={<ContentPlatform />} />
          <Route path="/movies" element={<ContentPlatform activeTab="movies" />} />
          <Route path="/games" element={<ContentPlatform activeTab="games" />} />
          <Route path="/webtoons" element={<ContentPlatform activeTab="webtoons" />} />
          <Route path="/novels" element={<ContentPlatform activeTab="novels" />} />
          <Route path="/ott" element={<ContentPlatform activeTab="ott" />} />
          
          <Route path="/api-test" element={<ApiTester />} />
          <Route path="/recommendations" element={<RecommendationPage />} />
          <Route path="/dashboard" element={
            <PrivateRoute>
              <UserDashboard username={currentUser?.username} />
            </PrivateRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;