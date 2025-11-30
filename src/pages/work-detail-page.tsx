import { useState } from "react";
import { useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { useAuth } from "../contexts/AuthContext";
import { useWorkDetail } from "../hooks/useWorks";
import {
  useReviews,
  useCreateReview,
  useDeleteReview,
  useLikeStats,
  useToggleLike,
  useToggleDislike,
  useBookmarkStatus,
  useToggleBookmark,
} from "../hooks/useInteractions";

type TabType = "info" | "reviews";

function WorkDetailPage() {
  const { id } = useParams();
  const contentId = id ? Number(id) : 0;
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    content: "",
  });

  const { data: work, isLoading: workLoading } = useWorkDetail(contentId);
  const { data: reviewsData } = useReviews(contentId);
  const createReviewMutation = useCreateReview(contentId);
  const deleteReviewMutation = useDeleteReview(contentId);
  const { data: likeStats } = useLikeStats(contentId);
  const toggleLikeMutation = useToggleLike(contentId);
  const toggleDislikeMutation = useToggleDislike(contentId);
  const { data: bookmarkStatus } = useBookmarkStatus(contentId);
  const toggleBookmarkMutation = useToggleBookmark(contentId);

  const handleLike = () => {
    if (!isAuthenticated) return alert("로그인이 필요합니다.");
    toggleLikeMutation.mutate();
  };

  const handleDislike = () => {
    if (!isAuthenticated) return alert("로그인이 필요합니다.");
    toggleDislikeMutation.mutate();
  };

  const handleBookmark = () => {
    if (!isAuthenticated) return alert("로그인이 필요합니다.");
    toggleBookmarkMutation.mutate();
  };

  const handleSubmitReview = () => {
    if (!isAuthenticated) return alert("로그인이 필요합니다.");
    if (!reviewForm.content.trim()) return alert("리뷰 내용을 입력해주세요.");

    createReviewMutation.mutate(reviewForm, {
      onSuccess: () => {
        setReviewForm({ rating: 5, title: "", content: "" });
        setShowReviewForm(false);
        alert("리뷰가 작성되었습니다.");
      },
      onError: (error: any) => {
        alert(error.response?.data?.error || "리뷰 작성에 실패했습니다.");
      },
    });
  };

  const handleDeleteReview = (reviewId: number) => {
    if (confirm("리뷰를 삭제하시겠습니까?")) {
      deleteReviewMutation.mutate(reviewId, {
        onSuccess: () => alert("리뷰가 삭제되었습니다."),
      });
    }
  };

  if (workLoading)
    return <div className="p-5 text-center text-gray-400">로딩 중...</div>;
  if (!work)
    return (
      <div className="p-5 text-center text-gray-400">
        작품을 찾을 수 없습니다.
      </div>
    );

  return (
    <div className="pb-5">
      {/* Header */}
      <div className="flex gap-5 p-5 bg-gray-900">
        <img
          src={work.thumbnail || "https://via.placeholder.com/160x220"}
          alt={work.title}
          className="w-[160px] h-[220px] rounded-md object-cover bg-gray-700 flex-shrink-0"
        />
        <div className="flex-1 flex flex-col gap-3">
          <h1 className="text-2xl font-bold text-white">{work.title}</h1>
          {work.originalTitle && (
            <div className="text-sm text-gray-400 mb-2">
              {work.originalTitle}
            </div>
          )}
          <div className="text-xl font-semibold text-yellow-400">
            ⭐ {work.score.toFixed(1)}
          </div>
          <div className="flex gap-3 mt-auto">
            <button
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border transition ${
                likeStats?.isLiked
                  ? "bg-green-500 text-black border-green-500"
                  : "bg-green-100/20 text-green-400 border-green-400"
              }`}
              onClick={handleLike}
            >
              👍 좋아요 {likeStats?.likeCount || 0}
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border transition ${
                likeStats?.isDisliked
                  ? "bg-red-500 text-black border-red-500"
                  : "bg-red-100/20 text-red-400 border-red-400"
              }`}
              onClick={handleDislike}
            >
              👎 별로예요 {likeStats?.dislikeCount || 0}
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-semibold border transition ${
                bookmarkStatus?.isBookmarked
                  ? "bg-yellow-400 text-black border-yellow-400"
                  : "bg-yellow-100/20 text-yellow-400 border-yellow-400"
              }`}
              onClick={handleBookmark}
            >
              🔖 {bookmarkStatus?.isBookmarked ? "북마크됨" : "북마크"}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 sticky top-0 bg-gray-950 z-50">
        <button
          className={`flex-1 text-center py-4 text-sm font-semibold transition ${
            activeTab === "info"
              ? "text-indigo-500 border-b-2 border-indigo-500"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("info")}
        >
          작품정보
        </button>
        <button
          className={`flex-1 text-center py-4 text-sm font-semibold transition ${
            activeTab === "reviews"
              ? "text-indigo-500 border-b-2 border-indigo-500"
              : "text-gray-400"
          }`}
          onClick={() => setActiveTab("reviews")}
        >
          리뷰
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {activeTab === "info" ? (
          <>
            {work.synopsis && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-2">
                  시놉시스
                </h2>
                <p className="text-gray-300 leading-relaxed text-sm">
                  {work.synopsis}
                </p>
              </div>
            )}

            {work.domainInfo && Object.keys(work.domainInfo).length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-3">
                  작품 정보
                </h2>
                <div className="grid gap-3">
                  {Object.entries(work.domainInfo).map(([key, value]) => (
                    <div key={key} className="flex p-3 bg-gray-800 rounded-md">
                      <span className="font-semibold text-gray-400 min-w-[100px]">
                        {key}
                      </span>
                      <span className="text-white flex-1">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {work.platformInfo && Object.keys(work.platformInfo).length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-3">
                  플랫폼 정보
                </h2>
                {Object.entries(work.platformInfo).map(([platform, info]) => (
                  <div key={platform} className="mb-6">
                    <h3 className="text-md font-semibold text-white mb-3">
                      {platform}
                    </h3>
                    <div className="grid gap-3">
                      {Object.entries(info).map(([key, value]) => {
                        const htmlFields = [
                          "detailed_description",
                          "about_the_game",
                          "short_description",
                        ];
                        const isHtmlField =
                          htmlFields.includes(key) && typeof value === "string";
                        return (
                          <div
                            key={key}
                            className="flex p-3 bg-gray-800 rounded-md"
                          >
                            <span className="font-semibold text-gray-400 min-w-[100px]">
                              {key}
                            </span>
                            <span className="text-white flex-1">
                              {isHtmlField ? (
                                <div
                                  className="prose prose-invert text-sm"
                                  dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(value as string),
                                  }}
                                />
                              ) : typeof value === "string" &&
                                value.startsWith("http") ? (
                                <a
                                  href={value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-500 underline"
                                >
                                  {value}
                                </a>
                              ) : typeof value === "object" ? (
                                JSON.stringify(value)
                              ) : (
                                String(value)
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Review Form */}
            {isAuthenticated && (
              <div className="pb-5 border-b border-gray-800">
                {!showReviewForm ? (
                  <button
                    className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-md hover:translate-y-[-2px] transition"
                    onClick={() => setShowReviewForm(true)}
                  >
                    리뷰 작성하기
                  </button>
                ) : (
                  <div className="bg-gray-800 p-5 rounded-md">
                    <h3 className="text-white text-lg mb-5">리뷰 작성</h3>
                    <div className="mb-4">
                      <label className="block text-gray-300 font-semibold mb-2">
                        평점
                      </label>
                      <select
                        value={reviewForm.rating}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            rating: Number(e.target.value),
                          })
                        }
                        className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                      >
                        {[5, 4, 3, 2, 1].map((v) => (
                          <option key={v} value={v}>
                            {"⭐".repeat(v)} ({v}점)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-300 font-semibold mb-2">
                        제목 (선택)
                      </label>
                      <input
                        type="text"
                        placeholder="리뷰 제목을 입력하세요"
                        value={reviewForm.title}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            title: e.target.value,
                          })
                        }
                        className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-white"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-gray-300 font-semibold mb-2">
                        내용
                      </label>
                      <textarea
                        rows={5}
                        placeholder="리뷰 내용을 작성해주세요"
                        value={reviewForm.content}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            content: e.target.value,
                          })
                        }
                        className="w-full p-2 bg-gray-900 border border-gray-700 rounded-md text-white resize-y"
                      />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleSubmitReview}
                        className="flex-1 py-2 bg-indigo-500 rounded-md text-white font-semibold hover:bg-indigo-600 transition"
                      >
                        작성하기
                      </button>
                      <button
                        onClick={() => {
                          setShowReviewForm(false);
                          setReviewForm({ rating: 5, title: "", content: "" });
                        }}
                        className="flex-1 py-2 border border-gray-700 rounded-md text-gray-400 font-semibold hover:text-gray-200 hover:border-gray-500 transition"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Review List */}
            <div className="flex flex-col gap-4">
              {reviewsData && reviewsData.content.length > 0 ? (
                reviewsData.content.map((review) => (
                  <div
                    key={review.reviewId}
                    className="p-4 bg-gray-800 rounded-md"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-white">
                        {review.username}
                      </span>
                      <span className="text-yellow-400 font-semibold">
                        ⭐ {review.rating.toFixed(1)}
                      </span>
                    </div>
                    {review.title && (
                      <h4 className="text-white font-semibold mb-1">
                        {review.title}
                      </h4>
                    )}
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {review.content}
                    </p>
                    <div className="flex justify-between items-center mt-3 text-gray-500 text-xs">
                      <span>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                      {review.isMyReview && (
                        <button
                          className="px-2 py-1 text-red-500 border border-red-500 rounded text-xs font-semibold hover:bg-red-500 hover:text-white transition"
                          onClick={() => handleDeleteReview(review.reviewId)}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 py-10 text-sm">
                  아직 리뷰가 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkDetailPage;
