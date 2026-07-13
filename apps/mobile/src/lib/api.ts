import { createApiClients, createApis } from "@aod/shared/api";
import { tokenStorage } from "./tokenStorage";

// 앱 전역 1회 조립 (웹 main.tsx와 대칭 — 저장소·env만 다르다)
const clients = createApiClients({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL!,
  getToken: () => tokenStorage.get(),
  isDev: __DEV__,
});

export const apis = createApis(clients);
