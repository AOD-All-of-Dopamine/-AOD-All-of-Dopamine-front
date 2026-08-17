import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CaretRight, SignOut, User } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import {
  useMyReviews,
  useMyBookmarks,
  useMyLikes,
} from "../hooks/useInteractions";
import { DOMAIN_LABEL_MAP } from "../constants/domain";
import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";
import RailCard from "../components/ui/RailCard";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";

/**
 * /profile - 목업 없음. 기존 구조(프로필 요약 / 통계 3분할 / 좋아요·보고 싶은 작품
 * 가로 릴) 유지 + 토큰·공용 컴포넌트 재스킨.
 * - 구 Header(앱바)·Modal·HorizontalScroller 제거 -> 페이지 제목 + 로그아웃 버튼,
 *   ConfirmDialog(로그아웃 확인), RailCard 가로 릴(홈 신작 릴 관례)로 대체.
 * - 구 페이지의 프로필 영역 클릭 이동(/profile/info)은 라우트가 존재하지 않아
 *   (App.tsx에 미등록 - 클릭 시 라우터 에러 화면) 제거했다. 라우트 추가 시 복원.
 * - 다크 전용 에셋(white-cat, view-all-icon)은 Phosphor 아이콘으로 대체.
 */

const primaryBtnClass =
  "rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]";

const categoryOf = (domain?: string): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};

interface RailWorkItem {
  id: number | string;
  title: string;
  thumbnail: string | null;
  domain?: string;
  releaseDate?: string;
}

/** 좋아요·보고 싶은 작품 공용 섹션 (제목 + 전체보기 + RailCard 릴 / 빈 상태) */
function WorkRailSection({
  title,
  count,
  description,
  viewAllTo,
  items,
  onNavigate,
}: {
  title: string;
  count: number;
  description: string;
  viewAllTo: string;
  items: RailWorkItem[] | undefined;
  onNavigate: (to: string) => void;
}) {
  return (
    <section className="mt-9">
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-baseline gap-1.5 text-[17px] font-extrabold tracking-[-0.02em] text-ink">
          {title}
          <span className="font-bold tabular-nums text-accent-ink">
            {count}
          </span>
        </h2>
        <button
          type="button"
          onClick={() => onNavigate(viewAllTo)}
          className="inline-flex items-center gap-0.5 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
        >
          전체보기
          <CaretRight size={13} />
        </button>
      </div>
      <p className="mt-0.5 text-[13.5px] text-ink-3">{description}</p>

      {items && items.length > 0 ? (
        <div className="scrollbar-rail mt-3.5 flex snap-x gap-3.5 overflow-x-auto pb-2.5">
          {items.map((item) => {
            const year = item.releaseDate?.slice(0, 4);
            const meta = [
              item.domain
                ? (DOMAIN_LABEL_MAP[item.domain] ?? item.domain)
                : undefined,
              year,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <RailCard
                key={item.id}
                title={item.title}
                meta={meta || undefined}
                imageUrl={item.thumbnail}
                fallbackIconUrl={thumbnailFallbackMap[categoryOf(item.domain)]}
                to={`/work/${item.id}`}
              />
            );
          })}
        </div>
      ) : (
        <div className="mt-3.5">
          <EmptyState
            variant="note"
            title="아직 등록한 작품이 없어요"
            action={
              <button
                type="button"
                onClick={() => onNavigate("/explore")}
                className={primaryBtnClass}
              >
                작품 둘러보기
              </button>
            }
          />
        </div>
      )}
    </section>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const { data: reviewsData } = useMyReviews(0, 1, isAuthenticated);
  const { data: bookmarksData } = useMyBookmarks(0, 10, isAuthenticated);
  const { data: likesData } = useMyLikes(0, 10, isAuthenticated);

  const reviewCount = reviewsData?.totalElements || 0;
  const likeCount = likesData?.totalElements || 0;
  const bookmarkCount = bookmarksData?.totalElements || 0;

  // 로그인하지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-16">
        <EmptyState
          icon={<User size={44} />}
          title="로그인이 필요해요"
          description="프로필을 보려면 로그인해 주세요."
          action={
            <button
              type="button"
              onClick={() => navigate("/login")}
              className={primaryBtnClass}
            >
              로그인 하기
            </button>
          }
        />
      </div>
    );
  }

  const confirmLogout = () => {
    logout();
    setIsLogoutOpen(false);
    navigate("/login");
  };

  return (
    <>
      <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-7">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">
            마이페이지
          </h1>
          <button
            type="button"
            onClick={() => setIsLogoutOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-2 transition-colors hover:border-line-strong hover:text-ink active:scale-[0.98]"
          >
            <SignOut size={15} />
            로그아웃
          </button>
        </div>

        {/* 프로필 섹션 */}
        <div className="mt-6 flex items-center gap-4">
          <div className="grid h-16 w-16 flex-none place-items-center rounded-full border border-line bg-surface text-ink-3 shadow-card">
            <User size={30} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[22px] font-extrabold tracking-[-0.02em] text-ink">
              {user?.username}
            </div>
            <div className="truncate text-sm text-ink-2">@{user?.username}</div>
          </div>
        </div>

        {/* 통계 3분할 */}
        <div className="mt-6 grid grid-cols-3 rounded-panel border border-line bg-surface py-4 text-center shadow-card">
          {[
            { id: "reviews", label: "리뷰 작성", value: reviewCount },
            { id: "likes", label: "좋아요", value: likeCount },
            { id: "bookmarks", label: "북마크", value: bookmarkCount },
          ].map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/profile/${item.id}`)}
              className={`flex flex-col gap-1 transition-colors hover:text-accent-ink ${
                idx !== 2 ? "border-r border-line" : ""
              }`}
            >
              <span className="text-xl font-extrabold tabular-nums text-ink">
                {item.value}
              </span>
              <span className="text-[13px] text-ink-2">{item.label}</span>
            </button>
          ))}
        </div>

        <WorkRailSection
          title="좋아요"
          count={likeCount}
          description="좋았던 작품을 찜해보세요"
          viewAllTo="/profile/likes"
          items={likesData?.content}
          onNavigate={navigate}
        />

        <WorkRailSection
          title="보고 싶은 작품"
          count={bookmarkCount}
          description="나중에 볼 작품을 등록해요"
          viewAllTo="/profile/bookmarks"
          items={bookmarksData?.content}
          onNavigate={navigate}
        />
      </div>

      {isLogoutOpen && (
        <ConfirmDialog
          title="로그아웃하시겠어요?"
          confirmLabel="로그아웃"
          onCancel={() => setIsLogoutOpen(false)}
          onConfirm={confirmLogout}
        />
      )}
    </>
  );
}
