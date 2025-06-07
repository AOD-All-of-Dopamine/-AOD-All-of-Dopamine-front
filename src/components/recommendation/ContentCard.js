import React, { useState, useCallback, useEffect } from 'react';
import { Star, Heart, Bookmark } from 'lucide-react';
import api from '../../api';
import './ContentCard.css';

const ContentCard = ({ content, onRate }) => {
  const [userRating, setUserRating] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isWishlist, setIsWishlist] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRatingMessage, setShowRatingMessage] = useState(false);

  // 사용자 정보 가져오기
  const currentUser = api.auth?.getCurrentUser?.();
  const isAuthenticated = api.auth?.isAuthenticated?.() || false;

  // 장르 데이터를 안전하게 배열로 변환하는 헬퍼 함수
  const getGenresArray = (content) => {
    const genreData = content.genres || content.genre;
    if (!genreData) return [];
    if (Array.isArray(genreData)) return genreData;
    if (typeof genreData === 'string') {
      return genreData.split(',').map(g => g.trim()).filter(g => g.length > 0);
    }
    return [];
  };

  // 사용자 평가 로드
  const loadUserRating = useCallback(async () => {
    if (!isAuthenticated || !currentUser || !content.id) return;

    try {
      const rating = await api.recommendations.getUserContentRating(
        currentUser.username, 
        content.contentType, 
        content.id
      );
      if (rating) {
        setUserRating(rating.rating);
        setIsLiked(rating.isLiked || false);
        setIsWishlist(rating.isWishlist || false);
      }
    } catch (error) {
      console.log('사용자 평가 없음');
    }
  }, [content.contentType, content.id, isAuthenticated, currentUser]);

  // 평균 평점 로드
  const loadAverageRating = useCallback(async () => {
    if (!content.id) return;

    try {
      const result = await api.recommendations.getContentAverageRating(
        content.contentType, 
        content.id
      );
      setAverageRating(result.averageRating || 0);
    } catch (error) {
      console.error('평균 평점 로드 오류:', error);
    }
  }, [content.contentType, content.id]);

  useEffect(() => {
    if (content.id) {
      loadAverageRating();
      if (isAuthenticated && currentUser) {
        loadUserRating();
      }
    }
  }, [content.id, loadAverageRating, loadUserRating]);

  // 평점 처리
  const handleRating = async (rating) => {
    if (!isAuthenticated || !currentUser || loading || isRemoving) {
      alert('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    
    try {
      await api.recommendations.rateContent(currentUser.username, {
        contentType: content.contentType,
        contentId: content.id,
        contentTitle: content.title,
        rating,
        isLiked: rating >= 4,
        isWatched: true
      });

      setUserRating(rating);
      setIsLiked(rating >= 4);
      await loadAverageRating();

      // 평가 완료 메시지 표시
      setShowRatingMessage(true);
      
      // 부드러운 제거 애니메이션 시작
      setTimeout(() => {
        setIsRemoving(true);
        
        // 카드 제거 완료 후 부모 컴포넌트에 알림
        setTimeout(() => {
          if (onRate) {
            onRate(content.contentType, content.id, rating, 'STAR', content.title);
          }
        }, 800); // CSS 애니메이션 시간과 맞춤
      }, 1500); // 메시지 표시 시간

    } catch (error) {
      console.error('평가 저장 오류:', error);
      alert('평가 저장 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 위시리스트 처리
  const handleWishlist = async () => {
    if (!isAuthenticated || !currentUser || loading) {
      alert('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    try {
      await api.recommendations.rateContent(currentUser.username, {
        contentType: content.contentType,
        contentId: content.id,
        contentTitle: content.title,
        isWishlist: !isWishlist
      });

      setIsWishlist(!isWishlist);
    } catch (error) {
      console.error('위시리스트 저장 오류:', error);
      alert('위시리스트 저장 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };

  // 평가 컴포넌트
  const RatingComponent = () => {
    if (!isAuthenticated) {
      return (
        <div className="rating-component" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '10px',
          fontSize: '14px',
          color: '#666'
        }}>
          <span>평점: {averageRating.toFixed(1)}</span>
          <a href="/login" style={{ color: '#007bff', textDecoration: 'none' }}>
            로그인하여 평가하세요
          </a>
        </div>
      );
    }

    return (
      <div className="rating-component" style={{ marginTop: '10px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '14px'
        }}>
          <span style={{ color: '#666' }}>평균: {averageRating.toFixed(1)}</span>
          <button
            onClick={handleWishlist}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              color: isWishlist ? '#007bff' : '#ccc',
              transition: 'color 0.2s'
            }}
            title={isWishlist ? '위시리스트에서 제거' : '위시리스트에 추가'}
          >
            <Bookmark size={16} fill={isWishlist ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                style={{
                  cursor: loading ? 'not-allowed' : 'pointer',
                  color: (hoveredRating || userRating) >= star ? '#ffc107' : '#e9ecef',
                  fill: (hoveredRating || userRating) >= star ? '#ffc107' : 'none',
                  transition: 'all 0.2s',
                  opacity: loading ? 0.5 : 1
                }}
                onMouseEnter={() => !loading && setHoveredRating(star)}
                onMouseLeave={() => !loading && setHoveredRating(0)}
                onClick={() => !loading && handleRating(star)}
              />
            ))}
          </div>

          {isLiked && (
            <Heart
              size={16}
              style={{ color: '#dc3545', fill: '#dc3545' }}
              title="좋아하는 콘텐츠"
            />
          )}
        </div>

        {userRating && (
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '4px'
          }}>
            내 평점: {userRating}점
          </div>
        )}
      </div>
    );
  };

  // 장르 배열 가져오기
  const genres = getGenresArray(content);

  // ContentPlatform과 동일한 카드 구조로 렌더링
  const renderContentCard = () => {
    const cardContent = (() => {
    switch (content.contentType) {
      case 'MOVIE':
        return (
          <div className="movie-card">
            <div className="thumbnail">
              {content.imageUrl || content.image_url ? (
                <img src={content.imageUrl || content.image_url} alt={content.title} />
              ) : (
                <div className="no-image">이미지 없음</div>
              )}
            </div>
            <div className="movie-info">
              <h3>{content.title}</h3>
              <p className="director"><strong>감독:</strong> {content.director || content.creator || '정보 없음'}</p>
              <div className="movie-meta">
                <span className="rating">평점: {content.rating ? content.rating.toFixed(1) : 'N/A'}</span>
                <span className="age-rating">{content.age_rating || ''}</span>
              </div>
              <p className="country">{content.country || ''}</p>
              <p className="running-time">{content.running_time ? `${content.running_time}분` : ''}</p>
              <p className="actors"><strong>출연:</strong> {content.actors || content.cast || '정보 없음'}</p>
              <p className="genres"><strong>장르:</strong> {genres.join(', ') || '정보 없음'}</p>
              <RatingComponent />
            </div>
          </div>
        );

      case 'GAME':
        return (
          <div className="game-card">
            <div className="game-images">
              {content.imageUrl || content.image_url ? (
                <img src={content.imageUrl || content.image_url} alt={content.title} className="header-image" />
              ) : (
                <div className="no-image">이미지 없음</div>
              )}
            </div>
            <div className="game-info">
              <h3>{content.title}</h3>
              <div className="game-price">
                {content.final_price !== null ? (
                  <span className="price">₩{(content.final_price || 0).toLocaleString()}</span>
                ) : (
                  <span className="price">가격 정보 없음</span>
                )}
                {(content.initial_price !== null && content.initial_price > content.final_price) && (
                  <span className="original-price">₩{(content.initial_price || 0).toLocaleString()}</span>
                )}
              </div>
              <p className="short-description">{content.summary || content.description || '설명 없음'}</p>
              <div className="game-meta">
                {content.required_age > 0 && (
                  <span className="age-rating">{content.required_age}세 이상</span>
                )}
                <span className="platform">플랫폼: {content.platform || 'PC'}</span>
              </div>
              <p className="publishers"><strong>퍼블리셔:</strong> {content.publishers || content.creator || '정보 없음'}</p>
              <p className="developers"><strong>개발사:</strong> {content.developers || content.developer || '정보 없음'}</p>
              <RatingComponent />
            </div>
          </div>
        );

      case 'WEBTOON':
        return (
          <div className="webtoon-card">
            <div className="thumbnail">
              {content.imageUrl || content.image_url ? (
                <img src={content.imageUrl || content.image_url} alt={content.title} />
              ) : (
                <div className="no-image">이미지 없음</div>
              )}
            </div>
            <div className="webtoon-info">
              <h3>{content.title}</h3>
              <p className="creators"><strong>작가:</strong> {content.authors || content.creator || content.author || '정보 없음'}</p>
              {content.publish_date && (
                <p className="publish-date">
                  <strong>연재시작:</strong> {
                    content.publish_date.replace(/^(\d{2})\.(\d{2})\.(\d{2})$/, (match, year, month, day) => {
                      const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`;
                      return `${fullYear}. ${parseInt(month)}. ${parseInt(day)}.`;
                    })
                  }
                </p>
              )}
              <div className="webtoon-meta">
                <span className="summary">{content.summary || content.description || '줄거리 정보 없음'}</span>
              </div>
              <p className="genres"><strong>장르:</strong> {genres.join(', ') || '정보 없음'}</p>
              <p className="platform">플랫폼: {content.platform || '정보 없음'}</p>
              <RatingComponent />
            </div>
          </div>
        );

      case 'NOVEL':
        return (
          <div className="novel-card">
            <div className="thumbnail">
              {content.imageUrl || content.image_url ? (
                <img src={content.imageUrl || content.image_url} alt={content.title} />
              ) : (
                <div className="no-image">이미지 없음</div>
              )}
            </div>
            <div className="novel-info">
              <h3>{content.title}</h3>
              <p className="authors"><strong>작가:</strong> {content.authors || content.creator || content.author || '정보 없음'}</p>
              <div className="novel-meta">
                <span className="age-rating">{content.age_rating || '연령 제한 없음'}</span>
                <span className="publisher">{content.publisher || '출판사 정보 없음'}</span>
              </div>
              <div className="status-badge" style={{
                display: 'inline-block',
                padding: '3px 8px',
                backgroundColor: content.status === '연재중' ? '#4CAF50' : '#FF9800',
                color: 'white',
                borderRadius: '4px',
                fontSize: '12px',
                marginTop: '10px'
              }}>
                {content.status || '상태 정보 없음'}
              </div>
              <p className="description" style={{ marginTop: '15px' }}>
                {content.summary || content.description || '줄거리 정보가 없습니다.'}
              </p>
              <p className="genres"><strong>장르:</strong> {genres.join(', ') || '정보 없음'}</p>
              <RatingComponent />
            </div>
          </div>
        );

      case 'OTT':
        return (
          <div className="movie-card">
            <div className="thumbnail">
              {content.imageUrl || content.image_url || content.thumbnail ? (
                <img src={content.imageUrl || content.image_url || content.thumbnail} alt={content.title} />
              ) : (
                <div className="no-image">이미지 없음</div>
              )}
            </div>
            <div className="movie-info">
              <h3>{content.title}</h3>
              <div className="movie-meta">
                <span className={`type ${content.type || ''}`}>
                  {content.type === 'Movie' ? '영화' :
                    content.type === 'TV Show' ? 'TV 쇼' :
                      content.type === 'documentary' ? '다큐멘터리' :
                        content.type || '정보 없음'}
                </span>
                <span className="year">{content.release_year || ''}</span>
              </div>
              <div className="movie-meta">
                <span>시청 등급: {content.maturity_rating || 'N/A'}</span>
              </div>
              <p className="description">{content.description || content.summary || '줄거리 정보 없음'}</p>
              <div className="creator-info">
                <span className="creator"><strong>제작:</strong> {content.creator || '정보 없음'}</span>
              </div>
              <p className="actors"><strong>출연:</strong> {content.actors || '정보 없음'}</p>
              <p className="genres"><strong>장르:</strong> {genres.join(', ') || '정보 없음'}</p>
              <RatingComponent />
            </div>
          </div>
        );

      default:
        return (
          <div className="movie-card">
            <div className="thumbnail">
              {content.imageUrl || content.image_url ? (
                <img src={content.imageUrl || content.image_url} alt={content.title} />
              ) : (
                <div className="no-image">이미지 없음</div>
              )}
            </div>
            <div className="movie-info">
              <h3>{content.title}</h3>
              <p className="creator"><strong>제작:</strong> {content.creator || content.author || content.director || '정보 없음'}</p>
              <p className="description">{content.summary || content.description || '설명 없음'}</p>
              <p className="genres"><strong>장르:</strong> {genres.join(', ') || '정보 없음'}</p>
              <RatingComponent />
            </div>
          </div>
        );
    }
    })();

    return (
      <div 
        className={`content-card-wrapper ${isRemoving ? 'removing' : ''}`}
        style={{
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* 평가 완료 메시지 오버레이 */}
        {showRatingMessage && (
          <div className="rating-success-overlay">
            <div className="rating-success-message">
              <div className="success-icon">⭐</div>
              <h3>평가가 완료되었습니다!</h3>
              <p>"{content.title}"에 {userRating}점을 주셨습니다</p>
              <div className="success-subtext">
                {userRating >= 4 ? '좋아하는 콘텐츠로 추가되었습니다! 💝' : '피드백을 반영하여 더 나은 추천을 드릴게요 📚'}
              </div>
            </div>
          </div>
        )}
        
        {cardContent}
      </div>
    );
  };

  return renderContentCard();
};

export default ContentCard;