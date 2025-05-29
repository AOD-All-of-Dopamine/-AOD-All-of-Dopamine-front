import React, { useState, useEffect } from 'react';
import './PreferenceModal.css';

const PreferenceModal = ({ 
  user, 
  currentPreferences, 
  contentTypes, 
  genres, 
  onSave, 
  onClose 
}) => {
  const [preferences, setPreferences] = useState({
    preferredGenres: [],
    preferredContentTypes: [],
    ageRange: '',
    preferredLanguage: 'Korean',
    preferredRating: '',
    mood: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentPreferences) {
      setPreferences({
        preferredGenres: currentPreferences.preferredGenres || [],
        preferredContentTypes: currentPreferences.preferredContentTypes || [],
        ageRange: currentPreferences.ageRange || '',
        preferredLanguage: currentPreferences.preferredLanguage || 'Korean',
        preferredRating: currentPreferences.preferredRating || '',
        mood: currentPreferences.mood || []
      });
    }
  }, [currentPreferences]);

  const handleGenreToggle = (genre) => {
    setPreferences(prev => ({
      ...prev,
      preferredGenres: prev.preferredGenres.includes(genre)
        ? prev.preferredGenres.filter(g => g !== genre)
        : [...prev.preferredGenres, genre]
    }));
  };

  const handleContentTypeToggle = (type) => {
    setPreferences(prev => ({
      ...prev,
      preferredContentTypes: prev.preferredContentTypes.includes(type)
        ? prev.preferredContentTypes.filter(t => t !== type)
        : [...prev.preferredContentTypes, type]
    }));
  };

  const handleMoodToggle = (moodItem) => {
    setPreferences(prev => ({
      ...prev,
      mood: prev.mood.includes(moodItem)
        ? prev.mood.filter(m => m !== moodItem)
        : [...prev.mood, moodItem]
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/recommendations/preferences/${user.username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        const updatedPreferences = await response.json();
        onSave(updatedPreferences);
      } else {
        console.error('선호도 저장 실패');
      }
    } catch (error) {
      console.error('선호도 저장 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const contentTypeOptions = [
    { value: 'MOVIE', label: '🎬 영화', icon: '🎬' },
    { value: 'WEBTOON', label: '📚 웹툰', icon: '📚' },
    { value: 'NOVEL', label: '📖 웹소설', icon: '📖' },
    { value: 'GAME', label: '🎮 게임', icon: '🎮' },
    { value: 'OTT', label: '📺 OTT', icon: '📺' }
  ];

  const ageRangeOptions = [
    { value: '10s', label: '10대' },
    { value: '20s', label: '20대' },
    { value: '30s', label: '30대' },
    { value: '40s', label: '40대' },
    { value: '50s+', label: '50대 이상' }
  ];

  const moodOptions = [
    '재미있는', '감동적인', '스릴있는', '무서운', '로맨틱한',
    '웃긴', '진지한', '판타지적인', '현실적인', '교육적인',
    '힐링되는', '액션가득한', '미스터리한', '따뜻한', '시원한'
  ];

  const ratingOptions = [
    { value: 'ALL', label: '전체 이용가' },
    { value: '12+', label: '12세 이상' },
    { value: '15+', label: '15세 이상' },
    { value: '18+', label: '성인' }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="preference-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ 취향 설정</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-content">
          {/* 콘텐츠 타입 선호도 */}
          <div className="preference-section">
            <h3>📱 관심있는 콘텐츠</h3>
            <div className="option-grid">
              {contentTypeOptions.map(option => (
                <button
                  key={option.value}
                  className={`option-card ${preferences.preferredContentTypes.includes(option.value) ? 'selected' : ''}`}
                  onClick={() => handleContentTypeToggle(option.value)}
                >
                  <span className="option-icon">{option.icon}</span>
                  <span className="option-label">{option.label.replace(option.icon + ' ', '')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 장르 선호도 */}
          <div className="preference-section">
            <h3>🎭 좋아하는 장르</h3>
            <div className="genre-tags">
              {genres.map(genre => (
                <button
                  key={genre}
                  className={`genre-tag ${preferences.preferredGenres.includes(genre) ? 'selected' : ''}`}
                  onClick={() => handleGenreToggle(genre)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* 연령대 */}
          <div className="preference-section">
            <h3>👤 연령대</h3>
            <div className="radio-group">
              {ageRangeOptions.map(option => (
                <label key={option.value} className="radio-option">
                  <input
                    type="radio"
                    name="ageRange"
                    value={option.value}
                    checked={preferences.ageRange === option.value}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      ageRange: e.target.value
                    }))}
                  />
                  <span className="radio-label">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 기분/분위기 */}
          <div className="preference-section">
            <h3>🌈 선호하는 분위기</h3>
            <div className="mood-tags">
              {moodOptions.map(mood => (
                <button
                  key={mood}
                  className={`mood-tag ${preferences.mood.includes(mood) ? 'selected' : ''}`}
                  onClick={() => handleMoodToggle(mood)}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          {/* 관람등급 */}
          <div className="preference-section">
            <h3>🔞 선호 관람등급</h3>
            <div className="radio-group">
              {ratingOptions.map(option => (
                <label key={option.value} className="radio-option">
                  <input
                    type="radio"
                    name="preferredRating"
                    value={option.value}
                    checked={preferences.preferredRating === option.value}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      preferredRating: e.target.value
                    }))}
                  />
                  <span className="radio-label">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 언어 설정 */}
          <div className="preference-section">
            <h3>🌐 선호 언어</h3>
            <select
              value={preferences.preferredLanguage}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                preferredLanguage: e.target.value
              }))}
              className="language-select"
            >
              <option value="Korean">한국어</option>
              <option value="English">English</option>
              <option value="Japanese">日本語</option>
              <option value="Chinese">中文</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            취소
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? '저장 중...' : '💾 저장하기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreferenceModal;