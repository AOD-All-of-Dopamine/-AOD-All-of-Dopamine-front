import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients } from "../src/api/client";
import { createWorkApi } from "../src/api/workApi";

const BASE = "http://test.local";
let lastUrl: URL | null = null;

const server = setupServer(
  http.get(`${BASE}/api/works`, ({ request }) => {
    lastUrl = new URL(request.url);
    return HttpResponse.json({
      content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true,
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => { server.resetHandlers(); lastUrl = null; });
afterAll(() => server.close());

describe("createWorkApi", () => {
  it("getWorks 기본값: page=0, size=20, sortBy=masterTitle, sortDirection=asc", async () => {
    const { publicApi } = createApiClients({ baseURL: BASE, getToken: () => null });
    const workApi = createWorkApi(publicApi);
    await workApi.getWorks();
    expect(lastUrl!.searchParams.get("page")).toBe("0");
    expect(lastUrl!.searchParams.get("size")).toBe("20");
    expect(lastUrl!.searchParams.get("sortBy")).toBe("masterTitle");
    expect(lastUrl!.searchParams.get("sortDirection")).toBe("asc");
  });

  it("getFeaturedToday: 200 이면 본문, 204 면 null", async () => {
    const { publicApi } = createApiClients({ baseURL: BASE, getToken: () => null });
    const workApi = createWorkApi(publicApi);
    const body = {
      date: "2026-09-27",
      work: { id: 42, domain: "GAME", title: "Hades II", thumbnail: null, score: 0 },
      reason: { platform: "Steam", ranking: 8, basis: "steam", ratingScore: 0.94, ratingCount: 61889, ratingLabel: "Very Positive" },
    };
    server.use(http.get(`${BASE}/api/works/featured-today`, () => HttpResponse.json(body)));
    expect(await workApi.getFeaturedToday()).toEqual(body);

    server.use(http.get(`${BASE}/api/works/featured-today`, () => new HttpResponse(null, { status: 204 })));
    expect(await workApi.getFeaturedToday()).toBeNull();
  });
});
