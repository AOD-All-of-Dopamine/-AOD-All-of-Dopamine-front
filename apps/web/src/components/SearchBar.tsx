import { useState } from "react";
import SearchIcon from "../assets/search-gray.svg";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  offsetTop?: number;
  fixed?: boolean;
  defaultValue?: string;
}

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
      className={`
    ${fixed ? "fixed" : "relative"}
    left-1/2 -translate-x-1/2
    max-w-2xl mx-auto
    w-full z-50
    bg-[#242424]
    px-4 py-4
  `}
      style={fixed ? { top: offsetTop } : undefined}
    >
      <form onSubmit={handleSubmit}>
        <img
          src={SearchIcon}
          alt="검색"
          className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
        />
        <input
          type="text"
          placeholder="작품을 검색하세요"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="
            w-full
            pl-10
            pr-4
            py-3
            rounded-lg
            bg-[#363539]
            text-[#D3D3D3]
            placeholder-[#D3D3D3]
            text-sm
            outline-none
            transition-colors
          "
        />
      </form>
    </div>
  );
}

export default SearchBar;
