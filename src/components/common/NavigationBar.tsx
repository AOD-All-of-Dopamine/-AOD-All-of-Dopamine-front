import {
  CalendarBlank,
  Compass,
  House,
  Trophy,
  User,
  type Icon,
} from "@phosphor-icons/react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";

/**
 * 모바일 하단 탭 (< lg 전용) - 데스크톱은 SiteHeader가 담당.
 * 아이콘은 Phosphor 단일 규칙(목업 .m-tab) - 활성 탭은 accent + fill 변형,
 * 라벨은 활성 시 ink 600.
 */
const TABS: { path: string; label: string; Icon: Icon }[] = [
  { path: "/home", label: "홈", Icon: House },
  { path: "/explore", label: "탐색", Icon: Compass },
  { path: "/ranking", label: "랭킹", Icon: Trophy },
  { path: "/new", label: "신작", Icon: CalendarBlank },
  { path: "/profile", label: "프로필", Icon: User },
];

const NavigationBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) =>
    !!matchPath({ path: `${path}/*`, end: false }, location.pathname);

  const handleNavigation = (path: string) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch border-t border-line bg-surface/95 backdrop-blur-md lg:hidden">
      {TABS.map(({ path, label, Icon }) => {
        const active = isActive(path);
        return (
          <button
            key={path}
            onClick={() => handleNavigation(path)}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-[3px] text-[11px]"
          >
            <Icon
              size={23}
              weight={active ? "fill" : "regular"}
              className={active ? "text-accent" : "text-ink-3"}
            />
            <span className={active ? "font-semibold text-ink" : "text-ink-3"}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
export default NavigationBar;
