import {
  RouteObject,
  createBrowserRouter,
  RouterProvider,
  Navigate,
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
import OnboardingPage from "./pages/onboarding-page";
import ReviewPage from "./pages/review-page";
import SearchPage from "./pages/search-page";
import CollectionsPage from "./pages/collections-page";
import CollectionDetailPage from "./pages/collection-detail-page";
import CollectionWipPage from "./pages/collection-wip-page";

const publicRoutes: RouteObject[] = [
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <Navigate to="/home" /> },
      { path: "home", element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "ranking", element: <RankingPage /> },
      { path: "internal/ranking", element: <InternalRankingPage /> },
      { path: "new", element: <NewReleasesPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "profile/reviews", element: <MyReviewsPage /> },
      { path: "profile/bookmarks", element: <MyBookmarksPage /> },
      { path: "profile/likes", element: <MyLikesPage /> },
      { path: "work/:id", element: <WorkDetailPage /> },
      { path: "collections", element: <CollectionsPage /> },
      // new/edit는 C-FE2 몫 - 진입점 404 방지용 자리 라우트 (C-FE2가 교체)
      { path: "collections/new", element: <CollectionWipPage /> },
      { path: "collections/:id", element: <CollectionDetailPage /> },
      { path: "collections/:id/edit", element: <CollectionWipPage /> },
      { path: "onboarding", element: <OnboardingPage /> },
      { path: "review/:id", element: <ReviewPage /> },
      { path: "search", element: <SearchPage /> },
      // dev 전용 - 시각 게이트 도구 (공용 컴포넌트 갤러리).
      // 플랜 편차: 삭제 대신 DEV 게이트로 유지 - 프로덕션 번들에서는
      // import.meta.env.DEV가 false 상수로 접혀 lazy import째 제외된다.
      ...(import.meta.env.DEV
        ? [
            {
              path: "dev/components",
              lazy: async () => ({
                Component: (await import("./pages/dev-components-page"))
                  .default,
              }),
            },
          ]
        : []),
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
