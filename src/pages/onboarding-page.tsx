import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import BottomButton from "../components/common/BottomButton";
import GenreChip from "../components/ui/GenreChip";

/**
 * /onboarding - 목업 없음 + 스펙상 플로우 재설계 스코프 제외. 기존 구조
 * (안내 문구 + 장르 칩 그리드 + 하단 다음 버튼) 유지, 토큰만 입힘.
 * - 구 Header 제거 -> 상단 뒤로가기(work-detail 관례).
 * - 장르 선택 칩은 2차 칩 위계(GenreChip, 활성=액센트 틴트) 재사용.
 * - body overflow 잠금 이펙트 제거 - 셸 스크롤에 맡긴다.
 */

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

  return (
    <div className="mx-auto max-w-[720px] px-6 pb-32 pt-6">
      <button
        type="button"
        onClick={() => navigate("/home")}
        className="-ml-2.5 inline-flex items-center gap-1.5 rounded-input px-2.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <ArrowLeft size={16} />
        뒤로 가기
      </button>

      <h1 className="mt-6 text-[22px] font-extrabold leading-snug tracking-[-0.02em] text-ink">
        좋아하는 장르를 골라주세요
        <br />
        취향에 맞는 콘텐츠를 추천해드려요
      </h1>

      <p className="mt-2 text-[14.5px] text-ink-2">최대 5개 선택 가능해요</p>

      {/* 장르 태그 */}
      <div className="mt-6 flex flex-wrap gap-2">
        {GENRES.map((genre) => (
          <GenreChip
            key={genre}
            active={selectedGenres.includes(genre)}
            onClick={() => toggleGenre(genre)}
          >
            {genre}
          </GenreChip>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 w-full">
        <div className="mx-auto max-w-[720px]">
          <BottomButton
            buttons={[
              {
                text: "다음",
                onClick: () => {
                  console.log("선택한 장르:", selectedGenres);
                  // API 저장
                  navigate("/home");
                },
                variant: "primary",
                disabled: !isValid,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
