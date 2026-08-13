import React from "react";
import HomeIcon from "../../assets/home-icon.tsx";
import RankingIcon from "../../assets/ranking-icon.tsx";
import SearchIcon from "../../assets/search-icon.tsx";
import CalendarIcon from "../../assets/calendar-icon.tsx";
import MyIcon from "../../assets/my-icon.tsx";
import { useLocation, useNavigate, matchPath } from "react-router-dom";

/** 모바일 하단 탭 (< lg 전용) — 데스크톱은 SiteHeader가 담당 */
const TABS = [
  { path: "/home", label: "홈", Icon: HomeIcon },
  { path: "/explore", label: "탐색", Icon: SearchIcon },
  { path: "/ranking", label: "랭킹", Icon: RankingIcon },
  { path: "/new", label: "신작", Icon: CalendarIcon },
  { path: "/profile", label: "프로필", Icon: MyIcon },
];

const NavigationBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) =>
    !!matchPath({ path: `${path}/*`, end: false }, location.pathname);

  const handleNavigation = (path: string) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-line bg-surface/95 backdrop-blur-md lg:hidden">
      {TABS.map(({ path, label, Icon }) => {
        const active = isActive(path);
        return (
          <button
            key={path}
            onClick={() => handleNavigation(path)}
            className="flex flex-col items-center gap-1 text-xs"
          >
            <Icon
              color={active ? "var(--color-accent)" : "var(--color-ink-3)"}
            />
            <span
              className={
                active ? "font-semibold text-ink" : "text-ink-3"
              }
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
export default NavigationBar;
