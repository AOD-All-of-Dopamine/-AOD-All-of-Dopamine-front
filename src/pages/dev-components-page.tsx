import { ReactNode, useState } from "react";
import { Star, ThumbsUp, BookmarkSimple } from "@phosphor-icons/react";
import WorkCard from "../components/ui/WorkCard";
import RailCard from "../components/ui/RailCard";
import RankRow from "../components/ui/RankRow";
import PodiumCard from "../components/ui/PodiumCard";
import ReviewCard from "../components/ui/ReviewCard";
import Chip from "../components/ui/Chip";
import DomainChip from "../components/ui/DomainChip";
import GenreChip from "../components/ui/GenreChip";
import FilterGroup from "../components/ui/FilterGroup";
import SortSelect from "../components/ui/SortSelect";
import SegmentedControl from "../components/ui/SegmentedControl";
import Pagination from "../components/ui/Pagination";
import Tag from "../components/ui/Tag";
import StatPill from "../components/ui/StatPill";
import DdayPill from "../components/ui/DdayPill";
import DeltaBadge from "../components/ui/DeltaBadge";
import EmptyState from "../components/ui/EmptyState";
import SkeletonCard from "../components/ui/SkeletonCard";

/**
 * /dev/components - Phase 2 공용 컴포넌트 시각 게이트용 갤러리.
 * 목업(mockups/*.html)과 동일한 샘플 데이터로 18종 컴포넌트를 전부 렌더한다.
 * Phase 7에서 제거 예정 (프로덕션 라우트 아님).
 */

const HWASAN = "https://picsum.photos/seed/aod-webtoon-hwasan/400/600";
const ORV = "https://picsum.photos/seed/aod-webtoon-orv/400/600";
const PARASITE = "https://picsum.photos/seed/aod-movie-parasite/400/600";
const SEOUL = "https://picsum.photos/seed/aod-movie-seoul/400/600";
const ELDEN_RING = "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg";
const BLACK_MYTH = "https://cdn.akamai.steamstatic.com/steam/apps/2358720/header.jpg";
const BALATRO = "https://cdn.akamai.steamstatic.com/steam/apps/2379780/header.jpg";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-14 first:mt-0">
      <h2 className="mb-4 text-lg font-bold tracking-tight text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DevComponentsPage() {
  const [sort, setSort] = useState("review");
  const [period, setPeriod] = useState("주간");
  const [periodSmall, setPeriodSmall] = useState("일간");
  const [page, setPage] = useState(4);
  const [chips, setChips] = useState(["액션", "RPG", "2024년 이후"]);
  const [genreValues, setGenreValues] = useState<string[]>(["액션", "RPG"]);
  const [era, setEra] = useState("2024");
  const [activeDomain, setActiveDomain] = useState("game");
  const [activeGenre, setActiveGenre] = useState("전체");

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        UI 컴포넌트 갤러리
      </h1>
      <p className="mt-1.5 text-sm text-ink-2">
        라이트 리디자인 공용 컴포넌트(src/components/ui) 18종을 mockups/*.html
        기준 실물 샘플로 렌더합니다.
      </p>

      {/* 1. WorkCard */}
      <Section title="WorkCard · portrait">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
          <WorkCard
            variant="portrait"
            title="화산귀환"
            meta="비가 / LICO"
            tags={["무협", "회귀", "판타지"]}
            imageUrl={HWASAN}
            to="/work/webtoon-hwasan"
            footer={
              <>
                <span>수요웹툰</span>
                <span className="ml-auto font-bold text-ink">전체</span>
              </>
            }
          />
          <WorkCard
            variant="portrait"
            title="전지적 독자 시점"
            meta="슬리피-C / UMI"
            tags={["판타지", "액션", "회귀"]}
            imageUrl={ORV}
            to="/work/webtoon-orv"
            footer={
              <>
                <span>수요웹툰</span>
                <span className="ml-auto font-bold text-ink">15세</span>
              </>
            }
          />
          <WorkCard
            variant="portrait"
            title="기생충"
            meta="2019 · 봉준호"
            tags={["드라마", "스릴러"]}
            imageUrl={PARASITE}
            to="/work/movie-parasite"
            footer={
              <>
                <span>넷플릭스 · 왓챠</span>
                <span className="ml-auto inline-flex items-center gap-1 font-bold text-ink">
                  <Star weight="fill" size={13} className="text-star" />
                  8.5
                </span>
              </>
            }
          />
          <WorkCard
            variant="portrait"
            title="서울의 봄"
            meta="2023 · 김성수"
            tags={["드라마", "역사"]}
            imageUrl={SEOUL}
            to="/work/movie-seoul"
            footer={
              <>
                <span>넷플릭스 · 티빙</span>
                <span className="ml-auto inline-flex items-center gap-1 font-bold text-ink">
                  <Star weight="fill" size={13} className="text-star" />
                  8.1
                </span>
              </>
            }
          />
        </div>
      </Section>

      <Section title="WorkCard · landscape">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
          <WorkCard
            variant="landscape"
            title="엘든 링"
            meta="2022 · FromSoftware"
            tags={["RPG", "소울라이크", "오픈월드"]}
            imageUrl={ELDEN_RING}
            to="/work/game-eldenring"
            footer={
              <>
                <span>매우 긍정적</span>
                <span className="ml-auto font-bold text-ink">92%</span>
              </>
            }
          />
          <WorkCard
            variant="landscape"
            title="검은 신화: 오공"
            meta="2024 · Game Science"
            tags={["액션", "RPG", "소울라이크"]}
            imageUrl={BLACK_MYTH}
            to="/work/game-blackmyth"
            footer={
              <>
                <span>압도적으로 긍정적</span>
                <span className="ml-auto font-bold text-ink">96%</span>
              </>
            }
          />
          <WorkCard
            variant="landscape"
            title="Balatro"
            meta="2024 · LocalThunk"
            tags={["로그라이크", "전략", "인디"]}
            imageUrl={BALATRO}
            to="/work/game-balatro"
            footer={
              <>
                <span>압도적으로 긍정적</span>
                <span className="ml-auto font-bold text-ink">98%</span>
              </>
            }
          />
        </div>
      </Section>

      {/* 2. RailCard */}
      <Section title="RailCard">
        <div className="flex gap-3.5 overflow-x-auto pb-1.5 scrollbar-hide">
          <RailCard
            title="검은 신화: 오공"
            meta="게임 · Steam"
            imageUrl={BLACK_MYTH}
            to="/work/game-blackmyth"
          />
          <RailCard
            title="Balatro"
            meta="게임 · Steam"
            imageUrl={BALATRO}
            to="/work/game-balatro"
          />
          <RailCard
            title="화산귀환"
            meta="웹툰 · 네이버웹툰"
            imageUrl={HWASAN}
            to="/work/webtoon-hwasan"
          />
          <RailCard
            title="서울의 봄"
            meta="영화 · 넷플릭스"
            imageUrl={SEOUL}
            to="/work/movie-seoul"
          />
        </div>
      </Section>

      {/* 3. RankRow */}
      <Section title="RankRow · panel">
        <div className="rounded-panel border border-line bg-surface px-3 shadow-card">
          <RankRow
            no={1}
            title="화산귀환"
            meta="웹툰 · 무협"
            imageUrl={HWASAN}
            to="/work/webtoon-hwasan"
            slot={<DeltaBadge delta="+2" />}
          />
          <RankRow
            no={2}
            title="검은 신화: 오공"
            meta="게임 · 액션 RPG"
            imageUrl={BLACK_MYTH}
            to="/work/game-blackmyth"
            slot={<DeltaBadge delta="+5" />}
          />
          <RankRow
            no={3}
            title="서울의 봄"
            meta="영화 · 드라마"
            imageUrl={SEOUL}
            to="/work/movie-seoul"
            slot={<DeltaBadge delta="0" />}
          />
          <RankRow
            no={4}
            title="전지적 독자 시점"
            meta="웹툰 · 판타지"
            imageUrl={ORV}
            slot={<DeltaBadge delta="-1" />}
          />
        </div>
      </Section>

      <Section title="RankRow · feature (accent 포함)">
        <div>
          <RankRow
            variant="feature"
            accent
            no={1}
            title="화산귀환"
            meta="웹툰 · 무협"
            imageUrl={HWASAN}
            to="/work/webtoon-hwasan"
            slot={<DeltaBadge delta="+2" />}
          />
          <RankRow
            variant="feature"
            accent
            no={2}
            title="검은 신화: 오공"
            meta="게임 · 액션 RPG"
            imageUrl={BLACK_MYTH}
            to="/work/game-blackmyth"
            slot={<DeltaBadge delta="+5" />}
          />
          <RankRow
            variant="feature"
            no={3}
            title="서울의 봄"
            meta="영화 · 드라마"
            imageUrl={SEOUL}
            to="/work/movie-seoul"
            slot={<DeltaBadge delta="0" />}
          />
          <RankRow
            variant="feature"
            no={4}
            title="전지적 독자 시점"
            meta="웹툰 · 판타지"
            imageUrl={ORV}
            slot={<DeltaBadge delta="-1" />}
          />
        </div>
      </Section>

      {/* 4. PodiumCard */}
      <Section title="PodiumCard">
        <div className="grid grid-cols-1 items-start gap-4.5 sm:grid-cols-3">
          <div className="sm:mt-[30px]">
            <PodiumCard
              rank={2}
              title="Balatro"
              meta="로그라이크 · LocalThunk"
              imageUrl={BALATRO}
              to="/work/game-balatro"
              slot={<DeltaBadge delta="new" />}
            />
          </div>
          <PodiumCard
            rank={1}
            title="화산귀환"
            meta="무협 · 비가"
            imageUrl={HWASAN}
            to="/work/webtoon-hwasan"
            slot={<DeltaBadge delta="0" />}
          />
          <div className="sm:mt-[30px]">
            <PodiumCard
              rank={3}
              title="서울의 봄"
              meta="드라마 · 김성수"
              imageUrl={SEOUL}
              to="/work/movie-seoul"
              slot={<DeltaBadge delta="-1" />}
            />
          </div>
        </div>
      </Section>

      {/* 5. ReviewCard */}
      <Section title="ReviewCard">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <ReviewCard name="매화검존1호팬" date="2026-08-06" score={5.0}>
            청명이 궁시렁대는 것만 봐도 일주일 피로가 풀린다.
          </ReviewCard>
          <ReviewCard name="패링수련생" date="2026-08-02" score={4.5}>
            패링 타이밍이 빡빡하지만 손에 익는 순간 예술이 된다.
          </ReviewCard>
        </div>
      </Section>

      {/* 6. Chip */}
      <Section title="Chip (제거 가능)">
        <div className="flex flex-wrap gap-2">
          {chips.length > 0 ? (
            chips.map((label) => (
              <Chip
                key={label}
                label={label}
                onRemove={() =>
                  setChips((prev) => prev.filter((c) => c !== label))
                }
              />
            ))
          ) : (
            <button
              type="button"
              onClick={() => setChips(["액션", "RPG", "2024년 이후"])}
              className="text-sm font-medium text-ink-2 underline"
            >
              칩 초기화
            </button>
          )}
        </div>
      </Section>

      {/* 7. DomainChip */}
      <Section title="DomainChip">
        <div className="flex flex-wrap gap-1.5">
          <DomainChip
            active={activeDomain === "movie"}
            onClick={() => setActiveDomain("movie")}
          >
            영화
          </DomainChip>
          <DomainChip
            active={activeDomain === "game"}
            onClick={() => setActiveDomain("game")}
          >
            게임
          </DomainChip>
          <DomainChip
            active={activeDomain === "webtoon"}
            onClick={() => setActiveDomain("webtoon")}
          >
            웹툰
          </DomainChip>
          <DomainChip disabled soonLabel="준비 중">
            웹소설
          </DomainChip>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <DomainChip size="lg" active>
            게임
          </DomainChip>
          <DomainChip size="lg">웹툰</DomainChip>
          <DomainChip size="lg" disabled>
            시리즈
          </DomainChip>
        </div>
      </Section>

      {/* 8. GenreChip */}
      <Section title="GenreChip">
        <div className="flex flex-wrap gap-1.5">
          {["전체", "액션", "RPG", "FPS", "어드벤처"].map((g) => (
            <GenreChip
              key={g}
              active={activeGenre === g}
              onClick={() => setActiveGenre(g)}
            >
              {g}
            </GenreChip>
          ))}
        </div>
      </Section>

      {/* 9. FilterGroup */}
      <Section title="FilterGroup">
        <div className="max-w-[256px] rounded-panel border border-line bg-surface px-3">
          <FilterGroup
            title="장르"
            type="checkbox"
            values={genreValues}
            onChange={setGenreValues}
            options={[
              { value: "액션", label: "액션" },
              { value: "RPG", label: "RPG" },
              { value: "FPS", label: "FPS" },
              { value: "어드벤처", label: "어드벤처", disabled: true },
            ]}
          />
          <FilterGroup
            title="출시 시기"
            type="radio"
            value={era}
            onChange={setEra}
            options={[
              { value: "all", label: "전체" },
              { value: "2024", label: "2024년 이후" },
              { value: "2020", label: "2020년대 초" },
              { value: "old", label: "2009년 이전", soonLabel: "준비 중" },
            ]}
          />
        </div>
      </Section>

      {/* 10. SortSelect */}
      <Section title="SortSelect">
        <SortSelect
          value={sort}
          onChange={setSort}
          options={[
            { value: "year", label: "최신 출시순" },
            { value: "review", label: "평가 높은 순" },
            { value: "name", label: "이름순" },
          ]}
        />
      </Section>

      {/* 11. SegmentedControl */}
      <Section title="SegmentedControl">
        <div className="flex flex-wrap items-center gap-6">
          <SegmentedControl
            ariaLabel="기간 선택"
            options={[
              { value: "일간", label: "일간" },
              { value: "주간", label: "주간" },
              { value: "월간", label: "월간" },
            ]}
            value={period}
            onChange={setPeriod}
          />
          <SegmentedControl
            ariaLabel="기간 선택 (소형)"
            size="sm"
            options={[
              { value: "일간", label: "일간" },
              { value: "주간", label: "주간" },
              { value: "월간", label: "월간" },
            ]}
            value={periodSmall}
            onChange={setPeriodSmall}
          />
        </div>
      </Section>

      {/* 12. Pagination */}
      <Section title="Pagination">
        <Pagination page={page} totalPages={12} onChange={setPage} />
      </Section>

      {/* 13. Tag */}
      <Section title="Tag">
        <div className="flex flex-wrap gap-1.5">
          <Tag>무협</Tag>
          <Tag>회귀</Tag>
          <Tag>판타지</Tag>
          <Tag>액션</Tag>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <Tag variant="surface">드라마</Tag>
          <Tag variant="surface">스릴러</Tag>
        </div>
      </Section>

      {/* 14. StatPill */}
      <Section title="StatPill">
        <div className="flex flex-wrap gap-2.5">
          <StatPill icon={<Star weight="fill" size={14} className="text-star" />}>
            8.5 <small className="font-medium text-ink-2">TMDB</small>
          </StatPill>
          <StatPill icon={<Star weight="fill" size={14} className="text-star" />}>
            4.5 <small className="font-medium text-ink-2">AOD 리뷰 3</small>
          </StatPill>
          <StatPill icon={<ThumbsUp size={14} className="text-ink-2" />}>
            매우 긍정적 91% <small className="font-medium text-ink-2">Steam</small>
          </StatPill>
        </div>
      </Section>

      {/* 15. DdayPill */}
      <Section title="DdayPill">
        <div className="flex flex-wrap gap-2.5">
          <DdayPill>D-99</DdayPill>
          <DdayPill variant="tba">미정</DdayPill>
        </div>
      </Section>

      {/* 16. DeltaBadge */}
      <Section title="DeltaBadge">
        <div className="flex flex-wrap items-center gap-4">
          <DeltaBadge delta="+2" />
          <DeltaBadge delta="-1" />
          <DeltaBadge delta="0" />
          <DeltaBadge delta="new" />
        </div>
      </Section>

      {/* 17. EmptyState */}
      <Section title="EmptyState">
        <EmptyState
          title="조건에 맞는 작품이 없어요"
          description="필터를 조금 풀어보시면 더 많은 작품을 만날 수 있어요."
          action={
            <button
              type="button"
              className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
            >
              필터 초기화
            </button>
          }
        />
      </Section>

      {/* 18. SkeletonCard */}
      <Section title="SkeletonCard">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
            <SkeletonCard variant="portrait" />
            <SkeletonCard variant="portrait" />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SkeletonCard variant="landscape" />
          </div>
          <div className="rounded-panel border border-line bg-surface px-3 shadow-card">
            <SkeletonCard variant="row" />
            <SkeletonCard variant="row" />
          </div>
        </div>
      </Section>

      <div className="mt-14 flex items-center gap-2.5">
        <BookmarkSimple size={16} className="text-ink-3" />
        <span className="text-[13px] text-ink-3">
          이 페이지는 Phase 7에서 제거됩니다.
        </span>
      </div>
    </div>
  );
}
