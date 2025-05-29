import React, { useState } from 'react';
import './RatingComponent.css';

const RatingComponent = ({ onRate, currentRating = 0 }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(currentRating);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const handleStarClick = (rating) => {
    setSelectedRating(rating);
    onRate(rating, 'STAR');
  };

  const handleQuickAction = (action) => {
    let rating = 0;
    switch (action) {
      case 'LIKE':
        rating = 1;
        break;
      case 'WISHLIST':
        rating = 1;
        break;
      case 'COMPLETED':
        rating = 1;
        break;
      default:
        rating = 0;
    }
    onRate(rating, action);
    setShowQuickActions(false);
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          className={`star ${i <= (hoverRating || selectedRating) ? 'active' : ''}`}
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => handleStarClick(i)}
          title={`${i}점`}
        >
          ⭐
        </button>
      );
    }
    return stars;
  };

  return (
    <div className="rating-component">
      {/* 별점 평가 */}
      <div className="star-rating">
        <div className="stars">
          {renderStars()}
        </div>
        {selectedRating > 0 && (
          <span className="rating-text">{selectedRating}/5</span>
        )}
      </div>

      {/* 빠른 액션 토글 */}
      <div className="quick-actions-wrapper">
        <button 
          className="quick-toggle"
          onClick={() => setShowQuickActions(!showQuickActions)}
          title="빠른 평가"
        >
          ⚡
        </button>

        {showQuickActions && (
          <div className="quick-actions">
            <button 
              className="quick-action like"
              onClick={() => handleQuickAction('LIKE')}
              title="좋아요"
            >
              👍
            </button>
            <button 
              className="quick-action wishlist"
              onClick={() => handleQuickAction('WISHLIST')}
              title="위시리스트"
            >
              💖
            </button>
            <button 
              className="quick-action completed"
              onClick={() => handleQuickAction('COMPLETED')}
              title="시청/독서/플레이 완료"
            >
              ✅
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RatingComponent;