import React from "react";
import HomeIcon from "../../assets/home-icon.tsx";
import RankingIcon from "../../assets/ranking-icon.tsx";
import SearchIcon from "../../assets/search-icon.tsx";
import MyIcon from "../../assets/my-icon.tsx";
import { useLocation, useNavigate, matchPath } from "react-router-dom";

const NavigationBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (pattern: string) =>
    !!matchPath({ path: pattern, end: false }, location.pathname);

  const handleNavigation = (path: string) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="fixed max-w-2xl bottom-0 left-0 w-full mx-auto right-0 bg-[#242424] flex justify-around items-center h-20 z-[1000]">
      <button
        onClick={() => handleNavigation("/home")}
        className="flex flex-col items-center gap-1 text-xs"
      >
        <HomeIcon color={isActive("/home/*") ? "white" : "gray"} />
        <span className={isActive("/home/*") ? "text-white" : "text-gray-400"}>
          홈
        </span>
      </button>
      <button
        onClick={() => handleNavigation("/explore")}
        className="flex flex-col items-center gap-1 text-xs"
      >
        <SearchIcon color={isActive("/explore/*") ? "white" : "gray"} />
        <span
          className={isActive("/explore/*") ? "text-white" : "text-gray-400"}
        >
          탐색
        </span>
      </button>
      <button
        onClick={() => handleNavigation("/ranking")}
        className="flex flex-col items-center gap-1 text-xs"
      >
        <RankingIcon color={isActive("/ranking/*") ? "white" : "gray"} />
        <span
          className={isActive("/ranking/*") ? "text-white" : "text-gray-400"}
        >
          랭킹
        </span>
      </button>
      <button
        onClick={() => handleNavigation("/new")}
        className="flex flex-col items-center gap-1 text-xs"
      >
        <SearchIcon color={isActive("/new/*") ? "white" : "gray"} />
        <span className={isActive("/new/*") ? "text-white" : "text-gray-400"}>
          신작
        </span>
      </button>
      <button
        onClick={() => handleNavigation("/profile")}
        className="flex flex-col items-center gap-1 text-xs"
      >
        <MyIcon color={isActive("/profile/*") ? "white" : "gray"} />
        <span
          className={isActive("/profile/*") ? "text-white" : "text-gray-400"}
        >
          프로필
        </span>
      </button>
    </nav>
  );
};
export default NavigationBar;
