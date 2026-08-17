import { describe, it, expect } from "vitest";
import {
  workKeys, releaseKeys, metaKeys, reviewKeys, interactionKeys, myKeys,
  collectionKeys, rankingKeys,
} from "../src/queries/keys";

describe("query key 팩토리 — 기존 인라인 키와 동일 구조", () => {
  const params = { domain: "GAME", page: 1 };

  it("work 계열", () => {
    expect(workKeys.list(params)).toEqual(["works", params]);
    expect(workKeys.detail(7)).toEqual(["work", 7]);
    expect(workKeys.search("q", params)).toEqual(["works", "search", "q", params]);
    expect(workKeys.infinite(params)).toEqual(["works-infinite", params]);
    expect(workKeys.recentReviewed(params)).toEqual(["works", "recent-reviews", params]);
  });

  it("파라미터를 정규화하지 않는다 — 빈 객체는 빈 객체 그대로", () => {
    expect(workKeys.list({})).toEqual(["works", {}]);
    expect(releaseKeys.recent({})).toEqual(["releases", "recent", {}]);
  });

  it("release·meta 계열", () => {
    expect(releaseKeys.recent(params)).toEqual(["releases", "recent", params]);
    expect(releaseKeys.upcoming(params)).toEqual(["releases", "upcoming", params]);
    expect(metaKeys.genres("GAME")).toEqual(["genres", "GAME"]);
    expect(metaKeys.genresWithCount("GAME")).toEqual(["genres-with-count", "GAME"]);
    expect(metaKeys.platforms(undefined)).toEqual(["platforms", undefined]);
  });

  it("review·interaction·my 계열", () => {
    expect(reviewKeys.list(3, 0, 20)).toEqual(["reviews", 3, 0, 20]);
    expect(reviewKeys.byContent(3)).toEqual(["reviews", 3]);
    expect(interactionKeys.likeStats(3)).toEqual(["likeStats", 3]);
    expect(interactionKeys.bookmarkStatus(3)).toEqual(["bookmarkStatus", 3]);
    expect(myKeys.reviews(0, 20)).toEqual(["myReviews", 0, 20]);
    expect(myKeys.bookmarks(0, 20)).toEqual(["myBookmarks", 0, 20]);
    expect(myKeys.bookmarksRoot()).toEqual(["myBookmarks"]);
    expect(myKeys.likes(0, 20)).toEqual(["myLikes", 0, 20]);
  });

  it("byContent는 list의 접두사다 (invalidation 전제)", () => {
    const prefix = reviewKeys.byContent(3);
    const full = reviewKeys.list(3, 0, 20);
    expect(full.slice(0, prefix.length)).toEqual(prefix);
  });

  it("collection 계열 — 기존 인라인 키(useCollections)와 동일 구조", () => {
    const params = { sort: "popular" as const, page: 0 };
    expect(collectionKeys.root()).toEqual(["collections"]);
    expect(collectionKeys.publicRoot()).toEqual(["collections", "public"]);
    expect(collectionKeys.publicList(params)).toEqual([
      "collections",
      "public",
      params,
    ]);
    expect(collectionKeys.mineRoot()).toEqual(["collections", "mine"]);
    expect(collectionKeys.mine(0, 20)).toEqual(["collections", "mine", 0, 20]);
    expect(collectionKeys.mineSummary(7)).toEqual([
      "collections",
      "mine-summary",
      7,
    ]);
    expect(collectionKeys.detail(7)).toEqual(["collection", 7]);
  });

  it("detail은 root(['collections']) 접두사 바깥이다 — 조회수 +1 부작용 회피 계약", () => {
    // 서버가 상세 GET마다 조회수를 +1 하므로, 목록 동기화용
    // invalidateQueries({ queryKey: collectionKeys.root() })가 상세 쿼리를
    // 재조회시키면 안 된다. detail 키가 "collection"(단수) 네임스페이스로
    // 분리되어 있어야 이 계약이 성립한다 — 회귀 시 이 테스트가 깨진다.
    const root = collectionKeys.root();
    const detail = collectionKeys.detail(7);
    expect(detail.slice(0, root.length)).not.toEqual(root);
    expect(detail[0]).toBe("collection");
    expect(detail[0]).not.toBe("collections");
  });

  it("publicRoot·mineRoot는 각 목록 키의 접두사다 (부분 invalidation 전제)", () => {
    const params = { domain: "GAME" };
    const publicFull = collectionKeys.publicList(params);
    const publicPrefix = collectionKeys.publicRoot();
    expect(publicFull.slice(0, publicPrefix.length)).toEqual(publicPrefix);

    const mineFull = collectionKeys.mine(0, 20);
    const minePrefix = collectionKeys.mineRoot();
    expect(mineFull.slice(0, minePrefix.length)).toEqual(minePrefix);

    // root는 목록·요약 전체의 접두사 (mine-summary 포함)
    const root = collectionKeys.root();
    for (const key of [publicFull, mineFull, collectionKeys.mineSummary(7)]) {
      expect(key.slice(0, root.length)).toEqual(root);
    }
  });

  it("ranking 계열 — 기존 인라인 키(useRankings)와 동일 구조", () => {
    expect(rankingKeys.all()).toEqual(["rankings", "all"]);
    expect(rankingKeys.platform("Steam")).toEqual([
      "rankings",
      "platform",
      "Steam",
    ]);
  });
});
