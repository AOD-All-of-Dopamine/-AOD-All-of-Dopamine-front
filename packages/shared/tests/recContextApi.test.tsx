import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients, createApis } from "../src/api";
import { ApiProvider, useToggleLike } from "../src/hooks";

const BASE = "http://test.local";
let seen: Record<string, string | null> = {};

const capture = (request: Request) => {
  seen = {
    source: request.headers.get("x-rec-source"),
    requestId: request.headers.get("x-rec-request-id"),
    impressionId: request.headers.get("x-rec-impression-id"),
    anonId: request.headers.get("x-anon-id"),
    sessionId: request.headers.get("x-session-id"),
  };
};

const server = setupServer(
  http.post(`${BASE}/api/works/1/like`, ({ request }) => {
    capture(request);
    return HttpResponse.json({ contentId: 1, likeCount: 1, dislikeCount: 0, userLikeType: "LIKE", message: "좋아요!" });
  }),
  http.post(`${BASE}/api/works/1/bookmark`, ({ request }) => {
    capture(request);
    return HttpResponse.json({ contentId: 1, bookmarked: true });
  }),
  http.post(`${BASE}/api/works/1/reviews`, ({ request }) => {
    capture(request);
    return HttpResponse.json({ reviewId: 1 });
  }),
  http.get(`${BASE}/api/works/1/likes`, ({ request }) => {
    capture(request);
    return HttpResponse.json({ likeCount: 0, dislikeCount: 0, userLikeType: "NONE" });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  seen = {};
});
afterAll(() => server.close());

const makeApis = () =>
  createApis(
    createApiClients({
      baseURL: BASE,
      getToken: () => "tok",
      getExtraHeaders: () => ({ "X-Anon-Id": "anon-1", "X-Session-Id": "sess-1" }),
    }),
  );

describe("추천 맥락 헤더", () => {
  it("privateApi 호출에는 익명·세션 헤더와 호출별 맥락이 붙는다", async () => {
    await makeApis().interactionApi.toggleLike(1, { source: "detail", requestId: "r-1", impressionId: "i-1" });
    expect(seen).toEqual({ source: "detail", requestId: "r-1", impressionId: "i-1", anonId: "anon-1", sessionId: "sess-1" });
  });

  it("맥락을 안 넘기면 X-Rec-* 는 없고 익명·세션만 붙는다", async () => {
    await makeApis().interactionApi.toggleBookmark(1);
    expect(seen).toEqual({ source: null, requestId: null, impressionId: null, anonId: "anon-1", sessionId: "sess-1" });
  });

  it("리뷰 작성에도 맥락이 붙는다", async () => {
    await makeApis().reviewApi.createReview(1, { rating: 4, content: "좋다" }, { source: "review" });
    expect(seen.source).toBe("review");
    expect(seen.anonId).toBe("anon-1");
  });

  it("publicApi 호출에는 아무 헤더도 붙이지 않는다", async () => {
    await makeApis().interactionApi.getLikeStats(1);
    expect(seen).toEqual({ source: null, requestId: null, impressionId: null, anonId: null, sessionId: null });
  });

  it("getExtraHeaders 를 안 주면 예전과 같다", async () => {
    const apis = createApis(createApiClients({ baseURL: BASE, getToken: () => "tok" }));
    await apis.interactionApi.toggleLike(1);
    expect(seen.anonId).toBeNull();
  });

  it("훅의 rec 인자가 요청까지 전달된다", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const apis = makeApis();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <ApiProvider apis={apis}>{children}</ApiProvider>
      </QueryClientProvider>
    );
    const { result } = renderHook(() => useToggleLike(1, { source: "detail" }), { wrapper });
    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(seen.source).toBe("detail");
  });
});
