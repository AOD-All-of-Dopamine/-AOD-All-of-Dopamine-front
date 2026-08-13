import { Link, NavLink } from "react-router-dom";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";

/** 상단 사이트 내비게이션 (64px 한 줄) - 목업 nav와 동일. 모바일(<lg)에서는 메뉴 숨김 + 하단 탭 사용 */
const NAV_ITEMS = [
  { to: "/home", label: "홈" },
  { to: "/explore", label: "탐색" },
  { to: "/ranking", label: "랭킹" },
  { to: "/new", label: "신작" },
];

const SiteHeader = () => {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-7 px-6">
        <Link
          to="/home"
          className="text-[21px] font-extrabold tracking-tighter text-ink"
        >
          AOD<em className="not-italic text-accent">.</em>
        </Link>

        <nav className="hidden lg:block">
          <ul className="flex gap-1">
            {NAV_ITEMS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `block rounded-input px-3 py-2 font-medium transition-colors ${
                      isActive
                        ? "font-bold text-ink"
                        : "text-ink-2 hover:bg-ink/5 hover:text-ink"
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          to="/search"
          className="ml-auto flex h-[38px] w-full max-w-[300px] items-center gap-2 rounded-full border border-line bg-canvas px-3.5 text-sm text-ink-3 transition-colors hover:border-line-strong"
        >
          <MagnifyingGlass size={16} />
          <span className="truncate">작품, 개발사, 작가 검색</span>
        </Link>

        {isAuthenticated ? (
          <Link
            to="/profile"
            className="shrink-0 rounded-full bg-ink px-4.5 py-2 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
          >
            내 정보
          </Link>
        ) : (
          <Link
            to="/login"
            className="shrink-0 rounded-full bg-ink px-4.5 py-2 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
          >
            로그인
          </Link>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
