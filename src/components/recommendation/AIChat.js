import React, { useState, useRef, useEffect } from 'react';
import AIMessage from './AIMessage';
import AIRecommendationService from './AIRecommendationService';
import './AIChat.css';

const AIChat = ({ user, onRecommendation, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [showWelcome, setShowWelcome] = useState(true);
  
  // 창 상태 관리
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({
    x: window.innerWidth - 450 - 20, // 오른쪽 여백
    y: Math.max(20, (window.innerHeight - 700) / 2) // 세로 중앙
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const chatWindowRef = useRef(null);

  // 개선된 초기 질문들
  const initialQuestions = [
    "🎬 오늘 밤에 볼 재미있는 영화 추천해줘",
    "📚 힐링되는 웹툰이나 웹소설 추천",
    "🎮 친구들과 함께할 게임 추천",
    // "😊 기분 좋아지는 콘텐츠 추천",
    // "🌙 잠들기 전에 볼 콘텐츠 추천"
  ];

  // 컴포넌트 마운트 시 웰컴 메시지와 초기 질문 설정
  useEffect(() => {
    if (showWelcome) {
      const welcomeMessage = {
        id: Date.now(),
        type: 'bot',
        content: `안녕하세요 ${user?.username || '님'}! 🎉\n\n저는 여러분의 취향에 맞는 완벽한 콘텐츠를 찾아드리는 AI 어시스턴트입니다.\n\n어떤 기분이신가요? 무엇을 찾고 계신지 알려주세요!`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      setSuggestedQuestions(initialQuestions);
      setShowWelcome(false);
    }
  }, [user, showWelcome]);

  // 메시지 자동 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 텍스트 영역 자동 리사이즈
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputMessage]);

  // 드래그 시작 핸들러
  const handleDragStart = (e) => {
    if (e.target.closest('.ai-chat-header') && !isMaximized) {
      setIsDragging(true);
      const rect = chatWindowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // 드래그 중 핸들러
  const handleDrag = (e) => {
    if (isDragging && !isMaximized) {
      const maxX = window.innerWidth - chatWindowRef.current.offsetWidth;
      const maxY = window.innerHeight - chatWindowRef.current.offsetHeight;

      const newX = Math.min(Math.max(0, e.clientX - dragOffset.x), maxX);
      const newY = Math.min(Math.max(0, e.clientY - dragOffset.y), maxY);

      setPosition({ x: newX, y: newY });
    }
  };

  // 드래그 종료 핸들러
  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // 마우스 이벤트 리스너
  useEffect(() => {
    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  // 최대화/최소화 토글
  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  // ESC 키로 최대화 해제
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMaximized]);

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

    // 추천 질문 숨기기
    if (suggestedQuestions.length > 0) {
      setSuggestedQuestions([]);
    }

    // 사용자 메시지 추가
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const result = await AIRecommendationService.getAIRecommendations(user.username, message);

      if (result.success) {
        const responseText = AIRecommendationService.extractResponseText(result.data);
        const recommendationData = AIRecommendationService.normalizeRecommendationData(result.data);

        let botContent = responseText;
        if (!botContent && recommendationData.length > 0) {
          botContent = `네! ${recommendationData.length}개의 맞춤 추천을 준비했습니다! 🎯\n\n각 추천을 확인해보시고, 마음에 드는 것이 있다면 추천 목록을 확인해보세요.`;
        } else if (!botContent) {
          botContent = '죄송해요, 지금은 추천을 생성할 수 없습니다. 다른 방식으로 설명해주시겠어요?';
        }

        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: botContent,
          recommendations: recommendationData,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);

      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('AI 추천 요청 실패:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: `앗, 문제가 발생했어요! 😅\n\n잠시 후 다시 시도해주시거나, 다른 방식으로 질문해주세요.\n\n예: "액션 영화 추천해줘" 또는 "로맨스 웹툰 찾고 있어"`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 추천 질문 클릭 처리
  const handleSuggestionClick = (suggestion) => {
    const cleanSuggestion = suggestion.replace(/^[🎬📚🎮😊🌙]\s*/, '');
    sendMessage(cleanSuggestion);
  };

  // 추천 적용 처리
  const handleApplyRecommendations = (recommendations) => {
    if (onRecommendation && Array.isArray(recommendations)) {
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

  // 외부 클릭으로 모달 닫기 (최대화 상태가 아닐 때만)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isMaximized) {
      onClose();
    }
  };

  // 창 스타일 계산
  const chatWindowStyle = isMaximized
    ? {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        width: '100%',
        height: '100%',
        borderRadius: '0',
        zIndex: '1000'
      }
    : {
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: '450px',
        height: '700px',
        zIndex: '1000'
      };

  return (
    <div className={`ai-chat-overlay ${isMaximized ? 'maximized' : ''}`} onClick={handleOverlayClick}>
      <div 
        className={`ai-chat-container ${isMaximized ? 'maximized' : ''} ${isDragging ? 'dragging' : ''}`}
        style={chatWindowStyle}
        ref={chatWindowRef}
      >
        
        {/* 헤더 */}
        <div className="ai-chat-header" onMouseDown={handleDragStart}>
          <div className="ai-header-content">
            <div className="ai-avatar">
              <span className="ai-emoji">🤖</span>
              <div className="ai-status-dot"></div>
            </div>
            <div className="ai-header-text">
              <h2>AI 추천 어시스턴트</h2>
              <p>당신만을 위한 맞춤 콘텐츠</p>
            </div>
          </div>
          
          <div className="header-controls">
            <button 
              className={`control-btn maximize-btn`}
              onClick={toggleMaximize} 
              title={isMaximized ? '창 모드로 전환 (ESC)' : '전체화면으로 전환'}
            >
              {isMaximized ? '↙' : '↗'}
            </button>
            
            <button className="control-btn close-btn" onClick={onClose} title="닫기">
              ✕
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="ai-error-banner">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
            <button className="error-close" onClick={() => setError('')} title="에러 메시지 닫기">×</button>
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
                <div className="message-avatar">🤖</div>
                <div className="message-bubble bot-bubble">
                  <div className="typing-animation">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                  <div className="typing-text">완벽한 추천을 찾고 있어요...</div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 추천 질문 버튼들 */}
        {suggestedQuestions.length > 0 && !isLoading && (
          <div className="ai-suggestions">
            <p className="suggestions-title">
              ✨ 이런 질문은 어떠세요?
            </p>
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
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="무엇을 찾고 계신가요? 예: 재미있는 액션 영화, 힐링되는 웹툰..."
                disabled={isLoading}
                rows="1"
                className="ai-textarea"
                style={{ 
                  minHeight: '20px',
                  maxHeight: '100px',
                  overflow: 'hidden',
                  resize: 'none'
                }}
              />
              <button 
                type="submit" 
                disabled={!inputMessage.trim() || isLoading}
                className="ai-send-btn"
                title={inputMessage.trim() ? "메시지 전송" : "메시지를 입력해주세요"}
              >
                {isLoading ? (
                  <div className="send-spinner"></div>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
              구체적으로 설명할수록 더 정확한 추천을 받을 수 있어요! (Shift+Enter로 줄바꿈)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;