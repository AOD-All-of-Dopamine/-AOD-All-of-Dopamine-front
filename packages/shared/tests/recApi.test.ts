import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients, createApis } from "../src/api";
import { REC_HEADER } from "../src/tracking";

const BASE = "http://test.local";

let lastUrl: URL | null = null;
let lastHeaders: Record<string, string | null> = {};
let lastBody: unknown = null;
let lastMethod = "";

const capture = async (request: Request) => {
  lastUrl = new URL(request.url);
  lastMethod = request.method;
  lastHeaders = {
    source: request.headers.get("x-rec-source"),
    requestId: request.headers.get("x-rec-request-id"),
    impressionId: request.headers.get("x-rec-impression-id"),
    anonId: request.headers.get("x-anon-id"),
    authorization: request.headers.get("authorization"),
  };
  const text = await request.text();
  lastBody = text ? JSON.parse(text) : null;
};

const server = setupServer(
  http.get(`${BASE}/api/recommendations`, async ({ request }) => {
    await capture(request);
    return HttpResponse.json({
      requestId: "req-1", chainId: "chain-1", pageDepth: 0,
      fallback: false, fallbackReason: null, hasMore: true,
      items: [{ impressionId: "imp-1", rank: 0, work: { id: 7, domain: "GAME", title: "T", thumbnail: null, score: 0 }, reason: null }],
    });
  }),
  http.put(`${BASE}/api/works/7/reaction`, async ({ request }) => {
    await capture(request);
    return HttpResponse.json({ state: "DISLIKE", previousState: "NONE", likeCount: 0, dislikeCount: 1 });
  }),
  http.put(`${BASE}/api/recommendations/not-interested/7`, async ({ request }) => {
    await capture(request);
    return HttpResponse.json({ on: true });
  }),
  http.delete(`${BASE}/api/recommendations/not-interested/7`, async ({ request }) => {
    await capture(request);
    return HttpResponse.json({ on: false });
  }),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  lastUrl = null;
  lastHeaders = {};
  lastBody = null;
  lastMethod = "";
});
afterAll(() => server.close());

const makeApis = (token: string | null = "tok") =>
  createApis(
    createApiClients({
      baseURL: BASE,
      getToken: () => token,
      getExtraHeaders: () => ({ [REC_HEADER.anonId]: "anon-1" }),
    }),
  );

const REC = { source: "rec_tab", requestId: "req-1", impressionId: "imp-1" };

describe("recApi", () => {
  it("목록은 tab·size 를 싣고 chainId 가 없으면 파라미터 자체를 빼며 기본 size 는 20 이다", async () => {
    const data = await makeApis().recApi.list({ tab: "game" });
    expect(lastUrl?.pathname).toBe("/api/recommendations");
    expect(lastUrl?.searchParams.get("tab")).toBe("game");
    expect(lastUrl?.searchParams.get("size")).toBe("20");
    expect(lastUrl?.searchParams.has("chainId")).toBe(false);
    expect(data.items[0].work.id).toBe(7);
  });

  it("chainId·size 를 주면 그대로 싣는다", async () => {
    await makeApis().recApi.list({ tab: "all", chainId: "chain-9", size: 5 });
    expect(lastUrl?.searchParams.get("chainId")).toBe("chain-9");
    expect(lastUrl?.searchParams.get("size")).toBe("5");
  });

  it("목록은 privateApi 로 나간다 — 토큰이 있으면 Authorization, 없어도 요청은 나간다(익명 대체)", async () => {
    await makeApis("tok").recApi.list({ tab: "all" });
    expect(lastHeaders.authorization).toBe("Bearer tok");
    expect(lastHeaders.anonId).toBe("anon-1");
    await makeApis(null).recApi.list({ tab: "all" });
    expect(lastHeaders.authorization).toBeNull();
    expect(lastHeaders.anonId).toBe("anon-1");
  });

  it("반응은 본문에 state 와 맥락을, 헤더에 X-Rec-* 를 싣는다", async () => {
    const result = await makeApis().recApi.setReaction(7, "DISLIKE", REC);
    expect(lastMethod).toBe("PUT");
    expect(lastBody).toEqual({ state: "DISLIKE", source: "rec_tab", requestId: "req-1", impressionId: "imp-1" });
    expect(lastHeaders).toMatchObject({ source: "rec_tab", requestId: "req-1", impressionId: "imp-1" });
    expect(result.previousState).toBe("NONE");
  });

  it("관심 없음 켜기는 PUT + 식별자 본문, 끄기는 DELETE + 헤더만이다", async () => {
    expect(await makeApis().recApi.setNotInterested(7, true, REC)).toEqual({ on: true });
    expect(lastMethod).toBe("PUT");
    expect(lastBody).toEqual({ requestId: "req-1", impressionId: "imp-1" });
    expect(lastHeaders.source).toBe("rec_tab");

    expect(await makeApis().recApi.setNotInterested(7, false, REC)).toEqual({ on: false });
    expect(lastMethod).toBe("DELETE");
    expect(lastBody).toBeNull();
    expect(lastHeaders.impressionId).toBe("imp-1");
  });

  it("맥락을 안 넘기면 X-Rec-* 헤더가 붙지 않는다", async () => {
    await makeApis().recApi.setReaction(7, "NONE");
    expect(lastHeaders.source).toBeNull();
    expect(lastBody).toEqual({ state: "NONE" });
  });
});
