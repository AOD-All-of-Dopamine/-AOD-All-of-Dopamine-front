import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowCounterClockwise,
  Faders,
  SortDescending,
  WarningCircle,
} from "@phosphor-icons/react";
import { useGenres, usePlatforms, useWorks } from "@aod/shared/hooks";
import { DOMAIN_FILTERS, DOMAIN_LABEL_MAP } from "@aod/shared/constants";
import {
  COLLECTION_SOURCES,
  platformLabel,
} from "../constants/platforms";
import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";
import WorkCard from "../components/ui/WorkCard";
import {
  workCardFooter,
  workCardMeta,
  workCardTags,
} from "../components/ui/workCardInfo";
import Chip from "../components/ui/Chip";
import DomainChip from "../components/ui/DomainChip";
import FilterGroup from "../components/ui/FilterGroup";
import Pagination from "../components/ui/Pagination";
import EmptyState from "../components/ui/EmptyState";
import SkeletonCard from "../components/ui/SkeletonCard";
import SoonBadge from "../components/ui/SoonBadge";

/**
 * /explore - mockups/explore-light-mockup.html 이식.
 * 레이아웃: 도메인 탭 행 / 좌 256px sticky 필터 레일(lg 이상 전용) /
 * 툴바(h1+결과수) / 활성 필터 칩 행 / 카드 그리드 / 페이지네이션.
 * <lg(mobile-light-mockup 프레임 2·3): 레일 대신 [필터 버튼 + 활성 칩 가로
 * 스크롤] 툴바와 필터 바텀시트. 시트도 즉시 적용(URL replace 단일 출처
 * 재사용) - 시트 내 스테이징 상태 없음, footer는 현재 결과 수 표시 + 닫기.
 *
 * URL 쿼리(?domain=&genres=&platforms=&era=&status=&weekdays=&ages=&page=)가
 * 상태의 단일 출처. 다중 값은 콤마 직렬화.
 *
 * 히스토리 정책: 도메인 탭 전환과 페이지 이동은 push, 필터 조작(토글,
 * 칩 제거, 초기화)은 replace. 결과 상태가 현재와 같으면 히스토리 no-op.
 *
 * 도메인별 필터 축 (백엔드 ContentRepository.findWorks 계약 기준):
 * - 공통: 장르(@> 포함, AND) / 플랫폼(&& 겹침, OR 다중)
 * - 게임, 웹소설: + 출시 시기(era 프리셋 -> releaseFrom/To)
 * - 영화, 시리즈: 플랫폼 대신 "볼 수 있는 곳"(수집 소스 TMDB_* 제외한 OTT만)
 *   + 개봉 시기(era)
 * - 웹툰: + 연재 상태(status) / 연재 요일(weekdays) / 연령 등급(ageRatings).
 *   이 세 축은 webtoon_contents EXISTS 서브쿼리라 타 도메인에 보내면 결과가
 *   0건이 되므로 웹툰 탭에서만 파싱, 전송한다.
 *
 * 남은 편차:
 * - 정렬: 도메인 지정 경로와 필터 경로 모두 서버가 sortBy를 무시하고
 *   release_date DESC 고정이므로 SortSelect를 생략하고 정적 라벨만 표시한다.
 * - attr(JSONB) 기반 축은 필터 금지 (가격, 리뷰 평가 등은 표시 전용).
 * - 장르, 플랫폼 필터는 백엔드가 domain 필수라 전체 탭에서는 노출하지 않는다.
 * - placeholderData(keepPreviousData)는 의도적으로 미적용 - 도메인 전환 시 이전
 *   도메인 카드 잔상 방지를 우선하고 페이지 전환 스켈레톤은 수용한다.
 */

const PAGE_SIZE = 20;

const DOMAIN_IDS = DOMAIN_FILTERS.map((d) => d.id.toLowerCase());

/**
 * 아직 수집 전인 플랫폼의 로드맵 표기 (목업 "준비 중" 항목).
 * 백엔드 수집 시작 시 API 목록(usePlatforms)으로 자동 대체됨 -
 * API 결과에 같은 라벨이 나타나면 아래 중복 제거 필터로 이 목록에서 빠진다.
 */
const SOON_PLATFORMS: Record<string, string[]> = {
  GAME: ["Epic Games"],
  WEBTOON: ["카카오웹툰"],
  WEBNOVEL: ["카카오페이지"],
};

/** 출시 시기 radio 프리셋 (목업 era 그룹) */
const ERA_OPTIONS = [
  { value: "", label: "전체" },
  { value: "2024", label: "2024년 이후" },
  { value: "2020", label: "2020년대 초" },
  { value: "2010", label: "2010년대" },
  { value: "old", label: "2009년 이전" },
];

/** era 프리셋 -> releaseFrom/To(yyyy-MM-dd) 매핑 */
const ERA_RANGE: Record<string, { from?: string; to?: string }> = {
  "2024": { from: "2024-01-01" },
  "2020": { from: "2020-01-01", to: "2023-12-31" },
  "2010": { from: "2010-01-01", to: "2019-12-31" },
  old: { to: "2009-12-31" },
};

/** 웹툰 연재 상태 - DB 실측값(webtoon_contents.status) 그대로 */
const STATUS_VALUES = ["연재중", "완결"];

/** 웹툰 연재 요일 - 값은 DB 실측값(mon~sun), 라벨은 월~일 */
const WEEKDAY_OPTIONS = [
  { value: "mon", label: "월" },
  { value: "tue", label: "화" },
  { value: "wed", label: "수" },
  { value: "thu", label: "목" },
  { value: "fri", label: "금" },
  { value: "sat", label: "토" },
  { value: "sun", label: "일" },
];
const WEEKDAY_VALUES = WEEKDAY_OPTIONS.map((o) => o.value);

/**
 * 웹툰 연령 등급 - DB 실측값(webtoon_contents.age_rating) 그대로.
 * 19세이용가는 크롤러 파서가 반환 가능한 값이라 성인작 데이터 유입에 대비해 포함.
 */
const AGE_OPTIONS = ["전체이용가", "12세이용가", "15세이용가", "19세이용가"];

/** 장르 접기 기본 노출 개수 - 웹툰 장르(네이버 태그 원천)가 수십 개라 접기 필요 */
const GENRE_COLLAPSE_LIMIT = 12;

const categoryOf = (domain: string): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};

const eraLabel = (value: string) =>
  ERA_OPTIONS.find((o) => o.value === value)?.label ?? value;

const weekdayChipLabel = (value: string) => {
  const day = WEEKDAY_OPTIONS.find((o) => o.value === value)?.label ?? value;
  return `${day}요일`;
};

interface ParamPatch {
  domain?: string;
  genres?: string[];
  platforms?: string[];
  era?: string;
  status?: string;
  weekdays?: string[];
  ages?: string[];
  page?: number;
}

/** 모든 필터 축을 비우는 patch (도메인 전환, 초기화 공용) */
const CLEAR_FILTERS: ParamPatch = {
  genres: [],
  platforms: [],
  era: "",
  status: "",
  weekdays: [],
  ages: [],
  page: 1,
};

const parseList = (raw: string | null) =>
  (raw ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

/** URL 쿼리를 유효한 화면 상태로 정규화 (잘못된 값은 안전 폴백) */
const parseParams = (p: URLSearchParams) => {
  const raw = (p.get("domain") ?? "game").toLowerCase();
  const domainId = DOMAIN_IDS.includes(raw) ? raw : "game";
  const isAll = domainId === "all";
  const isWebtoon = domainId === "webtoon";
  // 전체 탭에서는 백엔드가 필터를 적용하지 않으므로 URL 값도 무시한다.
  const genres = isAll ? [] : parseList(p.get("genres"));
  // 구 URL(?platform= 단수, radio 시절) 호환 - platforms 부재 시에만 이관
  const platforms = isAll
    ? []
    : parseList(p.get("platforms") ?? p.get("platform"));
  // era는 웹툰 레일에 없는 축 (웹툰은 연재 상태/요일/연령이 대신한다)
  const rawEra = p.get("era") ?? "";
  const eraValid = ERA_OPTIONS.some((o) => o.value !== "" && o.value === rawEra);
  const era = !isAll && !isWebtoon && eraValid ? rawEra : "";
  // 웹툰 도메인 컬럼 축은 웹툰 탭 전용 (타 도메인 전송 시 결과 0건)
  const rawStatus = p.get("status") ?? "";
  const status =
    isWebtoon && STATUS_VALUES.includes(rawStatus) ? rawStatus : "";
  // 완결작은 weekday가 null이라 요일과 조합하면 항상 0건 - 완결이면 요일 무시
  const weekdays =
    isWebtoon && status !== "완결"
      ? parseList(p.get("weekdays")).filter((w) => WEEKDAY_VALUES.includes(w))
      : [];
  const ages = isWebtoon
    ? parseList(p.get("ages")).filter((a) => AGE_OPTIONS.includes(a))
    : [];
  const rawPage = Number.parseInt(p.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  return {
    domainId,
    isAll,
    isWebtoon,
    genres,
    platforms,
    era,
    status,
    weekdays,
    ages,
    page,
  };
};

/** no-op 판정용 상태 직렬화 - URL 표기가 달라도 같은 화면이면 같은 키 */
const stateKey = (p: URLSearchParams) => {
  const s = parseParams(p);
  return [
    s.domainId,
    s.genres.join(","),
    s.platforms.join(","),
    s.era,
    s.status,
    s.weekdays.join(","),
    s.ages.join(","),
    s.page,
  ].join("|");
};

const writeList = (params: URLSearchParams, key: string, values?: string[]) => {
  if (values === undefined) return;
  if (values.length > 0) params.set(key, values.join(","));
  else params.delete(key);
};

const writeScalar = (params: URLSearchParams, key: string, value?: string) => {
  if (value === undefined) return;
  if (value) params.set(key, value);
  else params.delete(key);
};

/** 부분 변경(patch)만 반영하고 나머지 파라미터(미지 포함)는 보존 */
const buildParams = (base: URLSearchParams, patch: ParamPatch) => {
  const params = new URLSearchParams(base);
  if (patch.domain !== undefined) params.set("domain", patch.domain);
  writeList(params, "genres", patch.genres);
  // platforms를 쓸 때 구 단수 키를 함께 제거해야 해제가 no-op으로 오판되지 않는다
  if (patch.platforms !== undefined) params.delete("platform");
  writeList(params, "platforms", patch.platforms);
  writeScalar(params, "era", patch.era);
  writeScalar(params, "status", patch.status);
  writeList(params, "weekdays", patch.weekdays);
  writeList(params, "ages", patch.ages);
  if (patch.page !== undefined) {
    if (patch.page > 1) params.set("page", String(patch.page));
    else params.delete("page");
  }
  return params;
};

/**
 * 필터 옵션 로드 실패 시 그룹 자리에 표시 - 조용히 사라지는 대신 재시도 제공.
 * bordered=false: 시트 안에서는 그룹 border-b와 겹쳐 이중선이 되므로 구분선 생략.
 */
const FilterLoadError = ({
  onRetry,
  bordered = true,
}: {
  onRetry: () => void;
  bordered?: boolean;
}) => (
  <div className={`px-0.5 py-4 ${bordered ? "border-t border-line" : ""}`}>
    <p className="flex items-center gap-1.5 text-[13px] text-ink-2">
      <WarningCircle size={14} />
      필터를 불러오지 못했어요
    </p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-2 text-[13px] font-semibold text-accent-ink transition-opacity hover:opacity-80"
    >
      다시 시도
    </button>
  </div>
);

/** 바텀시트 필터 그룹 래퍼 (목업 .fgroup) */
const SheetGroup = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <div className="border-b border-line py-3.5 last:border-b-0">
    <h4 className="mb-2.5 text-[13.5px] font-bold text-ink">{title}</h4>
    {children}
  </div>
);

/** 바텀시트 옵션 pill (목업 .opt) - on = accent-tint 배경 + accent-ink 테두리·텍스트 */
const SheetOptionPill = ({
  label,
  on = false,
  onClick,
  disabled = false,
  soonLabel,
}: {
  label: string;
  on?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  soonLabel?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={on}
    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-[13px] py-2 text-[13px] font-semibold transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
      on
        ? "border-accent-ink bg-accent-tint text-accent-ink"
        : "border-line bg-surface text-ink-2"
    }`}
  >
    {label}
    {soonLabel && <SoonBadge>{soonLabel}</SoonBadge>}
  </button>
);

/** 바텀시트 라디오 열 (목업 .radio-col) - 단일 선택 축(연재 상태, 출시 시기) */
const SheetRadioGroup = ({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) => {
  const name = useId();
  return (
    <div className="flex flex-col gap-0.5">
      {options.map((option) => {
        const on = value === option.value;
        return (
          <label
            key={option.value}
            className="-mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-input px-1.5 py-[7px] text-sm text-ink-2"
          >
            <input
              type="radio"
              name={name}
              checked={on}
              onChange={() => onChange(option.value)}
              className="h-[15px] w-[15px] accent-accent"
            />
            <span className={on ? "font-semibold text-ink" : ""}>
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
};

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL 쿼리가 상태의 단일 출처 -
  // 직접 URL 진입, 새로고침, 뒤로가기 모두 여기서 복원된다.
  const {
    domainId,
    isAll,
    isWebtoon,
    genres,
    platforms,
    era,
    status,
    weekdays,
    ages,
    page,
  } = useMemo(() => parseParams(searchParams), [searchParams]);
  const domainKey = isAll ? undefined : domainId.toUpperCase();
  const isOttDomain = domainId === "movie" || domainId === "tv";

  // 결과 상태가 현재와 같으면 히스토리를 건드리지 않고 false 반환 (no-op 가드)
  const writeParams = (patch: ParamPatch, opts?: { replace?: boolean }) => {
    if (stateKey(buildParams(searchParams, patch)) === stateKey(searchParams)) {
      return false;
    }
    setSearchParams(
      (prev) => buildParams(prev, patch),
      opts?.replace ? { replace: true } : undefined,
    );
    return true;
  };

  // 도메인 전환(push) 시 필터/페이지 전부 리셋 (목업 동작과 동일)
  const handleDomainChange = (id: string) => {
    if (writeParams({ domain: id, ...CLEAR_FILTERS })) {
      window.scrollTo({ top: 0 });
    }
  };
  const handleGenresChange = (next: string[]) =>
    writeParams({ genres: next, page: 1 }, { replace: true });
  const handlePlatformsChange = (next: string[]) =>
    writeParams({ platforms: next, page: 1 }, { replace: true });
  const handleEraChange = (next: string) =>
    writeParams({ era: next, page: 1 }, { replace: true });
  // 완결 선택 시 요일 선택 자동 해제 (완결작 weekday null - 조합이 항상 0건)
  const handleStatusChange = (next: string) =>
    writeParams(
      next === "완결"
        ? { status: next, weekdays: [], page: 1 }
        : { status: next, page: 1 },
      { replace: true },
    );
  const handleWeekdaysChange = (next: string[]) =>
    writeParams({ weekdays: next, page: 1 }, { replace: true });
  const handleAgesChange = (next: string[]) =>
    writeParams({ ages: next, page: 1 }, { replace: true });
  const handleReset = () => writeParams(CLEAR_FILTERS, { replace: true });
  const handlePageChange = (next: number) => {
    if (writeParams({ page: next })) {
      window.scrollTo({ top: 0 });
    }
  };

  const eraRange = era ? ERA_RANGE[era] : undefined;
  const { data, isLoading, isError, refetch } = useWorks({
    domain: domainKey,
    genres: genres.length > 0 ? genres : undefined,
    platforms: platforms.length > 0 ? platforms : undefined,
    releaseFrom: eraRange?.from,
    releaseTo: eraRange?.to,
    status: status || undefined,
    weekdays: weekdays.length > 0 ? weekdays : undefined,
    ageRatings: ages.length > 0 ? ages : undefined,
    page: page - 1,
    size: PAGE_SIZE,
    // 도메인 경로에서는 서버가 정렬을 무시하지만(release_date DESC 고정),
    // 전체 탭(findAll 경로)만은 이 값을 따르므로 최신순으로 통일해 보낸다.
    sortBy: "releaseDate",
    sortDirection: "desc",
  });

  const {
    data: genreOptions,
    isError: genresFailed,
    refetch: refetchGenres,
  } = useGenres(domainKey, { enabled: !isAll });
  const {
    data: platformOptions,
    isError: platformsFailed,
    refetch: refetchPlatforms,
  } = usePlatforms(domainKey, { enabled: !isAll });

  const sortedGenres = useMemo(
    () => [...(genreOptions ?? [])].sort((a, b) => a.localeCompare(b, "ko")),
    [genreOptions],
  );

  // 장르 더 보기/접기 (목업 .more-genres) - 도메인 전환 시 접힘으로 초기화
  const [genresExpanded, setGenresExpanded] = useState(false);
  useEffect(() => {
    setGenresExpanded(false);
  }, [domainId]);

  // 접힘 상태에서는 상위 N개만 노출하되, 접힌 영역의 체크된 항목은 유지한다
  // (칩에는 있는데 레일에는 안 보이는 혼란 방지)
  const visibleGenres = genresExpanded
    ? sortedGenres
    : sortedGenres.filter(
        (g, i) => i < GENRE_COLLAPSE_LIMIT || genres.includes(g),
      );
  const hiddenGenreCount = sortedGenres.length - visibleGenres.length;

  const items = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // 데이터 로드 후 URL의 page가 실제 범위를 넘으면 1페이지로 정정 (replace)
  useEffect(() => {
    if (!isLoading && !isError && data && page > 1 && page > totalPages) {
      writeParams({ page: 1 }, { replace: true });
    }
    // writeParams는 매 렌더 재생성되지만 위 조건이 반응할 값은 아래가 전부다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isError, data, page, totalPages]);

  const title = isAll ? "전체" : (DOMAIN_LABEL_MAP[domainKey!] ?? domainId);
  const variant = domainId === "game" ? "landscape" : "portrait";
  const activeFilterCount =
    genres.length +
    platforms.length +
    (era ? 1 : 0) +
    (status ? 1 : 0) +
    weekdays.length +
    ages.length;
  const hasActiveFilters = activeFilterCount > 0;

  // 활성 필터 칩 - 데스크톱 래핑 행과 모바일 툴바 스크롤 행이 공유
  const activeFilterChips = [
    ...platforms.map((v) => ({
      key: `platform-${v}`,
      label: platformLabel(v),
      onRemove: () => handlePlatformsChange(platforms.filter((x) => x !== v)),
    })),
    ...genres.map((g) => ({
      key: `genre-${g}`,
      label: g,
      onRemove: () => handleGenresChange(genres.filter((x) => x !== g)),
    })),
    ...(era
      ? [{ key: "era", label: eraLabel(era), onRemove: () => handleEraChange("") }]
      : []),
    ...(status
      ? [{ key: "status", label: status, onRemove: () => handleStatusChange("") }]
      : []),
    ...weekdays.map((w) => ({
      key: `weekday-${w}`,
      label: weekdayChipLabel(w),
      onRemove: () => handleWeekdaysChange(weekdays.filter((x) => x !== w)),
    })),
    ...ages.map((a) => ({
      key: `age-${a}`,
      label: a,
      onRemove: () => handleAgesChange(ages.filter((x) => x !== a)),
    })),
  ];

  // 시트 pill 토글 - 즉시 적용(URL replace), 스테이징 없음
  const toggleGenre = (g: string) =>
    handleGenresChange(
      genres.includes(g) ? genres.filter((x) => x !== g) : [...genres, g],
    );
  const togglePlatform = (v: string) =>
    handlePlatformsChange(
      platforms.includes(v) ? platforms.filter((x) => x !== v) : [...platforms, v],
    );
  const toggleWeekday = (w: string) =>
    handleWeekdaysChange(
      weekdays.includes(w) ? weekdays.filter((x) => x !== w) : [...weekdays, w],
    );
  const toggleAge = (a: string) =>
    handleAgesChange(
      ages.includes(a) ? ages.filter((x) => x !== a) : [...ages, a],
    );

  // 영화, 시리즈는 수집 소스(TMDB_*)를 제외한 OTT만 "볼 수 있는 곳"으로 노출
  const visiblePlatforms = isOttDomain
    ? (platformOptions ?? []).filter((v) => !COLLECTION_SOURCES.includes(v))
    : (platformOptions ?? []);

  // "준비 중" 항목 - API 목록에 이미 같은 라벨이 있으면 중복 추가하지 않는다
  // (예: WEBNOVEL은 usePlatforms가 KakaoPage를 이미 반환할 수 있음)
  const apiPlatformLabels = (platformOptions ?? []).map(platformLabel);
  const soonPlatforms = (SOON_PLATFORMS[domainKey ?? ""] ?? []).filter(
    (label) => !apiPlatformLabels.includes(label),
  );

  // 모바일 2열 기본(목업 프레임 2 .grid2), 이후 목업 반응형 그대로 -
  // landscape 4/3/2열, portrait 5/4/3/2열 (1200/1023/767px)
  const gridClass =
    variant === "landscape"
      ? "mt-[22px] grid grid-cols-2 gap-y-3.5 gap-x-3 min-[768px]:grid-cols-3 min-[768px]:gap-y-5 min-[768px]:gap-x-[18px] min-[1201px]:grid-cols-4"
      : "mt-[22px] grid grid-cols-2 gap-y-3.5 gap-x-3 min-[768px]:grid-cols-3 min-[768px]:gap-y-5 min-[768px]:gap-x-[18px] min-[1024px]:grid-cols-4 min-[1201px]:grid-cols-5";

  // <lg 필터 바텀시트 - ConfirmDialog와 같은 네이티브 dialog.showModal() 기반.
  // top-layer + 배경 inert(포커스 트랩) + Escape(cancel)를 브라우저가 제공하고,
  // 딤은 ::backdrop. 시각은 하단 고정 패널 + translate 전환 유지.
  // 닫힘은 슬라이드 다운(300ms)이 끝난 뒤 close(), reduced-motion이면 즉시.
  const [sheetOpen, setSheetOpen] = useState(false); // 논리 상태 (showModal 대상)
  const [sheetShown, setSheetShown] = useState(false); // 전환 클래스 (업/다운)
  const sheetRef = useRef<HTMLDialogElement>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  // 배경 클릭 판정 - 패널 안에서 드래그를 시작해 딤에서 떼는 오동작 방지
  // (ConfirmDialog 전례)
  const pressedBackdropRef = useRef(false);
  const closeTimerRef = useRef<number | undefined>(undefined);

  const openSheet = () => {
    // 닫힘 전환 중 재열림 시 예약된 close()가 새 열림을 닫지 않게 취소
    window.clearTimeout(closeTimerRef.current);
    setSheetOpen(true);
    setSheetShown(true);
  };

  // 닫힘 시작 - 슬라이드 다운을 먼저 돌리고 전환이 끝난 뒤 close()
  const closeSheet = () => {
    const dialog = sheetRef.current;
    if (!dialog?.open) return;
    setSheetShown(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.close();
      return;
    }
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => dialog.close(), 300);
  };

  // 열림 동안: showModal + body 스크롤 잠금 + lg 진입 시 자동 닫기
  useEffect(() => {
    if (!sheetOpen) return;
    const dialog = sheetRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const mql = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = () => {
      if (mql.matches) dialog.close();
    };
    mql.addEventListener("change", onBreakpoint);
    return () => {
      document.body.style.overflow = prevOverflow;
      mql.removeEventListener("change", onBreakpoint);
      window.clearTimeout(closeTimerRef.current);
      if (dialog.open) dialog.close();
    };
  }, [sheetOpen]);

  const resetButton = (
    <button
      type="button"
      onClick={handleReset}
      className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
    >
      필터 초기화
    </button>
  );

  return (
    <>
      {/* 도메인 탭 행 */}
      <div className="mx-auto flex max-w-[1440px] gap-1.5 overflow-x-auto px-6 pt-5 scrollbar-hide">
        {DOMAIN_FILTERS.map((d) => {
          const id = d.id.toLowerCase();
          return (
            <DomainChip
              key={d.id}
              size="lg"
              active={domainId === id}
              onClick={() => handleDomainChange(id)}
            >
              {d.label}
            </DomainChip>
          );
        })}
      </div>

      {/* 좌 필터 레일 + 본문 */}
      <div className="mx-auto grid max-w-[1440px] items-start gap-4 px-6 pb-[72px] pt-5 lg:grid-cols-[256px_1fr] lg:gap-8">
        {/* 좌 필터 레일 - lg 이상 전용 (<lg는 필터 바텀시트가 대체) */}
        <div className="hidden lg:sticky lg:top-[84px] lg:block lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto">
          <div className="flex items-baseline justify-between px-0.5 pb-3.5 pt-1">
            <h2 className="text-[15px] font-bold text-ink">필터</h2>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[13px] text-ink-2 transition-colors hover:text-accent-ink"
            >
              <ArrowCounterClockwise size={13} />
              초기화
            </button>
          </div>

          {isAll ? (
            // findWorks는 domain 없이는 필터를 적용하지 않으므로 숨긴다
            <p className="border-t border-line px-0.5 py-4 text-[13px] leading-relaxed text-ink-2">
              전체 탭에서는 필터를 지원하지 않아요. 도메인을 선택하면 장르와
              플랫폼 필터를 쓸 수 있어요.
            </p>
          ) : (
            <>
              {genresFailed ? (
                <FilterLoadError onRetry={() => refetchGenres()} />
              ) : (
                sortedGenres.length > 0 && (
                  <FilterGroup
                    title="장르"
                    type="checkbox"
                    values={genres}
                    onChange={handleGenresChange}
                    options={visibleGenres.map((g) => ({ value: g, label: g }))}
                    footer={
                      (genresExpanded || hiddenGenreCount > 0) && (
                        <button
                          type="button"
                          aria-expanded={genresExpanded}
                          onClick={() => setGenresExpanded((v) => !v)}
                          className="mt-1.5 px-1.5 text-[13px] text-ink-3 transition-colors hover:text-ink"
                        >
                          {genresExpanded
                            ? "접기"
                            : `장르 ${hiddenGenreCount}개 더 보기`}
                        </button>
                      )
                    }
                  />
                )
              )}
              {platformsFailed ? (
                <FilterLoadError onRetry={() => refetchPlatforms()} />
              ) : (
                (visiblePlatforms.length > 0 || soonPlatforms.length > 0) && (
                  <FilterGroup
                    title={isOttDomain ? "볼 수 있는 곳" : "플랫폼"}
                    type="checkbox"
                    values={platforms}
                    onChange={handlePlatformsChange}
                    options={[
                      ...visiblePlatforms.map((v) => ({
                        value: v,
                        label: platformLabel(v),
                      })),
                      ...soonPlatforms.map((label) => ({
                        value: `soon-${label}`,
                        label,
                        disabled: true,
                        soonLabel: "준비 중",
                      })),
                    ]}
                  />
                )
              )}
              {isWebtoon ? (
                <>
                  <FilterGroup
                    title="연재 상태"
                    type="radio"
                    value={status}
                    onChange={handleStatusChange}
                    options={[
                      { value: "", label: "전체" },
                      ...STATUS_VALUES.map((v) => ({ value: v, label: v })),
                    ]}
                  />
                  {/* 완결작은 weekday null이라 요일 그룹은 완결 상태에서 숨김 */}
                  {status !== "완결" && (
                    <FilterGroup
                      title="연재 요일"
                      type="checkbox"
                      values={weekdays}
                      onChange={handleWeekdaysChange}
                      options={WEEKDAY_OPTIONS}
                    />
                  )}
                  <FilterGroup
                    title="연령 등급"
                    type="checkbox"
                    values={ages}
                    onChange={handleAgesChange}
                    options={AGE_OPTIONS.map((a) => ({ value: a, label: a }))}
                  />
                </>
              ) : (
                <FilterGroup
                  title={isOttDomain ? "개봉 시기" : "출시 시기"}
                  type="radio"
                  value={era}
                  onChange={handleEraChange}
                  options={ERA_OPTIONS}
                />
              )}
            </>
          )}
        </div>

        <main>
          {/* <lg 필터 툴바 - 시트 트리거 + 활성 필터 칩 가로 스크롤 (목업 .toolbar) */}
          <div className="mb-4 flex items-center gap-1.5 lg:hidden">
            <button
              ref={filterBtnRef}
              type="button"
              onClick={openSheet}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line-strong bg-surface px-3.5 py-2 text-[13.5px] font-semibold text-ink transition-colors hover:border-ink active:scale-[0.98]"
            >
              <Faders size={15} />
              필터
              {activeFilterCount > 0 && (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent-ink px-[5px] text-[11px] font-bold text-surface">
                  <span aria-hidden="true">{activeFilterCount}</span>
                  <span className="sr-only">
                    적용된 필터 {activeFilterCount}개
                  </span>
                </span>
              )}
            </button>
            {activeFilterChips.length > 0 && (
              <div className="flex min-w-0 gap-1.5 overflow-x-auto scrollbar-hide">
                {activeFilterChips.map((chip) => (
                  <span key={chip.key} className="flex-none whitespace-nowrap">
                    <Chip label={chip.label} onRemove={chip.onRemove} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 툴바: 제목 + 결과 수 + 정렬 표시 */}
          <div className="flex flex-wrap items-center gap-3.5">
            <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">
              {title}
            </h1>
            {!isLoading && !isError && (
              <span
                role="status"
                className="text-[14.5px] tabular-nums text-ink-2"
              >
                {totalElements.toLocaleString()}개 작품
              </span>
            )}
            {/* 서버 정렬이 release_date DESC 고정이라 SortSelect 대신 정적 라벨 */}
            <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-ink-2">
              <SortDescending size={14} />
              최신 출시순
            </span>
          </div>

          {/* 활성 필터 칩 행(lg 이상) - 모든 축의 개별 제거를 지원한다.
              <lg에서는 위 툴바의 가로 스크롤 칩 행이 같은 목록을 렌더한다 */}
          {hasActiveFilters && (
            <div className="mt-3.5 hidden flex-wrap gap-2 lg:flex">
              {activeFilterChips.map((chip) => (
                <Chip
                  key={chip.key}
                  label={chip.label}
                  onRemove={chip.onRemove}
                />
              ))}
            </div>
          )}

          {/* 상태 3종: 로딩 스켈레톤 / 에러 / 빈 결과 + 카드 그리드 */}
          {isLoading ? (
            <div className={gridClass} aria-hidden="true">
              {Array.from({ length: PAGE_SIZE }, (_, i) => (
                <SkeletonCard key={i} variant={variant} />
              ))}
            </div>
          ) : isError ? (
            <div className="mt-[22px]">
              <EmptyState
                icon={<WarningCircle size={44} />}
                title="작품을 불러오지 못했어요"
                description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
                action={
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
                  >
                    다시 시도
                  </button>
                }
              />
            </div>
          ) : items.length === 0 ? (
            <div className="mt-[22px]">
              <EmptyState
                title="조건에 맞는 작품이 없어요"
                description={
                  hasActiveFilters
                    ? "필터를 조금 풀어보시면 더 많은 작품을 만날 수 있어요."
                    : "아직 수집된 작품이 없어요. 조금만 기다려 주세요."
                }
                action={hasActiveFilters ? resetButton : undefined}
              />
            </div>
          ) : (
            <>
              <div className={gridClass}>
                {items.map((work) => (
                  // 목업 카드 구성 그대로 - meta(연도·제작자)/장르 태그/도메인별 foot.
                  // 전체 탭만 혼합 도메인이라 meta 앞에 도메인 라벨을 붙인다.
                  <WorkCard
                    key={work.id}
                    variant={variant}
                    title={work.title}
                    meta={workCardMeta(work, { withDomain: isAll })}
                    tags={workCardTags(work)}
                    imageUrl={work.thumbnail}
                    fallbackIconUrl={
                      thumbnailFallbackMap[categoryOf(work.domain)]
                    }
                    to={`/work/${work.id}`}
                    footer={workCardFooter(work)}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-10">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* <lg 필터 바텀시트 (목업 프레임 3) - 네이티브 dialog.showModal().
          배경 inert + 포커스 트랩 + top-layer는 브라우저가 제공, 딤은 ::backdrop.
          열림은 @starting-style(starting:)로, 닫힘은 closeSheet의 지연 close()로
          translate + 딤 opacity 300ms 전환. reduced-motion 시 즉시 */}
      <dialog
        ref={sheetRef}
        aria-label="필터"
        onClose={() => {
          // ConfirmDialog 전례: StrictMode 이중 이펙트가 재개방 후 흘려보내는
          // 유령 close 이벤트는 open=true 상태로 도착하므로 무시한다
          if (sheetRef.current?.open) return;
          setSheetOpen(false);
          setSheetShown(false);
          // 닫힘 시 트리거 버튼으로 포커스 복귀
          filterBtnRef.current?.focus();
        }}
        onCancel={(e) => {
          // Escape도 즉시 닫힘 대신 슬라이드 다운을 거쳐 닫는다
          e.preventDefault();
          closeSheet();
        }}
        onPointerDown={(e) => {
          pressedBackdropRef.current = e.target === sheetRef.current;
        }}
        onClick={(e) => {
          // 딤 클릭 판정 - ::backdrop 클릭은 dialog 자신이 타깃이 된다
          if (e.target === sheetRef.current && pressedBackdropRef.current) {
            closeSheet();
          }
        }}
        className={`m-0 mt-auto w-full max-w-none rounded-t-2xl bg-surface p-0 shadow-lift transition-transform duration-300 backdrop:bg-ink/40 backdrop:transition-opacity backdrop:duration-300 motion-reduce:transition-none motion-reduce:backdrop:transition-none lg:hidden ${
          sheetShown
            ? "translate-y-0 backdrop:opacity-100 starting:translate-y-full starting:backdrop:opacity-0"
            : "translate-y-full backdrop:opacity-0"
        }`}
      >
        {/* 패널 전면을 덮는 래퍼 - 내부 클릭이 dialog 자신(딤 판정)으로 새지 않게 */}
        <div className="flex max-h-[82dvh] flex-col">
          {/* 그립 바 */}
          <div className="mx-auto mt-2.5 h-1 w-9 flex-none rounded-full bg-line-strong" />
          {/* 헤더: 필터 | 초기화 */}
          <div className="flex flex-none items-center justify-between border-b border-line py-3 pl-5 pr-4">
            <h2 className="text-base font-extrabold text-ink">필터</h2>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[13px] text-ink-2 transition-colors hover:text-accent-ink"
            >
              <ArrowCounterClockwise size={13} />
              초기화
            </button>
          </div>

          {/* 본문 - 축별 그룹, 즉시 적용(레일과 동일 핸들러) */}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-1">
            {isAll ? (
              <p className="py-4 text-[13px] leading-relaxed text-ink-2">
                전체 탭에서는 필터를 지원하지 않아요. 도메인을 선택하면 장르와
                플랫폼 필터를 쓸 수 있어요.
              </p>
            ) : (
              <>
                {genresFailed ? (
                  <FilterLoadError bordered={false} onRetry={() => refetchGenres()} />
                ) : (
                  sortedGenres.length > 0 && (
                    <SheetGroup title="장르">
                      <div className="flex flex-wrap gap-[7px]">
                        {visibleGenres.map((g) => (
                          <SheetOptionPill
                            key={g}
                            label={g}
                            on={genres.includes(g)}
                            onClick={() => toggleGenre(g)}
                          />
                        ))}
                        {(genresExpanded || hiddenGenreCount > 0) && (
                          <SheetOptionPill
                            label={
                              genresExpanded
                                ? "접기"
                                : `더보기 +${hiddenGenreCount}`
                            }
                            onClick={() => setGenresExpanded((v) => !v)}
                          />
                        )}
                      </div>
                    </SheetGroup>
                  )
                )}
                {platformsFailed ? (
                  <FilterLoadError
                    bordered={false}
                    onRetry={() => refetchPlatforms()}
                  />
                ) : (
                  (visiblePlatforms.length > 0 || soonPlatforms.length > 0) && (
                    <SheetGroup title={isOttDomain ? "볼 수 있는 곳" : "플랫폼"}>
                      <div className="flex flex-wrap gap-[7px]">
                        {visiblePlatforms.map((v) => (
                          <SheetOptionPill
                            key={v}
                            label={platformLabel(v)}
                            on={platforms.includes(v)}
                            onClick={() => togglePlatform(v)}
                          />
                        ))}
                        {soonPlatforms.map((label) => (
                          <SheetOptionPill
                            key={label}
                            label={label}
                            disabled
                            soonLabel="준비 중"
                          />
                        ))}
                      </div>
                    </SheetGroup>
                  )
                )}
                {isWebtoon ? (
                  <>
                    <SheetGroup title="연재 상태">
                      <SheetRadioGroup
                        value={status}
                        onChange={handleStatusChange}
                        options={[
                          { value: "", label: "전체" },
                          ...STATUS_VALUES.map((v) => ({ value: v, label: v })),
                        ]}
                      />
                    </SheetGroup>
                    {/* 완결작은 weekday null이라 요일 그룹은 완결 상태에서 숨김 */}
                    {status !== "완결" && (
                      <SheetGroup title="연재 요일">
                        <div className="flex flex-wrap gap-[7px]">
                          {WEEKDAY_OPTIONS.map((option) => (
                            <SheetOptionPill
                              key={option.value}
                              label={option.label}
                              on={weekdays.includes(option.value)}
                              onClick={() => toggleWeekday(option.value)}
                            />
                          ))}
                        </div>
                      </SheetGroup>
                    )}
                    <SheetGroup title="연령 등급">
                      <div className="flex flex-wrap gap-[7px]">
                        {AGE_OPTIONS.map((age) => (
                          <SheetOptionPill
                            key={age}
                            label={age}
                            on={ages.includes(age)}
                            onClick={() => toggleAge(age)}
                          />
                        ))}
                      </div>
                    </SheetGroup>
                  </>
                ) : (
                  <SheetGroup title={isOttDomain ? "개봉 시기" : "출시 시기"}>
                    <SheetRadioGroup
                      value={era}
                      onChange={handleEraChange}
                      options={ERA_OPTIONS}
                    />
                  </SheetGroup>
                )}
              </>
            )}
          </div>

          {/* footer: 닫기 | N개 작품 보기 - 둘 다 닫기 (필터는 이미 적용됨) */}
          <div className="flex flex-none gap-2.5 border-t border-line px-5 pb-[18px] pt-3">
            <button
              type="button"
              onClick={closeSheet}
              className="flex-1 rounded-full border border-line-strong py-[13px] text-center text-[14.5px] font-bold text-ink transition-colors hover:border-ink active:scale-[0.98]"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={closeSheet}
              className="flex-[2] rounded-full bg-accent-ink py-[13px] text-center text-[14.5px] font-bold text-surface transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              {isLoading
                ? "작품 보기"
                : `${totalElements.toLocaleString()}개 작품 보기`}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
