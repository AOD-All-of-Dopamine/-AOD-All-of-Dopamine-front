import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients, createApis } from "../src/api";
import { ApiProvider, useRecommendations, useSetNotInterested, useSetReaction } from "../src/hooks";
import { mergeRecPages } from "../src/rec";

const BASE = "http://test.local";

const item = (id: number) => ({
  impressionId: `imp-${id}`,
  rank: id,
  work: { id, domain: "GAME", title: `작품 ${id}`, thumbnail: null, score: 0 },
  reason: null,
});

let listCalls: { tab: string | null; chainId: string | null; size: string | null }[] = [];

const server = setupServer(
  http.get(`${BASE}/api/recommendations`, ({ request }) => {
    const url = new URL(request.url);
    const chainId = url.searchParams.get("chainId");
    listCalls.push({ tab: url.searchParams.get("tab"), chainId, size: url.searchParams.get("size") });
    if (chainId === "chain-1") {
      return HttpResponse.json({
        requestId: "req-2", chainId: "chain-1", pageDepth: 1,
        fallback: false, fallbackReason: null, items: [item(3)], hasMore: false,
      });
    }
    return HttpResponse.json({
      requestId: "req-1", chainId: "chain-1", pageDepth: 0,
      fallback: false, fallbackReason: null, items: [item(1), item(2)], hasMore: true,
    });
  }),
  http.put(`${BASE}/api/works/1/reaction`, () =>
    HttpResponse.json({ state: "DISLIKE", previousState: "LIKE", likeCount: 0, dislikeCount: 1 }),
  ),
  http.put(`${BASE}/api/recommendations/not-interested/1`, () => HttpResponse.json({ on: true })),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  listCalls = [];
});
afterAll(() => server.close());

const wrapperOf = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const apis = createApis(createApiClients({ baseURL: BASE, getToken: () => "tok" }));
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ApiProvider apis={apis}>{children}</ApiProvider>
    </QueryClientProvider>
  );
  return { wrapper, queryClient };
};

describe("useRecommendations", () => {
  it("첫 쪽은 chainId 없이, 다음 쪽은 응답의 chainId 로 부른다", async () => {
    const { wrapper } = wrapperOf();
    const { result } = renderHook(() => useRecommendations("game", "nonce-1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listCalls[0]).toEqual({ tab: "game", chainId: null, size: "20" });
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(listCalls[1]?.chainId).toBe("chain-1");
    expect(result.current.hasNextPage).toBe(false);

    const view = mergeRecPages(result.current.data!.pages);
    expect(view.cards.map((c) => c.work.id)).toEqual([1, 2, 3]);
    expect(view.cards.map((c) => c.requestId)).toEqual(["req-1", "req-1", "req-2"]);
  });

  it("저장된 chainId 가 있으면 첫 요청부터 싣는다", async () => {
    const { wrapper } = wrapperOf();
    const { result } = renderHook(
      () => useRecommendations("all", "nonce-2", { initialChainId: "chain-1" }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listCalls[0]?.chainId).toBe("chain-1");
  });

  it("대체 응답은 다음 쪽이 없다", async () => {
    server.use(
      http.get(`${BASE}/api/recommendations`, () =>
        HttpResponse.json({
          requestId: "req-f", chainId: "chain-f", pageDepth: 0,
          fallback: true, fallbackReason: "anonymous", items: [item(9)], hasMore: false,
        }),
      ),
    );
    const { wrapper } = wrapperOf();
    const { result } = renderHook(() => useRecommendations("all", "nonce-3"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("404 는 재시도하지 않는다 — 새 체인은 nonce 를 바꾸는 쪽이 한다", async () => {
    server.use(
      http.get(`${BASE}/api/recommendations`, () => {
        listCalls.push({ tab: null, chainId: null, size: null });
        return HttpResponse.json({ error: "체인 없음" }, { status: 404 });
      }),
    );
    const { wrapper } = wrapperOf();
    const { result } = renderHook(
      () => useRecommendations("all", "nonce-4", { initialChainId: "chain-x" }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listCalls).toHaveLength(1);
  });

  it("enabled=false 면 아무것도 부르지 않는다", async () => {
    const { wrapper } = wrapperOf();
    renderHook(() => useRecommendations("all", "nonce-5", { enabled: false }), { wrapper });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(listCalls).toHaveLength(0);
  });

  it("같은 nonce 로 다시 마운트하면 캐시를 쓰고 다시 부르지 않는다 (뒤로가기 복원)", async () => {
    const { wrapper } = wrapperOf();
    const first = renderHook(() => useRecommendations("game", "nonce-6"), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();

    const second = renderHook(() => useRecommendations("game", "nonce-6"), { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    expect(listCalls).toHaveLength(1);
  });
});

describe("피드백 훅", () => {
  it("반응 지정은 previousState 를 돌려준다 (되돌리기에 쓴다)", async () => {
    const { wrapper } = wrapperOf();
    const { result } = renderHook(() => useSetReaction(), { wrapper });
    const response = await result.current.mutateAsync({
      contentId: 1,
      state: "DISLIKE",
      rec: { source: "rec_tab", requestId: "req-1", impressionId: "imp-1" },
    });
    expect(response.previousState).toBe("LIKE");
  });

  it("관심 없음 켜기는 on=true 를 돌려준다", async () => {
    const { wrapper } = wrapperOf();
    const { result } = renderHook(() => useSetNotInterested(), { wrapper });
    expect(await result.current.mutateAsync({ contentId: 1, on: true })).toEqual({ on: true });
  });
});
