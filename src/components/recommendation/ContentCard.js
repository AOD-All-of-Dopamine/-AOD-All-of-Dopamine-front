// ContentCard.js의 전체 수정된 코드

import React, { useState } from 'react';
import RatingComponent from './RatingComponent';
import './ContentCard.css';

const ContentCard = ({ content, onRate }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [userRating, setUserRating] = useState(0);

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

  const handleRating = (rating, type = 'STAR') => {
    setUserRating(rating);
    onRate(content.contentType, content.id, rating, type);
  };

  const formatReleaseDate = (dateString) => {
    if (!dateString) return '미정';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // 장르 배열 가져오기
  const genres = getGenresArray(content);

  const imageUrl = (content.imageUrl && content.imageUrl.trim()) || content.thumbnailUrl || null;

  return (
    <div className="content-card">
      <div className="card-header">
        <div className="content-type">
          <span className="type-icon">{getContentTypeIcon(content.contentType)}</span>
          <span className="type-label">{getContentTypeLabel(content.contentType)}</span>
        </div>
        {content.averageRating && (
          <div className="average-rating">
            ⭐ {content.averageRating.toFixed(1)}
          </div>
        )}
      </div>

      <div className="card-image">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={content.title}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        <div className="image-placeholder" style={{ display: imageUrl ? 'none' : 'flex' }}>
          <span className="placeholder-icon">{getContentTypeIcon(content.contentType)}</span>
        </div>
      </div>


      <div className="card-content">
        <h3 className="content-title" title={content.title}>
          {truncateText(content.title, 30)}
        </h3>

        {content.author && (
          <p className="content-author">✍️ {content.author}</p>
        )}

        {content.director && (
          <p className="content-director">🎬 {content.director}</p>
        )}

        {content.developer && (
          <p className="content-developer">👨‍💻 {content.developer}</p>
        )}

        {genres.length > 0 && (
          <div className="content-genres">
            {genres.slice(0, 3).map((genre, index) => (
              <span key={index} className="genre-tag">
                {genre}
              </span>
            ))}
            {genres.length > 3 && (
              <span className="genre-more">+{genres.length - 3}</span>
            )}
          </div>
        )}

        {content.description && (
          <p className="content-description">
            {truncateText(content.description, 80)}
          </p>
        )}

        <div className="content-meta">
          {content.releaseDate && (
            <span className="release-date">📅 {formatReleaseDate(content.releaseDate)}</span>
          )}
          {content.rating && (
            <span className="content-rating">🔞 {content.rating}</span>
          )}
          {content.price && (
            <span className="content-price">💰 {content.price}</span>
          )}
        </div>
      </div>

      <div className="card-actions">
        <button
          className="btn-details"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? '간단히 보기' : '자세히 보기'}
        </button>

        <RatingComponent
          onRate={handleRating}
          currentRating={userRating}
        />
      </div>

      {showDetails && (
        <div className="card-details">
          {content.fullDescription && (
            <div className="detail-section">
              <h4>📝 상세 설명</h4>
              <p>{content.fullDescription}</p>
            </div>
          )}

          {content.cast && content.cast.length > 0 && (
            <div className="detail-section">
              <h4>🎭 출연진</h4>
              <div className="cast-list">
                {content.cast.map((actor, index) => (
                  <span key={index} className="cast-member">{actor}</span>
                ))}
              </div>
            </div>
          )}

          {content.features && content.features.length > 0 && (
            <div className="detail-section">
              <h4>✨ 특징</h4>
              <div className="features-list">
                {content.features.map((feature, index) => (
                  <span key={index} className="feature-tag">{feature}</span>
                ))}
              </div>
            </div>
          )}

          {content.platforms && content.platforms.length > 0 && (
            <div className="detail-section">
              <h4>🖥️ 플랫폼</h4>
              <div className="platforms-list">
                {content.platforms.map((platform, index) => (
                  <span key={index} className="platform-tag">{platform}</span>
                ))}
              </div>
            </div>
          )}

          {content.url && (
            <div className="detail-section">
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-external"
              >
                🔗 바로 가기
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentCard;