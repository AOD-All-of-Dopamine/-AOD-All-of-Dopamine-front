import type { CollectionItem } from "@aod/shared/api";
import type { WorkSummary } from "@aod/shared/types";
import { workCardMeta, workCardTags } from "../ui/workCardInfo";

/** CollectionItem -> WorkSummary 형태 변환 (workCardInfo 파생 로직 재사용용) */
export const toWorkSummary = (item: CollectionItem): WorkSummary => ({
  id: item.contentId,
  domain: item.domain,
  title: item.title,
  thumbnail: item.posterUrl,
  score: item.score ?? 0,
  releaseDate: item.releaseDate ?? undefined,
  genres: item.genres,
  platforms: item.platforms,
  creator: item.creator,
  weekday: item.weekday,
  status: item.status,
  ageRating: item.ageRating,
  steamReviewDesc: item.steamReviewDesc,
  steamPositivePct: item.steamPositivePct,
  externalRating: item.externalRating,
});

/** 목업 item-meta - "연도 · 제작자 · 장르 상위 2" (workCardMeta/Tags 재사용) */
export const itemMetaLine = (work: WorkSummary): string | undefined => {
  const parts = [workCardMeta(work), ...(workCardTags(work)?.slice(0, 2) ?? [])];
  const line = parts.filter(Boolean).join(" · ");
  return line || undefined;
};
