import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { authApi, AuthResponse, UserInfo } from "../api/authApi";
import axios from "axios";

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  authReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "token";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // 토큰이 있으면 사용자 정보 로드
  const restoreUser = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY);

    if (!savedToken) {
      setAuthReady(true);
      return;
    }

    setLoading(true);
    try {
      const userInfo = await authApi.getCurrentUser();
      setToken(savedToken);
      setUser(userInfo);
    } catch (error: any) {
      const status = error?.response?.status;

      // 인증 자체가 잘못된 경우만 로그아웃
      if (status === 401 || status === 403) {
        clearAuth();
      } else {
        // 서버 장애/네트워크 문제면 토큰은 유지
        console.error("사용자 정보 복원 실패(일시 오류 가능):", error);
      }
    } finally {
      setLoading(false);
      setAuthReady(true);
    }
  }, [clearAuth]);

  useEffect(() => {
    restoreUser();
  }, [restoreUser]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const response: AuthResponse = await authApi.login({
        username,
        password,
      });

      const { token: newToken, userId, username: responseUsername } = response;

      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);

      // 로그인 응답 기준으로 즉시 인증 상태 확정
      setUser({
        userId,
        username: responseUsername,
        email: "",
      });

      // email 등 상세 정보가 꼭 필요하면 여기서 선택적으로 추가 조회
      // try {
      //   const fullUser = await authApi.getCurrentUser();
      //   setUser(fullUser);
      // } catch (e) {
      //   console.warn("상세 사용자 정보 조회 실패:", e);
      // }
    } catch (error: any) {
      throw new Error(error?.response?.data?.error || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      await authApi.signup({ username, email, password });
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.error || "회원가입에 실패했습니다.",
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearAuth();
  };

  const value: AuthContextType = {
    isAuthenticated: !!token,
    user,
    token,
    login,
    signup,
    logout,
    loading,
    authReady,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
