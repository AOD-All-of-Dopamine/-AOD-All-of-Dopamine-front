import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// 요청 인터셉터
apiClient.interceptors.request.use(
  (config) => {
    // 인증 토큰이 있으면 추가
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log("API Request:", config.method?.toUpperCase(), config.url, {
      params: config.params,
      data: config.data,
    });

    return config;
  },
  (error) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => {
    console.log(
      "API Response:",
      response.config.method?.toUpperCase(),
      response.config.url,
      response.data
    );
    return response;
  },
  (error) => {
    if (error.response) {
      // 서버 응답이 있는 경우
      console.error(
        "API Response Error:",
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      // 요청은 보냈지만 응답이 없는 경우
      console.error("No response from server");
    } else {
      // 요청 설정 중 에러
      console.error("Error setting up request:", error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
