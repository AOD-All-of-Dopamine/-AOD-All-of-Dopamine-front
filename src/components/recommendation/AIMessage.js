import React from 'react';
import './AIMessage.css';

const AIMessage = ({ message, onApplyRecommendations }) => {
  // URL 패턴 정규식
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // URL을 클릭 가능한 링크로 변환
  const formatMessageWithLinks = (text) => {
    if (!text) return '';
    
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="message-link"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // 시간 포맷팅
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      return timestamp.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return '';
    }
  };

  // 콘텐츠 타입별 아이콘
  const getContentTypeIcon = (type) => {
    const icons = {
      'MOVIE': '🎬',
      'WEBTOON': '📚',
      'NOVEL': '📖',
      'GAME': '🎮',
      'OTT': '📺',
      'movie': '🎬',
      'webtoon': '📚',
      'novel': '📖',
      'game': '🎮',
      'ott': '📺'
    };
    return icons[type] || '🎯';
  };

  // 콘텐츠 타입별 라벨
  const getContentTypeLabel = (type) => {
    const labels = {
      'MOVIE': '영화',
      'WEBTOON': '웹툰',
      'NOVEL': '웹소설',
      'GAME': '게임',
      'OTT': 'OTT',
      'movie': '영화',
      'webtoon': '웹툰',
      'novel': '웹소설',
      'game': '게임',
      'ott': 'OTT'
    };
    return labels[type] || type;
  };

  // 추천 콘텐츠 통계 계산
  const getRecommendationStats = (recommendations) => {
    if (!Array.isArray(recommendations)) return null;
    
    const typeCount = {};
    recommendations.forEach(rec => {
      const type = rec.contentType || 'unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const mostCommonType = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      total: recommendations.length,
      mostCommonType: mostCommonType ? mostCommonType[0] : null,
      typeCount
    };
  };

  const stats = message.recommendations ? getRecommendationStats(message.recommendations) : null;

  return (
    <div className={`ai-message ${message.type}`}>
      <div className="message-avatar">
        {message.type === 'user' ? '👤' : '🤖'}
      </div>
      
      <div className={`message-bubble ${message.type === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
        <div className="message-text">
          {message.content && message.content.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {formatMessageWithLinks(line)}
              {index < message.content.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
        
        {/* 추천 콘텐츠 미리보기 */}
        {message.recommendations && Array.isArray(message.recommendations) && message.recommendations.length > 0 && (
          <div className="message-recommendations">
            <h4>
              🎯 맞춤 추천
              {stats && (
                <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6b7280' }}>
                  ({stats.total}개)
                </span>
              )}
            </h4>
            
            {/* 추천 통계 */}
            {stats && stats.total > 1 && (
              <div className="recommendation-stats">
                <div className="stats-item">
                  <span className="stats-icon">📊</span>
                  <span>총 {stats.total}개 추천</span>
                </div>
                {stats.mostCommonType && (
                  <div className="stats-item">
                    <span className="stats-icon">{getContentTypeIcon(stats.mostCommonType)}</span>
                    <span>{getContentTypeLabel(stats.mostCommonType)} 중심</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="recommendation-grid">
              {message.recommendations.slice(0, 4).map((rec, index) => (
                <div key={index} className="recommendation-item">
                  <div className="rec-title" title={rec.title}>
                    {getContentTypeIcon(rec.contentType)} {rec.title || '제목 없음'}
                  </div>
                  <div className="rec-type">
                    {getContentTypeLabel(rec.contentType)}
                  </div>
                  {rec.summary && (
                    <div className="rec-description" title={rec.summary}>
                      {rec.summary}
                    </div>
                  )}
                  {rec.creator && (
                    <div className="rec-description">
                      👨‍🎨 {rec.creator}
                    </div>
                  )}
                </div>
              ))}
              
              {message.recommendations.length > 4 && (
                <div className="more-recommendations">
                  ✨ +{message.recommendations.length - 4}개 추가 추천
                </div>
              )}
            </div>
            
            <button 
              className="apply-recommendations-btn"
              onClick={() => onApplyRecommendations(message.recommendations)}
              title={`${message.recommendations.length}개의 추천을 확인하세요`}
            >
              <span>🎉</span>
              <span>추천 목록 확인하기</span>
              <span>({message.recommendations.length})</span>
            </button>
          </div>
        )}
      </div>
      
      {message.timestamp && (
        <div className="message-time">
          {formatTime(message.timestamp)}
        </div>
      )}
    </div>
  );
};

export default AIMessage;