import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  offsetTop?: number;
  fixed?: boolean;
  defaultValue?: string;
}

/**
 * [전환기] 모바일 전용 검색바 - 데스크톱은 SiteHeader의 검색이 대체(lg:hidden 유지).
 * 라이트 토큰(canvas pill, SiteHeader 검색과 동일 감각)으로 재스킨.
 * fixed/offsetTop/defaultValue props는 아직 미이식 페이지(내 좋아요·북마크, 검색)가
 * 사용하므로 시그니처 유지. fixed 모드 배경은 bg-inherit - 미이식 다크 페이지에서도
 * 스트립이 페이지 배경을 따라가게 하는 전환기 시각 정합용 (필 자체는 토큰 고정).
 */
function SearchBar({
  onSearch,
  offsetTop = 0,
  fixed = true,
  defaultValue = "",
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div
      className={`${
        fixed
          ? "fixed left-1/2 z-30 -translate-x-1/2 bg-inherit"
          : "relative"
      } mx-auto w-full max-w-2xl px-4 py-3 lg:hidden`}
      style={fixed ? { top: offsetTop } : undefined}
    >
      <form
        onSubmit={handleSubmit}
        className="flex h-[38px] items-center gap-2 rounded-full border border-line bg-canvas px-3.5 text-ink-3 transition-colors focus-within:border-line-strong"
      >
        <MagnifyingGlass size={16} className="flex-none" />
        <input
          type="search"
          aria-label="작품 검색"
          placeholder="작품, 개발사, 작가 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
      </form>
    </div>
  );
}

export default SearchBar;
