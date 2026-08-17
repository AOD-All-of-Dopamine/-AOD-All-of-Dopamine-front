import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosInstance,
} from "axios";

export interface ApiClientOptions {
  baseURL: string;
  getToken: () => string | null | Promise<string | null>;
  onSessionExpired?: () => void | Promise<void>;
  isDev?: boolean;
  retry?: { retries?: number; retryDelay?: number };
  sleep?: (ms: number) => Promise<void>;
}

export interface ApiClients {
  publicApi: AxiosInstance;
  privateApi: AxiosInstance;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createApiClients(options: ApiClientOptions): ApiClients {
  const {
    baseURL,
    getToken,
    onSessionExpired,
    isDev = false,
    sleep = defaultSleep,
  } = options;
  const { retries = 2, retryDelay = 500 } = options.retry ?? {};

  // dev 로그에도 비밀번호·토큰은 남기지 않는다 (auth 요청 body/응답 마스킹)
  const isAuthUrl = (url?: string) => !!url && url.includes("/auth/");

  const logRequest = (config: InternalAxiosRequestConfig) => {
    if (isDev) {
      console.log("API Request:", config.method?.toUpperCase(), config.url, {
        params: config.params,
        data: isAuthUrl(config.url) ? "[redacted]" : config.data,
      });
    }
    return config;
  };

  const logRequestError = (error: AxiosError) => {
    if (isDev) console.error("API Request Error:", error);
    return Promise.reject(error);
  };

  const logResponse = (response: AxiosResponse) => {
    if (isDev) {
      console.log(
        "API Response:",
        response.config.method?.toUpperCase(),
        response.config.url,
        isAuthUrl(response.config.url) ? "[redacted]" : response.data,
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
    return Promise.reject(error);
  };

  // 동시 401에서 콜백을 1회로 합치는 single-flight
  let sessionExpirationPromise: Promise<void> | null = null;
  const handleSessionExpired = async () => {
    if (!onSessionExpired) return;
    if (!sessionExpirationPromise) {
      sessionExpirationPromise = Promise.resolve(onSessionExpired()).finally(() => {
        sessionExpirationPromise = null;
      });
    }
    await sessionExpirationPromise;
  };

  const addRetryInterceptor = (instance: AxiosInstance) => {
    instance.interceptors.response.use(undefined, async (error: AxiosError) => {
      const config = error.config as InternalAxiosRequestConfig & {
        __retryCount?: number;
      };
      if (!config) return Promise.reject(error);

      config.__retryCount = config.__retryCount || 0;

      // 비멱등 메서드는 재시도하지 않는다 — 응답 유실 시 중복 쓰기 방지
      const method = (config.method ?? "get").toLowerCase();
      const isRetryableMethod =
        method === "get" || method === "head" || method === "options";

      const status = error.response?.status;
      const shouldRetry =
        isRetryableMethod &&
        (!error.response ||
          status === 429 ||
          (status !== undefined && status >= 500 && status < 600));

      if (!shouldRetry) return Promise.reject(error);
      if (config.__retryCount >= retries) return Promise.reject(error);

      config.__retryCount += 1;
      const delay = Math.round(
        retryDelay * Math.pow(2, config.__retryCount - 1) * (0.8 + Math.random() * 0.4),
      );

      if (isDev) {
        console.warn(`Request retry #${config.__retryCount} for ${config.url} after ${delay}ms`);
      }

      await sleep(delay);
      return instance.request(config);
    });
  };

  // 배열 파라미터를 platforms=a&platforms=b 반복 형식으로 직렬화.
  // axios 기본값(platforms[]=a 브래킷)은 Spring @RequestParam List 바인딩이 받지 못한다.
  const REPEAT_ARRAY_PARAMS = { indexes: null } as const;

  const publicApi = axios.create({
    baseURL,
    timeout: 30000,
    paramsSerializer: REPEAT_ARRAY_PARAMS,
  });
  const privateApi = axios.create({
    baseURL,
    timeout: 30000,
    paramsSerializer: REPEAT_ARRAY_PARAMS,
  });

  publicApi.interceptors.request.use(logRequest, logRequestError);
  addRetryInterceptor(publicApi);
  publicApi.interceptors.response.use(logResponse, logResponseError);

  privateApi.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return logRequest(config);
  }, logRequestError);
  addRetryInterceptor(privateApi);
  privateApi.interceptors.response.use(logResponse, async (error: AxiosError) => {
    if (error.response?.status === 401) {
      await handleSessionExpired();
    }
    return logResponseError(error);
  });

  return { publicApi, privateApi };
}
