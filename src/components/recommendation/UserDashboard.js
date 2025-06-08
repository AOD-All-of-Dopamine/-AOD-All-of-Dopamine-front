import React, { useState, useEffect } from 'react';
import { Star, Heart, Bookmark } from 'lucide-react';
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

  // 별점 수정 관련 상태
  const [removingItems, setRemovingItems] = useState(new Set());
  const [showRatingMessages, setShowRatingMessages] = useState(new Set());
  const [hoveredRatings, setHoveredRatings] = useState({});
  const [ratingLoading, setRatingLoading] = useState(new Set());

  // 현재 사용자 정보
  const currentUser = api.auth?.getCurrentUser?.();
  const isAuthenticated = api.auth?.isAuthenticated?.() || false;

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

  // 별점 수정 핸들러 (ContentCard와 동일한 로직)
  const handleRatingUpdate = async (item, newRating) => {
    if (!isAuthenticated || !currentUser || !item) {
      alert('로그인이 필요합니다.');
      return;
    }

    const itemKey = `${item.contentType}-${item.contentId}`;
    
    // 로딩 상태 추가
    setRatingLoading(prev => new Set([...prev, itemKey]));
    
    try {
      await api.recommendations.rateContent(currentUser.username, {
        contentType: item.contentType,
        contentId: item.contentId,
        contentTitle: item.contentTitle,
        rating: newRating,
        isLiked: newRating >= 4,
        isWatched: true
      });

      // 평가 완료 메시지 표시
      setShowRatingMessages(prev => new Set([...prev, itemKey]));
      
      // 부드러운 제거 애니메이션 시작
      setTimeout(() => {
        setRemovingItems(prev => new Set([...prev, itemKey]));
        
        // 카드 제거 완료 후 데이터 업데이트
        setTimeout(() => {
          // 상태에서 해당 아이템 제거
          if (activeTab === 'ratings') {
            setUserRatings(prev => prev.filter(rating => 
              `${rating.contentType}-${rating.contentId}` !== itemKey
            ));
          }
          
          // 모든 상태 정리
          setRemovingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemKey);
            return newSet;
          });
          setShowRatingMessages(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemKey);
            return newSet;
          });
          setRatingLoading(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemKey);
            return newSet;
          });
          
          // 통계 재계산
          calculateStats(userRatings.filter(rating => 
            `${rating.contentType}-${rating.contentId}` !== itemKey
          ));
        }, 800); // CSS 애니메이션 시간과 맞춤
      }, 1500); // 메시지 표시 시간

    } catch (error) {
      console.error('평가 수정 오류:', error);
      alert('평가 수정 중 오류가 발생했습니다.');
      
      // 로딩 상태 제거
      setRatingLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  // 위시리스트 토글 핸들러
  const handleWishlistToggle = async (item) => {
    if (!isAuthenticated || !currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      await api.recommendations.rateContent(currentUser.username, {
        contentType: item.contentType,
        contentId: item.contentId,
        contentTitle: item.contentTitle,
        isWishlist: !item.isWishlist
      });

      // 위시리스트 상태 업데이트
      if (activeTab === 'wishlist') {
        setWishlist(prev => prev.map(wishItem => 
          wishItem.contentId === item.contentId && wishItem.contentType === item.contentType
            ? { ...wishItem, isWishlist: !wishItem.isWishlist }
            : wishItem
        ));
      }
    } catch (error) {
      console.error('위시리스트 수정 오류:', error);
      alert('위시리스트 수정 중 오류가 발생했습니다.');
    }
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

  const formatDate = (dateString) => {
    if (!dateString) return '날짜 없음';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR');
    } catch (error) {
      return '날짜 없음';
    }
  };

  // 별점 컴포넌트 (ContentCard와 동일)
  const RatingComponent = ({ item, showRating = true }) => {
    const itemKey = `${item.contentType}-${item.contentId}`;
    const isLoadingItem = ratingLoading.has(itemKey);
    const hoveredRating = hoveredRatings[itemKey] || 0;
    
    if (!isAuthenticated || !showRating) {
      return (
        <div className="rating-display">
          {item.rating && (
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  style={{
                    color: star <= item.rating ? '#ffc107' : '#e9ecef',
                    fill: star <= item.rating ? '#ffc107' : 'none'
                  }}
                />
              ))}
              <span className="rating-value">({item.rating}/5)</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="rating-component interactive">
        <div className="rating-header">
          <span className="current-rating">현재 평점: {item.rating || 0}점</span>
          {activeTab === 'wishlist' && (
            <button
              onClick={() => handleWishlistToggle(item)}
              disabled={isLoadingItem}
              className="wishlist-btn"
              title={item.isWishlist ? '위시리스트에서 제거' : '위시리스트에 추가'}
            >
              <Bookmark size={16} fill={item.isWishlist ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {showRating && (
          <div className="rating-stars-container">
            <div className="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={18}
                  style={{
                    cursor: isLoadingItem ? 'not-allowed' : 'pointer',
                    color: (hoveredRating || item.rating) >= star ? '#ffc107' : '#e9ecef',
                    fill: (hoveredRating || item.rating) >= star ? '#ffc107' : 'none',
                    transition: 'all 0.2s',
                    opacity: isLoadingItem ? 0.5 : 1
                  }}
                  onMouseEnter={() => !isLoadingItem && setHoveredRatings(prev => ({ ...prev, [itemKey]: star }))}
                  onMouseLeave={() => !isLoadingItem && setHoveredRatings(prev => ({ ...prev, [itemKey]: 0 }))}
                  onClick={() => !isLoadingItem && handleRatingUpdate(item, star)}
                />
              ))}
            </div>
            
            {hoveredRating > 0 && (
              <span className="rating-preview">
                {hoveredRating}점으로 수정하시겠습니까?
              </span>
            )}

            {item.isLiked && (
              <Heart
                size={16}
                style={{ color: '#dc3545', fill: '#dc3545', marginLeft: '8px' }}
                title="좋아하는 콘텐츠"
              />
            )}
          </div>
        )}
      </div>
    );
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
        {items.map((item, index) => {
          const itemKey = `${item.contentType || 'item'}-${item.contentId || index}`;
          const isRemoving = removingItems.has(itemKey);
          const showMessage = showRatingMessages.has(itemKey);
          
          return (
            <div 
              key={`${itemKey}-${index}`} 
              className={`rating-item-wrapper ${isRemoving ? 'removing' : ''}`}
              style={{
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* 평가 완료 메시지 오버레이 */}
              {showMessage && (
                <div className="rating-success-overlay">
                  <div className="rating-success-message">
                    <div className="success-icon">⭐</div>
                    <h4>평가가 수정되었습니다!</h4>
                    <p>"{item.contentTitle}"</p>
                    <div className="success-subtext">
                      업데이트된 평가가 반영되었습니다 ✨
                    </div>
                  </div>
                </div>
              )}

              <div className="rating-item">
                <div className="item-header">
                  <div className="item-type">
                    <span className="type-icon">{getContentTypeIcon(item.contentType)}</span>
                    <span className="type-label">{getContentTypeLabel(item.contentType)}</span>
                  </div>
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

                {/* 별점 컴포넌트 */}
                <RatingComponent item={item} showRating={showRating} />
              </div>
            </div>
          );
        })}
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