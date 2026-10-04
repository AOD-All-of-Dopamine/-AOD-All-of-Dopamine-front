import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import MyBookmarksPage from "./my-bookmarks-page";
import MyLikesPage from "./my-likes-page";
import MyReviewsPage from "./my-reviews-page";

/**
 * /library — 내 보관함(설계 2026-10-04-trend-explore-design.md v2 #10).
 * 탭 관심 작품 · 좋아요 · 내 리뷰는 프로필 아래 목록 화면 본문을 그대로 쓴다(새 API 없음),
 * 내 컬렉션은 컬렉션 화면의 "내 컬렉션" 탭으로 보낸다. ?tab= 이 상태의 단일 출처(기본 bookmarks 는 생략, replace).
 * 비로그인은 로그인 확인 → 로그인 뒤 이 주소로 돌아온다(state.from).
 */

const TABS = [
  { id: "bookmarks", label: "관심 작품" },
  { id: "likes", label: "좋아요" },
  { id: "reviews", label: "내 리뷰" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function LibraryPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loginOpen, setLoginOpen] = useState(true);
  const raw = searchParams.get("tab");
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : "bookmarks";

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-6">
        <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">내 보관함</h1>
        <p className="mt-3 text-sm text-ink-2">로그인하면 관심 작품 · 좋아요 · 리뷰를 한곳에서 볼 수 있어요.</p>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="mt-5 rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85"
        >
          로그인
        </button>
        {loginOpen && (
          <ConfirmDialog
            title="로그인이 필요한 기능이에요"
            description="로그인 후 이용해 주세요."
            confirmLabel="로그인"
            onCancel={() => setLoginOpen(false)}
            onConfirm={() => navigate("/login", { state: { from: location.pathname + location.search } })}
          />
        )}
      </div>
    );
  }

  const select = (id: TabId) => {
    if (id === tab) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id === "bookmarks") next.delete("tab");
        else next.set("tab", id);
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-6">
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">내 보관함</h1>
      <div role="tablist" aria-label="내 보관함" className="mt-4 flex gap-5 overflow-x-auto border-b border-line scrollbar-hide">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`library-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="library-panel"
            onClick={() => select(t.id)}
            className={`-mb-px flex-none border-b-2 pb-2.5 text-[15px] font-bold transition-colors ${
              tab === t.id ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink-2"
            }`}
          >
            {t.label}
          </button>
        ))}
        <Link
          to="/collections?tab=mine"
          className="-mb-px inline-flex flex-none items-center gap-1 border-b-2 border-transparent pb-2.5 text-[15px] font-bold text-ink-3 transition-colors hover:text-ink-2"
        >
          내 컬렉션
          <ArrowRight size={14} />
        </Link>
      </div>
      <div id="library-panel" role="tabpanel" aria-labelledby={`library-tab-${tab}`} className="pt-1">
        {tab === "bookmarks" ? (
          <MyBookmarksPage embedded />
        ) : tab === "likes" ? (
          <MyLikesPage embedded />
        ) : (
          <MyReviewsPage embedded />
        )}
      </div>
    </div>
  );
}
