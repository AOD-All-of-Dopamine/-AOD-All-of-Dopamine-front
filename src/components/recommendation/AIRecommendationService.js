// src/components/recommendation/AIRecommendationService.js
import api from '../../api';

class AIRecommendationService {
  constructor() {
    this.suggestedQuestions = [
      '오늘 기분이 우울해, 힐링되는 콘텐츠 추천해줘',
      '친구랑 함께 볼 재미있는 영화 추천',
      '집에서 혼자 볼 웹툰, 로맨스 웹툰이 좋아!',
      '스릴러 소설 읽고 싶어 웹소설 추천',
      '주말에 친구 집에서 같이할 게임 추천',
      '세로로 짧게 볼 수 있는 내용이 좋아',
      '오늘 밤에 볼 추천해줘'
    ];
  }

  // 초기 추천 질문 목록 가져오기
  getInitialQuestions() {
    return this.suggestedQuestions;
  }

  // AI 추천 요청
  async getAIRecommendations(username, prompt) {
    try {
      console.log('AI 추천 요청:', { username, prompt });
      
      const response = await api.recommendations.getLLMRecommendations(username, prompt);
      console.log('AI 추천 응답:', response);

      return {
        success: true,
        data: response
      };
    } catch (error) {
      console.error('AI 추천 요청 실패:', error);
      return {
        success: false,
        error: error.message || 'AI 추천 요청 중 오류가 발생했습니다.'
      };
    }
  }

  // 추천 데이터 정규화
  normalizeRecommendationData(data) {
    if (!data) return [];
    
    // 추천 데이터가 있는 필드들을 확인
    const possibleRecommendationFields = [
      'recommendations', 'data', 'movies', 'webtoons', 
      'novels', 'games', 'ott', 'content', 'items'
    ];
    
    let recommendations = [];
    
    // 각 필드에서 배열 데이터 찾기
    for (const field of possibleRecommendationFields) {
      if (data[field] && Array.isArray(data[field])) {
        recommendations = [...recommendations, ...data[field]];
      } else if (data[field] && typeof data[field] === 'object') {
        // 중첩된 객체에서 배열 찾기
        Object.values(data[field]).forEach(value => {
          if (Array.isArray(value)) {
            recommendations = [...recommendations, ...value];
          }
        });
      }
    }
    
    // 데이터가 직접 배열인 경우
    if (recommendations.length === 0 && Array.isArray(data)) {
      recommendations = data;
    }
    
    // 각 아이템 정규화
    return recommendations.map(item => this.normalizeContentItem(item)).filter(Boolean);
  }

  // 개별 콘텐츠 아이템 정규화
  normalizeContentItem(item) {
    if (!item || typeof item !== 'object') return null;
    
    return {
      id: item.id || item.contentId || Math.random().toString(36),
      title: item.title || item.name || item.contentTitle || '제목 없음',
      contentType: item.contentType || item.type || 'UNKNOWN',
      creator: item.creator || item.author || item.director,
      summary: item.summary || item.description || item.plot,
      imageUrl: item.imageUrl || item.thumbnail || item.thumbnailUrl,
      rating: item.rating || item.score,
      genre: item.genre || item.genres,
      releaseDate: item.releaseDate || item.publishDate,
      ...item // 원본 데이터도 보존
    };
  }

  // 응답 텍스트 추출
  extractResponseText(response) {
    if (!response || typeof response !== 'object') {
      return typeof response === 'string' ? response : '';
    }

    // LLM 응답 텍스트 추출
    if (response.llmResponse) {
      return response.llmResponse;
    } else if (response.response) {
      return response.response;
    } else if (response.message) {
      return response.message;
    } else if (response.content) {
      return response.content;
    }

    return '';
  }

  // 추천 키워드 추출 (향후 확장용)
  extractKeywords(message) {
    const keywords = [];
    
    // 장르 키워드
    const genreKeywords = ['액션', '로맨스', '코미디', '드라마', '스릴러', '판타지', '공포', 'SF'];
    genreKeywords.forEach(genre => {
      if (message.includes(genre)) keywords.push(genre);
    });

    // 분위기 키워드
    const moodKeywords = ['힐링', '재미있는', '슬픈', '무서운', '감동적인'];
    moodKeywords.forEach(mood => {
      if (message.includes(mood)) keywords.push(mood);
    });

    // 콘텐츠 타입 키워드
    const typeKeywords = ['영화', '웹툰', '웹소설', '게임', 'OTT'];
    typeKeywords.forEach(type => {
      if (message.includes(type)) keywords.push(type);
    });

    return keywords;
  }
}

export default new AIRecommendationService();