import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClients, createApis } from "@aod/shared/api";
import { ApiProvider } from "@aod/shared/hooks";
import { idHeaders, type RecTracker } from "@aod/shared/tracking";
import { createBrowserIds } from "./tracking/browserIds";
import { createWebTracker } from "./tracking/createWebTracker";
import { TrackerProvider } from "./tracking/TrackerProvider";
import { NOOP_TRACKER } from "./tracking/trackerContext";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "/api" : "http://localhost:8080");
const getToken = () => localStorage.getItem("token");

const trackerIds = createBrowserIds();
// 계측 때문에 앱이 흰 화면이 되면 안 된다 — 트래커를 못 만들면 아무 일도 안 하는 트래커로 대신한다
let tracker: RecTracker = NOOP_TRACKER;
try {
  tracker = createWebTracker({
    baseURL,
    ids: trackerIds,
    getToken,
    isDev: import.meta.env.DEV,
  });
} catch (error) {
  console.warn("[rec-tracker] 초기화 실패 — 추적 없이 계속한다", error);
}

// 전송 형식은 baseURL 로 고른다: "/api"(Vercel 프록시)면 JSON, 절대 URL 이면 text/plain.
// 운영에서 절대 URL 로 바꾸면 프록시를 우회하면서 교차 오리진이 된다 — 백엔드 CORS·전송 형식을 함께 확인할 것.
if (import.meta.env.PROD && !baseURL.startsWith("/")) {
  console.warn("[rec-tracker] 운영 빌드의 API 주소가 절대 URL 이다 — 추천 로그 전송 경로를 확인하라:", baseURL);
}

const clients = createApiClients({
  baseURL,
  getToken,
  isDev: import.meta.env.DEV,
  // 서버 이벤트(reaction_changed 등)에 익명·세션 식별자를 싣는다 — privateApi 에만 붙는다
  getExtraHeaders: () => idHeaders(trackerIds),
});
const apis = createApis(clients);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ApiProvider apis={apis}>
        <TrackerProvider tracker={tracker}>
          <App />
        </TrackerProvider>
      </ApiProvider>
    </QueryClientProvider>
  </StrictMode>
);
