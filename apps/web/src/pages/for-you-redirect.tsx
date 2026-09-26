import { Navigate, useSearchParams } from "react-router-dom";
import { HOME_REC_TAB_PARAM } from "@aod/shared/constants";
import { parseRecTab } from "@aod/shared/rec";

/**
 * 옛 추천 탭 주소(/for-you, 2026-09-26 제거) → 홈 추천. 즐겨찾기 · 공유 링크 · 옛 온보딩 도착지를 살린다.
 * `?tab=webtoon` 같은 칩은 `/home?rec=webtoon` 으로, 전체 · 없음 · 모르는 값은 `/home` 으로.
 */
export default function ForYouRedirect() {
  const [params] = useSearchParams();
  const tab = parseRecTab(params.get("tab"));
  const to = tab === "all" ? "/home" : `/home?${HOME_REC_TAB_PARAM}=${tab}`;
  return <Navigate to={to} replace />;
}
