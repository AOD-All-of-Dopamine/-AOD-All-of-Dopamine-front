import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ContentCard from './ContentCard';
import PreferenceModal from './PreferenceModal';
import RatingComponent from './RatingComponent';
import AIChat from './AIChat';
import UserDashboard from './UserDashboard';
import api from '../../api';
import './RecommendationPage.css';

const RecommendationPage = () => {
  const { user, currentUser, isAuthenticated } = useAuth();
  
  // user 또는 currentUser 중 존재하는 것 사용
  const activeUser = user || currentUser;
  
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('initial');
  const [showPreferences, setShowPreferences] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [contentTypes, setContentTypes] = useState([]);
  const [genres, setGenres] = useState([]);
  const [userPreferences, setUserPreferences] = useState(null);
  const [error, setError] = useState('');
  const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);

  useEffect(() => {
    if (activeUser && activeUser.username && !initialLoadCompleted) {
      loadInitialData();
      setInitialLoadCompleted(true);
    }
  }, [activeUser, initialLoadCompleted]);

  const loadInitialData = async () => {
    console.log('초기 데이터 로드 시작:', activeUser);
    setLoading(true);
    setError('');
    
    try {
      // 병렬로 기본 데이터 로드
      const [loadedContentTypes, loadedGenres] = await Promise.all([
        api.recommendations.getContentTypes(),
        api.recommendations.getGenres()
      ]);
      
      console.log('로드된 콘텐츠 타입:', loadedContentTypes);
      console.log('로드된 장르:', loadedGenres);
      
      setContentTypes(Array.isArray(loadedContentTypes) ? loadedContentTypes : []);
      setGenres(Array.isArray(loadedGenres) ? loadedGenres : []);
      
      // 사용자 선호도 로드
      await loadUserPreferences();
      
      // 초기 추천 로드
      await loadRecommendations('initial');
    } catch (error) {
      console.error('초기 데이터 로드 실패:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    if (!activeUser || !activeUser.username) {
      console.warn('사용자 정보가 없어 선호도를 로드할 수 없습니다.');
      return;
    }
    
    try {
      console.log('사용자 선호도 로드 시작:', activeUser.username);
      const prefs = await api.recommendations.getUserPreferences(activeUser.username);
      console.log('로드된 사용자 선호도:', prefs);
      setUserPreferences(prefs);
    } catch (error) {
      console.warn('사용자 선호도 로드 실패:', error);
      // 선호도 로드 실패는 에러로 표시하지 않음 (선택사항이므로)
    }
  };

  const loadRecommendations = async (type, prompt = null) => {
    if (!activeUser || !activeUser.username) {
      console.error('사용자 정보가 없습니다:', { activeUser });
      setRecommendations([]);
      setError('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      let data = [];
      console.log(`추천 로드 시작: ${type}, 사용자: ${activeUser.username}`);

      switch (type) {
        case 'initial':
          data = await api.recommendations.getInitialRecommendations(activeUser.username);
          break;
        case 'traditional':
          data = await api.recommendations.getTraditionalRecommendations(activeUser.username);
          break;
        case 'llm':
          data = await api.recommendations.getLLMRecommendations(
            activeUser.username, 
            prompt || '재미있는 콘텐츠 추천해주세요'
          );
          break;
        default:
          console.warn('알 수 없는 추천 타입:', type);
          data = [];
      }

      console.log(`추천 로드 완료: ${type}`, data);

      // 데이터 처리 및 정규화
      const normalizedData = normalizeRecommendationData(data);
      console.log('정규화된 추천 데이터:', normalizedData);
      
      setRecommendations(normalizedData);
      setSelectedTab(type);
      
      // 추천이 비어있을 때 사용자에게 안내
      if (normalizedData.length === 0) {
        if (type === 'initial') {
          setError('아직 추천할 콘텐츠가 준비되지 않았습니다. 선호도를 설정해보세요!');
        } else if (type === 'traditional') {
          setError('맞춤 추천을 위해 콘텐츠를 평가하거나 선호도를 설정해주세요.');
        }
      }
      
    } catch (error) {
      console.error('추천 로드 실패:', error);
      setError(`추천을 불러오는 중 오류가 발생했습니다: ${error.message}`);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  // 백엔드 응답 데이터를 정규화하는 함수
  const normalizeRecommendationData = (data) => {
    if (!data) return [];
    
    // 이미 배열인 경우
    if (Array.isArray(data)) {
      return data.map(item => normalizeContentItem(item));
    }
    
    // 객체인 경우 (백엔드에서 카테고리별로 그룹화된 데이터)
    if (typeof data === 'object') {
      const allItems = [];
      
      // 모든 카테고리의 아이템들을 하나의 배열로 합침
      Object.values(data).forEach(categoryItems => {
        if (Array.isArray(categoryItems)) {
          categoryItems.forEach(item => {
            const normalizedItem = normalizeContentItem(item);
            if (normalizedItem) {
              allItems.push(normalizedItem);
            }
          });
        }
      });
      
      return allItems;
    }
    
    return [];
  };

  // 개별 콘텐츠 아이템 정규화
  const normalizeContentItem = (item) => {
    if (!item) return null;
    
    return {
      id: item.id || item.contentId || Math.random().toString(36),
      title: item.title || item.name || item.contentTitle || '제목 없음',
      contentType: item.contentType || item.type || 'UNKNOWN',
      creator: item.creator || item.author || item.director,
      summary: item.summary || item.description || item.plot,
      imageUrl: item.imageUrl || item.thumbnail || item.thumbnailUrl,
      rating: item.rating || item.score,
      genre: item.genre || item.genres,
      releaseDate: item.releaseDate || item.publishDate,
      ...item // 원본 데이터도 보존
    };
  };

  const handleRating = async (contentType, contentId, rating, ratingType = 'STAR') => {
    if (!activeUser || !activeUser.username) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      console.log('콘텐츠 평가 시작:', { contentType, contentId, rating, ratingType });
      
      await api.recommendations.rateContent(activeUser.username, {
        contentType,
        contentId,
        rating,
        ratingType
      });
      
      console.log('평가 완료');
      
      // 선호도 다시 로드
      await loadUserPreferences();
      
      // 평가 후 메시지 표시
      setError(''); // 기존 에러 메시지 제거
      
    } catch (error) {
      console.error('평가 실패:', error);
      setError('평가 저장에 실패했습니다.');
    }
  };

  const handlePreferenceUpdate = async (newPreferences) => {
    if (!activeUser || !activeUser.username) {
      setError('로그인이 필요합니다.');
      return;
    }

    try {
      console.log('선호도 업데이트 시작:', newPreferences);
      
      await api.recommendations.setUserPreferences(activeUser.username, newPreferences);
      setUserPreferences(newPreferences);
      setShowPreferences(false);
      
      // 선호도 업데이트 후 맞춤 추천 다시 로드
      await loadRecommendations('traditional');
      
      console.log('선호도 업데이트 완료');
    } catch (error) {
      console.error('선호도 업데이트 실패:', error);
      setError('선호도 저장에 실패했습니다.');
    }
  };

  const handleTabChange = (newTab) => {
    if (newTab !== selectedTab) {
      setError(''); // 탭 변경 시 에러 메시지 초기화
      loadRecommendations(newTab);
    }
  };

  // 로그인되지 않은 경우
  if (!isAuthenticated || !activeUser) {
    return (
      <div className="recommendation-page">
        <div className="login-prompt">
          <h2>🎯 개인화된 추천을 받아보세요!</h2>
          <p>로그인하시면 맞춤형 콘텐츠 추천을 받을 수 있습니다.</p>
          <a href="/login" className="btn btn-primary">로그인하기</a>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendation-page">
      {/* 헤더 */}
      <div className="recommendation-header">
        <div className="user-info">
          <h1>🎬 {activeUser.username || '사용자'}님을 위한 추천</h1>
          <p>당신의 취향에 맞는 최고의 콘텐츠를 찾아드려요</p>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn btn-outline"
            onClick={() => setShowPreferences(true)}
          >
            ⚙️ 선호도 설정
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => setShowAIChat(true)}
          >
            🤖 AI 추천 채팅
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => setShowDashboard(true)}
          >
            📊 내 활동
          </button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* 디버그 정보 (개발용) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          fontSize: '12px', 
          color: '#666', 
          marginBottom: '10px',
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        }}>
          <strong>디버그 정보:</strong> 사용자: {activeUser?.username}, 
          추천 수: {recommendations.length}, 
          선호도: {userPreferences ? '설정됨' : '미설정'}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="recommendation-tabs">
        <button 
          className={`tab ${selectedTab === 'initial' ? 'active' : ''}`}
          onClick={() => handleTabChange('initial')}
          disabled={loading}
        >
          🌟 첫 추천
        </button>
        <button 
          className={`tab ${selectedTab === 'traditional' ? 'active' : ''}`}
          onClick={() => handleTabChange('traditional')}
          disabled={loading}
        >
          🎯 맞춤 추천
        </button>
        <button 
          className={`tab ${selectedTab === 'llm' ? 'active' : ''}`}
          onClick={() => handleTabChange('llm')}
          disabled={loading}
        >
          🧠 AI 추천
        </button>
      </div>

      {/* 추천 콘텐츠 */}
      <div className="recommendation-content">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>맞춤 추천을 준비중입니다...</p>
          </div>
        ) : (
          <div className="content-grid">
            {Array.isArray(recommendations) && recommendations.length > 0 ? (
              recommendations.map((content, index) => (
                <ContentCard
                  key={`${content.contentType || 'content'}-${content.id || index}-${index}`}
                  content={content}
                  onRate={handleRating}
                />
              ))
            ) : (
              <div className="no-recommendations">
                <h3>😅 추천할 콘텐츠가 없습니다</h3>
                {selectedTab === 'initial' && (
                  <div>
                    <p>아직 콘텐츠가 준비되지 않았습니다.</p>
                    <p>선호도를 설정하고 맞춤 추천을 받아보세요!</p>
                  </div>
                )}
                {selectedTab === 'traditional' && (
                  <div>
                    <p>맞춤 추천을 위해 다음 중 하나를 해보세요:</p>
                    <ul style={{ textAlign: 'left', margin: '10px 0' }}>
                      <li>선호도 설정하기</li>
                      <li>콘텐츠에 별점 주기</li>
                      <li>좋아하는 콘텐츠 평가하기</li>
                    </ul>
                  </div>
                )}
                {selectedTab === 'llm' && (
                  <p>AI 채팅을 통해 원하는 콘텐츠를 설명해보세요!</p>
                )}
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    if (selectedTab === 'llm') {
                      setShowAIChat(true);
                    } else {
                      setShowPreferences(true);
                    }
                  }}
                >
                  {selectedTab === 'llm' ? 'AI 채팅 시작' : '선호도 설정하기'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 모달들 */}
      {showPreferences && (
        <PreferenceModal
          user={activeUser}
          currentPreferences={userPreferences}
          contentTypes={contentTypes}
          genres={genres}
          onSave={handlePreferenceUpdate}
          onClose={() => setShowPreferences(false)}
        />
      )}

      {showAIChat && (
        <AIChat
          user={activeUser}
          onRecommendation={(recommendations) => {
            if (Array.isArray(recommendations)) {
              setRecommendations(recommendations);
              setSelectedTab('llm');
            }
            setShowAIChat(false);
          }}
          onClose={() => setShowAIChat(false)}
        />
      )}

      {showDashboard && (
        <UserDashboard
          user={activeUser}
          onClose={() => setShowDashboard(false)}
        />
      )}
    </div>
  );
};

export default RecommendationPage;