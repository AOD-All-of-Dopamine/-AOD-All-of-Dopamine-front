import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, NavLink } from 'react-router-dom';
import ContentPlatform from './ContentPlatform';
import ApiTester from './ApiTester'; // ApiTester 컴포넌트 추가
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>콘텐츠 통합 플랫폼</h1>
          <nav>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              홈
            </NavLink>
            <NavLink to="/contents" className={({ isActive }) => isActive ? 'active' : ''}>
              콘텐츠 목록
            </NavLink>
            <NavLink to="/movies" className={({ isActive }) => isActive ? 'active' : ''}>
              영화
            </NavLink>
            <NavLink to="/netflix" className={({ isActive }) => isActive ? 'active' : ''}>
              스팀게임
            </NavLink>
            <NavLink to="/api-test" className={({ isActive }) => isActive ? 'active' : ''}>
              API 테스트
            </NavLink>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={
            <main className="home-container">
              <div className="category-links">
                <Link to="/contents" className="category-card">
                  <h2>통합 콘텐츠</h2>
                  <p>영화와 게임을 한 곳에서 살펴보세요</p>
                </Link>
                <Link to="/netflix" className="category-card">
                  <h2>넷플릭스 콘텐츠</h2>
                  <p>다양한 넷플릭스 콘텐츠를 살펴보세요</p>
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
          <Route path="/contents" element={<ContentPlatform />} />
          <Route path="/movies" element={<ContentPlatform activeTab="movies" />} />
          <Route path="/netflix" element={<ContentPlatform activeTab="netflix" />} />
          <Route path="/games" element={<ContentPlatform activeTab="games" />} />
          <Route path="/api-test" element={<ApiTester />} /> {/* API 테스트 라우트 추가 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <footer className="App-footer">
          <p>&copy; 2025 콘텐츠 통합 플랫폼</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;