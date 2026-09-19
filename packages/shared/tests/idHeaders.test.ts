import { describe, it, expect } from "vitest";
import { REC_HEADER, idHeaders } from "../src/tracking";

describe("idHeaders", () => {
  it("익명·세션 식별자를 헤더로 만든다", () => {
    expect(idHeaders({ anonId: () => "a-1", sessionId: () => "s-1" })).toEqual({
      [REC_HEADER.anonId]: "a-1",
      [REC_HEADER.sessionId]: "s-1",
    });
  });
});
