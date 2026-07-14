import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { UserInfo } from "@aod/shared/api";
import { tokenStorage } from "../lib/tokenStorage";
import { apis, sessionExpired } from "../lib/api";
import { queryClient } from "../lib/queryClient";

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: UserInfo }
  | { status: "unauthenticated" };

interface AuthContextType {
  state: AuthState;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const restore = useCallback(async () => {
    try {
      // tokenStorage.get() 예외(SecureStore 오류)도 잡지 않으면
      // 'loading'에 영구 고착되므로 try 안에서 수행한다.
      const token = await tokenStorage.get();
      if (!token) {
        setState({ status: "unauthenticated" });
        return;
      }
      const user = await apis.authApi.getCurrentUser();
      setState({ status: "authenticated", user });
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      // 인증 자체가 잘못된 경우만 토큰 폐기. 백엔드는 만료/무효 토큰에
      // 400("인증에 실패했습니다")을 반환하므로 400도 포함한다 — 안 하면
      // 만료 토큰이 영구히 남아 매 부팅마다 실패 요청이 반복된다.
      // (일시 오류 5xx/네트워크는 토큰 유지 — 웹 AuthContext와 동일)
      if (status === 400 || status === 401 || status === 403) {
        await tokenStorage.clear();
      }
      setState({ status: "unauthenticated" });
    }
  }, []);

  useEffect(() => {
    restore();
  }, [restore]);

  // 런타임 401(세션 만료) → 토큰 폐기 + 캐시 정리 + 상태 전환
  useEffect(() => {
    sessionExpired.handler = async () => {
      const token = await tokenStorage.get();
      if (!token) return; // 비로그인 상태의 privateApi 401 — 무시
      await tokenStorage.clear();
      queryClient.clear();
      setState({ status: "unauthenticated" });
    };
  }, []);

  const login = async (username: string, password: string) => {
    const res = await apis.authApi.login({ username, password });
    await tokenStorage.set(res.token);
    // 계정 전환 시 이전 사용자의 my* 캐시가 노출되지 않도록 정리
    queryClient.clear();
    // 로그인 응답 기준으로 즉시 인증 상태 확정 (웹과 동일)
    setState({
      status: "authenticated",
      user: { userId: res.userId, username: res.username, email: "" },
    });
  };

  const signup = async (username: string, email: string, password: string) => {
    await apis.authApi.signup({ username, email, password });
  };

  const logout = async () => {
    await tokenStorage.clear();
    // 개인 데이터(my*) 캐시를 남기지 않는다 — 계정 전환 교차 노출 방지
    queryClient.clear();
    setState({ status: "unauthenticated" });
  };

  return (
    <AuthContext.Provider value={{ state, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
