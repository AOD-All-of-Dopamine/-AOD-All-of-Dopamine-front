import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/common/Header";
import { useEffect, useState } from "react";
import PurpleStar from "../assets/purple-star.svg";
import GreyStar from "../assets/grey-star.svg";
import BottomButton from "../components/common/BottomButton";
import { useCreateReview } from "../hooks/useInteractions";
import { useAuth } from "../contexts/AuthContext";

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
      }
    );
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  if (!contentId) return <div>잘못된 접근입니다.</div>;

  return (
    <div className="relative bg-[#242424] min-h-full">
      <Header
        title="리뷰 작성하기"
        leftIcon="back"
        onLeftClick={() => navigate(-1)}
        bgColor="#242424"
      />

      <div className="w-full max-w-2xl mx-auto px-5 pt-16 pb-32">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-[PretendardVariable] text-white">
            별점
          </span>
        </div>
        <div className="flex items-center justify-center gap-8 mb-3">
          {[1, 2, 3, 4, 5].map((rating) => {
            const isActive = (hoveredRating || selectedRating) >= rating;

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
        <div className="flex justify-between items-center mt-6 mb-2">
          <span className="text-sm font-[PretendardVariable] text-white">
            리뷰 한줄평
          </span>

          <span className="text-xs text-[#B2B1B3]">
            {reviewForm.content.length}/300
          </span>
        </div>
        <textarea
          value={reviewForm.content}
          onChange={(e) =>
            setReviewForm({
              ...reviewForm,
              content: e.target.value,
            })
          }
          placeholder="작품에 대한 한줄평을 작성해주세요."
          className="
    w-full
    min-h-[100px]
    p-3
    rounded-lg
    bg-[#302F31]
    text-sm text-white
    placeholder:text-[#B2B1B3]
    resize-none
    focus:outline-none
    focus:border-[#855BFF]
  "
        />
      </div>
      <div className="fixed bottom-0 left-0 w-full">
        <div className="max-w-2xl mx-auto">
          <BottomButton
            buttons={[
              {
                text: "저장",
                onClick: handleSubmitReview,
                variant: "purple",
                disabled: isSaveDisabled,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
