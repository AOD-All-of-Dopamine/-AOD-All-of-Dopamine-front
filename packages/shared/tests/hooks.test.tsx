import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients, createApis } from "../src/api";
import { ApiProvider, useApis, useWorks } from "../src/hooks";

const BASE = "http://test.local";
const server = setupServer(
  http.get(`${BASE}/api/works`, () =>
    HttpResponse.json({
      content: [{ id: 1, domain: "GAME", title: "t", thumbnail: "", score: 0, rank: 1, releaseDate: "" }],
      page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true,
    }),
  ),
);

// wrapper 바깥에서 1회 생성 — 리렌더마다 새 인스턴스가 생기지 않도록
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
const apis = createApis(createApiClients({ baseURL: BASE, getToken: () => null }));

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider apis={apis}>{children}</ApiProvider>
    </QueryClientProvider>
  );
}

beforeAll(() => server.listen());
afterEach(() => {
  queryClient.clear();
  server.resetHandlers();
});
afterAll(() => server.close());

describe("shared hooks", () => {
  it("useWorks가 ApiProvider의 API로 데이터를 가져온다", async () => {
    const { result } = renderHook(() => useWorks(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.content).toHaveLength(1);
  });

  it("ApiProvider 밖에서 useApis를 쓰면 명확한 에러를 던진다", () => {
    expect(() => renderHook(() => useApis())).toThrow(/ApiProvider/);
  });
});
