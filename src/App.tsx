import {
  RouteObject,
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import PublicLayout from "./layouts/public-layout";
import HomePage from "./pages/home-page";
import ExplorePage from "./pages/explore-page";
import RankingPage from "./pages/ranking-page";
import NewReleasesPage from "./pages/new-releases-page";
import ProfilePage from "./pages/profile-page";
import WorkDetailPage from "./pages/work-detail-page";
import LoginPage from "./pages/login-page";
import SignupPage from "./pages/signup-page";
import MyReviewsPage from "./pages/my-reviews-page";
import MyBookmarksPage from "./pages/my-bookmarks-page";
import MyLikesPage from "./pages/my-likes-page";
import InternalRankingPage from "./pages/internal-ranking-page";

const publicRoutes: RouteObject[] = [
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { path: "home", element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "ranking", element: <RankingPage /> },
      { path: "internal/ranking", element: <InternalRankingPage /> },
      { path: "new", element: <NewReleasesPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "profile/reviews", element: <MyReviewsPage /> },
      { path: "profile/bookmarks", element: <MyBookmarksPage /> },
      { path: "profile/likes", element: <MyLikesPage /> },
      { path: "work/:id", element: <WorkDetailPage /> },
    ],
  },
];

const router = createBrowserRouter([...publicRoutes]);

const App = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default App;
