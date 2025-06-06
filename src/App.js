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
import './App.css';

const AppContent = () => {
  const { isAuthenticated, currentUser } = useAuth();

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <div className="header-top">
            <h1>콘텐츠 통합 플랫폼</h1>
            <AuthNav />
          </div>
          <nav>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              홈
            </NavLink>
            <NavLink to="/contents" className={({ isActive }) => isActive ? 'active' : ''}>
              통합 콘텐츠
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
            <NavLink to="/api-test" className={({ isActive }) => isActive ? 'active' : ''}>
              API 테스트
            </NavLink>
            {currentUser && (
              <>
                <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
                  내 프로필
                </NavLink>
                <NavLink to="/recommendations" className={({ isActive }) => isActive ? 'active' : ''}>
                  맞춤 추천
                </NavLink>
              </>
            )}
          </nav>
        </header>
        <Routes>
          <Route path="/" element={
            <main className="home-container">
              <div className="welcome-banner">
                {isAuthenticated && currentUser ?
                  <h2>환영합니다, {currentUser.username}님!</h2> :
                  <h2>콘텐츠 큐레이션 서비스에 오신 것을 환영합니다</h2>
                }
              </div>
              <div className="category-links">
                <Link to="/contents" className="category-card">
                  <h2>통합 콘텐츠</h2>
                  <p>영화, 게임, 웹툰, 웹소설, 넷플릭스를 한 곳에서</p>
                </Link>
                <Link to="/ott" className="category-card">
                  <h2>OTT 콘텐츠</h2>
                  <p>다양한 OTT 콘텐츠를 살펴보세요</p>
                </Link>
                <Link to="/webtoons" className="category-card">
                  <h2>웹툰</h2>
                  <p>인기 웹툰 정보를 만나보세요</p>
                </Link>
                <Link to="/novels" className="category-card">
                  <h2>웹소설</h2>
                  <p>다양한 웹소설을 확인해보세요</p>
                </Link>
                <Link to="/movies" className="category-card">
                  <h2>영화</h2>
                  <p>최신 영화 정보</p>
                </Link>
                <Link to="/games" className="category-card">
                  <h2>게임</h2>
                  <p>인기 게임 정보</p>
                </Link>
              </div>
            </main>
          } />
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
        <footer className="App-footer">
          <p>&copy; 2025 콘텐츠 통합 플랫폼</p>
        </footer>
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