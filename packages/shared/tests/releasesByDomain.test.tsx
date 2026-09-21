import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients, createApis } from "../src/api";
import { ApiProvider, useReleasesByDomain } from "../src/hooks";

const BASE = "http://test.local";
const server = setupServer();
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

const page = (domain: string, ids: number[]) => ({
  content: ids.map((id) => ({
    id, domain, title: `${domain}-${id}`, thumbnail: "", score: 0, rank: 0, releaseDate: "",
  })),
  page: 0, size: 10, totalElements: ids.length, totalPages: 1, first: true, last: true,
});

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  queryClient.clear();
  server.resetHandlers();
});
afterAll(() => server.close());

describe("useReleasesByDomain", () => {
  it("도메인마다 따로 요청하고, 넘긴 순서대로 결과를 돌려준다", async () => {
    const asked: string[] = [];
    server.use(
      http.get(`${BASE}/api/works/releases/recent`, ({ request }) => {
        const url = new URL(request.url);
        const domain = url.searchParams.get("domain")!;
        asked.push(`${domain}:${url.searchParams.get("size")}`);
        return HttpResponse.json(page(domain, domain === "GAME" ? [1, 2] : []));
      }),
    );

    const { result } = renderHook(
      () => useReleasesByDomain("recent", ["MOVIE", "GAME"], 10),
      { wrapper },
    );
    await waitFor(() => expect(result.current.every((r) => !r.isLoading)).toBe(true));

    expect(asked.sort()).toEqual(["GAME:10", "MOVIE:10"]);
    expect(result.current.map((r) => r.domain)).toEqual(["MOVIE", "GAME"]);
    expect(result.current[0].items).toEqual([]);
    expect(result.current[1].items.map((w) => w.id)).toEqual([1, 2]);
  });

  it("한 도메인이 실패해도 나머지는 그대로 온다 - 실패한 쪽은 isError + 빈 목록", async () => {
    server.use(
      http.get(`${BASE}/api/works/releases/upcoming`, ({ request }) => {
        const domain = new URL(request.url).searchParams.get("domain")!;
        return domain === "TV"
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(page(domain, [7]));
      }),
    );

    const { result } = renderHook(
      () => useReleasesByDomain("upcoming", ["TV", "GAME"], 3),
      { wrapper },
    );
    // API 클라이언트가 실패한 GET 을 지수 백오프로 2회 재시도한다 - 실패가 확정되기까지 기다린다
    await waitFor(
      () => expect(result.current.every((r) => !r.isLoading)).toBe(true),
      { timeout: 12000 },
    );

    expect(result.current[0]).toMatchObject({ domain: "TV", isError: true, items: [] });
    expect(result.current[1]).toMatchObject({ domain: "GAME", isError: false });
    expect(result.current[1].items.map((w) => w.id)).toEqual([7]);
  }, 15000);
});
