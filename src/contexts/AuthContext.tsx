import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi, AuthResponse, UserInfo } from '../api/authApi'

interface AuthContextType {
  isAuthenticated: boolean
  user: UserInfo | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  signup: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // 토큰이 있으면 사용자 정보 로드
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const userInfo = await authApi.getCurrentUser()
          setUser(userInfo)
        } catch (error) {
          console.error('사용자 정보 로드 실패:', error)
          // 토큰이 유효하지 않으면 제거
          localStorage.removeItem('token')
          setToken(null)
        }
      }
      setLoading(false)
    }

    loadUser()
  }, [token])

  const login = async (username: string, password: string) => {
    try {
      const response: AuthResponse = await authApi.login({ username, password })
      const { token: newToken, userId, username: responseUsername } = response

      // 토큰 저장
      localStorage.setItem('token', newToken)
      setToken(newToken)

      // 사용자 정보 설정
      setUser({
        userId,
        username: responseUsername,
        email: '', // 로그인 응답에 email이 없으므로 나중에 로드
      })
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '로그인에 실패했습니다.')
    }
  }

  const signup = async (username: string, email: string, password: string) => {
    try {
      await authApi.signup({ username, email, password })
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '회원가입에 실패했습니다.')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const value: AuthContextType = {
    isAuthenticated: !!token && !!user,
    user,
    token,
    login,
    signup,
    logout,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
