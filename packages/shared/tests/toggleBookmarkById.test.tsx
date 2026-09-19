import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients, createApis } from "../src/api";
import { ApiProvider, useToggleBookmarkById } from "../src/hooks";
import { interactionKeys, myKeys } from "../src/queries";

const BASE = "http://test.local";

let calls: { id: string; source: string | null; requestId: string | null }[] = [];
let bookmarked = false;

const server = setupServer(
  http.post(`${BASE}/api/works/:id/bookmark`, ({ params, request }) => {
    bookmarked = !bookmarked;
    calls.push({
      id: String(params.id),
      source: request.headers.get("X-Rec-Source"),
      requestId: request.headers.get("X-Rec-Request-Id"),
    });
    return HttpResponse.json({ contentId: Number(params.id), bookmarked, message: "ok" });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  calls = [];
  bookmarked = false;
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

describe("useToggleBookmarkById", () => {
  it("호출 시점의 contentId 로 토글하고 추천 맥락 헤더를 싣는다", async () => {
    const { wrapper } = wrapperOf();
    const { result } = renderHook(() => useToggleBookmarkById(), { wrapper });

    const on = await result.current.mutateAsync({
      contentId: 7,
      rec: { source: "rec_tab", requestId: "req-1", impressionId: "imp-1" },
    });
    expect(on.bookmarked).toBe(true);
    expect(calls[0]).toEqual({ id: "7", source: "rec_tab", requestId: "req-1" });

    // 토글이다 — 같은 작품을 다시 부르면 꺼진다(화면은 응답의 bookmarked 로 문구를 고른다)
    const off = await result.current.mutateAsync({ contentId: 7 });
    expect(off.bookmarked).toBe(false);
  });

  it("성공하면 그 작품의 북마크 상태와 내 북마크 목록만 무효화한다", async () => {
    const { wrapper, queryClient } = wrapperOf();
    const invalidated: unknown[] = [];
    queryClient.setQueryData(interactionKeys.bookmarkStatus(7), { bookmarked: false });
    queryClient.setQueryData(myKeys.bookmarksRoot(), { content: [] });
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "invalidate") {
        invalidated.push(event.query.queryKey);
      }
    });

    const { result } = renderHook(() => useToggleBookmarkById(), { wrapper });
    await result.current.mutateAsync({ contentId: 7 });
    await waitFor(() => expect(invalidated.length).toBeGreaterThanOrEqual(2));
    unsubscribe();

    expect(invalidated).toContainEqual(interactionKeys.bookmarkStatus(7));
    expect(invalidated).toContainEqual(myKeys.bookmarksRoot());
    // 추천 목록은 건드리지 않는다 — 보이는 목록은 다시 받지 않는다(설계 §3)
    expect(invalidated.some((key) => (key as string[])[0] === "recommendations")).toBe(false);
  });
});
