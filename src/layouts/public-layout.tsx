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
  // 컬렉션 상세도 같은 문법 - work/:id처럼 id 형식을 따지지 않고 매칭한다
  // (비숫자 id도 상세 페이지의 Shell 상단 바가 404 화면을 감싸므로, 여기서
  // 숫자 검증을 하면 <lg에 SiteHeader와 페이지 상단 바가 이중 렌더된다).
  // 정적 세그먼트 new만 제외 - 생성 화면은 아래 isOwnShellRoute가 담당.
  const collectionDetailMatch = matchPath(
    "/collections/:id",
    location.pathname,
  );
  const isDetailRoute =
    !!matchPath("/work/:id", location.pathname) ||
    (!!collectionDetailMatch && collectionDetailMatch.params.id !== "new");

  // 컬렉션 생성/편집(C-FE2)도 <lg에서 자체 상단 바(X + 저장)를 쓴다 (목업 5c).
  // 고정 하단 액션 바는 없어 푸터 여백 규칙은 상세만 적용.
  const collectionEditMatch = matchPath(
    "/collections/:id/edit",
    location.pathname,
  );
  const isOwnShellRoute =
    !!matchPath("/collections/new", location.pathname) ||
    (!!collectionEditMatch &&
      /^\d+$/.test(collectionEditMatch.params.id ?? ""));

  return (
    <div className="flex min-h-screen flex-col">
      {isDetailRoute || isOwnShellRoute ? (
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
