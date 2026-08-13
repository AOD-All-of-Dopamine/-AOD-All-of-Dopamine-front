import { matchPath, Outlet, useLocation } from "react-router-dom";
import SiteHeader from "../components/common/SiteHeader";
import SiteFooter from "../components/common/SiteFooter";
import NavigationBar from "../components/common/NavigationBar";

function PublicLayout() {
  const location = useLocation();
  const showNav = ["/home", "/explore", "/ranking", "/new", "/profile/*"];

  const showNavBar = showNav.some((pattern) =>
    matchPath({ path: pattern, end: false }, location.pathname)
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      {/* 모바일 하단 탭이 보이는 라우트는 탭 높이만큼 하단 여백 확보 */}
      <main className={showNavBar ? "flex-1 pb-20 lg:pb-0" : "flex-1"}>
        <Outlet />
      </main>
      <SiteFooter />
      {showNavBar && <NavigationBar />}
    </div>
  );
}

export default PublicLayout;
