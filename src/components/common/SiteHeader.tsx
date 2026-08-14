import { Link, NavLink } from "react-router-dom";
import { MagnifyingGlass, UserCircle } from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext";

/**
 * 상단 사이트 내비게이션 - 목업 nav와 동일.
 * lg 이상: 64px 한 줄(로고 + 메뉴 + 검색 필 + 로그인/내 정보 텍스트 버튼).
 * <lg(모바일 목업 .m-nav): 56px, 로고 + 검색 아이콘(/search) + 로그인/프로필
 * 아이콘만 표시(44px 터치 타깃). 메뉴는 하단 탭(NavigationBar)이 담당.
 */
const NAV_ITEMS = [
  { to: "/home", label: "홈" },
  { to: "/explore", label: "탐색" },
  { to: "/ranking", label: "랭킹" },
  { to: "/new", label: "신작" },
];

const SiteHeader = () => {
  const { isAuthenticated } = useAuth();
  const authTo = isAuthenticated ? "/profile" : "/login";
  const authLabel = isAuthenticated ? "내 정보" : "로그인";

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-line bg-surface/90 backdrop-blur-md lg:h-16">
      <div className="mx-auto flex h-full max-w-[1440px] items-center gap-7 pl-4 pr-2 lg:px-6">
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

        {/* 데스크톱 검색 필 - <lg에서는 우측 검색 아이콘으로 대체 */}
        <Link
          to="/search"
          className="ml-auto hidden h-[38px] w-full max-w-[300px] items-center gap-2 rounded-full border border-line bg-canvas px-3.5 text-sm text-ink-3 transition-colors hover:border-line-strong lg:flex"
        >
          <MagnifyingGlass size={16} />
          <span className="truncate">작품, 개발사, 작가 검색</span>
        </Link>

        <Link
          to={authTo}
          className="hidden shrink-0 rounded-full bg-ink px-4.5 py-2 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98] lg:block"
        >
          {authLabel}
        </Link>

        {/* 모바일 아이콘 액션 (목업 .icon-btn, 44px 터치 타깃) */}
        <div className="ml-auto flex lg:hidden">
          <Link
            to="/search"
            aria-label="검색"
            className="grid h-11 w-11 place-items-center rounded-full text-ink transition-colors active:bg-ink/5"
          >
            <MagnifyingGlass size={21} />
          </Link>
          <Link
            to={authTo}
            aria-label={authLabel}
            className="grid h-11 w-11 place-items-center rounded-full text-ink transition-colors active:bg-ink/5"
          >
            <UserCircle size={23} />
          </Link>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
