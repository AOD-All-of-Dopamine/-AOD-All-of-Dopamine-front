import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients } from "../src/api/client";

const BASE = "http://test.local";
const noSleep = async () => {};
let lastAuthHeader: string | null = null;
let hitCount = 0;

const server = setupServer(
  http.get(`${BASE}/api/ok`, ({ request }) => {
    lastAuthHeader = request.headers.get("authorization");
    return HttpResponse.json({ ok: true });
  }),
  http.get(`${BASE}/api/flaky`, () => {
    hitCount += 1;
    if (hitCount < 3) return new HttpResponse(null, { status: 500 });
    return HttpResponse.json({ ok: true });
  }),
  http.post(`${BASE}/api/flaky-post`, () => {
    hitCount += 1;
    return new HttpResponse(null, { status: 500 });
  }),
  http.get(`${BASE}/api/secret`, () => new HttpResponse(null, { status: 401 })),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  lastAuthHeader = null;
  hitCount = 0;
});
afterAll(() => server.close());

describe("createApiClients", () => {
  it("privateApi는 getToken이 준 토큰을 Bearer 헤더로 첨부한다", async () => {
    const { privateApi } = createApiClients({
      baseURL: BASE,
      getToken: () => "tok-123",
    });
    await privateApi.get("/api/ok");
    expect(lastAuthHeader).toBe("Bearer tok-123");
  });

  it("토큰이 null이면 Authorization 헤더를 붙이지 않는다", async () => {
    const { privateApi } = createApiClients({ baseURL: BASE, getToken: () => null });
    await privateApi.get("/api/ok");
    expect(lastAuthHeader).toBeNull();
  });

  it("publicApi는 토큰을 첨부하지 않는다", async () => {
    const { publicApi } = createApiClients({ baseURL: BASE, getToken: () => "tok-123" });
    await publicApi.get("/api/ok");
    expect(lastAuthHeader).toBeNull();
  });

  it("비동기 getToken(Promise)도 지원한다", async () => {
    const { privateApi } = createApiClients({
      baseURL: BASE,
      getToken: () => Promise.resolve("tok-async"),
    });
    await privateApi.get("/api/ok");
    expect(lastAuthHeader).toBe("Bearer tok-async");
  });

  it("GET 5xx는 retries 상한까지 재시도 후 성공한다 (2회 실패 → 3회째 성공)", async () => {
    const { publicApi } = createApiClients({
      baseURL: BASE,
      getToken: () => null,
      retry: { retries: 2 },
      sleep: noSleep,
    });
    const res = await publicApi.get("/api/flaky");
    expect(res.data.ok).toBe(true);
    expect(hitCount).toBe(3);
  });

  it("재시도 상한 초과 시 에러를 던진다 (retries: 1이면 2회 시도 후 실패)", async () => {
    const { publicApi } = createApiClients({
      baseURL: BASE,
      getToken: () => null,
      retry: { retries: 1 },
      sleep: noSleep,
    });
    await expect(publicApi.get("/api/flaky")).rejects.toThrow();
    expect(hitCount).toBe(2);
  });

  it("POST는 5xx여도 재시도하지 않는다 (비멱등 보호)", async () => {
    const { publicApi } = createApiClients({
      baseURL: BASE,
      getToken: () => null,
      retry: { retries: 2 },
      sleep: noSleep,
    });
    await expect(publicApi.post("/api/flaky-post")).rejects.toThrow();
    expect(hitCount).toBe(1);
  });

  it("privateApi가 401을 받으면 onSessionExpired를 호출한다", async () => {
    const onSessionExpired = vi.fn();
    const { privateApi } = createApiClients({
      baseURL: BASE,
      getToken: () => "expired",
      onSessionExpired,
    });
    await expect(privateApi.get("/api/secret")).rejects.toThrow();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("동시 다발 401에서도 onSessionExpired는 1회만 실행된다 (single-flight)", async () => {
    const onSessionExpired = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(resolve, 20)),
    );
    const { privateApi } = createApiClients({
      baseURL: BASE,
      getToken: () => "expired",
      onSessionExpired,
    });
    await Promise.allSettled([
      privateApi.get("/api/secret"),
      privateApi.get("/api/secret"),
      privateApi.get("/api/secret"),
    ]);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("onSessionExpired 없이 401을 받아도 조용히 에러만 전파한다", async () => {
    const { privateApi } = createApiClients({ baseURL: BASE, getToken: () => "expired" });
    await expect(privateApi.get("/api/secret")).rejects.toThrow();
  });
});
