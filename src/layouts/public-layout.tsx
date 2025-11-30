import { Outlet } from "react-router-dom";
import NavigationBar from "../components/common/NavigationBar";

function PublicLayout() {
  return (
    <div className="flex justify-center min-h-screen">
      <div className="relative w-full min-h-screen">
        <Outlet />
        <NavigationBar />
      </div>
    </div>
  );
}

export default PublicLayout;
