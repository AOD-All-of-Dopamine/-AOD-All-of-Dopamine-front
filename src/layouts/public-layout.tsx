import { Outlet } from "react-router-dom";
import NavigationBar from "../components/common/NavigationBar";

function PublicLayout() {
  return (
    <div className="flex justify-center min-h-screen">
      <div className="relative w-full min-h-screen pb-410">
        {/* pb-32 = 128px padding-bottom (NavigationBar 높이 + 충분한 여유 공간) */}
        <Outlet />
        <NavigationBar />
      </div>
    </div>
  );
}

export default PublicLayout;
