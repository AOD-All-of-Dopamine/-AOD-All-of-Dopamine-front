import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChatCircleText,
  DotsThreeVertical,
  FilmStrip,
  Star,
} from "@phosphor-icons/react";
import { useMyReviews, useDeleteReview } from "../hooks/useInteractions";
import type { Review } from "../api/interactionApi";
import EmptyState from "../components/ui/EmptyState";
import Pagination from "../components/ui/Pagination";

/**
 * /profile/reviews - 목업 없음. 기존 구조(리뷰 카드 리스트 + 더보기 메뉴 + 페이지네이션)
 * 유지 + 토큰 재스킨.
 * - 구 Header 제거 -> 상단 뒤로가기(work-detail 관례) + 페이지 제목.
 * - 별점은 svg 에셋 대신 Phosphor Star, 이전/다음 버튼은 ui/Pagination으로 대체.
 * - 더보기 메뉴(수정하기/삭제하기)와 confirm/alert 삭제 플로우는 기존 로직 유지.
 *   삭제하기만 시맨틱 danger 토큰 사용.
 */

const PAGE_SIZE = 20;

export default function MyReviewsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useMyReviews(page, PAGE_SIZE);
  const [openOptionId, setOpenOptionId] = useState<number | null>(null);
  const deleteReviewMutation = useDeleteReview(0);

  const handleDelete = (reviewId: number) => {
    if (confirm("리뷰를 삭제하시겠습니까?")) {
      deleteReviewMutation.mutate(reviewId, {
        onSuccess: () => {
          alert("리뷰가 삭제되었습니다.");
        },
      });
    }
  };

  const sortedReviews = [...(data?.content ?? [])].sort(
    (a: Review, b: Review) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-20 pt-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="-ml-2.5 inline-flex items-center gap-1.5 rounded-input px-2.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <ArrowLeft size={16} />
        뒤로 가기
      </button>

      <h1 className="mt-4 text-[26px] font-extrabold tracking-[-0.03em] text-ink">
        내가 리뷰한 작품
      </h1>

      {isLoading ? (
        <div className="mt-5 flex flex-col gap-4" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-panel border border-line bg-surface p-4"
            >
              <div className="flex gap-4">
                <div className="aspect-[2/3] w-14 flex-none rounded-input bg-line" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-4 w-3/5 rounded-input bg-line" />
                  <div className="h-3.5 w-24 rounded-input bg-canvas" />
                  <div className="h-3 w-20 rounded-input bg-canvas" />
                </div>
              </div>
              <div className="mt-3 h-4 w-4/5 rounded-input bg-canvas" />
            </div>
          ))}
        </div>
      ) : data && data.content.length > 0 ? (
        <>
          <div className="mt-5 flex flex-col gap-4">
            {sortedReviews.map((review) => (
              <article
                key={review.reviewId}
                className="rounded-panel border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong"
              >
                <div className="flex gap-4">
                  <button
                    type="button"
                    aria-label={`${review.contentTitle} 상세로 이동`}
                    onClick={() => navigate(`/work/${review.contentId}`)}
                    className="grid aspect-[2/3] w-14 flex-none place-items-center self-start rounded-input border border-line bg-canvas text-ink-3"
                  >
                    <FilmStrip size={22} />
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="cursor-pointer truncate text-[15.5px] font-bold text-ink hover:underline"
                        onClick={() => navigate(`/work/${review.contentId}`)}
                      >
                        {review.contentTitle}
                      </h3>

                      <div className="relative flex-none">
                        <button
                          type="button"
                          aria-label="리뷰 관리 메뉴"
                          aria-expanded={openOptionId === review.reviewId}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenOptionId(
                              openOptionId === review.reviewId
                                ? null
                                : review.reviewId,
                            );
                          }}
                          className="grid h-7 w-7 place-items-center rounded-full text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink"
                        >
                          <DotsThreeVertical size={18} weight="bold" />
                        </button>

                        {openOptionId === review.reviewId && (
                          <div className="absolute right-0 top-8 z-20 w-28 overflow-hidden rounded-panel border border-line bg-surface shadow-lift">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenOptionId(null);
                                // 수정하기 기능 추가 필요
                              }}
                              className="w-full px-3.5 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-ink/5"
                            >
                              수정하기
                            </button>
                            <div className="h-px bg-line" />
                            <button
                              type="button"
                              onClick={() => {
                                setOpenOptionId(null);
                                handleDelete(review.reviewId);
                              }}
                              className="w-full px-3.5 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/5"
                            >
                              삭제하기
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className="mt-1.5 flex gap-0.5"
                      role="img"
                      aria-label={`평점 ${review.rating}점`}
                    >
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isActive = star <= Math.round(review.rating);
                        return (
                          <Star
                            key={star}
                            size={15}
                            weight={isActive ? "fill" : "regular"}
                            className={
                              isActive ? "text-star" : "text-line-strong"
                            }
                          />
                        );
                      })}
                    </div>

                    <div className="mt-1 text-xs text-ink-3">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {review.title && (
                  <h4 className="mt-3 text-sm font-semibold text-ink">
                    {review.title}
                  </h4>
                )}

                <p className="mt-2 text-[14.5px] leading-6 text-ink-2">
                  {review.content}
                </p>
              </article>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                page={page + 1}
                totalPages={data.totalPages}
                onChange={(next) => setPage(next - 1)}
              />
            </div>
          )}
        </>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon={<ChatCircleText size={44} />}
            title="아직 작성한 리뷰가 없어요"
            description="마음에 남은 작품에 첫 리뷰를 남겨보세요."
            action={
              <button
                type="button"
                onClick={() => navigate("/explore")}
                className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
              >
                작품 둘러보기
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}
