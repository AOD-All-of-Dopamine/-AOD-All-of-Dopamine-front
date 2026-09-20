import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, MagnifyingGlass, WarningCircle, X } from "@phosphor-icons/react";
import { useInfiniteWorks, useSearchWorks, useSetReaction } from "@aod/shared/hooks";
import { DOMAIN_LABEL_MAP } from "@aod/shared/constants";
import { recKeys } from "@aod/shared/queries";
import type { WorkSummary } from "@aod/shared/types";
import type { RecRequestContext } from "@aod/shared/tracking";
import {
  EMPTY_ONBOARDING_SELECTION,
  ONBOARDING_SOURCE,
  canFinishOnboarding,
  isPicked,
  isSaved,
  onboardingLandingPath,
  onboardingReducer,
  onboardingSaveMessage,
  onboardingStatusText,
  pendingPicks,
  picksByDomain,
  recErrorStatus,
  runOnboardingSave,
  savedPicks,
  toOnboardingPick,
  type OnboardingPick,
} from "@aod/shared/rec";
import { useAuth } from "../contexts/AuthContext";
import { clearRecChains } from "../hooks/useRecChain";
import { useToast } from "../hooks/useToast";
import BottomButton from "../components/common/BottomButton";
import DomainChip from "../components/ui/DomainChip";
import EmptyState from "../components/ui/EmptyState";
import SkeletonCard from "../components/ui/SkeletonCard";
import Toast from "../components/ui/Toast";
import OnboardingWorkTile from "../components/onboarding/OnboardingWorkTile";

/**
 * /onboarding — "좋아하는 작품을 골라주세요" (REC_TAB_DESIGN §2-5, 설계 spec6 §2·§3).
 *
 * 장르 온보딩(고른 값을 console.log 만 하던 화면)을 대체한다. 고른 작품은 `완료` 에서
 * PUT /api/works/{id}/reaction {state:"LIKE", source:"onboarding"} 으로 **진짜 좋아요**가 된다
 * (좋아요 목록에도 보이고 SeedResolver 가 시드로 읽는다).
 *
 * 그리드는 새 엔드포인트 없이 기존 목록·검색 훅을 쓴다. 목록 API 는 도메인 지정 경로에서
 * 정렬을 무시하고 출시일 내림차순으로 고정돼 있어(WorkApiService) 고를 정렬이 없다 —
 * 그래서 화면에도 "인기"라고 쓰지 않는다. 랭킹 API 는 content 와 이어진 행이 없으면
 * contentId 가 없어 좋아요를 보낼 수 없으므로 쓰지 않는다.
 *
 * 판정 로직(선택·완료 조건·저장 큐·부분 실패 문구·착지 경로)은 전부 @aod/shared/rec 에 있고
 * vitest 가 덮는다.
 */

/** 분야 칩. 전체 칩은 두지 않는다 — 한 칩 = 한 도메인이라 카드 비율이 섞이지 않는다. */
const ONBOARDING_DOMAINS = ["GAME", "MOVIE", "TV", "WEBTOON", "WEBNOVEL"] as const;
type OnboardingDomain = (typeof ONBOARDING_DOMAINS)[number];

const GRID_PAGE_SIZE = 24;

const GRID_CLASS =
  "mt-5 grid grid-cols-2 gap-x-3 gap-y-3.5 min-[480px]:grid-cols-3 min-[768px]:gap-x-[18px] min-[768px]:gap-y-5 min-[1201px]:grid-cols-4";

const PRIMARY_BUTTON =
  "rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]";

const OUTLINE_BUTTON =
  "rounded-full border border-line bg-surface px-[22px] py-2.5 text-sm font-semibold text-ink transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-50";

const LOAD_MORE_ERROR = "더 불러오지 못했어요. 다시 시도해 주세요.";

/** 저장 요청에 싣는 맥락 — 서버가 reaction_changed.payload.source 로 남긴다(§2-5). */
const ONBOARDING_REC: RecRequestContext = { source: ONBOARDING_SOURCE };

/** 토큰 만료 판정. shared 는 HTTP 를 모르므로 웹이 넘긴다(axios 오류 모양은 client.ts 가 지킨다). */
const isAuthError = (error: unknown) => recErrorStatus(error) === 401;

function OnboardingPicker() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast, show: showToast } = useToast();
  const { mutateAsync: setReactionAsync } = useSetReaction();

  const [domain, setDomain] = useState<OnboardingDomain>("GAME");
  const [inputValue, setInputValue] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selection, dispatch] = useReducer(onboardingReducer, EMPTY_ONBOARDING_SELECTION);
  const [saving, setSaving] = useState(false);

  /** 저장이 도는 중인지. 상태가 아니라 ref 로도 잡는다 — `완료` 연타가 저장을 두 번 시작하지 못하게. */
  const savingRef = useRef(false);
  /** 저장 도중에 화면을 떠났는지. 떠난 뒤에는 이 화면 상태를 건드리지도, 이동시키지도 않는다. */
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const searching = keyword.length > 0;

  // 검색어가 없으면 useSearchWorks 는 enabled:false 라 요청을 보내지 않는다(훅 내부 규칙).
  const listQuery = useInfiniteWorks({ domain, size: GRID_PAGE_SIZE });
  const searchQuery = useSearchWorks(keyword, { domain, size: GRID_PAGE_SIZE });

  const works: WorkSummary[] = useMemo(() => {
    const source = searching
      ? (searchQuery.data?.content ?? [])
      : (listQuery.data?.pages ?? []).flatMap((page) => page.content);
    // 목록 정렬은 전순서(release_date DESC NULLS LAST, content_id ASC)라 쪽이 겹칠 일은 없다 —
    // 이 걸러내기는 방어적인 것이다(같은 id 가 두 번 오면 React key 가 충돌하고 타일이 두 장 된다).
    const seen = new Set<number>();
    const unique: WorkSummary[] = [];
    for (const work of source) {
      if (seen.has(work.id)) continue;
      seen.add(work.id);
      unique.push(work);
    }
    return unique;
  }, [searching, searchQuery.data, listQuery.data]);

  // 검색은 placeholderData(keepPreviousData) 라 칩을 바꾸면 **직전 분야의 결과**가 잠깐 남는다 —
  // 그동안은 스켈레톤을 보여 준다(게임↔나머지는 카드 비율까지 달라 더 튄다).
  const isLoading = searching
    ? searchQuery.isLoading || searchQuery.isPlaceholderData
    : listQuery.isLoading;
  // 보여 줄 것이 하나도 없을 때만 오류 화면이다 — "더 보기" 실패는 status 를 error 로 바꾸지만
  // 이미 받은 쪽들은 data 에 그대로 있다(for-you-page 와 같은 판정).
  const showErrorPanel = (searching ? searchQuery.isError : listQuery.isError) && works.length === 0;
  const counts = picksByDomain(selection);
  const canFinish = canFinishOnboarding(selection);

  const retry = () => {
    if (searching) void searchQuery.refetch();
    else void listQuery.refetch();
  };

  const loadMore = async () => {
    let failed = false;
    try {
      // fetchNextPage 는 거부하지 않는다 — 실패는 결과의 isError 로 온다(양쪽 다 받아 둔다).
      failed = (await listQuery.fetchNextPage()).isError;
    } catch {
      failed = true;
    }
    // 불러오는 사이에 화면을 떠났으면 토스트를 띄우지 않는다(떠난 화면에 타이머를 남기지 않는다).
    if (failed && aliveRef.current) showToast({ message: LOAD_MORE_ERROR }, 3000);
  };

  const togglePick = (pick: OnboardingPick) => {
    // 이미 서버에 들어간 것은 화면에서 뺄 수 없다(부분 실패 뒤 재시도 중일 때만 생긴다).
    if (isSaved(selection, pick.contentId)) {
      showToast({ message: "이미 좋아요에 담긴 작품이에요" }, 2500);
      return;
    }
    dispatch({ type: "toggle", pick });
  };

  const toggle = (work: WorkSummary) => togglePick(toOnboardingPick(work));

  /**
   * 좋아요가 시드를 바꿨다 — 저장 전에 받아 둔 추천 목록은 낡았다.
   * 추천 쿼리는 staleTime 무한 · 마운트 재조회 없음이라 버리지 않으면 /for-you 가
   * 방금 고친 취향을 무시하고 옛 `no_seed` 대체 목록을 그대로 보여 준다.
   * 로그인·로그아웃이 쓰는 것과 같은 짝(캐시 제거 + 체인 초기화)을 그대로 쓴다.
   */
  const purgeRecCache = useCallback(() => {
    queryClient.removeQueries({ queryKey: recKeys.root() });
    clearRecChains();
  }, [queryClient]);

  const finish = async () => {
    if (savingRef.current) return;
    const pending = pendingPicks(selection);
    if (pending.length === 0) {
      purgeRecCache();
      navigate(onboardingLandingPath(savedPicks(selection).map((pick) => pick.domain)));
      return;
    }

    savingRef.current = true;
    setSaving(true);
    // runOnboardingSave 는 절대 거부되지 않는다 — 성공·실패를 갈라서 돌려준다.
    const result = await runOnboardingSave(
      pending.map((pick) => pick.contentId),
      (contentId) => setReactionAsync({ contentId, state: "LIKE", rec: ONBOARDING_REC }),
      { isAuthError },
    );
    savingRef.current = false;

    const savedNow = pending.filter((pick) => result.saved.includes(pick.contentId));
    // 캐시는 이 화면 것이 아니다 — 화면을 떠났어도 한 건이라도 담겼으면 버려야 한다.
    if (savedNow.length > 0) purgeRecCache();

    // 저장 도중에 화면을 떠났으면 여기서 멈춘다(상태 갱신·이동은 이 화면 몫이다).
    if (!aliveRef.current) return;

    setSaving(false);
    // 저장이 도는 사이에 해제됐더라도 성공했으면 리듀서가 다시 담는다(saved ⊆ picks).
    const next =
      savedNow.length > 0
        ? onboardingReducer(selection, { type: "saved", picks: savedNow })
        : selection;
    if (savedNow.length > 0) dispatch({ type: "saved", picks: savedNow });

    const message = onboardingSaveMessage(result);
    if (message) {
      // 실패분은 고른 채로 남는다 — `완료` 를 다시 누르면 그것만 재시도된다.
      showToast({ message }, 4000);
      // 401 만 예외다: 몇 번을 눌러도 같은 401 이라 재시도가 아니라 로그인이 답이다.
      // (고른 것은 지우지 않는다 — 다시 로그인해 들어오면 처음부터 고르게 되지만 잃는 것은 없다.)
      if (result.authFailed) navigate("/login");
      return;
    }
    navigate(onboardingLandingPath(savedPicks(next).map((pick) => pick.domain)));
  };

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-32 pt-7">
      <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">
        좋아하는 작품을 골라주세요
      </h1>
      <p className="mt-1.5 text-[13.5px] text-ink-3">
        최소 3개, 분야마다 2개 이상 고르면 추천이 넓어져요
      </p>

      {/* 고른 작품 되짚기 — 다른 칩·검색에서 고른 것은 지금 그리드에 없어서 해제할 방법이 없다 */}
      {selection.picks.length > 0 && (
        <div className="mt-4">
          <p className="text-[12.5px] font-semibold text-ink-3">
            고른 작품 {selection.picks.length}
          </p>
          <ul className="mt-1.5 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {selection.picks.map((pick) => (
              <li
                key={pick.contentId}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface py-1.5 pl-[13px] pr-2 text-[13px] font-semibold text-ink"
              >
                <span className="max-w-[150px] truncate">{pick.title}</span>
                {isSaved(selection, pick.contentId) ? (
                  <>
                    {/* 서버에 담긴 것은 뺄 수 없다 — × 대신 담김 표시 */}
                    <CheckCircle
                      size={16}
                      weight="fill"
                      className="flex-none text-accent-ink"
                      aria-hidden="true"
                    />
                    <span className="sr-only">담김</span>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => togglePick(pick)}
                    disabled={saving}
                    aria-label={`${pick.title} 선택 해제`}
                    className="grid h-[18px] w-[18px] flex-none place-items-center rounded-full text-ink-2 transition-colors hover:bg-ink/10 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <X size={12} weight="bold" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex gap-1.5 overflow-x-auto scrollbar-hide lg:flex-wrap lg:overflow-visible">
        {ONBOARDING_DOMAINS.map((id) => (
          <DomainChip key={id} active={id === domain} onClick={() => setDomain(id)}>
            {counts[id] ? `${DOMAIN_LABEL_MAP[id]} ${counts[id]}` : DOMAIN_LABEL_MAP[id]}
          </DomainChip>
        ))}
      </div>

      {/* 검색은 지금 칩의 분야 안에서만 한다 — 그리드 카드 비율이 섞이지 않게 */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setKeyword(inputValue.trim());
        }}
        className="mt-3 flex h-10 w-full max-w-[380px] items-center gap-2 rounded-full border border-line bg-surface px-4 text-ink-3 transition-colors focus-within:border-line-strong"
      >
        <MagnifyingGlass size={16} className="flex-none" />
        <input
          type="search"
          aria-label={`${DOMAIN_LABEL_MAP[domain]} 작품 검색`}
          placeholder="작품 제목으로 찾기"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            // 입력을 비우면 검색을 끄고 기본 목록으로 돌아간다(별도 지우기 버튼 없이)
            if (event.target.value.trim().length === 0) setKeyword("");
          }}
          className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
        />
      </form>

      <p role="status" className="mt-4 text-[13.5px] font-semibold text-ink-2">
        {onboardingStatusText(selection)}
      </p>

      {isLoading ? (
        <div className={GRID_CLASS} aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <SkeletonCard key={index} variant={domain === "GAME" ? "landscape" : "portrait"} />
          ))}
        </div>
      ) : showErrorPanel ? (
        <div className="mt-7">
          <EmptyState
            icon={<WarningCircle size={44} />}
            title="작품을 불러오지 못했어요"
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            action={
              <button type="button" onClick={retry} className={PRIMARY_BUTTON}>
                다시 시도
              </button>
            }
          />
        </div>
      ) : works.length === 0 ? (
        <div className="mt-7">
          {searching ? (
            <EmptyState variant="note" title="검색 결과가 없어요" description="다른 제목으로 찾아보세요." />
          ) : (
            <EmptyState title="보여드릴 작품이 없어요" description="다른 분야를 눌러 보세요." />
          )}
        </div>
      ) : (
        <>
          <div className={GRID_CLASS}>
            {works.map((work) => (
              <OnboardingWorkTile
                key={work.id}
                work={work}
                selected={isPicked(selection, work.id)}
                onToggle={toggle}
                disabled={saving}
              />
            ))}
          </div>

          {/* 한 쪽이 실패해도 버튼은 남는다 — 실패는 토스트로 알리고 다시 누르면 재시도된다 */}
          {!searching && listQuery.hasNextPage && (
            <div className="mt-7 flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={listQuery.isFetchingNextPage}
                className={OUTLINE_BUTTON}
              >
                {listQuery.isFetchingNextPage ? "불러오는 중…" : "더 보기"}
              </button>
            </div>
          )}
        </>
      )}

      {/* 하단 고정 바 — 이 라우트에는 모바일 하단 탭이 없어서(public-layout 의 showNav 목록 밖) 겹치지 않는다 */}
      <div className="fixed bottom-0 left-0 w-full">
        <div className="mx-auto max-w-[1280px]">
          <BottomButton
            buttons={[
              { text: "건너뛰기", onClick: () => navigate("/home"), variant: "secondary", disabled: saving },
              {
                text: saving ? "담는 중…" : "완료",
                onClick: () => void finish(),
                variant: "primary",
                disabled: !canFinish || saving,
              },
            ]}
          />
        </div>
      </div>

      {/* 이 화면에는 고정 액션 바가 있다 — 토스트를 바 위로 올려 `완료` 클릭을 먹지 않게 한다 */}
      {toast && <Toast key={toast.id} message={toast.message} placement="above-bar" />}
    </div>
  );
}

export default function OnboardingPage() {
  const { isAuthenticated, authReady } = useAuth();

  // 토큰 복원이 끝나기 전에는 판정하지 않는다 — 새로고침에서 로그인 화면으로 잘못 튕기지 않게.
  if (!authReady) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 pb-20 pt-7">
        <div className={GRID_CLASS} aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <SkeletonCard key={index} variant="portrait" />
          ))}
        </div>
      </div>
    );
  }

  // 고른 작품을 좋아요로 저장하려면 토큰이 필요하다 — 비로그인은 로그인으로 보낸다(설계 §4-3).
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <OnboardingPicker />;
}
