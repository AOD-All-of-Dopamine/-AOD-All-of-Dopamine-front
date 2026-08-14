import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosInstance,
} from "axios";

// In development, prefer explicit env var or localhost. In production, if no
// VITE_API_BASE_URL is provided, use a same-origin `/api` path so the app can
// call a frontend-hosted proxy (Vercel function, CDN edge function, etc.)
// This enables a frontend-only workaround when you can't change the backend
// CORS settings.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:8080");

const isDev = import.meta.env.DEV;

const logRequest = (config: InternalAxiosRequestConfig) => {
  if (isDev) {
    console.log("API Request:", config.method?.toUpperCase(), config.url, {
      params: config.params,
      data: config.data,
    });
  }
  return config;
};

const logRequestError = (error: AxiosError) => {
  if (isDev) {
    console.error("API Request Error:", error);
  }
  return Promise.reject(error);
};

const logResponse = (response: AxiosResponse) => {
  if (isDev) {
    console.log(
      "API Response:",
      response.config.method?.toUpperCase(),
      response.config.url,
      response.data,
    );
  }
  return response;
};

const logResponseError = (error: AxiosError) => {
  if (isDev) {
    if (error.response) {
      console.error(
        "API Response Error:",
        error.config?.method?.toUpperCase(),
        error.config?.url,
        error.response.status,
        error.response.data,
      );
    } else if (error.request) {
      console.error(
        "No response from server:",
        error.config?.method?.toUpperCase(),
        error.config?.url,
      );
    } else {
      console.error("Error setting up request:", error.message);
    }
  }

  // 필요하면 401 공통 처리 추가 가능
  // if (error.response?.status === 401) {
  //   localStorage.removeItem("token");
  //   window.location.href = "/login";
  // }

  return Promise.reject(error);
};

// 배열 파라미터를 platforms=a&platforms=b 반복 형식으로 직렬화.
// axios 기본값(platforms[]=a 브래킷)은 Spring @RequestParam List 바인딩이 받지 못한다.
const REPEAT_ARRAY_PARAMS = { indexes: null } as const;

export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  // increase timeout to handle slow upstreams (was 10s)
  timeout: 30000,
  paramsSerializer: REPEAT_ARRAY_PARAMS,
});

export const privateApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  paramsSerializer: REPEAT_ARRAY_PARAMS,
});

// Retry interceptor for transient failures (network errors, timeouts, 5xx, 429)
const addRetryInterceptor = (
  instance: AxiosInstance,
  { retries = 2, retryDelay = 500 } = {} as {
    retries?: number;
    retryDelay?: number;
  },
) => {
  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as any;
    if (!config) return Promise.reject(error);

    config.__retryCount = config.__retryCount || 0;

    const shouldRetry = (() => {
      // Network or timeout
      if (!error.response) return true;
      const status = error.response.status;
      // Retry on server errors and too many requests
      if (status >= 500 && status < 600) return true;
      if (status === 429) return true;
      return false;
    })();

    if (!shouldRetry) return Promise.reject(error);

    if (config.__retryCount >= retries) return Promise.reject(error);

    config.__retryCount += 1;
    const delay = Math.round(
      retryDelay *
        Math.pow(2, config.__retryCount - 1) *
        (0.8 + Math.random() * 0.4),
    );

    if (import.meta.env.DEV) {
      console.warn(
        `Request retry #${config.__retryCount} for ${config.url} after ${delay}ms`,
      );
    }

    await new Promise((r) => setTimeout(r, delay));
    return instance.request(config);
  });
};

console.log("API_BASE_URL =", API_BASE_URL);

publicApi.interceptors.request.use(logRequest, logRequestError);
// add retry logic for transient failures before the response error handler
addRetryInterceptor(publicApi, { retries: 2, retryDelay: 500 });
publicApi.interceptors.response.use(logResponse, logResponseError);

privateApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return logRequest(config);
}, logRequestError);

// add retry logic for transient failures before the response error handler
addRetryInterceptor(privateApi, { retries: 2, retryDelay: 500 });
privateApi.interceptors.response.use(logResponse, logResponseError);
