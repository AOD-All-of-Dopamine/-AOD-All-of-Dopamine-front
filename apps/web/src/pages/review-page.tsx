import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Star } from "@phosphor-icons/react";
import BottomButton from "../components/common/BottomButton";
import EmptyState from "../components/ui/EmptyState";
import { useCreateReview } from "@aod/shared/hooks";
import { useAuth } from "../contexts/AuthContext";

/**
 * /review/:id - 목업 없음. 기존 구조(별점 선택 + 한줄평 + 하단 저장 바) 유지 + 토큰 재스킨.
 * - 구 Header 제거 -> 상단 뒤로가기(work-detail 관례) + 페이지 제목.
 * - 별점은 svg 에셋 대신 Phosphor Star(fill=star 토큰, 비활성=line-strong).
 * - body overflow 잠금 이펙트 제거 - 셸 스크롤에 맡긴다.
 * - 카운터(/300)에 맞춰 textarea maxLength=300 부여.
 */
export default function ReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contentId = id ? Number(id) : 0;
  const { isAuthenticated } = useAuth();
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    content: "",
  });
  const isSaveDisabled =
    selectedRating === 0 || reviewForm.content.trim().length === 0;
  const numericContentId = contentId ? Number(contentId) : 0;
  const createReviewMutation = useCreateReview(numericContentId);

  const handleSubmitReview = () => {
    if (!isAuthenticated) return alert("로그인이 필요합니다.");
    if (isNaN(numericContentId) || numericContentId <= 0) {
      alert("유효하지 않은 콘텐츠입니다.");
      return;
    }
    if (!reviewForm.content.trim()) return alert("리뷰 내용을 입력해주세요.");
    if (selectedRating === 0) return alert("별점을 선택해주세요.");

    createReviewMutation.mutate(
      { ...reviewForm, rating: selectedRating },
      {
        onSuccess: () => {
          setReviewForm({ rating: 5, content: "" });
          setSelectedRating(0);
          alert("리뷰가 작성되었습니다.");
          navigate(-1);
        },
        onError: (error: any) => {
          alert(error.response?.data?.error || "리뷰 작성에 실패했습니다.");
        },
      },
    );
  };

  if (!contentId) {
    return (
      <div className="mx-auto max-w-[720px] px-6 pb-20 pt-10">
        <EmptyState
          title="잘못된 접근이에요"
          description="리뷰를 작성할 작품을 먼저 선택해 주세요."
          action={
            <button
              type="button"
              onClick={() => navigate("/explore")}
              className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
            >
              탐색으로 가기
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] px-6 pb-32 pt-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="-ml-2.5 inline-flex items-center gap-1.5 rounded-input px-2.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <ArrowLeft size={16} />
        뒤로 가기
      </button>

      <h1 className="mt-4 text-[22px] font-extrabold tracking-[-0.02em] text-ink">
        리뷰 작성하기
      </h1>

      <div className="mt-6 rounded-panel border border-line bg-surface px-6 py-6 shadow-card">
        <p className="text-sm font-semibold text-ink">별점</p>
        <div
          className="mt-3 flex items-center justify-center gap-6"
          onMouseLeave={() => setHoveredRating(0)}
        >
          {[1, 2, 3, 4, 5].map((rating) => {
            const isActive = (hoveredRating || selectedRating) >= rating;

            return (
              <button
                key={rating}
                type="button"
                aria-label={`별점 ${rating}점`}
                aria-pressed={selectedRating === rating}
                onClick={() => setSelectedRating(rating)}
                onMouseEnter={() => setHoveredRating(rating)}
                className="transition-transform hover:scale-110 motion-reduce:hover:scale-100"
              >
                <Star
                  size={30}
                  weight={isActive ? "fill" : "regular"}
                  className={isActive ? "text-star" : "text-line-strong"}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <label
            htmlFor="review-content"
            className="text-sm font-semibold text-ink"
          >
            리뷰 한줄평
          </label>
          <span className="text-xs tabular-nums text-ink-3">
            {reviewForm.content.length}/300
          </span>
        </div>
        <textarea
          id="review-content"
          value={reviewForm.content}
          maxLength={300}
          onChange={(e) =>
            setReviewForm({
              ...reviewForm,
              content: e.target.value,
            })
          }
          placeholder="작품에 대한 한줄평을 작성해주세요."
          className="mt-2 min-h-[120px] w-full resize-none rounded-input border border-line bg-surface p-3.5 text-[15px] text-ink placeholder:text-ink-3 transition-colors focus:border-line-strong"
        />
      </div>

      <div className="fixed bottom-0 left-0 w-full">
        <div className="mx-auto max-w-[720px]">
          <BottomButton
            buttons={[
              {
                text: "저장",
                onClick: handleSubmitReview,
                variant: "primary",
                disabled: isSaveDisabled,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
