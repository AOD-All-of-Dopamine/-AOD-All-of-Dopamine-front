// src/components/recommendation/AIMessage.js
import React from 'react';
import './AIMessage.css';

const AIMessage = ({ message, onApplyRecommendations }) => {
  // URL 패턴 정규식
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  // URL을 클릭 가능한 링크로 변환
  const formatMessageWithLinks = (text) => {
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
    return timestamp.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`ai-message ${message.type}`}>
      <div className="message-avatar"></div>
      
      <div className={`message-bubble ${message.type === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
        <div className="message-text">
          {message.content.split('\n').map((line, index) => (
            <React.Fragment key={index}>
              {formatMessageWithLinks(line)}
              {index < message.content.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
        
        {/* 추천 콘텐츠 미리보기 */}
        {message.recommendations && message.recommendations.length > 0 && (
          <div className="message-recommendations">
            <h4>🎯 맞춤 추천 ({message.recommendations.length}개)</h4>
            <div className="recommendation-preview">
              {message.recommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="recommendation-item">
                  <div className="rec-title">{rec.title}</div>
                  <div className="rec-type">{rec.contentType}</div>
                </div>
              ))}
              {message.recommendations.length > 3 && (
                <div className="more-recommendations">
                  +{message.recommendations.length - 3}개 추가 추천 콘텐츠
                </div>
              )}
            </div>
            <button 
              className="apply-recommendations-btn"
              onClick={() => onApplyRecommendations(message.recommendations)}
            >
              ✨ 이 추천들 확인하기
            </button>
          </div>
        )}
      </div>
      
      <div className="message-time">
        {formatTime(message.timestamp)}
      </div>
    </div>
  );
};

export default AIMessage;