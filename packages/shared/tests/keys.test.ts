import { describe, it, expect } from "vitest";
import {
  workKeys, releaseKeys, metaKeys, reviewKeys, interactionKeys, myKeys,
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
});
