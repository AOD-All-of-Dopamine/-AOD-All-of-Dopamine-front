import React from "react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";

interface NavItem {
  id: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  label: string;
  path: string;
  pattern: string;
}

const NavigationBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (pattern: string) =>
    !!matchPath({ path: pattern, end: false }, location.pathname);

  const navItems: NavItem[] = [
    {
      id: "home",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
            stroke="var(--grey-400)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 22V12H15V22"
            stroke="var(--grey-400)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
            fill="var(--grey-100)"
            stroke="var(--grey-100)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 22V12H15V22"
            stroke="var(--bg-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      label: "홈",
      path: "/home",
      pattern: "/home/*",
    },
    {
      id: "ranking",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M8 21V11H4V21H8ZM14 21V3H10V21H14ZM20 21V7H16V21H20Z"
            stroke="var(--grey-400)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M8 21V11H4V21H8ZM14 21V3H10V21H14ZM20 21V7H16V21H20Z"
            fill="var(--grey-100)"
            stroke="var(--grey-100)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      label: "랭킹",
      path: "/ranking",
      pattern: "/ranking/*",
    },
    {
      id: "explore",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle
            cx="11"
            cy="11"
            r="8"
            stroke="var(--grey-400)"
            strokeWidth="2"
          />
          <path
            d="M21 21L16.65 16.65"
            stroke="var(--grey-400)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle
            cx="11"
            cy="11"
            r="8"
            fill="var(--grey-100)"
            stroke="var(--grey-100)"
            strokeWidth="2"
          />
          <path
            d="M21 21L16.65 16.65"
            stroke="var(--grey-100)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ),
      label: "탐색",
      path: "/explore",
      pattern: "/explore/*",
    },
    {
      id: "new-releases",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="var(--grey-400)" strokeWidth="2"/>
          <path d="M16 2V6" stroke="var(--grey-400)" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 2V6" stroke="var(--grey-400)" strokeWidth="2" strokeLinecap="round"/>
          <path d="M3 10H21" stroke="var(--grey-400)" strokeWidth="2"/>
          <path d="M12 14V18" stroke="var(--grey-400)" strokeWidth="2" strokeLinecap="round"/>
          <path d="M10 16H14" stroke="var(--grey-400)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="18" rx="2" fill="var(--grey-100)" stroke="var(--grey-100)" strokeWidth="2"/>
          <path d="M16 2V6" stroke="var(--grey-100)" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 2V6" stroke="var(--grey-100)" strokeWidth="2" strokeLinecap="round"/>
          <path d="M3 10H21" stroke="var(--bg-primary)" strokeWidth="2"/>
          <path d="M12 14V18" stroke="var(--bg-primary)" strokeWidth="2" strokeLinecap="round"/>
          <path d="M10 16H14" stroke="var(--bg-primary)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      label: "신작",
      path: "/new-releases",
      pattern: "/new-releases/*",
    },
    {
      id: "mypage",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
            stroke="var(--grey-400)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="7"
            r="4"
            stroke="var(--grey-400)"
            strokeWidth="2"
          />
        </svg>
      ),
      activeIcon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
            fill="var(--grey-100)"
            stroke="var(--grey-100)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="7"
            r="4"
            fill="var(--grey-100)"
            stroke="var(--grey-100)"
            strokeWidth="2"
          />
        </svg>
      ),
      label: "MY",
      path: "/profile",
      pattern: "/profile/*",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-[var(--bg-primary)] shadow-[0px_0px_5px_rgba(36,35,37,0.15)] z-[1000]">
      <ul className="flex items-center justify-around h-[60px] max-w-[500px] mx-auto px-2">
        {navItems.map((item) => {
          const active = isActive(item.pattern);
          return (
            <li key={item.id}>
              <button
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center gap-0.5 min-w-[50px]"
              >
                <div className="w-6 h-6">
                  {active ? item.activeIcon : item.icon}
                </div>
                <span
                  className={`text-[10px] tracking-tight ${
                    active ? "text-[var(--grey-100)]" : "text-[var(--grey-400)]"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default NavigationBar;
