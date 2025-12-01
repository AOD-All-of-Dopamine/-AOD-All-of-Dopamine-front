import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

function SearchBar({ onSearch, placeholder = "작품을 검색하세요" }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClick = () => {
    if (!onSearch) {
      navigate("/explore");
    }
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-[var(--bg-primary)] px-4 py-2">
      <form onSubmit={handleSubmit}>
        <button
          type={onSearch ? "submit" : "button"}
          onClick={handleClick}
          className="flex w-full items-center gap-2 px-3 py-3 bg-[var(--bg-hover)] rounded-lg"
        >
          {/* 검색 아이콘 */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="flex-shrink-0"
          >
            <path
              d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z"
              stroke="var(--grey-400)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17.5 17.5L13.875 13.875"
              stroke="var(--grey-400)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {onSearch ? (
            <input
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-[var(--grey-200)] text-sm outline-none"
            />
          ) : (
            <span className="text-[var(--grey-200)] text-sm">{placeholder}</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default SearchBar;
