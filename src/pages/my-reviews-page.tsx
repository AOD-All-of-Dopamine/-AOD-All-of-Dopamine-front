import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyReviews, useDeleteReview } from "../hooks/useInteractions";
import Header from "../components/common/Header";
import PurpleStar from "../assets/purple-star.svg";
import GreyStar from "../assets/grey-star.svg";
import MoreIcon from "../assets/more-icon.svg";

export default function MyReviewsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { data, isLoading } = useMyReviews(page, 20);
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
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (isLoading) {
    return <div className="p-5 max-w-3xl mx-auto text-white">로딩 중...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="내가 리뷰한 작품"
        leftIcon="back"
        onLeftClick={() => navigate(-1)}
        bgColor="#242424"
      />

      <div className="w-full max-w-2xl mx-auto px-5 mt-15">
        {/* 리뷰 리스트 */}
        {data && data.content.length > 0 ? (
          <>
            <div className="flex flex-col gap-4">
              {sortedReviews.map((review) => (
                <div
                  key={review.reviewId}
                  className="p-4 bg-[#302F31] rounded-lg transition hover:bg-[#333]"
                >
                  <div className="flex gap-4">
                    <div
                      className="w-15 h-21 bg-[#444] rounded-md flex items-center justify-center cursor-pointer flex-shrink-0"
                      onClick={() => navigate(`/work/${review.contentId}`)}
                    >
                      <span className="text-2xl">🎬</span>
                    </div>

                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-start">
                        <h3
                          className="mt-1 font-[PretendardVariable] font-medium text-base text-white cursor-pointer hover:underline"
                          onClick={() => navigate(`/work/${review.contentId}`)}
                        >
                          {review.contentTitle}
                        </h3>

                        {/* <button
                          onClick={() => handleDelete(review.reviewId)}
                          className="ml-2 px-2 py-1 bg-red-600/20 text-red-500 border border-red-600 rounded text-xs font-semibold hover:bg-red-600 hover:text-white transition"
                        >
                          삭제
                        </button> */}
                        <div className="relative">
                          <img
                            src={MoreIcon}
                            alt="더보기"
                            className="w-3 h-3 mt-2 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenOptionId(
                                openOptionId === review.reviewId
                                  ? null
                                  : review.reviewId
                              );
                            }}
                          />

                          {openOptionId === review.reviewId && (
                            <div className="absolute right-4 top-1 w-24 bg-[#242325] rounded-md border border-[#403F43] shadow-lg z-20 overflow-hidden">
                              <button
                                onClick={() => {
                                  setOpenOptionId(null);
                                  // 수정하기 기능 추가 필요
                                }}
                                className="w-full px-2 py-2 font-[PretendardVariable] text-sm text-white text-left hover:bg-[#4A4A4C]"
                              >
                                수정하기
                              </button>

                              <div className="h-px bg-[#403F43]" />

                              <button
                                onClick={() => {
                                  setOpenOptionId(null);
                                  handleDelete(review.reviewId);
                                }}
                                className="w-full px-2 py-2 font-[PretendardVariable] text-sm text-red-400 text-left hover:bg-[#4A4A4C]"
                              >
                                삭제하기
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isActive = star <= Math.round(review.rating);

                          return (
                            <img
                              key={star}
                              src={isActive ? PurpleStar : GreyStar}
                              alt="리뷰 평점"
                              className="w-4 h-4 object-contain"
                            />
                          );
                        })}
                      </div>

                      {/* 날짜 */}
                      <div className="text-[#D3D3D3] text-[12px] mt-1">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {review.title && (
                    <h4 className="mt-3 font-[PretendardVariable] text-white font-semibold text-sm">
                      {review.title}
                    </h4>
                  )}

                  {/* 리뷰 내용 */}
                  <p className="mt-2 mt-3 font-[PretendardVariable] text-white text-sm leading-6">
                    {review.content}
                  </p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 pt-6">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className={`px-4 py-2 rounded-md text-sm font-[PretendardVariable] font-semibold transition 
                ${
                  page === 0
                    ? "bg-[#444] text-white cursor-not-allowed"
                    : "bg-[#855BFF] text-white hover:bg-indigo-400"
                }`}
                >
                  이전
                </button>

                <span className="text-white text-sm font-[PretendardVariable] font-semibold">
                  {page + 1} / {data.totalPages}
                </span>

                <button
                  disabled={page >= data.totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className={`px-4 py-2 rounded-md text-sm font-[PretendardVariable] font-semibold transition 
                ${
                  page >= data.totalPages - 1
                    ? "bg-[#444] text-white cursor-not-allowed"
                    : "bg-[#855BFF] text-white hover:bg-indigo-400"
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
              className="px-6 py-3 bg-gradient-to-br from-indigo-400 to-[#855BFF] text-white rounded-lg text-lg font-semibold transition hover:-translate-y-1 hover:shadow-xl"
            >
              작품 둘러보기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
