import MovieIcon from "../assets/thumbnail-icon/null_movie.svg";
import TvIcon from "../assets/thumbnail-icon/null_series.svg";
import GameIcon from "../assets/thumbnail-icon/null_game.svg";
import WebtoonIcon from "../assets/thumbnail-icon/null_webtoon.svg";
import WebnovelIcon from "../assets/thumbnail-icon/null_webnovel.svg";

export type Category = "movie" | "tv" | "game" | "webtoon" | "webnovel";

export const thumbnailFallbackMap: Record<Category, string> = {
  movie: MovieIcon,
  tv: TvIcon,
  game: GameIcon,
  webtoon: WebtoonIcon,
  webnovel: WebnovelIcon,
};

/**
 * 통일 2:3 썸네일 틀(WorkThumb) 안에 이미지를 넣는 방식.
 * - cover: 원본이 2:3(TMDB 포스터)이라 틀을 그대로 채운다.
 * - contain: 원본 비율이 다르다(Steam 460:215, 네이버웹툰 480:623, 웹소설 ~0.7) -
 *   자르지 않고 원본 비율로 넣고, 남는 자리는 같은 이미지의 블러 배경이 채운다.
 * 새 도메인을 Category에 추가하면 이 맵의 누락이 컴파일 에러로 잡힌다.
 */
export type ThumbFit = "cover" | "contain";

export const thumbFitMap: Record<Category, ThumbFit> = {
  movie: "cover",
  tv: "cover",
  game: "contain",
  webtoon: "contain",
  webnovel: "contain",
};

/**
 * 썸네일 원본의 모양 - 가로로 긴 틀(홈 히어로 FeatureCard)에 넣을 때 쓴다.
 * landscape 는 틀을 그대로 채우고, portrait 는 자르지 않고 세워 둔다.
 * (thumbFitMap 은 세로 2:3 틀 기준이라 축이 다르다 - 영화 포스터는 2:3 틀은 채우지만 가로 틀은 못 채운다.)
 */
export type ThumbShape = "portrait" | "landscape";

export const thumbShapeMap: Record<Category, ThumbShape> = {
  movie: "portrait",
  tv: "portrait",
  game: "landscape",
  webtoon: "portrait",
  webnovel: "portrait",
};

/** 백엔드 도메인 문자열("GAME" 등, 대소문자 무관) -> Category. 모르는 값은 movie */
export const categoryOf = (domain?: string | null): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};
