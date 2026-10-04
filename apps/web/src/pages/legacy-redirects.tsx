import { Navigate, useSearchParams } from "react-router-dom";

/**
 * 옛 주소 이동(설계 2026-10-04-trend-explore-design.md v2 #9) — 모두 replace(북마크 · 외부 링크가 깨지지 않게).
 * /ranking?domain=X → /trend?hot=X#hot · /new → /trend/new · /profile/likes|bookmarks|reviews → /library?tab=
 */

const HOT_DOMAINS = ["movie", "tv", "game", "webtoon", "webnovel"];

export function RankingRedirect() {
  const [params] = useSearchParams();
  const domain = params.get("domain")?.toLowerCase();
  const query = domain && HOT_DOMAINS.includes(domain) ? `?hot=${domain}` : "";
  return <Navigate to={`/trend${query}#hot`} replace />;
}

export function NewRedirect() {
  const [params] = useSearchParams();
  const query = params.toString();
  return <Navigate to={`/trend/new${query ? `?${query}` : ""}`} replace />;
}

export function LibraryRedirect({ tab }: { tab: "likes" | "bookmarks" | "reviews" }) {
  return <Navigate to={tab === "bookmarks" ? "/library" : `/library?tab=${tab}`} replace />;
}
