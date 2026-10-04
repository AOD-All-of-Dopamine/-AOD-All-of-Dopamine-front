import {
  RouteObject,
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import PublicLayout from "./layouts/public-layout";
import HomePage from "./pages/home-page";
import ForYouRedirect from "./pages/for-you-redirect";
import ExplorePage from "./pages/explore-page";
import NewReleasesPage from "./pages/new-releases-page";
import ProfilePage from "./pages/profile-page";
import WorkDetailPage from "./pages/work-detail-page";
import LoginPage from "./pages/login-page";
import SignupPage from "./pages/signup-page";
import TrendPage from "./pages/trend-page";
import LibraryPage from "./pages/library-page";
import {
  LibraryRedirect,
  NewRedirect,
  RankingRedirect,
} from "./pages/legacy-redirects";
import InternalRankingPage from "./pages/internal-ranking-page";
import OnboardingPage from "./pages/onboarding-page";
import ReviewPage from "./pages/review-page";
import SearchPage from "./pages/search-page";
import CollectionsPage from "./pages/collections-page";
import CollectionDetailPage from "./pages/collection-detail-page";
import CollectionNewPage from "./pages/collection-new-page";
import CollectionEditPage from "./pages/collection-edit-page";

const publicRoutes: RouteObject[] = [
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <Navigate to="/home" /> },
      { path: "home", element: <HomePage /> },
      // 추천 탭은 홈으로 합쳤다(2026-09-26) — 옛 주소는 홈 추천으로 넘긴다
      { path: "for-you", element: <ForYouRedirect /> },
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "explore", element: <ExplorePage /> },
      // 트렌드 = 랭킹 + 신작(2026-10-04) — 옛 주소는 트렌드 · 내 보관함으로 넘긴다
      { path: "trend", element: <TrendPage /> },
      { path: "trend/new", element: <NewReleasesPage /> },
      { path: "ranking", element: <RankingRedirect /> },
      { path: "internal/ranking", element: <InternalRankingPage /> },
      { path: "new", element: <NewRedirect /> },
      { path: "library", element: <LibraryPage /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "profile/reviews", element: <LibraryRedirect tab="reviews" /> },
      {
        path: "profile/bookmarks",
        element: <LibraryRedirect tab="bookmarks" />,
      },
      { path: "profile/likes", element: <LibraryRedirect tab="likes" /> },
      { path: "work/:id", element: <WorkDetailPage /> },
      { path: "collections", element: <CollectionsPage /> },
      { path: "collections/new", element: <CollectionNewPage /> },
      { path: "collections/:id", element: <CollectionDetailPage /> },
      { path: "collections/:id/edit", element: <CollectionEditPage /> },
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
