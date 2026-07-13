import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "token";

// 모바일의 유일한 토큰 저장소 접점 — shared에는 getToken으로만 주입된다.
export const tokenStorage = {
  get: () => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};
