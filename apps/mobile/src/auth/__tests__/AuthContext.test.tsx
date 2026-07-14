import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "../AuthContext";

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockClear = jest.fn();
jest.mock("../../lib/tokenStorage", () => ({
  tokenStorage: {
    get: (...a: unknown[]) => mockGet(...a),
    set: (...a: unknown[]) => mockSet(...a),
    clear: (...a: unknown[]) => mockClear(...a),
  },
}));

const mockGetCurrentUser = jest.fn();
const mockLogin = jest.fn();
jest.mock("../../lib/api", () => ({
  apis: {
    authApi: {
      getCurrentUser: (...a: unknown[]) => mockGetCurrentUser(...a),
      login: (...a: unknown[]) => mockLogin(...a),
      signup: jest.fn(),
    },
  },
  sessionExpired: { handler: jest.fn() },
}));

const mockCacheClear = jest.fn();
jest.mock("../../lib/queryClient", () => ({
  queryClient: { clear: (...a: unknown[]) => mockCacheClear(...a) },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthContext hydration", () => {
  beforeEach(() => jest.clearAllMocks());

  it("토큰 없음 → unauthenticated", async () => {
    mockGet.mockResolvedValue(null);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.state.status).toBe("loading");
    await waitFor(() =>
      expect(result.current.state.status).toBe("unauthenticated"),
    );
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it("유효 토큰 → authenticated (user 복원)", async () => {
    mockGet.mockResolvedValue("tok");
    mockGetCurrentUser.mockResolvedValue({ userId: 1, username: "u", email: "e" });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() =>
      expect(result.current.state.status).toBe("authenticated"),
    );
  });

  it("401 → 토큰 삭제 + unauthenticated", async () => {
    mockGet.mockResolvedValue("expired");
    mockGetCurrentUser.mockRejectedValue({ response: { status: 401 } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() =>
      expect(result.current.state.status).toBe("unauthenticated"),
    );
    expect(mockClear).toHaveBeenCalled();
  });

  it("400(서버가 만료 토큰에 400 반환) → 토큰 삭제 + unauthenticated", async () => {
    mockGet.mockResolvedValue("expired");
    mockGetCurrentUser.mockRejectedValue({
      response: { status: 400, data: { error: "인증에 실패했습니다." } },
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() =>
      expect(result.current.state.status).toBe("unauthenticated"),
    );
    expect(mockClear).toHaveBeenCalled();
  });

  it("일시 오류(5xx) → unauthenticated지만 토큰은 유지", async () => {
    mockGet.mockResolvedValue("tok");
    mockGetCurrentUser.mockRejectedValue({ response: { status: 500 } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() =>
      expect(result.current.state.status).toBe("unauthenticated"),
    );
    expect(mockClear).not.toHaveBeenCalled();
  });

  it("tokenStorage.get() 예외 → loading 고착 없이 unauthenticated", async () => {
    mockGet.mockRejectedValue(new Error("SecureStore failure"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() =>
      expect(result.current.state.status).toBe("unauthenticated"),
    );
  });

  it("login 성공 → 토큰 저장 + authenticated", async () => {
    mockGet.mockResolvedValue(null);
    mockLogin.mockResolvedValue({ token: "new", userId: 2, username: "me", message: "" });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() =>
      expect(result.current.state.status).toBe("unauthenticated"),
    );
    await act(async () => {
      await result.current.login("me", "pw");
    });
    expect(mockSet).toHaveBeenCalledWith("new");
    await waitFor(() =>
      expect(result.current.state.status).toBe("authenticated"),
    );
  });
});
