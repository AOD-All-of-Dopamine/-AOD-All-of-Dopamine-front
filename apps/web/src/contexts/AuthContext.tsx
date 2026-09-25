import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useApis } from "@aod/shared/hooks";
import { recKeys } from "@aod/shared/queries";
import type { AuthResponse, UserInfo } from "@aod/shared/api";
import { clearRecChains } from "../hooks/useRecChain";
import { clearPendingOnboarding, markPendingOnboarding } from "../hooks/pendingOnboarding";
import { subscribeSessionExpired } from "../hooks/sessionExpired";

/** 가입 결과. 가입은 로그인이 아니므로 토큰이 아니라 "다음에 무엇을 할지"만 돌려준다. */
export interface SignupResult {
  username: string;
  needsOnboarding: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserInfo | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<SignupResult>;
  logout: () => void;
  loading: boolean;
  authReady: boolean;
  /** 로그인이 만료돼 로그아웃된 시각. 화면이 한 번 알리고 `dismissSessionExpired` 로 지운다. */
  sessionExpiredAt: number | null;
  dismissSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "token";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { authApi } = useApis();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [sessionExpiredAt, setSessionExpiredAt] = useState<number | null>(null);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    // 다른 사용자의 추천 목록·체인이 남지 않게 한다 (추천 탭 설계 §4)
    queryClient.removeQueries({ queryKey: recKeys.root() });
    clearRecChains();
  }, [queryClient]);

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
  }, [clearAuth, authApi]);

  useEffect(() => {
    restoreUser();
  }, [restoreUser]);

  // 요청 중 401 — 토큰이 있었던 경우만 로그아웃으로 본다. 토큰이 없는데 401 이면(비로그인으로
  // 로그인 필요 API 를 부른 경우) 만료가 아니므로 알리지 않는다. 동시 401 여러 개는 클라이언트가
  // 한 번으로 합치고, 첫 처리에서 토큰이 지워지므로 두 번째부터는 여기서 걸러진다.
  useEffect(
    () =>
      subscribeSessionExpired(() => {
        if (!localStorage.getItem(TOKEN_KEY)) return;
        clearAuth();
        setSessionExpiredAt(Date.now());
      }),
    [clearAuth],
  );

  const dismissSessionExpired = useCallback(() => setSessionExpiredAt(null), []);

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
      setSessionExpiredAt(null);

      // 로그인 응답 기준으로 즉시 인증 상태 확정
      setUser({
        userId,
        username: responseUsername,
        email: "",
      });

      // 비로그인 대체 목록이 남아 있으면 로그인 직후에도 그대로 보인다 — 버린다
      queryClient.removeQueries({ queryKey: recKeys.root() });
      clearRecChains();

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

  const signup = async (
    username: string,
    email: string,
    password: string,
  ): Promise<SignupResult> => {
    setLoading(true);
    try {
      const response = await authApi.signup({ username, email, password });
      const result: SignupResult = {
        username: response.username || username,
        needsOnboarding: response.needsOnboarding === true,
      };
      // 가입은 로그인을 시키지 않는다(응답에 토큰이 없다) — 다음 로그인 때 온보딩으로
      // 보내려고 아이디를 표시해 둔다 (추천 탭 설계 §2-5·§6-3).
      if (result.needsOnboarding) markPendingOnboarding(result.username);
      else clearPendingOnboarding();
      return result;
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
    sessionExpiredAt,
    dismissSessionExpired,
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
