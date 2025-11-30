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
    return <div className="p-5 max-w-3xl mx-auto text-white">로딩 중...</div>;
  }

  return (
    <div className="p-5 max-w-3xl mx-auto text-white">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b-2 border-[#333]">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-transparent text-gray-400 border border-gray-600 rounded-md text-sm transition hover:text-gray-300 hover:border-gray-400"
        >
          ← 뒤로
        </button>

        <h1 className="text-2xl font-bold">작성한 리뷰</h1>
      </div>

      {/* 리뷰 리스트 */}
      {data && data.content.length > 0 ? (
        <>
          <div className="flex flex-col gap-4">
            {data.content.map((review) => (
              <div
                key={review.reviewId}
                className="p-5 bg-[#2a2a2a] rounded-lg transition hover:bg-[#333]"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <h3
                    className="flex-1 text-lg font-semibold text-indigo-400 cursor-pointer hover:text-indigo-300 hover:underline"
                    onClick={() => navigate(`/work/${review.contentId}`)}
                  >
                    {review.contentTitle}
                  </h3>

                  <button
                    onClick={() => handleDelete(review.reviewId)}
                    className="px-3 py-1 bg-red-600/20 text-red-500 border border-red-600 rounded text-xs font-semibold transition hover:bg-red-600 hover:text-white"
                  >
                    삭제
                  </button>
                </div>

                <div className="text-yellow-400 text-lg mb-2">
                  {"⭐".repeat(review.rating)}
                </div>

                {review.title && (
                  <h4 className="text-white font-semibold mb-3 text-base">
                    {review.title}
                  </h4>
                )}

                <p className="text-gray-300 text-sm leading-6 mb-3">
                  {review.content}
                </p>

                <div className="text-gray-500 text-xs">
                  {new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-[#333]">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition 
                ${
                  page === 0
                    ? "bg-[#444] text-gray-600 cursor-not-allowed"
                    : "bg-indigo-500 text-white hover:bg-indigo-400"
                }`}
              >
                이전
              </button>

              <span className="text-gray-300 text-sm font-semibold">
                {page + 1} / {data.totalPages}
              </span>

              <button
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition 
                ${
                  page >= data.totalPages - 1
                    ? "bg-[#444] text-gray-600 cursor-not-allowed"
                    : "bg-indigo-500 text-white hover:bg-indigo-400"
                }`}
              >
                다음
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-400 text-base mb-5">
            아직 작성한 리뷰가 없습니다.
          </p>

          <button
            onClick={() => navigate("/explore")}
            className="px-6 py-3 bg-gradient-to-br from-indigo-400 to-purple-600 text-white rounded-lg text-lg font-semibold transition hover:-translate-y-1 hover:shadow-xl"
          >
            작품 둘러보기
          </button>
        </div>
      )}
    </div>
  );
}
