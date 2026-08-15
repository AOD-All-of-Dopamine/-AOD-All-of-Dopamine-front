import { matchPath, Outlet, useLocation } from "react-router-dom";
import SiteHeader from "../components/common/SiteHeader";
import SiteFooter from "../components/common/SiteFooter";
import NavigationBar from "../components/common/NavigationBar";

function PublicLayout() {
  const location = useLocation();
  const showNav = ["/home", "/explore", "/ranking", "/new", "/profile/*"];

  const showNavBar =
    showNav.some((pattern) =>
      matchPath({ path: pattern, end: false }, location.pathname),
    ) ||
    // 컬렉션은 발견 페이지만 하단 탭 노출 - 상세(/collections/:id)는 자체
    // 상단 바 + 고정 좋아요 액션 바가 있어 정확 일치로만 매칭한다
    !!matchPath({ path: "/collections", end: true }, location.pathname);

  // 상세는 <lg에서 페이지 자체의 뒤로가기 바(목업 .d-nav)가 상단을 담당 -
  // SiteHeader는 lg+ 전용. lg:contents로 래퍼 박스를 없애 sticky 동작 불변.
  // 푸터도 이 라우트 <lg에서는 고정 액션 바만큼 하단 여백을 받는다(아래 참고).
  // 컬렉션 상세도 같은 문법 - 단 /collections/new(자리 라우트)는 숫자 id가
  // 아니므로 제외한다.
  const collectionDetailMatch = matchPath(
    "/collections/:id",
    location.pathname,
  );
  const isDetailRoute =
    !!matchPath("/work/:id", location.pathname) ||
    (!!collectionDetailMatch &&
      /^\d+$/.test(collectionDetailMatch.params.id ?? ""));

  return (
    <div className="flex min-h-screen flex-col">
      {isDetailRoute ? (
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
      {/* 상세 <lg는 고정 액션 바(~73px+safe-area)가 문서 하단을 덮으므로
          푸터 뒤에 그만큼 여백을 둬 푸터 내용 가림을 방지 (lg+ 영향 없음) */}
      {isDetailRoute ? (
        <div className="max-lg:pb-24">
          <SiteFooter />
        </div>
      ) : (
        <SiteFooter />
      )}
      {showNavBar && <NavigationBar />}
    </div>
  );
}

export default PublicLayout;
