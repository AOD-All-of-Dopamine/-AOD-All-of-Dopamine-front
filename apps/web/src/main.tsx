import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClients, createApis } from "@aod/shared/api";
import { ApiProvider } from "@aod/shared/hooks";
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

const clients = createApiClients({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? "/api" : "http://localhost:8080"),
  getToken: () => localStorage.getItem("token"),
  isDev: import.meta.env.DEV,
});
const apis = createApis(clients);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ApiProvider apis={apis}>
        <App />
      </ApiProvider>
    </QueryClientProvider>
  </StrictMode>
);
