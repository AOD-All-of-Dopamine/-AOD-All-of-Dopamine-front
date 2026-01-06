import { useEffect, useState } from "react";
import Header from "../components/common/Header";
import { useNavigate } from "react-router-dom";
import BottomButton from "../components/common/BottomButton";

const GENRES = [
  "액션",
  "SF",
  "스릴러",
  "로맨스",
  "코미디",
  "드라마",
  "판타지",
  "모험",
  "가족",
  "공포",
  "미스터리",
  "범죄",
  "다큐",
  "역사",
  "전쟁",
  "애니메이션",
  "음악",
  "무협",
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      }
      if (prev.length >= 5) return prev;
      return [...prev, genre];
    });
  };

  const isValid = selectedGenres.length >= 1 && selectedGenres.length <= 5;

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div className="relative bg-[#242424] min-h-full">
      <Header
        leftIcon="back"
        onLeftClick={() => navigate("/home")}
        bgColor="#242424"
      />
      <div className="flex-1 px-6 pt-18 pb-24">
        <h1 className="font-[PretendardVariable] text-white text-[16px] font-semibold leading-snug mb-2">
          좋아하는 장르를 골라주세요
          <br />
          취향에 맞는 콘텐츠를 추천해드려요
        </h1>

        <p className="font-[PretendardVariable] text-[#B2B1B3] text-[14px] mb-6">
          최대 5개 선택 가능해요
        </p>

        {/* 장르 태그 */}
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => {
            const selected = selectedGenres.includes(genre);

            return (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`
                  px-4 py-2 rounded-full text-[14px] font-[PretendardVariable] font-medium transition
                  ${
                    selected
                      ? "bg-[#855BFF] text-white"
                      : "bg-[#2F2F32] text-[#D3D3D3]"
                  }
                `}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 w-full">
        <div className="max-w-2xl mx-auto">
          <BottomButton
            buttons={[
              {
                text: "다음",
                onClick: () => {
                  console.log("선택한 장르:", selectedGenres);
                  // API 저장
                  navigate("/home");
                },
                variant: "purple",
                disabled: !isValid,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
