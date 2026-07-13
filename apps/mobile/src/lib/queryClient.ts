import { QueryClient, onlineManager, focusManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";

// 캐시 정책은 웹(main.tsx)과 동일하게 유지한다.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// RN에는 window 온라인/포커스 이벤트가 없어 React Query 매니저에 직접 연결한다.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(!!state.isConnected)),
);

AppState.addEventListener("change", (status) =>
  focusManager.setFocused(status === "active"),
);
