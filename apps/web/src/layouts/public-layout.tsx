import { matchPath, Outlet, useLocation } from "react-router-dom";
import NavigationBar from "../components/common/NavigationBar";

function PublicLayout() {
  const location = useLocation();
  const showNav = ["/home", "/explore", "/ranking", "/new", "/profile/*"];

  const showNavBar = showNav.some((pattern) =>
    matchPath({ path: pattern, end: false }, location.pathname)
  );

  return (
    <div className="flex justify-center min-h-screen">
      <div className="relative w-full min-h-screen pb-15">
        {/* pb-32 = 128px padding-bottom (NavigationBar 높이 + 충분한 여유 공간) */}
        <Outlet />
        {showNavBar && <NavigationBar />}
      </div>
    </div>
  );
}

export default PublicLayout;
