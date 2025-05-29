// src/components/recommendation/AIChat.js
import React, { useState, useRef, useEffect } from 'react';
import AIMessage from './AIMessage';
import AIRecommendationService from './AIRecommendationService';
import './AIChat.css';

const AIChat = ({ user, onRecommendation, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: `안녕하세요 ${user?.username || '사용자'}님! 😊\n\n어떤 콘텐츠를 찾고 계신가요?\n아래 버튼을 클릭하거나 직접 입력해보세요!`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const messagesEndRef = useRef(null);

  // 컴포넌트 마운트 시 초기 질문 설정
  useEffect(() => {
    setSuggestedQuestions(AIRecommendationService.getInitialQuestions());
  }, []);

  // 메시지 자동 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 메시지 전송 처리
  const sendMessage = async (messageText = null) => {
    const message = messageText || inputMessage.trim();
    if (!message || isLoading) return;

    if (!user || !user.username) {
      setError('로그인이 필요합니다.');
      return;
    }

    setError('');
    setInputMessage('');
    setIsLoading(true);

    // 사용자 메시지 추가
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // AI 추천 서비스 호출
      const result = await AIRecommendationService.getAIRecommendations(user.username, message);

      if (result.success) {
        // 응답 데이터 처리
        const responseText = AIRecommendationService.extractResponseText(result.data);
        const recommendationData = AIRecommendationService.normalizeRecommendationData(result.data);

        // 봇 메시지 추가
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: responseText || 'AI가 추천을 생성했습니다!',
          recommendations: recommendationData,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);

        // 질문 목록 초기화 (대화가 진행되면 가림)
        setSuggestedQuestions([]);

      } else {
        // 에러 처리
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('AI 추천 요청 실패:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: `죄송해요! 추천을 생성하는 중 문제가 발생했습니다. 😅\n\n다시 시도해주세요!`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 추천 질문 클릭 처리
  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  // 추천 적용 처리
  const handleApplyRecommendations = (recommendations) => {
    if (onRecommendation) {
      onRecommendation(recommendations);
    }
    onClose();
  };

  // 폼 제출 처리
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  // 엔터 키 처리
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="ai-chat-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ai-chat-container">
        
        {/* 헤더 */}
        <div className="ai-chat-header">
          <div className="ai-header-content">
            <div className="ai-avatar">
              <span className="ai-emoji">🤖</span>
              <div className="ai-status-dot"></div>
            </div>
            <div className="ai-header-text">
              <h2>AI 추천 어시스턴트</h2>
              <p>맞춤형 콘텐츠 추천</p>
            </div>
          </div>
          <button className="ai-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="ai-error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
            <button className="error-close" onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* 메시지 영역 */}
        <div className="ai-messages-area">
          <div className="ai-messages-container">
            {messages.map((message) => (
              <AIMessage
                key={message.id}
                message={message}
                onApplyRecommendations={handleApplyRecommendations}
              />
            ))}
            
            {/* 로딩 인디케이터 */}
            {isLoading && (
              <div className="ai-message bot">
                <div className="message-avatar">
                  <span>🤖</span>
                </div>
                <div className="message-bubble bot-bubble">
                  <div className="typing-animation">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                  <span className="typing-text">AI가 추천을 생성하고 있어요...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 추천 질문 버튼들 */}
        {suggestedQuestions.length > 0 && !isLoading && (
          <div className="ai-suggestions">
            <p className="suggestions-title">💡 이런 것들을 물어보세요</p>
            <div className="suggestions-grid">
              {suggestedQuestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-chip"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <span className="chip-text">{suggestion}</span>
                  <span className="chip-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 입력 영역 */}
        <div className="ai-input-area">
          <form className="ai-input-form" onSubmit={handleSubmit}>
            <div className="input-container">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="어떤 콘텐츠를 찾고 계신가요? 구체적으로 설명해주세요..."
                disabled={isLoading}
                rows="1"
                className="ai-textarea"
              />
              <button 
                type="submit" 
                disabled={!inputMessage.trim() || isLoading}
                className="ai-send-btn"
              >
                {isLoading ? (
                  <div className="send-spinner"></div>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" 
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </form>
          
          {/* 사용 팁 */}
          <div className="ai-tips">
            <span className="tip-icon">💡</span>
            <span className="tip-text">
              장르, 분위기, 상황을 구체적으로 말해주시면 더 정확한 추천을 받을 수 있어요!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;