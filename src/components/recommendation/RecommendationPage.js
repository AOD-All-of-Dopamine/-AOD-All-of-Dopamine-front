import React, { useState, useEffect } from 'react';
import api from '../../api';

const RecommendationPage = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState('all');

  const currentUser = api.auth?.getCurrentUser?.();
  const isAuthenticated = api.auth?.isAuthenticated?.() || false;

  useEffect(() => {
    loadRecommendations();
  }, [selectedType]);

  const loadRecommendations = async () => {
    if (!isAuthenticated || !currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 실제 추천 API 호출 시도
      try {
        const response = await api.recommendations.getTraditionalRecommendations(currentUser.username);
        setRecommendations(response || []);
      } catch (apiError) {
        console.log('추천 API 호출 실패, 임시 데이터 사용');
        // API가 없거나 에러인 경우 임시 데이터 사용
        const mockData = generateMockRecommendations();
        setRecommendations(mockData);
      }
    } catch (error) {
      console.error('추천 데이터 로딩 실패:', error);
      setError('추천 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const generateMockRecommendations = () => {
    const mockRecommendations = [
      {
        id: 1,
        title: '기생충',
        type: 'movie',
        genre: '드라마',
        rating: 4.8,
        reason: '사용자가 좋아하는 드라마 장르와 높은 평점 기반 추천',
        imageUrl: 'https://via.placeholder.com/200x300?text=기생충'
      },
      {
        id: 2,
        title: '사이버펑크 2077',
        type: 'game',
        genre: 'RPG',
        rating: 4.2,
        reason: 'RPG 게임을 자주 플레이하는 패턴 기반 추천',
        imageUrl: 'https://via.placeholder.com/200x300?text=사이버펑크'
      },
      {
        id: 3,
        title: '신의 탑',
        type: 'webtoon',
        genre: '액션',
        rating: 4.5,
        reason: '액션 장르 선호도와 높은 사용자 평점 기반',
        imageUrl: 'https://via.placeholder.com/200x300?text=신의탑'
      },
      {
        id: 4,
        title: '전지적 독자 시점',
        type: 'novel',
        genre: '판타지',
        rating: 4.7,
        reason: '판타지 소설 독서 이력 기반 맞춤 추천',
        imageUrl: 'https://via.placeholder.com/200x300?text=전독시'
      },
      {
        id: 5,
        title: '오징어 게임',
        type: 'netflix',
        genre: '스릴러',
        rating: 4.6,
        reason: '스릴러 장르 시청 패턴 분석 결과',
        imageUrl: 'https://via.placeholder.com/200x300?text=오징어게임'
      }
    ];

    if (selectedType === 'all') {
      return mockRecommendations;
    }
    return mockRecommendations.filter(item => item.type === selectedType);
  };

  const getTypeLabel = (type) => {
    const labels = {
      'movie': '영화',
      'game': '게임', 
      'webtoon': '웹툰',
      'novel': '웹소설',
      'netflix': '넷플릭스'
    };
    return labels[type] || type;
  };

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h1>맞춤 추천</h1>
        <p>추천 서비스를 이용하려면 로그인이 필요합니다.</p>
        <a href="/login" style={{ 
          display: 'inline-block',
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '5px',
          marginTop: '20px'
        }}>
          로그인하기
        </a>
      </div>
    );
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>추천 콘텐츠를 불러오는 중...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{error}</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>맞춤 추천</h1>
        <p>사용자의 취향과 평점 이력을 분석하여 개인화된 콘텐츠를 추천합니다</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', gap: '10px' }}>
        <label style={{ fontWeight: 'bold' }}>콘텐츠 타입:</label>
        <select 
          value={selectedType} 
          onChange={(e) => setSelectedType(e.target.value)}
          style={{ 
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            fontSize: '14px'
          }}
        >
          <option value="all">전체</option>
          <option value="movie">영화</option>
          <option value="game">게임</option>
          <option value="webtoon">웹툰</option>
          <option value="novel">웹소설</option>
          <option value="netflix">넷플릭스</option>
        </select>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '20px' 
      }}>
        {recommendations.length > 0 ? (
          recommendations.map(item => (
            <div key={item.id} style={{
              background: 'white',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}>
              <div style={{ position: 'relative', height: '200px', overflow: 'hidden' }}>
                <img 
                  src={item.imageUrl} 
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {getTypeLabel(item.type)}
                </div>
              </div>
              <div style={{ padding: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2em' }}>{item.title}</h3>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <span style={{
                    background: '#f0f8ff',
                    color: '#0066cc',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px'
                  }}>
                    {item.genre}
                  </span>
                  <span style={{ color: '#ff6b35', fontWeight: 'bold' }}>
                    ★ {item.rating}
                  </span>
                </div>
                <p style={{ 
                  color: '#666',
                  fontSize: '14px',
                  lineHeight: '1.4',
                  marginBottom: '15px'
                }}>
                  {item.reason}
                </p>
                <button style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  자세히 보기
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ 
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '40px'
          }}>
            <p>추천할 콘텐츠가 없습니다.</p>
            <p>더 많은 콘텐츠에 평점을 남겨보세요!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationPage;