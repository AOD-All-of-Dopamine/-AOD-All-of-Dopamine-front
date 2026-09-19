import { describe, it, expect } from "vitest";
import { REC_CLIENT_EVENT_TYPES, REC_HEADER, recHeaders } from "../src/tracking";

describe("recHeaders", () => {
  it("값이 있는 항목만 X-Rec-* 헤더로 만든다", () => {
    expect(recHeaders({ source: "detail", requestId: "r-1" })).toEqual({
      [REC_HEADER.source]: "detail",
      [REC_HEADER.requestId]: "r-1",
    });
  });

  it("맥락이 없으면 빈 객체", () => {
    expect(recHeaders()).toEqual({});
    expect(recHeaders({})).toEqual({});
  });

  it("헤더 이름은 백엔드 RecContextFilter 와 같다", () => {
    expect(REC_HEADER).toEqual({
      source: "X-Rec-Source",
      requestId: "X-Rec-Request-Id",
      impressionId: "X-Rec-Impression-Id",
      anonId: "X-Anon-Id",
      sessionId: "X-Session-Id",
    });
  });

  it("클라이언트 이벤트 타입은 백엔드 화이트리스트 6종과 같다", () => {
    expect([...REC_CLIENT_EVENT_TYPES].sort()).toEqual(
      ["card_clicked", "detail_viewed", "impression_viewed", "outbound_clicked", "rec_loaded_more", "rec_tab_changed"],
    );
  });
});
