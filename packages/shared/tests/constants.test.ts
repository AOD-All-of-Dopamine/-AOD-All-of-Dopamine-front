import { describe, it, expect } from "vitest";
import { WEEKDAY_KO } from "../src/constants";

describe("WEEKDAY_KO — 웹·모바일 workCardInfo 로컬 정의에서 승격된 공용 상수", () => {
  it("DB 실측 요일 키(mon~sun) 7개 고정", () => {
    expect(WEEKDAY_KO).toEqual({
      mon: "월",
      tue: "화",
      wed: "수",
      thu: "목",
      fri: "금",
      sat: "토",
      sun: "일",
    });
  });
});
