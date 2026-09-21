import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients, createApis } from "../src/api";
import type { CollectionDetail, CollectionItem } from "../src/api/collectionApi";
import { ApiProvider, useShelfItemMutations } from "../src/hooks";
import { collectionKeys } from "../src/queries/keys";

const BASE = "http://test.local";
const COLLECTION_ID = 7;
const server = setupServer();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
const apis = createApis(createApiClients({ baseURL: BASE, getToken: () => null }));

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider apis={apis}>{children}</ApiProvider>
    </QueryClientProvider>
  );
}

const item = (itemId: number, comment: string | null = null): CollectionItem => ({
  itemId,
  contentId: itemId * 10,
  comment,
  position: itemId,
  title: `작품 ${itemId}`,
  posterUrl: null,
  releaseDate: null,
  domain: "GAME",
  score: null,
  creator: null,
  genres: null,
  platforms: null,
  weekday: null,
  status: null,
  ageRating: null,
  steamReviewDesc: null,
  steamPositivePct: null,
  externalRating: null,
});

const seed = (items: CollectionItem[]) =>
  queryClient.setQueryData<CollectionDetail>(collectionKeys.detail(COLLECTION_ID), {
    id: COLLECTION_ID,
    title: "갓겜 모음",
    description: null,
    domain: "GAME",
    tint: "PINE",
    visibility: "PUBLIC",
    likeCount: 0,
    viewCount: 0,
    itemCount: items.length,
    curatorNickname: "kim",
    coverPosters: [],
    likedByMe: false,
    createdAt: "",
    owner: true,
    updatedAt: "",
    items,
  });

const cached = () =>
  queryClient.getQueryData<CollectionDetail>(collectionKeys.detail(COLLECTION_ID))!;
const ids = () => cached().items.map((i) => i.itemId);
const itemsUrl = `${BASE}/api/collections/${COLLECTION_ID}/items`;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  queryClient.clear();
  server.resetHandlers();
});
afterAll(() => server.close());

const render = () =>
  renderHook(() => useShelfItemMutations(COLLECTION_ID), { wrapper }).result;

describe("useShelfItemMutations", () => {
  it("add: 응답으로 받은 아이템을 말미에 꽂고 itemCount 를 올린다", async () => {
    seed([item(1)]);
    server.use(http.post(itemsUrl, () => HttpResponse.json(item(2))));
    const shelf = render();

    await act(() => shelf.current.add.mutateAsync({ contentId: 20 }));

    expect(ids()).toEqual([1, 2]);
    expect(cached().itemCount).toBe(2);
  });

  it("remove: 응답 전에 먼저 빠지고, 서버가 실패하면 되돌아온다", async () => {
    seed([item(1), item(2)]);
    // 응답을 늦춰야 "먼저 빠진" 중간 상태를 볼 수 있다
    server.use(
      http.delete(`${itemsUrl}/1`, async () => {
        await delay(150);
        return new HttpResponse(null, { status: 500 });
      }),
    );
    const shelf = render();

    act(() => shelf.current.remove.mutate({ itemId: 1, contentId: 10 }));
    await waitFor(() => expect(ids()).toEqual([2]));
    await waitFor(() => expect(shelf.current.remove.isError).toBe(true));

    expect(ids()).toEqual([1, 2]);
    expect(cached().itemCount).toBe(2);
  });

  it("remove: 이미 빠져 있으면(404) 성공으로 친다", async () => {
    seed([item(1), item(2)]);
    server.use(
      http.delete(`${itemsUrl}/1`, () => new HttpResponse(null, { status: 404 })),
    );
    const shelf = render();

    await act(() => shelf.current.remove.mutateAsync({ itemId: 1, contentId: 10 }));

    expect(ids()).toEqual([2]);
  });

  it("restore: 같은 메모로 다시 담고 원래 자리로 옮긴다", async () => {
    seed([item(1), item(3)]);
    let posted: unknown;
    let order: unknown;
    server.use(
      http.post(itemsUrl, async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json(item(9, "옛 메모"));
      }),
      http.put(`${itemsUrl}/order`, async ({ request }) => {
        order = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const shelf = render();

    await act(() =>
      shelf.current.restore.mutateAsync({ item: item(2, "옛 메모"), index: 1 }),
    );

    expect(posted).toEqual({ contentId: 20, comment: "옛 메모" });
    expect(order).toEqual({ itemIds: [1, 9, 3] });
    expect(ids()).toEqual([1, 9, 3]);
  });

  it("restore: 순서 복원이 실패해도 작품은 말미에 남는다", async () => {
    seed([item(1), item(3)]);
    server.use(
      http.post(itemsUrl, () => HttpResponse.json(item(9))),
      http.put(`${itemsUrl}/order`, () => new HttpResponse(null, { status: 400 })),
    );
    const shelf = render();

    await act(() => shelf.current.restore.mutateAsync({ item: item(2), index: 0 }));

    expect(ids()).toEqual([1, 3, 9]);
  });

  it("move: 연타해도 직렬로 실행되어 마지막 PUT 이 최종 순서를 싣는다", async () => {
    seed([item(1), item(2), item(3)]);
    const orders: number[][] = [];
    server.use(
      http.put(`${itemsUrl}/order`, async ({ request }) => {
        orders.push(((await request.json()) as { itemIds: number[] }).itemIds);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const shelf = render();

    act(() => {
      shelf.current.move.mutate({ itemId: 1, delta: 1 });
      shelf.current.move.mutate({ itemId: 1, delta: 1 });
    });
    await waitFor(() => expect(orders).toHaveLength(2));

    expect(ids()).toEqual([2, 3, 1]);
    expect(orders[orders.length - 1]).toEqual([2, 3, 1]);
  });

  it("setComment: 다듬은 메모를 보내고, 실패하면 옛 메모로 되돌린다", async () => {
    seed([item(1, "옛 메모")]);
    let patched: unknown;
    server.use(
      http.patch(`${itemsUrl}/1`, async ({ request }) => {
        patched = await request.json();
        await delay(150);
        return new HttpResponse(null, { status: 500 });
      }),
    );
    const shelf = render();

    act(() => shelf.current.setComment.mutate({ itemId: 1, comment: "  새 메모 " }));
    await waitFor(() => expect(cached().items[0].comment).toBe("새 메모"));
    await waitFor(() => expect(shelf.current.setComment.isError).toBe(true));

    expect(patched).toEqual({ comment: "새 메모" });
    expect(cached().items[0].comment).toBe("옛 메모");
  });
});
