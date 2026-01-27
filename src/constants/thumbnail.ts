import MovieIcon from "../assets/thumbnail-icon/null_movie.svg";
import TvIcon from "../assets/thumbnail-icon/null_series.svg";
import GameIcon from "../assets/thumbnail-icon/null_game.svg";
import WebtoonIcon from "../assets/thumbnail-icon/null_webtoon.svg";
import WebnovelIcon from "../assets/thumbnail-icon/null_webnovel.svg";

export type Category = "movie" | "tv" | "game" | "webtoon" | "webnovel";

export const imageAspectMap: Record<Category, string> = {
  movie: "aspect-[20/30]",
  tv: "aspect-[2/3]",
  game: "aspect-[21.5/10]",
  webtoon: "aspect-[19/25]",
  webnovel: "aspect-[17/25]",
};

export const thumbnailFallbackMap: Record<Category, string> = {
  movie: MovieIcon,
  tv: TvIcon,
  game: GameIcon,
  webtoon: WebtoonIcon,
  webnovel: WebnovelIcon,
};

export const thumbnailIconSizeMap: Record<Category, string> = {
  movie: "w-10 h-10",
  tv: "w-10 h-10",
  game: "w-11 h-11",
  webtoon: "w-10 h-10",
  webnovel: "w-9 h-9",
};
