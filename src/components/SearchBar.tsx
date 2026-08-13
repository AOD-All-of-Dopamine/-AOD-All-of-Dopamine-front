import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

interface SearchBarProps {
  onSearch?: (query: string) => void;
}

/**
 * 모바일 전용 검색바 - 데스크톱은 SiteHeader의 검색이 대체(lg:hidden).
 * 라이트 토큰(surface pill, SiteHeader 검색과 동일 감각).
 * Phase 7에서 fixed/offsetTop/defaultValue 전환기 props 제거 - 미이식 다크
 * 페이지가 전부 이식 완료되어 유일한 사용처(홈)의 인라인 모드만 남았다.
 */
function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-3 lg:hidden">
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
