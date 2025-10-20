import apiClient from './client'

export interface SignupRequest {
  username: string
  email: string
  password: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
  username: string
  userId: number
  message: string
}

export interface UserInfo {
  userId: number
  username: string
  email: string
}

export const authApi = {
  /**
   * 회원가입
   */
  signup: async (data: SignupRequest): Promise<{ message: string; username: string }> => {
    const response = await apiClient.post('/api/auth/signup', data)
    return response.data
  },

  /**
   * 로그인
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/api/auth/login', data)
    return response.data
  },

  /**
   * 중복 확인
   */
  checkDuplicate: async (data: { username?: string; email?: string }): Promise<any> => {
    const response = await apiClient.post('/api/auth/check-duplicate', data)
    return response.data
  },

  /**
   * 현재 사용자 정보 조회
   */
  getCurrentUser: async (): Promise<UserInfo> => {
    const response = await apiClient.get('/api/auth/me')
    return response.data
  },
}
