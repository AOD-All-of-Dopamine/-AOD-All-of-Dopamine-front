import {
  BookOpen,
  FilmSlate,
  GameController,
  Scroll,
  TelevisionSimple,
  type Icon,
} from "@phosphor-icons/react";
import type { Category } from "../../constants/thumbnail";

/** 도메인 아이콘 - 책등 아래 표시와 새 컬렉션의 분야 선택이 같이 쓴다 */
export const DOMAIN_ICON: Record<Category, Icon> = {
  movie: FilmSlate,
  tv: TelevisionSimple,
  game: GameController,
  webtoon: Scroll,
  webnovel: BookOpen,
};
