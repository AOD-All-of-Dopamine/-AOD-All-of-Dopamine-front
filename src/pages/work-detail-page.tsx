import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

export default function WorkDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contentId = id ? Number(id) : 0;
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
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
    if (selectedRating === 0) return alert("별점을 선택해주세요.");

    createReviewMutation.mutate(
      { ...reviewForm, rating: selectedRating },
      {
        onSuccess: () => {
          setReviewForm({ rating: 5, title: "", content: "" });
          setSelectedRating(0);
          setShowReviewForm(false);
          alert("리뷰가 작성되었습니다.");
        },
        onError: (error: any) => {
          alert(error.response?.data?.error || "리뷰 작성에 실패했습니다.");
        },
      }
    );
  };

  const handleDeleteReview = (reviewId: number) => {
    if (confirm("리뷰를 삭제하시겠습니까?")) {
      deleteReviewMutation.mutate(reviewId, {
        onSuccess: () => alert("리뷰가 삭제되었습니다."),
      });
    }
  };

  if (workLoading)
    return (
      <div className="min-h-screen bg-[var(--blackbackground-primary)] flex items-center justify-center text-[var(--greygrey-300text-secondary)]">
        로딩 중...
      </div>
    );
  if (!work)
    return (
      <div className="min-h-screen bg-[var(--blackbackground-primary)] flex items-center justify-center text-[var(--greygrey-300text-secondary)]">
        작품을 찾을 수 없습니다.
      </div>
    );

  const reviewCount = reviewsData?.totalElements || 0;
  const averageRating = work.score || 0;

  return (
    <div className="min-h-screen bg-[var(--blackbackground-primary)] pb-20">
      {/* 배경 블러 이미지 */}
      <div className="absolute top-0 left-0 w-full h-[333px] overflow-hidden">
        <img
          src={work.thumbnail || "https://via.placeholder.com/375x333"}
          alt=""
          className="w-full h-full object-cover blur-sm opacity-30"
        />
        <div className="absolute bottom-0 left-0 w-full h-[108px] bg-gradient-to-t from-[var(--blackbackground-primary)] to-transparent" />
      </div>

      {/* 헤더 */}
      <header className="relative z-10 h-[60px] flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18L9 12L15 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button className="w-5 h-5">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="7" stroke="white" strokeWidth="2" />
            <path
              d="M14 14L18 18"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      {/* 포스터 */}
      <div className="relative z-10 mx-4 mt-4">
        <div className="w-[120px] h-[168px] bg-[var(--greygrey-900background-secondary)] rounded overflow-hidden">
          <img
            src={work.thumbnail || "https://via.placeholder.com/120x168"}
            alt={work.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 작품 정보 섹션 */}
      <div className="relative z-10 px-4 mt-4">
        {/* 제목 및 기본 정보 */}
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-[18px] font-semibold text-white">{work.title}</h1>
          {work.domain && (
            <span className="px-1 py-0.5 bg-[#E9E1FF] rounded text-[12px] text-[#855BFF]">
              {work.domain}
            </span>
          )}
        </div>

        <p className="text-[14px] text-[var(--greygrey-200text-primary)]">
          {work.domain || "영화"} ·{" "}
          {work.releaseDate
            ? new Date(work.releaseDate).getFullYear()
            : new Date().getFullYear()}
        </p>

        <div className="flex items-center gap-0.5 mt-1">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1L10.163 5.279L15 5.944L11.5 9.269L12.326 14L8 11.779L3.674 14L4.5 9.269L1 5.944L5.837 5.279L8 1Z"
              fill="#855BFF"
            />
          </svg>
          <span className="text-[14px] text-[#855BFF]">
            {averageRating.toFixed(1)}
          </span>
        </div>

        {/* 통계 카드 */}
        <div className="mt-4 bg-[var(--greygrey-900background-secondary)] rounded-lg py-3">
          <div className="flex items-center">
            <div className="flex-1 flex flex-col items-center border-r border-[var(--greygrey-700)]">
              <span className="text-[18px] font-semibold text-white">
                {reviewCount}
              </span>
              <span className="text-[14px] text-[var(--greygrey-200text-primary)]">
                리뷰
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center border-r border-[var(--greygrey-700)]">
              <span className="text-[18px] font-semibold text-white">
                {likeStats?.likeCount || 0}
              </span>
              <span className="text-[14px] text-[var(--greygrey-200text-primary)]">
                좋아요
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[18px] font-semibold text-white">
                {likeStats?.dislikeCount || 0}
              </span>
              <span className="text-[14px] text-[var(--greygrey-200text-primary)]">
                싫어요
              </span>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-center gap-8 mt-4">
          <button
            onClick={handleBookmark}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg
                width="14"
                height="19"
                viewBox="0 0 14 19"
                fill={bookmarkStatus?.isBookmarked ? "#855BFF" : "none"}
              >
                <path
                  d="M1 3C1 1.89543 1.89543 1 3 1H11C12.1046 1 13 1.89543 13 3V17L7 14L1 17V3Z"
                  stroke={bookmarkStatus?.isBookmarked ? "#855BFF" : "white"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-[14px] text-white">보고 싶어요</span>
          </button>

          <button
            onClick={handleLike}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg
                width="19"
                height="17"
                viewBox="0 0 19 17"
                fill={likeStats?.isLiked ? "#855BFF" : "none"}
              >
                <path
                  d="M1 7H4V16H1V7Z"
                  stroke={likeStats?.isLiked ? "#855BFF" : "white"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 7L7 1H8C9.10457 1 10 1.89543 10 3V5H15C16.1046 5 17 5.89543 17 7V8.5C17 9 16.5 10 16 10.5L13 15C12.5 15.5 12 16 11 16H4V7Z"
                  stroke={likeStats?.isLiked ? "#855BFF" : "white"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-[14px] text-white">좋아요</span>
          </button>

          <button
            onClick={handleDislike}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg
                width="19"
                height="17"
                viewBox="0 0 19 17"
                fill={likeStats?.isDisliked ? "#FF5455" : "none"}
                className="rotate-180"
              >
                <path
                  d="M1 7H4V16H1V7Z"
                  stroke={likeStats?.isDisliked ? "#FF5455" : "#9F9EA4"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 7L7 1H8C9.10457 1 10 1.89543 10 3V5H15C16.1046 5 17 5.89543 17 7V8.5C17 9 16.5 10 16 10.5L13 15C12.5 15.5 12 16 11 16H4V7Z"
                  stroke={likeStats?.isDisliked ? "#FF5455" : "#9F9EA4"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-[14px] text-[var(--greygrey-400icon)]">
              싫어요
            </span>
          </button>
        </div>

        {/* 플랫폼 */}
        {work.platformInfo && Object.keys(work.platformInfo).length > 0 && (
          <div className="mt-6">
            <h2 className="text-[16px] font-semibold text-white mb-2">
              플랫폼
            </h2>
            <div className="flex items-center gap-3">
              {Object.keys(work.platformInfo).map((platform) => (
                <div
                  key={platform}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="w-10 h-10 bg-[var(--greygrey-900background-secondary)] rounded-full overflow-hidden flex items-center justify-center">
                    <span className="text-[10px] text-white">
                      {platform.slice(0, 2)}
                    </span>
                  </div>
                  <span className="text-[12px] text-white">{platform}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="relative z-10 mt-6 flex border-b border-[var(--greygrey-700)]">
        <button
          className={`flex-1 py-3 text-center text-[16px] ${
            activeTab === "info"
              ? "font-semibold text-white border-b-2 border-white"
              : "text-[var(--greygrey-300text-secondary)]"
          }`}
          onClick={() => setActiveTab("info")}
        >
          작품 정보
        </button>
        <button
          className={`flex-1 py-3 text-center text-[16px] ${
            activeTab === "reviews"
              ? "font-semibold text-white border-b-2 border-white"
              : "text-[var(--greygrey-300text-secondary)]"
          }`}
          onClick={() => setActiveTab("reviews")}
        >
          리뷰
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="relative z-10 px-4 py-4">
        {activeTab === "info" ? (
          <>
            {work.synopsis && (
              <div className="mb-6">
                <h2 className="text-[16px] font-semibold text-white mb-2">
                  시놉시스
                </h2>
                <p className="text-[14px] text-[var(--greygrey-200text-primary)] leading-relaxed">
                  {work.synopsis}
                </p>
              </div>
            )}

            {work.domainInfo && Object.keys(work.domainInfo).length > 0 && (
              <div className="mb-6">
                <h2 className="text-[16px] font-semibold text-white mb-3">
                  작품 정보
                </h2>
                <div className="flex flex-col gap-2">
                  {Object.entries(work.domainInfo).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex p-3 bg-[var(--greygrey-900background-secondary)] rounded-lg"
                    >
                      <span className="text-[14px] text-[var(--greygrey-300text-secondary)] min-w-[80px]">
                        {key}
                      </span>
                      <span className="text-[14px] text-white flex-1">
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
              <div className="mb-6">
                <h2 className="text-[16px] font-semibold text-white mb-3">
                  플랫폼 정보
                </h2>
                {Object.entries(work.platformInfo).map(([platform, info]) => (
                  <div key={platform} className="mb-4">
                    <h3 className="text-[14px] font-semibold text-white mb-2">
                      {platform}
                    </h3>
                    <div className="flex flex-col gap-2">
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
                            className="p-3 bg-[var(--greygrey-900background-secondary)] rounded-lg"
                          >
                            <span className="text-[12px] text-[var(--greygrey-300text-secondary)] block mb-1">
                              {key}
                            </span>
                            <span className="text-[14px] text-white">
                              {isHtmlField ? (
                                <div
                                  className="prose prose-invert prose-sm"
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
                                  className="text-[#855BFF] underline"
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
          <>
            {/* 내가 쓴 리뷰 섹션 */}
            {isAuthenticated && (
              <div className="mb-6">
                <h2 className="text-[16px] font-semibold text-white mb-2">
                  내가 쓴 리뷰
                </h2>
                <div className="p-4 border border-[var(--greygrey-700)] rounded-lg">
                  <p className="text-[14px] text-white text-center mb-3">
                    이 작품은 어떠셨나요?
                  </p>

                  {/* 별점 선택 */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setSelectedRating(rating)}
                        onMouseEnter={() => setHoveredRating(rating)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="w-8 h-8 transition-transform hover:scale-110"
                      >
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 32 32"
                          fill="none"
                        >
                          <path
                            d="M16 4L19.708 11.472L28 12.632L22 18.472L23.416 26.728L16 22.848L8.584 26.728L10 18.472L4 12.632L12.292 11.472L16 4Z"
                            fill={
                              (hoveredRating || selectedRating) >= rating
                                ? "#FFD700"
                                : "#64636B"
                            }
                            stroke={
                              (hoveredRating || selectedRating) >= rating
                                ? "#FFD700"
                                : "#64636B"
                            }
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    ))}
                  </div>

                  {!showReviewForm ? (
                    <button
                      onClick={() => setShowReviewForm(true)}
                      className="w-full py-2 bg-[#855BFF] text-white text-[14px] rounded"
                    >
                      리뷰 작성하기
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <input
                        type="text"
                        placeholder="리뷰 제목 (선택)"
                        value={reviewForm.title}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            title: e.target.value,
                          })
                        }
                        className="w-full p-3 bg-[var(--greygrey-800background-hover)] border border-[var(--greygrey-700)] rounded text-white text-[14px] placeholder-[var(--greygrey-400icon)]"
                      />
                      <textarea
                        placeholder="리뷰 내용을 작성해주세요"
                        rows={4}
                        value={reviewForm.content}
                        onChange={(e) =>
                          setReviewForm({
                            ...reviewForm,
                            content: e.target.value,
                          })
                        }
                        className="w-full p-3 bg-[var(--greygrey-800background-hover)] border border-[var(--greygrey-700)] rounded text-white text-[14px] placeholder-[var(--greygrey-400icon)] resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSubmitReview}
                          className="flex-1 py-2 bg-[#855BFF] text-white text-[14px] rounded"
                        >
                          작성하기
                        </button>
                        <button
                          onClick={() => {
                            setShowReviewForm(false);
                            setReviewForm({
                              rating: 5,
                              title: "",
                              content: "",
                            });
                          }}
                          className="flex-1 py-2 border border-[var(--greygrey-700)] text-[var(--greygrey-300text-secondary)] text-[14px] rounded"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 모든 리뷰 */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <h2 className="text-[16px] font-semibold text-white">
                  모든 리뷰
                </h2>
                <span className="text-[16px] font-semibold text-white">
                  {reviewCount}
                </span>
              </div>

              {/* 평균 평점 카드 */}
              <div className="bg-[var(--greygrey-900background-secondary)] rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M12 2L14.708 8.472L22 9.632L16.5 14.472L17.916 21.728L12 18.848L6.084 21.728L7.5 14.472L2 9.632L9.292 8.472L12 2Z"
                          fill={
                            star <= Math.round(averageRating)
                              ? "#FFD700"
                              : "#64636B"
                          }
                        />
                      </svg>
                    ))}
                  </div>
                  <span className="text-[24px] font-semibold text-white">
                    {averageRating.toFixed(1)}
                  </span>
                </div>
                <p className="text-[14px] text-white mt-1">
                  총 {reviewCount}개 평점
                </p>
              </div>

              {/* 리뷰 목록 */}
              <div className="flex flex-col gap-3">
                {reviewsData && reviewsData.content.length > 0 ? (
                  reviewsData.content.map((review) => (
                    <div key={review.reviewId} className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 bg-[var(--greygrey-800background-hover)] rounded-full flex items-center justify-center">
                          <svg
                            width="16"
                            height="18"
                            viewBox="0 0 30 32"
                            fill="none"
                          >
                            <path
                              d="M15 16C19.4183 16 23 12.4183 23 8C23 3.58172 19.4183 0 15 0C10.5817 0 7 3.58172 7 8C7 12.4183 10.5817 16 15 16Z"
                              fill="white"
                            />
                            <path
                              d="M15 18C6.71573 18 0 24.7157 0 33H30C30 24.7157 23.2843 18 15 18Z"
                              fill="white"
                            />
                          </svg>
                        </div>
                        <div>
                          <span className="text-[14px] font-semibold text-white block">
                            {review.username}
                          </span>
                          <span className="text-[12px] text-[var(--greygrey-200text-primary)]">
                            {new Date(review.createdAt).toLocaleDateString(
                              "ko-KR",
                              { year: "numeric", month: "long", day: "numeric" }
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-0.5 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M8 1L10.163 5.279L15 5.944L11.5 9.269L12.326 14L8 11.779L3.674 14L4.5 9.269L1 5.944L5.837 5.279L8 1Z"
                              fill={
                                star <= Math.round(review.rating)
                                  ? "#FFD700"
                                  : "#64636B"
                              }
                            />
                          </svg>
                        ))}
                      </div>

                      <p className="text-[14px] text-white mb-2">
                        {review.content}
                      </p>

                      <div className="flex items-center gap-2">
                        <button className="flex items-center gap-1.5 px-2.5 py-2 bg-[var(--greygrey-800background-hover)] rounded-md">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M1 6H3V14H1V6Z"
                              stroke="white"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M3 6L5 1H6C6.55228 1 7 1.44772 7 2V4H11C11.5523 4 12 4.44772 12 5V6C12 6.5 11.5 7 11 7.5L9 11C8.5 11.5 8 12 7 12H3V6Z"
                              stroke="white"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span className="text-[12px] text-white">0</span>
                        </button>
                        <button className="flex items-center gap-1.5 px-2.5 py-2 bg-[var(--greygrey-800background-hover)] rounded-md">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            className="rotate-180"
                          >
                            <path
                              d="M1 6H3V14H1V6Z"
                              stroke="white"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M3 6L5 1H6C6.55228 1 7 1.44772 7 2V4H11C11.5523 4 12 4.44772 12 5V6C12 6.5 11.5 7 11 7.5L9 11C8.5 11.5 8 12 7 12H3V6Z"
                              stroke="white"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span className="text-[12px] text-white">0</span>
                        </button>
                        {review.isMyReview && (
                          <button
                            onClick={() => handleDeleteReview(review.reviewId)}
                            className="ml-auto text-[12px] text-[#FF5455]"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-10 text-center text-[14px] text-[var(--greygrey-300text-secondary)]">
                    아직 리뷰가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
