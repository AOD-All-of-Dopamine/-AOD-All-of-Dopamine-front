const API_BASE = 'http://localhost:8080';

class RecommendationAPI {
  async getInitialRecommendations(username) {
    const response = await fetch(`${API_BASE}/api/recommendations/initial/${username}`);
    if (!response.ok) throw new Error('초기 추천 불러오기 실패');
    return await response.json();
  }

  async getTraditionalRecommendations(username) {
    const response = await fetch(`${API_BASE}/api/recommendations/traditional/${username}`);
    if (!response.ok) throw new Error('전통 추천 불러오기 실패');
    return await response.json();
  }

  async getLLMRecommendations(username, prompt) {
    const response = await fetch(`${API_BASE}/api/recommendations/llm/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error('LLM 추천 요청 실패');
    return await response.json();
  }

  async setUserPreferences(username, preferences) {
    const response = await fetch(`${API_BASE}/api/recommendations/preferences/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });
    if (!response.ok) throw new Error('선호도 설정 실패');
    return await response.json();
  }

  async getUserPreferences(username) {
    const response = await fetch(`${API_BASE}/api/recommendations/preferences/${username}`);
    if (!response.ok) throw new Error('선호도 조회 실패');
    return await response.json();
  }

  async rateContent(username, rating) {
    const response = await fetch(`${API_BASE}/api/recommendations/ratings/${username}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rating),
    });
    if (!response.ok) throw new Error('콘텐츠 평가 실패');
    return await response.json();
  }

  async getAvailableGenres() {
    const response = await fetch(`${API_BASE}/api/recommendations/genres`);
    if (!response.ok) throw new Error('장르 목록 조회 실패');
    return await response.json();
  }

  async getContentTypes() {
    const response = await fetch(`${API_BASE}/api/recommendations/content-types`);
    if (!response.ok) throw new Error('콘텐츠 타입 조회 실패');
    return await response.json();
  }
}

export default new RecommendationAPI();
