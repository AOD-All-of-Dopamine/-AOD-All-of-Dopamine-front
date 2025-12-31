import { useState, useEffect, useRef } from "react";
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
import {
  getFieldLabel,
  getPlatformLabel,
  formatFieldValue,
} from "../utils/field-labels";
import Back from "../assets/left-arrow.svg";
import SearchIcon from "../assets/search-icon.svg";
import PurpleStar from "../assets/purple-star.svg";
import GreyStar from "../assets/grey-star.svg";
import WhiteLikeIcon from "../assets/work-detail-icon/white-like-icon.png";
import WhiteDislikeIcon from "../assets/work-detail-icon/white-dislike-icon.png";
import GreyLikeIcon from "../assets/work-detail-icon/grey-like-icon.png";
import ShareIcon from "../assets/work-detail-icon/share-icon.svg";
import SaveIcon from "../assets/work-detail-icon/save-icon.svg";
import BookmarkIcon from "../assets/work-detail-icon/bookmark-icon.svg";
import whiteCat from "../assets/white-cat.png";
import { PLATFORM_META } from "../constants/platforms";

type TabType = "info" | "reviews";

const FlyingIcon = ({
  icon,
  start,
  target,
}: {
  icon: string;
  start: { x: number; y: number };
  target: { x: number; y: number };
}) => {
  const [style, setStyle] = useState({
    left: `${start.x}px`,
    top: `${start.y}px`,
    opacity: 1,
    transform: "scale(1)",
  });

  useEffect(() => {
    // Force reflow/next frame
    requestAnimationFrame(() => {
      setStyle({
        left: `${target.x}px`,
        top: `${target.y}px`,
        opacity: 0,
        transform: "scale(0.5)",
      });
    });
  }, [target.x, target.y]);

  return (
    <img
      src={icon}
      className="fixed w-6 h-6 z-[100] transition-all duration-500 ease-in-out pointer-events-none"
      style={style}
      alt=""
    />
  );
};

export default function WorkDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const contentId = id ? Number(id) : 0;
  const isAuthenticated = useAuth(); // true;

  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    content: "",
  });

  const [isBookmarkAnimating, setIsBookmarkAnimating] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [flyingIcon, setFlyingIcon] = useState<{
    icon: string;
    start: { x: number; y: number };
    target: { x: number; y: number };
  } | null>(null);
  const ratingButtonRef = useRef<HTMLDivElement>(null);

  const { data: work, isLoading: workLoading } = useWorkDetail(contentId);
  const { data: reviewsData } = useReviews(contentId);
  const { data: likeStats } = useLikeStats(contentId);
  const { data: bookmarkStatus } = useBookmarkStatus(contentId);

  const createReviewMutation = useCreateReview(contentId);
  const deleteReviewMutation = useDeleteReview(contentId);
  const toggleLikeMutation = useToggleLike(contentId);
  const toggleDislikeMutation = useToggleDislike(contentId);
  const toggleBookmarkMutation = useToggleBookmark(contentId);

  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [contentId]);

  const handleBookmark = () => {
    if (!isAuthenticated) return alert("로그인이 필요합니다.");
    setIsBookmarkAnimating(true);
    toggleBookmarkMutation.mutate();
    setTimeout(() => setIsBookmarkAnimating(false), 500);
  };

  const handleRatingAction = (
    type: "like" | "dislike",
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (!isAuthenticated) {
      alert("로그인이 필요합니다.");
      setIsRatingOpen(false);
      return;
    }

    const startRect = e.currentTarget.getBoundingClientRect();
    const targetRect = ratingButtonRef.current?.getBoundingClientRect();

    if (targetRect) {
      setFlyingIcon({
        icon: type === "like" ? WhiteLikeIcon : WhiteDislikeIcon,
        start: {
          x: startRect.left + startRect.width / 2 - 12,
          y: startRect.top,
        },
        target: {
          x: targetRect.left + targetRect.width / 2 - 12,
          y: targetRect.top + targetRect.height / 2 - 12,
        },
      });
      setTimeout(() => setFlyingIcon(null), 500);
    }

    if (type === "like") {
      if (likeStats?.isDisliked) toggleDislikeMutation.mutate();
      toggleLikeMutation.mutate();
    } else {
      if (likeStats?.isLiked) toggleLikeMutation.mutate();
      toggleDislikeMutation.mutate();
    }

    setIsRatingOpen(false);
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

  const platformItems = Object.entries(work.platformInfo ?? {})
    .flatMap(([platformKey, info]) => {
      const items: string[] = [];

      // 플랫폼 key도 포함
      items.push(platformKey);

      if (Array.isArray(info.watch_providers)) {
        items.push(...info.watch_providers);
      }

      return items;
    })
    .filter((v, i, arr) => arr.indexOf(v) === i)

    .filter((key) => PLATFORM_META[key])
    .map((key) => ({
      key,
      ...PLATFORM_META[key],
    }));

  return (
    <div className="relative min-h-screen pb-20">
      {flyingIcon && (
        <FlyingIcon
          icon={flyingIcon.icon}
          start={flyingIcon.start}
          target={flyingIcon.target}
        />
      )}
      <div className="relative w-full h-80 overflow-hidden">
        <img
          src={work.thumbnail || "https://via.placeholder.com/1920x380"}
          alt=""
          className="w-full h-full object-cover blur-sm opacity-60 brightness-75 scale-110"
        />

        <div
          className="absolute bottom-0 left-0 w-full h-40
      bg-gradient-to-t
      from-[#242424]/100
      via-[#242424]/80
      via-[#242424]/40
      to-transparent"
        />
      </div>
      {/* 2. 메인 컨텐츠 영역: max-w-2xl로 제한 */}
      <div className="w-full max-w-2xl mx-auto relative -mt-81 z-10">
        {/* 헤더 */}
        <header className="h-[60px] flex items-center justify-between px-4 mb-4">
          <button onClick={() => navigate(-1)} className="w-5 h-5">
            <img src={Back} alt="뒤로가기" className="w-5 h-5" />
          </button>
          <button className="w-5 h-5">
            <img src={SearchIcon} className="w-5 h-5" />
          </button>
        </header>

        {/* 포스터 */}
        <div className="relative z-10 mx-4 mt-10">
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
          <div className="flex items-center gap-3">
            <h1 className="font-[PretendardVariable] text-[18px] font-semibold text-white">
              {work.title}
            </h1>
            {work.domain && (
              <span className="px-1 bg-[#E9E1FF] rounded text-[12px] text-[#855BFF]">
                {work.domain}
              </span>
            )}
          </div>

          <p className="font-[PretendardVariable] text-[14px] text-[#D3D3D3]">
            {work.domain || "영화"} ·{" "}
            {work.releaseDate
              ? new Date(work.releaseDate).getFullYear()
              : new Date().getFullYear()}
          </p>

          <div className="flex items-center gap-1">
            <img src={PurpleStar} alt="평점" className="w-3.5 h-3.5" />
            <span className="font-[PretendardVariable] text-[14px] text-[#855BFF]">
              {averageRating.toFixed(1)}
            </span>
          </div>

          {/* 통계 카드 */}
          <div className="bg-[#302F31] rounded-xl py-3 px-2 backdrop-blur-sm mt-6">
            <div className="flex items-center">
              <div className="flex-1 flex flex-col items-center border-r border-[#403F43]">
                <span className="text-[18px] font-semibold text-white">
                  {reviewCount}
                </span>
                <span className="font-[PretendardVariable] font-medium text-[14px] text-[#D3D3D3]">
                  리뷰
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center border-r border-[#403F43]">
                <span className="text-[18px] font-semibold text-white">
                  {likeStats?.likeCount || 0}
                </span>
                <span className="font-[PretendardVariable] font-medium text-[14px] text-[#D3D3D3]">
                  좋아요
                </span>
              </div>
              <div className="flex-1 flex flex-col items-center">
                <span className="text-[18px] font-semibold text-white">
                  {likeStats?.dislikeCount || 0}
                </span>
                <span className="font-[PretendardVariable] font-medium text-[14px] text-[#D3D3D3]">
                  싫어요
                </span>
              </div>
            </div>
          </div>

          {/* 액션 영역 */}
          <div className="flex items-center justify-center gap-10 mt-6 relative mx-auto max-w-[320px]">
            <button
              onClick={handleBookmark}
              className="flex flex-col items-center gap-1.5 min-w-16"
            >
              <div
                className={`w-6 h-6 flex items-center justify-center transition-transform duration-500 ${isBookmarkAnimating ? "rotate-[360deg]" : ""}`}
              >
                <img
                  src={bookmarkStatus?.isBookmarked ? BookmarkIcon : SaveIcon}
                  className="w-6 h-6"
                  alt="save"
                />
              </div>
              <span
                className={`font-[PretendardVariable] text-[14px] whitespace-nowrap ${bookmarkStatus?.isBookmarked ? "text-white" : "text-[#8D8C8E]"}`}
              >
                {bookmarkStatus?.isBookmarked ? "관심 작품" : "보고 싶어요"}
              </span>
            </button>

            <div
              ref={ratingButtonRef}
              className="relative min-w-16 flex justify-center"
            >
              {!isRatingOpen ? (
                <button
                  onClick={() => setIsRatingOpen(true)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    <img
                      src={
                        likeStats?.isLiked
                          ? WhiteLikeIcon
                          : likeStats?.isDisliked
                            ? WhiteDislikeIcon
                            : GreyLikeIcon
                      }
                      className="w-6 h-6"
                      alt="rate"
                    />
                  </div>

                  <span
                    className={`text-[14px] ${
                      likeStats?.isLiked || likeStats?.isDisliked
                        ? "text-white"
                        : "text-[#8D8C8E]"
                    }`}
                  >
                    {likeStats?.isLiked
                      ? "좋아요"
                      : likeStats?.isDisliked
                        ? "싫어요"
                        : "평가"}
                  </span>
                </button>
              ) : (
                <>
                  <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsRatingOpen(false)}
                  />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center z-50">
                    <div className="absolute bottom-12 w-[160px] h-[56px] bg-[#302F31] rounded-full flex items-center justify-around shadow-2xl animate-slide-up-fade border border-white/10">
                      <button
                        onClick={(e) => {
                          handleRatingAction("like", e);
                        }}
                        className="flex flex-col items-center px-4"
                      >
                        <img
                          src={WhiteLikeIcon}
                          className="w-5 h-5 mb-0.5"
                          alt="like"
                        />
                        <span className="font-[PretendardVariable] text-white text-[11px]">
                          좋아요
                        </span>
                      </button>
                      <div className="w-[1px] h-4 bg-white/20" />
                      <button
                        onClick={(e) => {
                          handleRatingAction("dislike", e);
                        }}
                        className="flex flex-col items-center px-4"
                      >
                        <img
                          src={WhiteDislikeIcon}
                          className="w-5 h-5 mb-0.5"
                          alt="dislike"
                        />
                        <span className="font-[PretendardVariable] text-white text-[11px]">
                          싫어요
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={() => setIsRatingOpen(false)}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <div className="w-7 h-7 flex items-center justify-center bg-[#302F31] rounded-full shadow-lg border border-white/10">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                        >
                          <path
                            d="M1 1L11 11M11 1L1 11"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button className="flex flex-col items-center gap-1.5 min-w-16">
              <div className="w-6 h-6 flex items-center justify-center">
                <img src={ShareIcon} className="w-6 h-6" alt="share" />
              </div>
              <span className="font-[PretendardVariable] text-[14px] text-[#8D8C8E]">
                공유
              </span>
            </button>
          </div>

          {/* 플랫폼 */}
          {platformItems.length > 0 && (
            <div className="mt-8">
              <h2 className="text-[16px] font-semibold text-white mb-2">
                플랫폼
              </h2>

              <div className="flex items-center gap-4">
                {platformItems.map(({ key, label, logo }) => (
                  <div
                    key={`${key}-${label}`}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className="
          w-12 h-12
          rounded-full
          bg-[var(--greygrey-900background-secondary)]
          flex items-center justify-center
          overflow-hidden
        "
                    >
                      {logo ? (
                        <img
                          src={logo}
                          alt={label}
                          className="w-12 h-12 object-contain rounded-full"
                        />
                      ) : (
                        <span className="text-[11px] text-white font-medium">
                          {label.slice(0, 2)}
                        </span>
                      )}
                    </div>

                    <span className="text-[12px] text-white">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 탭 */}
        <div className="relative z-10 mt-6 flex border-b border-[#403F43]">
          <button
            className={`flex-1 py-3 text-center text-[16px] border-b-2 ${
              activeTab === "info"
                ? "font-semibold text-white border-white"
                : "text-[var(--greygrey-300text-secondary)] border-transparent"
            }`}
            onClick={() => setActiveTab("info")}
          >
            작품 정보
          </button>

          <button
            className={`flex-1 py-3 text-center text-[16px] border-b-2 ${
              activeTab === "reviews"
                ? "font-semibold text-white border-white"
                : "text-[var(--greygrey-300text-secondary)] border-transparent"
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
                  <h2 className="font-[PretendardVariable] text-[16px] text-[#B2B1B3] mb-2">
                    작품 설명
                  </h2>
                  <p
                    className={`font-[PretendardVariable] text-[14px] text-[var(--greygrey-200text-primary)] leading-relaxed ${
                      !isSynopsisExpanded ? "line-clamp-4" : ""
                    }`}
                  >
                    {work.synopsis}
                  </p>

                  <button
                    onClick={() => setIsSynopsisExpanded((prev) => !prev)}
                    className="mt-2 text-[13px] text-[#855BFF] font-medium"
                  >
                    {isSynopsisExpanded ? "접기" : "더보기"}
                  </button>
                </div>
              )}

              {/* 구분선 */}
              {work.synopsis &&
                work.domainInfo &&
                Object.keys(work.domainInfo).length > 0 && (
                  <div className="border-t border-[#403F43] mb-6"></div>
                )}

              {work.domainInfo && Object.keys(work.domainInfo).length > 0 && (
                <div className="mb-6">
                  <div className="flex flex-col gap-2">
                    {Object.entries(work.domainInfo).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex p-1 bg-[var(--greygrey-900background-secondary)] rounded-lg"
                      >
                        <span className="font-[PretendardVariable] text-[14px] text-[#B2B1B3] min-w-[80px]">
                          {getFieldLabel(key, "domain")}
                        </span>
                        <span className="font-[PretendardVariable] text-[14px] text-white flex-1">
                          {formatFieldValue(key, value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 구분선 */}
              {work.domainInfo &&
                Object.keys(work.domainInfo).length > 0 &&
                work.platformInfo &&
                Object.keys(work.platformInfo).length > 0 && (
                  <div className="border-t border-[#403F43] mb-6"></div>
                )}

              {work.platformInfo &&
                Object.keys(work.platformInfo).length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-[16px] text-[#B2B1B3] mb-3">
                      플랫폼 정보
                    </h2>
                    {Object.entries(work.platformInfo).map(
                      ([platform, info]) => (
                        <div key={platform} className="mb-4">
                          <h3 className="text-[14px] font-semibold text-white mb-2">
                            {getPlatformLabel(platform)}
                          </h3>
                          <div className="flex flex-col gap-2">
                            {Object.entries(info).map(([key, value]) => {
                              const htmlFields = [
                                "detailed_description",
                                "about_the_game",
                                "short_description",
                              ];
                              const isHtmlField =
                                htmlFields.includes(key) &&
                                typeof value === "string";

                              const formattedValue = formatFieldValue(
                                key,
                                value
                              );
                              const isMultiline =
                                formattedValue.includes("\n") ||
                                formattedValue.length > 100;

                              return (
                                <div
                                  key={key}
                                  className="p-3 bg-[var(--greygrey-900background-secondary)] rounded-lg"
                                >
                                  <span className="text-[12px] text-[var(--greygrey-300text-secondary)] block mb-1">
                                    {getFieldLabel(key, "platform")}
                                  </span>
                                  <div className="text-[14px] text-white">
                                    {isHtmlField ? (
                                      <div
                                        className="prose prose-invert prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{
                                          __html: DOMPurify.sanitize(
                                            value as string
                                          ),
                                        }}
                                      />
                                    ) : typeof value === "string" &&
                                      value.startsWith("http") ? (
                                      <a
                                        href={value}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#855BFF] underline break-all"
                                      >
                                        {value}
                                      </a>
                                    ) : isMultiline ? (
                                      <pre className="whitespace-pre-wrap font-sans text-[14px]">
                                        {formattedValue}
                                      </pre>
                                    ) : (
                                      formattedValue
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
            </>
          ) : (
            <>
              {/* 내가 쓴 리뷰 섹션 */}
              {isAuthenticated && (
                <div className="mb-6">
                  <h2 className="font-[PretendardVariable] text-[16px] font-semibold text-white mb-2">
                    내가 쓴 리뷰
                  </h2>
                  <div className="p-4 border border-[#403F43] rounded-lg">
                    <p className="font-[PretendardVariable] text-[14px] text-white text-center mb-3">
                      이 작품은 어떠셨나요?
                    </p>

                    {/* 별점 선택 */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                      {[1, 2, 3, 4, 5].map((rating) => {
                        const isActive =
                          (hoveredRating || selectedRating) >= rating;

                        return (
                          <button
                            key={rating}
                            onClick={() => setSelectedRating(rating)}
                            onMouseEnter={() => setHoveredRating(rating)}
                            onMouseLeave={() => setHoveredRating(0)}
                            className="w-7 h-7 hover:scale-110"
                          >
                            <img
                              src={isActive ? PurpleStar : GreyStar}
                              alt="점수"
                              className="w-full h-full object-contain"
                            />
                          </button>
                        );
                      })}
                    </div>

                    {!showReviewForm ? (
                      <button
                        onClick={() => setShowReviewForm(true)}
                        className="w-full py-2 bg-[#855BFF] font-[PretendardVariable] text-white text-[14px] rounded mt-2"
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
                <div className="bg-[#302F31] rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isActive = star <= Math.round(averageRating);

                        return (
                          <img
                            key={star}
                            src={isActive ? PurpleStar : GreyStar}
                            alt="평점"
                            className="w-6 h-6 object-contain"
                          />
                        );
                      })}
                    </div>
                    <span className="font-[PretendardVariable] text-[24px] font-semibold text-white">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>

                  <p className="font-[PretendardVariable] text-[14px] text-white mt-1">
                    총 {reviewCount}개 평점
                  </p>
                </div>

                {/* 리뷰 목록 */}
                <div className="flex flex-col gap-3">
                  {reviewsData && reviewsData.content.length > 0 ? (
                    reviewsData.content.map((review) => (
                      <div key={review.reviewId} className="p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-9 h-9 bg-[#363539] rounded-full flex items-center justify-center">
                            <img
                              src={whiteCat}
                              alt="profile"
                              className="w-6 h-6 object-cover"
                            />
                          </div>
                          <div>
                            <span className="font-[PretendardVariable] text-[14px] font-semibold text-white block">
                              {review.username}
                            </span>
                            <span className="font-[PretendardVariable] text-[12px] text-[var(--greygrey-200text-primary)]">
                              {new Date(review.createdAt).toLocaleDateString(
                                "ko-KR",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-0.5 mb-2">
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

                        <p className="font-[PretendardVariable] text-[14px] text-white mb-2">
                          {review.content}
                        </p>

                        <div className="flex items-center gap-2">
                          <button className="flex items-center gap-1.5 px-2.5 py-2 bg-[var(--greygrey-800background-hover)] rounded-md">
                            <img
                              src={WhiteLikeIcon}
                              className="w-4 h-4 mb-0.5"
                              alt="like"
                            />
                            <span className="text-[12px] text-white">0</span>
                          </button>
                          <button className="flex items-center gap-1.5 px-2.5 py-2 bg-[var(--greygrey-800background-hover)] rounded-md">
                            <img
                              src={WhiteDislikeIcon}
                              className="w-4 h-4 mb-0.5"
                              alt="dislike"
                            />
                            <span className="text-[12px] text-white">0</span>
                          </button>
                          {review.isMyReview && (
                            <button
                              onClick={() =>
                                handleDeleteReview(review.reviewId)
                              }
                              className="ml-auto font-[PretendardVariable] text-[12px] text-[#FF5455]"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 font-[PretendardVariable] text-center text-[14px] text-[var(--greygrey-300text-secondary)]">
                      아직 리뷰가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>{" "}
    </div>
  );
}
