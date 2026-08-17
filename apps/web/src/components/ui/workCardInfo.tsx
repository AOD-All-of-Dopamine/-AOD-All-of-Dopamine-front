import { ReactNode } from "react";
import { Star } from "@phosphor-icons/react";
import { WorkSummary } from "@aod/shared/types";
import { DOMAIN_LABEL_MAP, WEEKDAY_KO } from "@aod/shared/constants";
import { watchPlatformLabels } from "../../constants/platforms";
import { steamReviewDescKo } from "@aod/shared/constants";

/**
 * WorkCard에 채울 도메인별 표시 정보(meta/tags/footer)를 WorkSummary에서 파생.
 * 카드 구성은 explore-light-mockup.html 기준 (dev-components-page 갤러리 샘플과 동일):
 * - 게임: meta "연도 · 개발사", foot 좌 Steam 한글 평가 / 우 긍정 %
 * - 웹툰: meta 작가(목업 card-meta는 작가만), foot 좌 "수요웹툰"|"완결" / 우 연령
 * - 영화/시리즈: meta "연도 · 감독", foot 좌 OTT 상위 2 "외 N" / 우 ★TMDB 평점
 * - 웹소설: 목업 없음 - 공통 규칙(연도 · 작가 + 장르 태그) + 연령(우측) 준용
 * 모든 신규 필드는 null 허용 - 값이 없으면 해당 요소를 렌더하지 않고,
 * footer 전체가 비면 undefined를 반환해 구분선 행 자체를 생략한다.
 */

const MAX_TAGS = 3;
const MAX_OTT_LABELS = 2;

// WEEKDAY_KO는 shared로 승격 - 기존 소비처(work-detail-page) 호환용 재수출
export { WEEKDAY_KO };

/**
 * "12세이용가" -> "12세". 전체이용가는 표기 생략(undefined).
 * 웹소설 실데이터는 "15세 이용가"처럼 공백 포함형이라 비교 전에 공백을 흡수한다.
 */
const ageLabel = (ageRating?: string | null) => {
  const normalized = ageRating?.replace(/\s+/g, "");
  if (!normalized || normalized === "전체이용가") return undefined;
  return normalized.replace(/이용가$/, "");
};

/** 우측 정렬 강조 값 (목업 .review-pct / .star-score) */
const FootEnd = ({ children }: { children: ReactNode }) => (
  <span className="ml-auto inline-flex items-center gap-1 font-bold text-ink">
    {children}
  </span>
);

/**
 * 메타 줄 - "연도 · 제작자" (웹툰은 목업대로 작가만, 작가 없으면 연도 폴백).
 * withDomain: 혼합 도메인 목록(전체 탭·검색·보관함)에서 도메인 라벨을 앞에 붙인다.
 */
export const workCardMeta = (
  work: WorkSummary,
  opts?: { withDomain?: boolean },
): string | undefined => {
  const year = work.releaseDate?.slice(0, 4);
  const creator = work.creator?.trim() || undefined;
  const parts = work.domain === "WEBTOON" ? [creator ?? year] : [year, creator];
  if (opts?.withDomain) {
    parts.unshift(DOMAIN_LABEL_MAP[work.domain] ?? work.domain);
  }
  const meta = parts.filter(Boolean).join(" · ");
  return meta || undefined;
};

/**
 * 게임 Steam 평가 파생 - desc(한글 매핑)와 긍정 %. 값이 없는 축은 undefined.
 * 포스터 카드 foot과 GameCompactCard(혼합 목록 가로 행)가 공유한다.
 */
export const steamRating = (
  work: WorkSummary,
): { desc?: string; pct?: number } => ({
  desc: work.steamReviewDesc
    ? steamReviewDescKo(work.steamReviewDesc)
    : undefined,
  pct:
    typeof work.steamPositivePct === "number"
      ? work.steamPositivePct
      : undefined,
});

/**
 * 장르 태그 - 마스터 장르 상위 3개 (없으면 태그 행 생략).
 * 실데이터에 중복 장르가 실재(React key 충돌·중복 태그 노출) - slice 전에
 * dedupe해 상위 슬롯을 고유 장르가 채우도록 한다.
 */
export const workCardTags = (work: WorkSummary): string[] | undefined => {
  const genres = [...new Set((work.genres ?? []).filter(Boolean))].slice(
    0,
    MAX_TAGS,
  );
  return genres.length > 0 ? genres : undefined;
};

/** 카드 하단 행 - 도메인별 구성. 표기할 값이 하나도 없으면 undefined */
export const workCardFooter = (work: WorkSummary): ReactNode => {
  switch (work.domain) {
    case "GAME": {
      const { desc, pct } = steamRating(work);
      if (!desc && pct === undefined) return undefined;
      return (
        <>
          {desc && <span className="truncate">{desc}</span>}
          {pct !== undefined && <FootEnd>{pct}%</FootEnd>}
        </>
      );
    }
    case "WEBTOON": {
      // weekday는 완결작에서 빈 문자열("")일 수 있음 - 요일 미상 연재작은 "연재중" 폴백
      const weekday = work.weekday ? WEEKDAY_KO[work.weekday] : undefined;
      const status =
        work.status === "연재중"
          ? weekday
            ? `${weekday}요웹툰`
            : "연재중"
          : work.status === "완결"
            ? "완결"
            : undefined;
      const age = ageLabel(work.ageRating);
      if (!status && !age) return undefined;
      return (
        <>
          {status && <span className="font-semibold">{status}</span>}
          {age && <FootEnd>{age}</FootEnd>}
        </>
      );
    }
    case "WEBNOVEL": {
      const age = ageLabel(work.ageRating);
      return age ? <FootEnd>{age}</FootEnd> : undefined;
    }
    case "MOVIE":
    case "TV": {
      const otts = watchPlatformLabels(work.platforms);
      const ottText =
        otts.length > 0
          ? otts.slice(0, MAX_OTT_LABELS).join(" · ") +
            (otts.length > MAX_OTT_LABELS
              ? ` 외 ${otts.length - MAX_OTT_LABELS}`
              : "")
          : undefined;
      // null·0은 미평가 - 0.0 렌더 금지 (표시 자체를 생략)
      const rating =
        typeof work.externalRating === "number" && work.externalRating > 0
          ? work.externalRating.toFixed(1)
          : undefined;
      if (!ottText && !rating) return undefined;
      return (
        <>
          {ottText && <span className="truncate">{ottText}</span>}
          {rating && (
            <FootEnd>
              <Star
                weight="fill"
                size={13}
                className="text-star"
                aria-hidden="true"
              />
              {rating}
            </FootEnd>
          )}
        </>
      );
    }
    default:
      return undefined;
  }
};
