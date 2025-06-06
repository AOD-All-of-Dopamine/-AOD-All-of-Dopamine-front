import axios from 'axios';

// axios 인스턴스 생성
const axiosInstance = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - JWT 토큰을 헤더에 추가
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 백엔드 API 호출을 위한 서비스 모듈
const api = {
  // 인증 관련 API 함수들
  auth: {
    // 회원가입
    register: async (username, email, password) => {
      try {
        console.log('회원가입 API 호출 중...');
        const response = await axiosInstance.post('/auth/signup', {
          username,
          email,
          password
        });
        console.log('회원가입 API 응답:', response);
        return response.data;
      } catch (error) {
        console.error('회원가입 중 오류 발생:', error);
        throw error;
      }
    },

    // 로그인
    login: async (username, password) => {
      try {
        console.log('로그인 API 호출 중...');
        const response = await axiosInstance.post('/auth/login', {
          username,
          password
        });
        console.log('로그인 API 응답:', response);
        if (response.data.token) {
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('user', JSON.stringify({
            username,
            roles: response.data.roles || []
          }));
        }
        return response.data;
      } catch (error) {
        console.error('로그인 중 오류 발생:', error);
        throw error;
      }
    },

    // 로그아웃
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },

    // 현재 사용자 정보 가져오기
    getCurrentUser: () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) return JSON.parse(userStr);
        return null;
      } catch (error) {
        console.error('사용자 정보를 가져오는 중 오류 발생:', error);
        return null;
      }
    },

    // 인증 상태 확인
    isAuthenticated: () => {
      const token = localStorage.getItem('token');
      return !!token; // 존재 여부만 true/false로 반환
    }
  },

  // 영화 데이터 가져오기
  getMovies: async () => {
    try {
      console.log('영화 API 호출 중...');
      const response = await axiosInstance.get('/movies');
      console.log('영화 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('영화 데이터를 가져오는 중 오류 발생:', error);
      if (error.response) {
        console.error('서버 응답 오류:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('응답 없음:', error.request);
      } else {
        console.error('요청 설정 오류:', error.message);
      }
      throw error;
    }
  },

  // 게임 데이터 가져오기 (경로 변경: steam-games -> games)
  getGames: async () => {
    try {
      console.log('게임 API 호출 중...');
      const response = await axiosInstance.get('/games');
      console.log('게임 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('게임 데이터를 가져오는 중 오류 발생:', error);
      if (error.response) {
        console.error('서버 응답 오류:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('응답 없음:', error.request);
      } else {
        console.error('요청 설정 오류:', error.message);
      }
      throw error;
    }
  },

  // 하위 호환성을 위한 별칭
  getSteamGames: async () => {
    return api.getGames();
  },

  // 웹툰 데이터 가져오기
  getWebtoons: async () => {
    try {
      console.log('웹툰 API 호출 중...');
      const response = await axiosInstance.get('/webtoons');
      console.log('웹툰 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('웹툰 데이터를 가져오는 중 오류 발생:', error);
      if (error.response) {
        console.error('서버 응답 오류:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('응답 없음:', error.request);
      } else {
        console.error('요청 설정 오류:', error.message);
      }
      throw error;
    }
  },

  // 웹툰 장르별 데이터 가져오기 (genreId -> genreName)
  getWebtoonsByGenre: async (genreName) => {
    try {
      console.log(`장르 ${genreName}의 웹툰 API 호출 중...`);
      const response = await axiosInstance.get(`/webtoons/genre/${genreName}`);
      console.log('웹툰 장르별 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('웹툰 장르별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  // 웹툰 작가별 데이터 가져오기 (새로 추가)
  getWebtoonsByAuthor: async (authorName) => {
    try {
      console.log(`작가 ${authorName}의 웹툰 API 호출 중...`);
      const response = await axiosInstance.get(`/webtoons/author/${authorName}`);
      console.log('웹툰 작가별 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('웹툰 작가별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  // 웹소설 데이터 가져오기
  getNovels: async () => {
    try {
      console.log('웹소설 API 호출 중...');
      const response = await axiosInstance.get('/novels');
      console.log('웹소설 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('웹소설 데이터를 가져오는 중 오류 발생:', error);
      if (error.response) {
        console.error('서버 응답 오류:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('응답 없음:', error.request);
      } else {
        console.error('요청 설정 오류:', error.message);
      }
      throw error;
    }
  },

  // 웹소설 장르별 데이터 가져오기 (genreId -> genreName)
  getNovelsByGenre: async (genreName) => {
    try {
      console.log(`장르 ${genreName}의 웹소설 API 호출 중...`);
      const response = await axiosInstance.get(`/novels/genre/${genreName}`);
      console.log('웹소설 장르별 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('웹소설 장르별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  // 웹소설 작가별 데이터 가져오기 (새로 추가)
  getNovelsByAuthor: async (authorName) => {
    try {
      console.log(`작가 ${authorName}의 웹소설 API 호출 중...`);
      const response = await axiosInstance.get(`/novels/author/${authorName}`);
      console.log('웹소설 작가별 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('웹소설 작가별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  // OTT 콘텐츠 데이터 가져오기 (netflix-content -> ott-content)
  getOttContent: async () => {
    try {
      console.log('OTT 콘텐츠 API 호출 중...');
      const response = await axiosInstance.get('/ott-content');
      console.log('OTT 콘텐츠 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('OTT 콘텐츠 데이터를 가져오는 중 오류 발생:', error);
      if (error.response) {
        console.error('서버 응답 오류:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('응답 없음:', error.request);
      } else {
        console.error('요청 설정 오류:', error.message);
      }
      throw error;
    }
  },

  // 하위 호환성을 위한 별칭
  getNetflixContent: async () => {
    return api.getOttContent();
  },

  // OTT 장르별 데이터 가져오기
  getOttContentByGenre: async (genreName) => {
    try {
      console.log(`장르 ${genreName}의 OTT 콘텐츠 API 호출 중...`);
      const response = await axiosInstance.get(`/ott-content/genre/${genreName}`);
      console.log('OTT 장르별 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('OTT 장르별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  // OTT 배우별 데이터 가져오기 (새로 추가)
  getOttContentByActor: async (actorName) => {
    try {
      console.log(`배우 ${actorName}의 OTT 콘텐츠 API 호출 중...`);
      const response = await axiosInstance.get(`/ott-content/actor/${actorName}`);
      console.log('OTT 배우별 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('OTT 배우별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  // 하위 호환성을 위한 넷플릭스 관련 함수들
  getNetflixContentByGenre: async (genreId) => {
    return api.getOttContentByGenre(genreId);
  },

  getNetflixContentByType: async (type) => {
    try {
      console.log(`타입 ${type}의 OTT 콘텐츠 API 호출 중...`);
      // 통합 검색 API 사용
      const response = await axiosInstance.get(`/search?keyword=&type=ott`);
      console.log('OTT 타입별 API 응답:', response);
      if (response.status === 200) {
        // 클라이언트 사이드에서 타입 필터링
        return response.data.filter(content => 
          !type || content.type?.toLowerCase() === type.toLowerCase()
        );
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('OTT 타입별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  getNetflixContentByYear: async (year) => {
    try {
      console.log(`연도 ${year}의 OTT 콘텐츠 API 호출 중...`);
      // 통합 검색 API 사용
      const response = await axiosInstance.get(`/search?keyword=&type=ott`);
      console.log('OTT 연도별 API 응답:', response);
      if (response.status === 200) {
        // 클라이언트 사이드에서 연도 필터링
        return response.data.filter(content => 
          content.release_year?.toString() === year.toString()
        );
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('OTT 연도별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  // 통합 검색 API
  searchContent: async (keyword, type) => {
    try {
      console.log(`키워드 "${keyword}", 타입 "${type}"로 콘텐츠 검색 중...`);
      const response = await axiosInstance.get(`/search?keyword=${encodeURIComponent(keyword)}&type=${type}`);
      console.log('검색 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('검색 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  // 하위 호환성을 위한 넷플릭스 검색
  searchNetflixContent: async (keyword) => {
    return api.searchContent(keyword, 'ott');
  },

  // 영화 관련 새로운 API들
  getMoviesByGenre: async (genreName) => {
    try {
      console.log(`장르 ${genreName}의 영화 API 호출 중...`);
      const response = await axiosInstance.get(`/movies/genre/${genreName}`);
      console.log('영화 장르별 API 응답:', response);
      return response.data;
    } catch (error) {
      console.error('영화 장르별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  getMoviesByActor: async (actorName) => {
    try {
      console.log(`배우 ${actorName}의 영화 API 호출 중...`);
      const response = await axiosInstance.get(`/movies/actor/${actorName}`);
      console.log('영화 배우별 API 응답:', response);
      return response.data;
    } catch (error) {
      console.error('영화 배우별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  // 게임 관련 새로운 API들
  getGamesByPublisher: async (publisherName) => {
    try {
      console.log(`퍼블리셔 ${publisherName}의 게임 API 호출 중...`);
      const response = await axiosInstance.get(`/games/publisher/${publisherName}`);
      console.log('게임 퍼블리셔별 API 응답:', response);
      return response.data;
    } catch (error) {
      console.error('게임 퍼블리셔별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  getGamesByDeveloper: async (developerName) => {
    try {
      console.log(`개발사 ${developerName}의 게임 API 호출 중...`);
      const response = await axiosInstance.get(`/games/developer/${developerName}`);
      console.log('게임 개발사별 API 응답:', response);
      return response.data;
    } catch (error) {
      console.error('게임 개발사별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  signupWithPreferences: async (userData) => {
    try {
      console.log('선호도 포함 회원가입 API 호출 중...', userData);
      const response = await axiosInstance.post('/auth/signup', {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        preferences: userData.preferences
      });
      console.log('선호도 포함 회원가입 API 응답:', response);
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify({
          username: userData.username,
          email: userData.email,
          hasPreferences: userData.preferences ? true : false,
          roles: response.data.roles || []
        }));
      }
      return response.data;
    } catch (error) {
      console.error('선호도 포함 회원가입 중 오류 발생:', error);
      throw error;
    }
  },

  // 추천 시스템 API
  recommendations: {
    // 전통적인 추천 가져오기
    getTraditionalRecommendations: async (username) => {
      try {
        console.log(`전통적인 추천 API 호출 중... username: ${username}`);
        const response = await axiosInstance.get(`/recommendations/traditional/${username}`);
        console.log('전통적인 추천 API 응답:', response);
        return response.data;
      } catch (error) {
        console.error('전통적인 추천 데이터를 가져오는 중 오류 발생:', error);
        throw error;
      }
    },

    // LLM 추천 요청
    getLLMRecommendations: async (username, prompt) => {
      try {
        console.log(`LLM 추천 API 호출 중... username: ${username}, prompt: ${prompt}`);
        const response = await axiosInstance.post(`/recommendations/llm/${username}`, { prompt });
        console.log('LLM 추천 API 응답:', response);
        return response.data;
      } catch (error) {
        console.error('LLM 추천 데이터를 가져오는 중 오류 발생:', error);
        throw error;
      }
    },

    // LLM 추천 히스토리
    getLLMHistory: async (username) => {
      try {
        const response = await axiosInstance.get(`/recommendations/llm/${username}/history`);
        return response.data;
      } catch (error) {
        console.error('LLM 추천 히스토리를 가져오는 중 오류 발생:', error);
        throw error;
      }
    },

    // 사용자 선호도 설정
    setUserPreferences: async (username, preferences) => {
      try {
        console.log('사용자 선호도 설정 API 호출 중...', preferences);
        const response = await axiosInstance.post(`/recommendations/preferences/${username}`, preferences);
        console.log('사용자 선호도 설정 API 응답:', response);
        return response.data;
      } catch (error) {
        console.error('사용자 선호도 설정 중 오류 발생:', error);
        throw error;
      }
    },

    // 사용자 선호도 조회
    getUserPreferences: async (username) => {
      try {
        const response = await axiosInstance.get(`/recommendations/preferences/${username}`);
        return response.data;
      } catch (error) {
        console.error('사용자 선호도를 가져오는 중 오류 발생:', error);
        throw error;
      }
    },

    // 콘텐츠 평가
    rateContent: async (username, ratingData) => {
      try {
        console.log('콘텐츠 평가 API 호출 중...', ratingData);
        const response = await axiosInstance.post(`/recommendations/ratings/${username}`, ratingData);
        console.log('콘텐츠 평가 API 응답:', response);
        return response.data;
      } catch (error) {
        console.error('콘텐츠 평가 중 오류 발생:', error);
        throw error;
      }
    },

    // 사용자 평가 목록 조회
    getUserRatings: async (username) => {
      try {
        const response = await axiosInstance.get(`/recommendations/ratings/${username}`);
        return response.data;
      } catch (error) {
        console.error('사용자 평가 목록을 가져오는 중 오류 발생:', error);
        throw error;
      }
    },

    // 좋아요 목록 조회
    getUserLikedContent: async (username) => {
      try {
        const response = await axiosInstance.get(`/recommendations/ratings/${username}/liked`);
        return response.data;
      } catch (error) {
        console.error('좋아요 목록을 가져오는 중 오류 발생:', error);
        throw error;
      }
    },

    // 위시리스트 조회
    getUserWishlist: async (username) => {
      try {
        const response = await axiosInstance.get(`/recommendations/ratings/${username}/wishlist`);
        return response.data;
      } catch (error) {
        console.error('위시리스트를 가져오는 중 오류 발생:', error);
        throw error;
      }
    },

    // 콘텐츠 평균 평점 조회
    getContentAverageRating: async (contentType, contentId) => {
      try {
        const response = await axiosInstance.get(`/recommendations/ratings/average/${contentType}/${contentId}`);
        return response.data;
      } catch (error) {
        console.error('콘텐츠 평균 평점을 가져오는 중 오류 발생:', error);
        throw error;
      }
    },

    // 특정 콘텐츠에 대한 사용자 평가 조회
    getUserContentRating: async (username, contentType, contentId) => {
      try {
        const response = await axiosInstance.get(`/recommendations/ratings/${username}/${contentType}/${contentId}`);
        return response.data;
      } catch (error) {
        console.error('사용자 콘텐츠 평가를 가져오는 중 오류 발생:', error);
        throw error;
      }
    },

    // 평가 삭제
    deleteContentRating: async (username, contentType, contentId) => {
      try {
        const response = await axiosInstance.delete(`/recommendations/ratings/${username}/${contentType}/${contentId}`);
        return response.data;
      } catch (error) {
        console.error('콘텐츠 평가 삭제 중 오류 발생:', error);
        throw error;
      }
    },

    getInitialRecommendations: async (username) => {
      try {
        console.log(`초기 추천 API 호출 중... username: ${username}`);
        const response = await axiosInstance.get(`/recommendations/initial/${username}`);
        console.log('초기 추천 API 응답:', response);
        return response.data;
      } catch (error) {
        console.error('초기 추천 데이터를 가져오는 중 오류 발생:', error);
        throw error;
      }
    },
  
    // 장르 목록 조회
    getGenres: async () => {
      try {
        console.log('장르 목록 API 호출 중...');
        const response = await axiosInstance.get('/recommendations/genres');
        console.log('장르 목록 API 응답:', response);
        return response.data;
      } catch (error) {
        console.error('장르 목록을 가져오는 중 오류 발생:', error);
        throw error;
      }
    },
  
    // 콘텐츠 타입 목록 조회
    getContentTypes: async () => {
      try {
        console.log('콘텐츠 타입 목록 API 호출 중...');
        const response = await axiosInstance.get('/recommendations/content-types');
        console.log('콘텐츠 타입 목록 API 응답:', response);
        return response.data;
      } catch (error) {
        console.error('콘텐츠 타입 목록을 가져오는 중 오류 발생:', error);
        throw error;
      }
    }
  }
};

export default api;