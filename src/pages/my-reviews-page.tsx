import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyReviews, useDeleteReview } from "../hooks/useInteractions";

export default function MyReviewsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useMyReviews(page, 20);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--blackbackground-primary)] flex items-center justify-center text-[var(--greygrey-300text-secondary)]">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--blackbackground-primary)] pb-20">
      {/* 헤더 */}
      <header className="h-[60px] flex items-center px-4">
        <button onClick={() => navigate(-1)} className="w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="flex-1 text-center text-[18px] font-semibold text-white mr-6">
          작성한 리뷰
        </h1>
      </header>

      {/* 리뷰 리스트 */}
      <div className="px-4">
        {data && data.content.length > 0 ? (
          <>
            <div className="flex flex-col gap-3">
              {data.content.map((review) => (
                <div
                  key={review.reviewId}
                  className="p-4 bg-[var(--greygrey-900background-secondary)] rounded-lg"
                >
                  {/* 작품 제목 */}
                  <div className="flex justify-between items-start mb-2">
                    <h3
                      className="flex-1 text-[16px] font-semibold text-[#855BFF] cursor-pointer"
                      onClick={() => navigate(`/work/${review.contentId}`)}
                    >
                      {review.contentTitle}
                    </h3>

                    <button
                      onClick={() => handleDelete(review.reviewId)}
                      className="text-[12px] text-[#FF5455]"
                    >
                      삭제
                    </button>
                  </div>

                  {/* 별점 */}
                  <div className="flex gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 1L10.163 5.279L15 5.944L11.5 9.269L12.326 14L8 11.779L3.674 14L4.5 9.269L1 5.944L5.837 5.279L8 1Z"
                          fill={star <= review.rating ? "#FFD700" : "#64636B"}
                        />
                      </svg>
                    ))}
                  </div>

                  {review.title && (
                    <h4 className="text-[14px] font-semibold text-white mb-2">
                      {review.title}
                    </h4>
                  )}

                  <p className="text-[14px] text-white mb-2">
                    {review.content}
                  </p>

                  <div className="text-[12px] text-[var(--greygrey-200text-primary)]">
                    {new Date(review.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>

            {/* 페이지네이션 */}
            {data.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-6 pt-4 border-t border-[var(--greygrey-700)]">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 bg-[#855BFF] text-white rounded text-[14px] font-semibold disabled:bg-[var(--greygrey-700)] disabled:text-[var(--greygrey-400icon)] disabled:cursor-not-allowed"
                >
                  이전
                </button>

                <span className="text-[14px] text-white">
                  {page + 1} / {data.totalPages}
                </span>

                <button
                  disabled={page >= data.totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 bg-[#855BFF] text-white rounded text-[14px] font-semibold disabled:bg-[var(--greygrey-700)] disabled:text-[var(--greygrey-400icon)] disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-[16px] text-white mb-4">
              아직 작성한 리뷰가 없습니다.
            </p>
            <button
              onClick={() => navigate("/explore")}
              className="px-4 py-2 bg-[#855BFF] text-white rounded text-[14px]"
            >
              작품 둘러보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
