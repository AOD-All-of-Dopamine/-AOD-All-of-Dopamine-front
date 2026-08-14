import { matchPath, Outlet, useLocation } from "react-router-dom";
import SiteHeader from "../components/common/SiteHeader";
import SiteFooter from "../components/common/SiteFooter";
import NavigationBar from "../components/common/NavigationBar";

function PublicLayout() {
  const location = useLocation();
  const showNav = ["/home", "/explore", "/ranking", "/new", "/profile/*"];

  const showNavBar = showNav.some((pattern) =>
    matchPath({ path: pattern, end: false }, location.pathname),
  );

  // 상세는 <lg에서 페이지 자체의 뒤로가기 바(목업 .d-nav)가 상단을 담당 -
  // SiteHeader는 lg+ 전용. lg:contents로 래퍼 박스를 없애 sticky 동작 불변.
  const isWorkDetail = !!matchPath("/work/:id", location.pathname);

  return (
    <div className="flex min-h-screen flex-col">
      {isWorkDetail ? (
        <div className="hidden lg:contents">
          <SiteHeader />
        </div>
      ) : (
        <SiteHeader />
      )}
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
