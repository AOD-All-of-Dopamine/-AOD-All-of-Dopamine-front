import React, { useState, useEffect } from 'react';
import api from '../../api';

const UserDashboard = ({ username }) => {
  const [dashboardData, setDashboardData] = useState({
    totalRatings: 0,
    averageRating: 0,
    favoriteGenres: [],
    recentRatings: [],
    statistics: {
      movies: 0,
      games: 0,
      webtoons: 0,
      novels: 0,
      netflix: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAuthenticated = api.auth?.isAuthenticated?.() || false;
  const currentUser = api.auth?.getCurrentUser?.();

  useEffect(() => {
    if (username && isAuthenticated) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [username, isAuthenticated]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 실제 API 호출 시도
      try {
        // 사용자 평점 데이터 가져오기
        const ratingsData = await api.recommendations.getUserRatings(username);
        const likesData = await api.recommendations.getUserLikedContent(username);
        const wishlistData = await api.recommendations.getUserWishlist(username);
        
        // 데이터가 있으면 실제 데이터 사용
        if (ratingsData && Array.isArray(ratingsData)) {
          processDashboardData(ratingsData);
        } else {
          // 데이터가 없으면 임시 데이터 사용
          setDashboardData(generateMockDashboardData());
        }
      } catch (apiError) {
        console.log('대시보드 API 호출 실패, 임시 데이터 사용');
        // API가 없거나 에러인 경우 임시 데이터
        setDashboardData(generateMockDashboardData());
      }
    } catch (error) {
      console.error('대시보드 데이터 로딩 실패:', error);
      setError('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const processDashboardData = (ratingsData) => {
    // 실제 데이터 처리 로직
    const totalRatings = ratingsData.length;
    const averageRating = ratingsData.reduce((sum, rating) => sum + rating.rating, 0) / totalRatings || 0;
    
    // 콘텐츠 타입별 통계
    const statistics = ratingsData.reduce((acc, rating) => {
      acc[rating.contentType] = (acc[rating.contentType] || 0) + 1;
      return acc;
    }, {});

    // 최근 평점 (최대 5개)
    const recentRatings = ratingsData
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
      .slice(0, 5);

    setDashboardData({
      totalRatings,
      averageRating,
      favoriteGenres: [], // 장르 데이터가 있다면 처리
      recentRatings,
      statistics: {
        movies: statistics.movie || 0,
        games: statistics.game || 0,
        webtoons: statistics.webtoon || 0,
        novels: statistics.novel || 0,
        netflix: statistics.ott || 0
      }
    });
  };

  const generateMockDashboardData = () => {
    return {
      totalRatings: 47,
      averageRating: 4.2,
      favoriteGenres: [
        { genre: '액션', count: 12 },
        { genre: '드라마', count: 8 },
        { genre: '코미디', count: 6 },
        { genre: '스릴러', count: 5 }
      ],
      recentRatings: [
        { id: 1, title: '기생충', type: 'movie', rating: 5, date: '2025-05-25' },
        { id: 2, title: '신의 탑', type: 'webtoon', rating: 4, date: '2025-05-24' },
        { id: 3, title: '사이버펑크 2077', type: 'game', rating: 3, date: '2025-05-23' },
        { id: 4, title: '전지적 독자 시점', type: 'novel', rating: 5, date: '2025-05-22' },
        { id: 5, title: '오징어 게임', type: 'netflix', rating: 4, date: '2025-05-21' }
      ],
      statistics: {
        movies: 15,
        games: 8,
        webtoons: 12,
        novels: 7,
        netflix: 5
      }
    };
  };

  const getTypeLabel = (type) => {
    const labels = {
      'movie': '영화',
      'game': '게임',
      'webtoon': '웹툰', 
      'novel': '웹소설',
      'netflix': '넷플릭스',
      'ott': '넷플릭스'
    };
    return labels[type] || type;
  };

  const renderStarRating = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h1>대시보드</h1>
        <p>대시보드를 이용하려면 로그인이 필요합니다.</p>
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
    return <div style={{ textAlign: 'center', padding: '50px' }}>대시보드를 불러오는 중...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{error}</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1>{username}님의 대시보드</h1>
        <p>콘텐츠 활동 통계와 개인화된 정보를 확인하세요</p>
      </div>

      {/* 통계 카드 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '10px',
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1em', opacity: 0.9 }}>총 평점 수</h3>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '5px' }}>
            {dashboardData.totalRatings}
          </div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '25px',
          borderRadius: '10px',
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '1em', opacity: 0.9 }}>평균 평점</h3>
          <div style={{ fontSize: '2.5em', fontWeight: 'bold', marginBottom: '5px' }}>
            {dashboardData.averageRating.toFixed(1)}
          </div>
          <div style={{ fontSize: '1.2em', opacity: 0.9 }}>
            {renderStarRating(Math.round(dashboardData.averageRating))}
          </div>
        </div>
      </div>

      {/* 콘텐츠별 통계 */}
      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        marginBottom: '30px'
      }}>
        <h2 style={{ 
          marginBottom: '20px', 
          paddingBottom: '10px', 
          borderBottom: '2px solid #f0f0f0' 
        }}>
          콘텐츠별 평점 통계
        </h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
          gap: '15px' 
        }}>
          <div style={{
            textAlign: 'center',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>영화</div>
            <div style={{ fontSize: '1.2em', color: '#007bff', fontWeight: 'bold' }}>
              {dashboardData.statistics.movies}개
            </div>
          </div>
          <div style={{
            textAlign: 'center',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>웹툰</div>
            <div style={{ fontSize: '1.2em', color: '#007bff', fontWeight: 'bold' }}>
              {dashboardData.statistics.webtoons}개
            </div>
          </div>
          <div style={{
            textAlign: 'center',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>게임</div>
            <div style={{ fontSize: '1.2em', color: '#007bff', fontWeight: 'bold' }}>
              {dashboardData.statistics.games}개
            </div>
          </div>
          <div style={{
            textAlign: 'center',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>웹소설</div>
            <div style={{ fontSize: '1.2em', color: '#007bff', fontWeight: 'bold' }}>
              {dashboardData.statistics.novels}개
            </div>
          </div>
          <div style={{
            textAlign: 'center',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>넷플릭스</div>
            <div style={{ fontSize: '1.2em', color: '#007bff', fontWeight: 'bold' }}>
              {dashboardData.statistics.netflix}개
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* 선호 장르 */}
        {dashboardData.favoriteGenres.length > 0 && (
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              marginBottom: '20px', 
              paddingBottom: '10px', 
              borderBottom: '2px solid #f0f0f0' 
            }}>
              선호 장르
            </h2>
            <div>
              {dashboardData.favoriteGenres.map((genre, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '15px'
                }}>
                  <span style={{ fontWeight: 'bold', flex: 1 }}>{genre.genre}</span>
                  <span style={{ color: '#666', marginRight: '10px', minWidth: '40px' }}>
                    {genre.count}개
                  </span>
                  <div style={{
                    flex: 2,
                    height: '8px',
                    background: '#e9ecef',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      width: `${(genre.count / dashboardData.favoriteGenres[0]?.count) * 100}%`,
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 최근 평점 */}
        <div style={{
          background: 'white',
          padding: '25px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ 
            marginBottom: '20px', 
            paddingBottom: '10px', 
            borderBottom: '2px solid #f0f0f0' 
          }}>
            최근 평점
          </h2>
          <div>
            {dashboardData.recentRatings.map(rating => (
              <div key={rating.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px',
                background: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '10px'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{rating.title}</h4>
                  <span style={{
                    fontSize: '12px',
                    background: '#007bff',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '10px'
                  }}>
                    {getTypeLabel(rating.type)}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#ff6b35', marginBottom: '5px' }}>
                    {renderStarRating(rating.rating)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {rating.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;