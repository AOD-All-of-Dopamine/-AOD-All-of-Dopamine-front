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

  // 스팀 게임 데이터 가져오기
  getSteamGames: async () => {
    try {
      console.log('게임 API 호출 중...');
      const response = await axiosInstance.get('/steam-games');
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

  // 웹툰 장르별 데이터 가져오기
  getWebtoonsByGenre: async (genreId) => {
    try {
      console.log(`장르 ID ${genreId}의 웹툰 API 호출 중...`);
      const response = await axiosInstance.get(`/webtoons/genre/${genreId}`);
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

  // 웹소설 장르별 데이터 가져오기
  getNovelsByGenre: async (genreId) => {
    try {
      console.log(`장르 ID ${genreId}의 웹소설 API 호출 중...`);
      const response = await axiosInstance.get(`/novels/genre/${genreId}`);
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

  // 넷플릭스 콘텐츠 데이터 가져오기
  getNetflixContent: async () => {
    try {
      console.log('넷플릭스 API 호출 중...');
      const response = await axiosInstance.get('/netflix-content');
      console.log('넷플릭스 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('넷플릭스 데이터를 가져오는 중 오류 발생:', error);
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

  // 넷플릭스 타입별(영화, 시리즈 등) 데이터 가져오기
  getNetflixContentByType: async (type) => {
    try {
      console.log(`타입 ${type}의 넷플릭스 콘텐츠 API 호출 중...`);
      const response = await axiosInstance.get(`/netflix-content/type/${type}`);
      console.log('넷플릭스 타입별 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('넷플릭스 타입별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  // 넷플릭스 장르별 데이터 가져오기
  getNetflixContentByGenre: async (genreId) => {
    try {
      console.log(`장르 ID ${genreId}의 넷플릭스 콘텐츠 API 호출 중...`);
      const response = await axiosInstance.get(`/netflix-content/genre/${genreId}`);
      console.log('넷플릭스 장르별 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('넷플릭스 장르별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  // 넷플릭스 연도별 데이터 가져오기
  getNetflixContentByYear: async (year) => {
    try {
      console.log(`연도 ${year}의 넷플릭스 콘텐츠 API 호출 중...`);
      const response = await axiosInstance.get(`/netflix-content/year/${year}`);
      console.log('넷플릭스 연도별 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('넷플릭스 연도별 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  },

  // 넷플릭스 검색 API
  searchNetflixContent: async (keyword) => {
    try {
      console.log(`키워드 "${keyword}"로 넷플릭스 콘텐츠 검색 중...`);
      const response = await axiosInstance.get(`/netflix-content/search?keyword=${encodeURIComponent(keyword)}`);
      console.log('넷플릭스 검색 API 응답:', response);
      if (response.status === 200) {
        return response.data;
      } else {
        console.warn('API 응답이 성공이지만 상태 코드가 200이 아닙니다:', response.status);
        return [];
      }
    } catch (error) {
      console.error('넷플릭스 검색 데이터를 가져오는 중 오류 발생:', error);
      throw error;
    }
  }
};

export default api;