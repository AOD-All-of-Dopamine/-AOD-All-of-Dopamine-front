import { createApiClients, createApis } from '@aod/shared/api';
import { tokenStorage } from './tokenStorage';

// 런타임 401 처리 — 기본은 토큰 폐기만. AuthContext가 마운트되면
// 상태 전환·캐시 정리를 포함한 핸들러로 교체한다(순환 의존 회피용 mutable ref).
export const sessionExpired = {
  handler: async (): Promise<void> => {
    const token = await tokenStorage.get();
    if (!token) return; // 비로그인 상태의 privateApi 401 — 세션 만료 아님
    await tokenStorage.clear();
  },
};

// 앱 전역 1회 조립 (웹 main.tsx와 대칭 — 저장소·env만 다르다)
const clients = createApiClients({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL!,
  getToken: () => tokenStorage.get(),
  onSessionExpired: () => sessionExpired.handler(),
  isDev: __DEV__,
});

export const apis = createApis(clients);
