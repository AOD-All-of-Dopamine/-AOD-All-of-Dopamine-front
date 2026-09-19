import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClients, createApis } from "@aod/shared/api";
import { ApiProvider } from "@aod/shared/hooks";
import { REC_HEADER } from "@aod/shared/tracking";
import { createBrowserIds } from "./tracking/browserIds";
import { createWebTracker } from "./tracking/createWebTracker";
import { TrackerProvider } from "./tracking/TrackerProvider";
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
const tracker = createWebTracker({
  baseURL,
  ids: trackerIds,
  getToken,
  isDev: import.meta.env.DEV,
});

const clients = createApiClients({
  baseURL,
  getToken,
  isDev: import.meta.env.DEV,
  // 서버 이벤트(reaction_changed 등)에 익명·세션 식별자를 싣는다 — privateApi 에만 붙는다
  getExtraHeaders: () => ({
    [REC_HEADER.anonId]: trackerIds.anonId(),
    [REC_HEADER.sessionId]: trackerIds.sessionId(),
  }),
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
