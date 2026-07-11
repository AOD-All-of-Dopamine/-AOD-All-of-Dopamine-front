import { publicApi, privateApi } from "./client";

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  userId: number;
  message: string;
}

export interface UserInfo {
  userId: number;
  username: string;
  email: string;
}

export interface DuplicateCheckRequest {
  username?: string;
  email?: string;
}

export interface DuplicateCheckResponse {
  usernameDuplicate?: boolean;
  emailDuplicate?: boolean;
  message?: string;
}

export const authApi = {
  /**
   * 회원가입
   */
  signup: async (
    payload: SignupRequest,
  ): Promise<{ message: string; username: string }> => {
    const { data } = await publicApi.post<{
      message: string;
      username: string;
    }>("/api/auth/signup", payload);
    return data;
  },

  /**
   * 로그인
   */
  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const { data } = await publicApi.post<AuthResponse>(
      "/api/auth/login",
      payload,
    );
    return data;
  },

  /**
   * 중복 확인
   */
  checkDuplicate: async (
    payload: DuplicateCheckRequest,
  ): Promise<DuplicateCheckResponse> => {
    const { data } = await publicApi.post<DuplicateCheckResponse>(
      "/api/auth/check-duplicate",
      payload,
    );
    return data;
  },

  /**
   * 현재 사용자 정보 조회
   */
  getCurrentUser: async (): Promise<UserInfo> => {
    const { data } = await privateApi.get<UserInfo>("/api/auth/me");
    return data;
  },
};
