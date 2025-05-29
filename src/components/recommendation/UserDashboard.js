import React, { useState, useEffect } from 'react';
import api from '../../api';
import './UserDashboard.css';

const UserDashboard = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('ratings');
  const [userRatings, setUserRatings] = useState([]);
  const [likedContent, setLikedContent] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalRatings: 0,
    averageRating: 0,
    favoriteGenres: [],
    contentTypeStats: {}
  });

  useEffect(() => {
    if (user && user.username) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user || !user.username) {
      setError('사용자 정보가 없습니다.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const promises = [];
      
      // API가 있는 경우에만 호출
      if (api.recommendations) {
        if (api.recommendations.getUserRatings) {
          promises.push(loadUserRatings());
        }
        if (api.recommendations.getUserLikedContent) {
          promises.push(loadLikedContent());
        }
        if (api.recommendations.getUserWishlist) {
          promises.push(loadWishlist());
        }
      }
      
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      } else {
        setError('추천 시스템 API를 사용할 수 없습니다.');
      }
    } catch (error) {
      console.error('사용자 데이터 로드 실패:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserRatings = async () => {
    try {
      const ratings = await api.recommendations.getUserRatings(user.username);
      const ratingsArray = Array.isArray(ratings) ? ratings : [];
      setUserRatings(ratingsArray);
      calculateStats(ratingsArray);
    } catch (error) {
      console.error('평가 데이터 로드 실패:', error);
      setUserRatings([]);
    }
  };

  const loadLikedContent = async () => {
    try {
      const liked = await api.recommendations.getUserLikedContent(user.username);
      setLikedContent(Array.isArray(liked) ? liked : []);
    } catch (error) {
      console.error('좋아요 데이터 로드 실패:', error);
      setLikedContent([]);
    }
  };

  const loadWishlist = async () => {
    try {
      const wishlist = await api.recommendations.getUserWishlist(user.username);
      setWishlist(Array.isArray(wishlist) ? wishlist : []);
    } catch (error) {
      console.error('위시리스트 데이터 로드 실패:', error);
      setWishlist([]);
    }
  };

  const calculateStats = (ratings) => {
    if (!Array.isArray(ratings)) {
      ratings = [];
    }

    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0 
      ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / totalRatings 
      : 0;

    // 장르 통계
    const genreCount = {};
    const contentTypeCount = {};

    ratings.forEach(rating => {
      // 콘텐츠 타입별 통계
      if (rating.contentType) {
        contentTypeCount[rating.contentType] = (contentTypeCount[rating.contentType] || 0) + 1;
      }
      
      // 장르 통계
      if (rating.genres && Array.isArray(rating.genres)) {
        rating.genres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      }
    });

    const favoriteGenres = Object.entries(genreCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);

    setStats({
      totalRatings,
      averageRating: Math.round(averageRating * 10) / 10,
      favoriteGenres,
      contentTypeStats: contentTypeCount
    });
  };

  const getContentTypeIcon = (type) => {
    const icons = {
      'MOVIE': '🎬',
      'WEBTOON': '📚',
      'NOVEL': '📖',
      'GAME': '🎮',
      'OTT': '📺'
    };
    return icons[type] || '🎯';
  };

  const getContentTypeLabel = (type) => {
    const labels = {
      'MOVIE': '영화',
      'WEBTOON': '웹툰',
      'NOVEL': '웹소설',
      'GAME': '게임',
      'OTT': 'OTT'
    };
    return labels[type] || type;
  };

  const renderStars = (rating) => {
    const stars = [];
    const numRating = Number(rating) || 0;
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= numRating ? 'filled' : ''}`}>
          ⭐
        </span>
      );
    }
    return stars;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '날짜 없음';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR');
    } catch (error) {
      return '날짜 없음';
    }
  };

  const renderRatingsList = (items, showRating = true) => {
    if (!Array.isArray(items) || items.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>아직 데이터가 없습니다</p>
          <small>콘텐츠를 평가해보세요!</small>
        </div>
      );
    }

    return (
      <div className="ratings-list">
        {items.map((item, index) => (
          <div key={`${item.contentType || 'item'}-${item.contentId || index}-${index}`} className="rating-item">
            <div className="item-header">
              <div className="item-type">
                <span className="type-icon">{getContentTypeIcon(item.contentType)}</span>
                <span className="type-label">{getContentTypeLabel(item.contentType)}</span>
              </div>
              {showRating && item.rating && (
                <div className="item-rating">
                  {renderStars(item.rating)}
                  <span className="rating-value">({item.rating}/5)</span>
                </div>
              )}
            </div>
            <h4 className="item-title">{item.contentTitle || item.title || '제목 없음'}</h4>
            {item.author && (
              <p className="item-author">✍️ {item.author}</p>
            )}
            <div className="item-meta">
              <span className="item-date">📅 {formatDate(item.createdAt || item.ratedAt)}</span>
              {item.ratingType && item.ratingType !== 'STAR' && (
                <span className="rating-type">
                  {item.ratingType === 'LIKE' ? '👍 좋아요' :
                   item.ratingType === 'WISHLIST' ? '💖 위시리스트' :
                   item.ratingType === 'COMPLETED' ? '✅ 완료' : ''}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 사용자 정보가 없는 경우
  if (!user || !user.username) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="dashboard-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>📊 사용자 활동</h2>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="error-content">
            <p>사용자 정보를 불러올 수 없습니다.</p>
            <button className="btn btn-primary" onClick={onClose}>닫기</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="dashboard-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 {user.username}님의 활동</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <h3>{stats.totalRatings}</h3>
                <p>총 평가</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <h3>{stats.averageRating}</h3>
                <p>평균 평점</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">💖</div>
              <div className="stat-content">
                <h3>{likedContent.length}</h3>
                <p>좋아요</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📝</div>
              <div className="stat-content">
                <h3>{wishlist.length}</h3>
                <p>위시리스트</p>
              </div>
            </div>
          </div>

          {/* 콘텐츠 타입별 통계 */}
          {Object.keys(stats.contentTypeStats).length > 0 && (
            <div className="content-type-stats">
              <h3>📈 콘텐츠 타입별 활동</h3>
              <div className="type-stats-grid">
                {Object.entries(stats.contentTypeStats).map(([type, count]) => (
                  <div key={type} className="type-stat">
                    <span className="type-icon">{getContentTypeIcon(type)}</span>
                    <span className="type-name">{getContentTypeLabel(type)}</span>
                    <span className="type-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 선호 장르 */}
          {stats.favoriteGenres.length > 0 && (
            <div className="favorite-genres">
              <h3>🎭 선호 장르</h3>
              <div className="genre-list">
                {stats.favoriteGenres.map((genre, index) => (
                  <span key={index} className="genre-badge">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 탭 네비게이션 */}
        <div className="dashboard-tabs">
          <button 
            className={`tab ${activeTab === 'ratings' ? 'active' : ''}`}
            onClick={() => setActiveTab('ratings')}
          >
            ⭐ 평가 ({userRatings.length})
          </button>
          <button 
            className={`tab ${activeTab === 'liked' ? 'active' : ''}`}
            onClick={() => setActiveTab('liked')}
          >
            👍 좋아요 ({likedContent.length})
          </button>
          <button 
            className={`tab ${activeTab === 'wishlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('wishlist')}
          >
            💖 위시리스트 ({wishlist.length})
          </button>
        </div>

        {/* 탭 콘텐츠 */}
        <div className="tab-content">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>데이터를 불러오는 중...</p>
            </div>
          ) : (
            <>
              {activeTab === 'ratings' && renderRatingsList(userRatings, true)}
              {activeTab === 'liked' && renderRatingsList(likedContent, false)}
              {activeTab === 'wishlist' && renderRatingsList(wishlist, false)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;