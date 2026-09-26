import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowClockwise, CaretLeft, CaretRight, WarningCircle } from "@phosphor-icons/react";
import {
  HOME_PICK_CANDIDATES,
  HOME_REC_SET_SIZE,
  HOME_REC_SURFACE,
  HOME_REC_TAB_PARAM,
  REC_TAB_LABELS,
} from "@aod/shared/constants";
import { useMyLikes, useRecommendations, useSetReaction } from "@aod/shared/hooks";
import { recKeys } from "@aod/shared/queries";
import {
  collapsedIds,
  homeLikesCaption,
  homeRecCanRefresh,
  homeRecCanRestart,
  homeRecFeedbackEnabled,
  homeRecMode,
  homeRecSetLabel,
  homeRecShowsReason,
  homeRecTitle,
  mergeRecPages,
  noSeedPlatformHint,
  parseRecTab,
  railNextLeft,
  railPrevLeft,
  railWindow,
  railWindowLabel,
  recCardContext,
  recCardFields,
  recErrorStatus,
  recHiddenReducer,
  recLoadedMoreFields,
  recTabChangedFields,
  type RailMetrics,
  type RailWindow,
  type RecHiddenEntry,
} from "@aod/shared/rec";
import type { RecRequestContext } from "@aod/shared/tracking";
import { REC_TABS, type ReactionState, type RecCard, type RecTab } from "@aod/shared/types";
import { useAuth } from "../../contexts/AuthContext";
import { readChainState, recChainStateKey, writeChainState } from "../../hooks/recChainState";
import { clearRecChains, useRecChain, type RecChain } from "../../hooks/useRecChain";
import { useToast } from "../../hooks/useToast";
import { useTracker } from "../../tracking/trackerContext";
import HiddenCardSlot from "../rec/HiddenCardSlot";
import DomainChip from "../ui/DomainChip";
import Toast from "../ui/Toast";
import HomeRecCard from "./HomeRecCard";
import HomeRecEndCard from "./HomeRecEndCard";
import HomeTastePicker from "./HomeTastePicker";

const NO_HIDDEN: readonly RecHiddenEntry[] = [];
const NO_LIKED: Record<number, boolean> = {};
/** 좋아요 미니 포스터 수. */
const LIKE_MINIS = 3;

/** 가린 쓰기 1건의 결과. ok=false 면 서버에 남은 것이 없다 — 되돌릴 것도 없다. */
interface HideOutcome {
  ok: boolean;
  previousState: ReactionState;
  /** 실패 원인 — 401 이면 토스트를 전역 안내에 맡긴다. */
  error?: unknown;
}

/** 상세에서 돌아와 다시 그릴 때는 흐린 자리를 닫는다 — "그 자리 되돌리기"는 홈에 머무는 동안만이다. */
const initialHidden = (key: string) =>
  recHiddenReducer(readChainState(key)?.hidden ?? NO_HIDDEN, { type: "collapse" });

const RAIL_CLASS = "scrollbar-rail mt-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-1.5";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type EnqueueWrite = <T>(contentId: number, task: () => Promise<T>) => Promise<T>;

/**
 * 홈 추천 한 줄 — 추천이 보이는 유일한 곳 (설계 2026-09-26-home-rec-only; 추천 탭 /for-you 는 없앴다).
 * 분야 칩 · 한 묶음 30개 가로 줄 · 순환 화살표 · 위치 표시 · 새 추천 받기(같은 체인의 다음 쪽).
 * 모드(personal·anon·pick·popular·error)는 **보이는 묶음**의 대체 사유와 요청 상태로 정한다(homeRecMode).
 */
export default function HomeRecRail() {
  const { token } = useAuth();
  // 로그인 상태가 바뀌면(로그아웃·401·다른 계정) 통째로 새로 띄운다 — 숨김·👍·위치는 마운트 때 저장소에서
  // 읽으므로, 그대로 두면 이전 세션의 상태가 남는다. 저장소는 clearRecChains 가 이미 비웠다.
  return <HomeRecSection key={token ?? "anon"} />;
}

/**
 * 바깥: 칩(URL `?rec=`) · 체인 · 토스트 · 쓰기 대기열. 칩을 바꿔도 토스트와 진행 중인 쓰기가 사라지지 않게
 * 여기 둔다. 몸통은 `탭:nonce` 로 다시 띄운다 — 숨김·👍·위치는 마운트 때 한 번 읽으므로 키가 바뀌면 새로 읽어야 한다.
 */
function HomeRecSection() {
  const tracker = useTracker();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseRecTab(searchParams.get(HOME_REC_TAB_PARAM));
  const chain = useRecChain(tab, { continueWithoutCache: true });

  const toast = useToast();
  const { show: showToast } = toast;
  const endRef = useRef<HTMLSpanElement>(null);

  /**
   * 작품마다 쓰기를 한 줄로 세운다(👍·👎·되돌리기). 자리에서 바로 되돌리고 다시 👎 할 수 있어서,
   * 앞 요청이 끝나기 전에 뒤 요청을 보내면 서버가 받은 순서와 화면이 어긋난다.
   */
  const writeChainRef = useRef(new Map<number, Promise<unknown>>());
  const enqueueWrite = useCallback<EnqueueWrite>((contentId, task) => {
    const previous = writeChainRef.current.get(contentId) ?? Promise.resolve();
    const next = previous.then(task, task);
    const settled = next.catch(() => undefined);
    writeChainRef.current.set(contentId, settled);
    void settled.then(() => {
      if (writeChainRef.current.get(contentId) === settled) writeChainRef.current.delete(contentId);
    });
    return next;
  }, []);
  /** 새 추천을 받기 전에 날아가는 👍/👎 를 모두 기다린다 — 서버는 요청마다 시드를 새로 읽는다. */
  const waitForWrites = useCallback(async () => {
    // 기다리는 사이 새로 누른 쓰기도 기다린다 — 대기열이 빌 때까지.
    while (writeChainRef.current.size > 0) {
      await Promise.allSettled([...writeChainRef.current.values()]);
    }
  }, []);

  /** 401 은 전역 안내("로그인이 만료됐어요")가 맡는다 — 같이 띄우면 같은 자리에 두 장이 겹친다. */
  const reportError = useCallback(
    (error: unknown, message = "잠시 후 다시 시도해 주세요") => {
      if (recErrorStatus(error) !== 401) showToast({ message }, 3000);
    },
    [showToast],
  );
  const notify = useCallback((message: string) => showToast({ message }, 4000), [showToast]);

  /** 칩을 눌렀을 때만 기록한다 — URL 로 바뀐 경우(온보딩 도착·뒤로가기)는 사용자 선택이 아니다. */
  const changeTab = useCallback(
    (next: RecTab, via?: "hint") => {
      if (next === tab) return;
      tracker.track("rec_tab_changed", recTabChangedFields({ from: tab, to: next, surface: HOME_REC_SURFACE, via }));
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === "all") params.delete(HOME_REC_TAB_PARAM);
          else params.set(HOME_REC_TAB_PARAM, next);
          return params;
        },
        // 홈의 한 섹션이다 — 뒤로가기가 칩 이력으로 차지 않게, 화면도 위로 튀지 않게
        { replace: true, preventScrollReset: true },
      );
    },
    [setSearchParams, tab, tracker],
  );

  const skipRail = useCallback(() => endRef.current?.focus(), []);

  return (
    <section className="mt-14" aria-labelledby="home-rec-title">
      <HomeRecBody
        key={`${tab}:${chain.nonce}`}
        tab={tab}
        chain={chain}
        onTabChange={changeTab}
        enqueueWrite={enqueueWrite}
        waitForWrites={waitForWrites}
        reportError={reportError}
        notify={notify}
        onSkip={skipRail}
      />
      <span ref={endRef} tabIndex={-1} className="sr-only">
        추천 끝
      </span>
      {toast.toast && (
        <Toast
          key={toast.toast.id}
          message={toast.toast.message}
          actionLabel={toast.toast.actionLabel}
          onAction={toast.toast.onAction}
        />
      )}
    </section>
  );
}

interface HomeRecBodyProps {
  tab: RecTab;
  chain: RecChain;
  onTabChange: (tab: RecTab, via?: "hint") => void;
  enqueueWrite: EnqueueWrite;
  waitForWrites: () => Promise<void>;
  reportError: (error: unknown, message?: string) => void;
  notify: (message: string) => void;
  onSkip: () => void;
}

function HomeRecBody({
  tab,
  chain,
  onTabChange,
  enqueueWrite,
  waitForWrites,
  reportError,
  notify,
  onSkip,
}: HomeRecBodyProps) {
  const { isAuthenticated } = useAuth();
  const tracker = useTracker();
  const queryClient = useQueryClient();
  const railId = useId();
  const stateKey = recChainStateKey(tab, chain.nonce);
  const { remember, restart, restartOnChainExpired } = chain;

  const [hidden, dispatchHidden] = useReducer(recHiddenReducer, stateKey, initialHidden);
  const [likedIds, setLikedIds] = useState<Record<number, boolean>>(
    () => readChainState(stateKey)?.liked ?? NO_LIKED,
  );
  const hiddenRef = useRef(hidden);
  const likedRef = useRef(likedIds);
  /**
   * 가로 위치 — 상세에서 돌아오거나 칩을 오가도 보던 자리로(설계 검수 B4). **어느 묶음의 위치인지**(requestId)를
   * 같이 둔다 — 받는 중에 떠났다 돌아오면 새 묶음이 옛 묶음의 끝 위치에 놓이지 않게(구현 검수 M4).
   */
  const scrollLeftRef = useRef(readChainState(stateKey)?.scrollLeft ?? 0);
  const scrollRequestRef = useRef(readChainState(stateKey)?.scrollRequestId ?? null);
  const saveState = useCallback(() => {
    writeChainState(stateKey, {
      hidden: hiddenRef.current,
      liked: likedRef.current,
      scrollLeft: scrollLeftRef.current,
      scrollRequestId: scrollRequestRef.current,
    });
  }, [stateKey]);
  useEffect(() => {
    hiddenRef.current = hidden;
    likedRef.current = likedIds;
    saveState();
  }, [hidden, likedIds, saveState]);

  const query = useRecommendations(tab, chain.nonce, {
    initialChainId: chain.initialChainId,
    size: HOME_REC_SET_SIZE,
    surface: HOME_REC_SURFACE,
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const pages = query.data?.pages;
  /** 보이는 묶음 = 받은 쪽 중 마지막 쪽 하나 — 쪽을 합치지 않는다. */
  const lastPage = pages && pages.length > 0 ? pages[pages.length - 1] : undefined;
  const view = useMemo(
    () => mergeRecPages(lastPage ? [lastPage] : [], collapsedIds(hidden)),
    [lastPage, hidden],
  );
  const mode = homeRecMode({ view: lastPage ? view : null, error: query.error, isAuthenticated });
  const title = homeRecTitle(mode, isAuthenticated);
  const showReason = homeRecShowsReason(mode);
  const feedbackEnabled = isAuthenticated && homeRecFeedbackEnabled(mode);
  const likedCount = useMemo(() => Object.values(likedIds).filter(Boolean).length, [likedIds]);
  const canRefresh = homeRecCanRefresh(mode, hasNextPage);
  const canRestart = homeRecCanRestart(mode, likedCount);
  const exhausted = mode === "personal" && !hasNextPage && !isFetchingNextPage;
  const setLabel = mode === "personal" ? homeRecSetLabel(lastPage?.pageDepth ?? 0) : null;

  // 서버가 준 체인을 기억한다. 대체 응답의 chainId 는 저장된 값이 아니라 다음 요청에 보내면 404 다.
  // 더 받을 게 없는 체인(소진 · 체인 저장 실패)도 기억하지 않는다 — 새로고침 뒤 이어 받기(continueWithoutCache)가
  // 404 로 헛돌거나 카드 0장(empty) 대체를 받는다(구현 검수 M5).
  useEffect(() => {
    if (!lastPage) return;
    remember(lastPage.fallback || !lastPage.hasMore ? null : lastPage.chainId);
  }, [lastPage, remember]);

  // 좋아요 미니 포스터 — 개인화일 때만 부른다(비로그인 호출은 400).
  const likes = useMyLikes(0, LIKE_MINIS, isAuthenticated && mode === "personal");
  const likeWorks = likes.data?.content ?? [];
  const likesCaption = homeLikesCaption(likes.data?.totalElements ?? 0, likeWorks.length);

  const setReaction = useSetReaction();
  const { mutateAsync: setReactionAsync } = setReaction;

  /** contentId → 날아가는 중인 싫어요 쓰기. 되돌리기는 이 약속이 끝난 뒤에 반대 요청을 보낸다. */
  const pendingHideRef = useRef(new Map<number, Promise<HideOutcome>>());
  /** 반응 쓰기가 날아가는 중인 카드 — 👍 연타로 요청이 쌓이지 않게 한다. */
  const likeBusyRef = useRef(new Set<number>());
  /** 다음 렌더에서 포커스를 옮길 곳 — 👎 뒤에는 되돌리기, 되돌린 뒤에는 카드. */
  const focusRequestRef = useRef<{ contentId: number; target: "undo" | "card" } | null>(null);
  useEffect(() => {
    focusRequestRef.current = null; // 자식이 마운트되며 한 번 쓰고 나면 비운다 (부모 effect 는 자식 뒤에 돈다)
  });

  /** 새 묶음을 받은 뒤 첫 카드로 포커스 — 끝 카드의 버튼이 스켈레톤에 사라져 포커스가 빠지지 않게. */
  const focusFirstRef = useRef(false);

  /**
   * 오류는 한 곳에서 처리한다.
   * 404 = 체인 없음·만료 → 새 체인으로 딱 한 번(몸통이 새 키로 다시 뜬다).
   * 받아 둔 묶음이 있으면(새 추천 받기 실패 · 이어 받은 쪽이 대체) 그대로 두고 알린다.
   */
  const reportedErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (!query.isError) return;
    if (reportedErrorRef.current === query.error) return;
    reportedErrorRef.current = query.error;
    focusFirstRef.current = false;
    if (restartOnChainExpired(query.error)) return;
    if (query.data) reportError(query.error, "새 추천을 받지 못했어요 · 잠시 후 다시 눌러 주세요");
  }, [query.data, query.error, query.isError, reportError, restartOnChainExpired]);

  const openCard = useCallback(
    (card: RecCard) => tracker.track("card_clicked", recCardFields(card, HOME_REC_SURFACE)),
    [tracker],
  );

  const toggleLike = useCallback(
    (card: RecCard) => {
      const contentId = card.work.id;
      if (likeBusyRef.current.has(contentId)) return;
      const nextLiked = !likedIds[contentId];
      likeBusyRef.current.add(contentId);
      setLikedIds((prev) => ({ ...prev, [contentId]: nextLiked }));
      void enqueueWrite(contentId, () =>
        setReactionAsync({
          contentId,
          state: nextLiked ? "LIKE" : "NONE",
          rec: recCardContext(card, HOME_REC_SURFACE),
        }),
      )
        .catch((error: unknown) => {
          setLikedIds((prev) => ({ ...prev, [contentId]: !nextLiked }));
          reportError(error);
        })
        .finally(() => {
          likeBusyRef.current.delete(contentId);
        });
    },
    [enqueueWrite, likedIds, reportError, setReactionAsync],
  );

  const undo = useCallback(
    async (contentId: number) => {
      const entry = hiddenRef.current.find((item) => item.contentId === contentId);
      if (!entry) return;
      focusRequestRef.current = { contentId, target: "card" };
      dispatchHidden({ type: "restore", contentId });

      const rec: RecRequestContext = {
        source: HOME_REC_SURFACE,
        requestId: entry.requestId,
        impressionId: entry.impressionId,
      };
      try {
        // 👎 쓰기 뒤에 줄을 선다 — 그 결과(previousState)를 보고 돌려놓는다.
        await enqueueWrite(contentId, async () => {
          const pending = pendingHideRef.current.get(contentId);
          const { ok, previousState } = await (pending ??
            Promise.resolve<HideOutcome>({ ok: true, previousState: entry.previousState }));
          // 서버가 👎 를 기록하지 못했으면 되돌릴 것도 없다 (카드는 이미 되살렸다).
          if (!ok) return;
          // 돌려놓을 상태는 서버가 알려 준 previousState 다 — 좋아요였던 작품은 좋아요로 돌아간다.
          await setReactionAsync({ contentId, state: previousState, rec });
        });
      } catch (error) {
        dispatchHidden({ type: "hide", entry });
        reportError(error);
      }
    },
    [enqueueWrite, reportError, setReactionAsync],
  );

  const dislike = useCallback(
    async (card: RecCard) => {
      const contentId = card.work.id;
      const entry: RecHiddenEntry = {
        contentId,
        kind: "dislike",
        title: card.work.title,
        requestId: card.requestId,
        impressionId: card.impressionId,
        previousState: "NONE",
        slotVisible: true,
      };
      focusRequestRef.current = { contentId, target: "undo" };
      dispatchHidden({ type: "hide", entry });

      // 이 약속은 절대 거부되지 않는다 — 되돌리기가 그대로 await 할 수 있어야 한다.
      const write: Promise<HideOutcome> = enqueueWrite(contentId, async () => {
        try {
          const result = await setReactionAsync({
            contentId,
            state: "DISLIKE",
            rec: recCardContext(card, HOME_REC_SURFACE),
          });
          return { ok: true, previousState: result.previousState };
        } catch (error) {
          return { ok: false, previousState: "NONE", error };
        }
      });
      pendingHideRef.current.set(contentId, write);

      const outcome = await write;
      if (outcome.ok) {
        dispatchHidden({ type: "confirm", contentId, previousState: outcome.previousState });
      } else if (hiddenRef.current.some((item) => item.contentId === contentId)) {
        dispatchHidden({ type: "restore", contentId });
        reportError(outcome.error);
      }
      if (pendingHideRef.current.get(contentId) === write) pendingHideRef.current.delete(contentId);
    },
    [enqueueWrite, reportError, setReactionAsync],
  );

  /** 이 몸통이 아직 떠 있는지 — 쓰기를 기다리는 사이 칩을 바꾸면 떠난 몸통이 요청하지 않게. */
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /**
   * 새 추천 받기 — 같은 체인의 다음 쪽. 그사이 누른 👍/👎 쓰기가 끝난 뒤에 부른다(서버가 시드를 새로 읽는다).
   * 잠금은 **동기**로 건다 — 쓰기를 기다리는 동안 두 번 누르면(머리 버튼 → 끝 카드) 두 번째가 첫 요청을 취소하고
   * 다시 불러, 서버가 "본 작품"으로 올린 30개가 화면에 나오지도 않고 사라진다(구현 검수 M1).
   */
  const refreshingRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshSet = useCallback(async () => {
    if (refreshingRef.current || isFetchingNextPage || !hasNextPage) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      await waitForWrites();
      if (!aliveRef.current) return;
      tracker.track(
        "rec_loaded_more",
        recLoadedMoreFields({
          requestId: view.requestId,
          pageDepth: view.pageDepth,
          tab,
          surface: HOME_REC_SURFACE,
        }),
      );
      focusFirstRef.current = true;
      await fetchNextPage({ cancelRefetch: false });
    } finally {
      refreshingRef.current = false;
      if (aliveRef.current) setRefreshing(false);
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, tab, tracker, view.pageDepth, view.requestId, waitForWrites]);

  /** 체인을 새로 연다(내 취향으로 다시 받기 · 처음부터 다시 받기) — 방금 누른 👍 가 시드가 된 뒤에(구현 검수 M2). */
  const [restarting, setRestarting] = useState(false);
  const restartAfterWrites = useCallback(async () => {
    setRestarting(true);
    await waitForWrites();
    if (aliveRef.current) restart();
  }, [restart, waitForWrites]);

  /**
   * 취향을 다 골랐다 — 추천을 다시 받는다. 옛 캐시를 버리고(removeQueries) 체인을 새로 열면
   * 몸통이 새 키로 다시 떠서 **한 번만** 부른다(예전 resetQueries 는 옛 키 · 새 키로 두 번 불렀다 — 검수 B8).
   */
  const refreshAfterPick = useCallback(() => {
    queryClient.removeQueries({ queryKey: recKeys.root() });
    clearRecChains();
    restart();
  }, [queryClient, restart]);

  // ── 가로 줄: 위치 표시 · 순환 화살표 · 위치 복원 ──
  const railRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<RailMetrics | null>(null);
  const [railWin, setRailWin] = useState<RailWindow | null>(null);
  const cardCount = view.cards.length;

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const firstItem = rail.firstElementChild as HTMLElement | null;
    const gap = Number.parseFloat(getComputedStyle(rail).columnGap) || 0;
    const metrics: RailMetrics = {
      scrollLeft: rail.scrollLeft,
      clientWidth: rail.clientWidth,
      scrollWidth: rail.scrollWidth,
      itemWidth: firstItem?.offsetWidth ?? 168,
      gap,
      count: cardCount,
      hasEndCard: cardCount > 0,
    };
    metricsRef.current = metrics;
    const next = railWindow(metrics);
    setRailWin((prev) =>
      prev && prev.first === next.first && prev.last === next.last && prev.page === next.page &&
      prev.pages === next.pages && prev.total === next.total
        ? prev
        : next,
    );
  }, [cardCount]);

  const lastRequestIdRef = useRef(lastPage?.requestId);
  lastRequestIdRef.current = lastPage?.requestId;
  const frameRef = useRef(0);
  const onRailScroll = useCallback(() => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      const rail = railRef.current;
      if (rail) {
        scrollLeftRef.current = rail.scrollLeft;
        scrollRequestRef.current = lastRequestIdRef.current ?? null;
      }
      measure();
      saveState();
    });
  }, [measure, saveState]);
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  const busy = refreshing || isFetchingNextPage;
  const showRail = cardCount > 0 && mode !== "pick" && mode !== "error";

  // 크기가 바뀌면(창 · 글꼴) 다시 잰다.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(rail);
    return () => observer.disconnect();
  }, [measure, showRail]);

  // 줄이 처음 그려질 때 저장된 위치로 — 목록이 도착한 뒤라야 스크롤할 폭이 있다. **같은 묶음일 때만**.
  const restoredRef = useRef(false);
  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail || !showRail) return;
    if (!restoredRef.current) {
      restoredRef.current = true;
      if (scrollLeftRef.current > 0 && scrollRequestRef.current === lastPage?.requestId) {
        rail.scrollLeft = scrollLeftRef.current;
      }
    }
    measure();
  }, [lastPage?.requestId, measure, showRail]);

  // 새 묶음을 받으면 처음으로 되돌리고(새 작품들이다), 새 추천 받기로 온 것이면 첫 카드로 포커스.
  const lastRequestId = lastPage?.requestId;
  const shownRequestRef = useRef(lastRequestId);
  useLayoutEffect(() => {
    if (shownRequestRef.current === lastRequestId) return;
    shownRequestRef.current = lastRequestId;
    scrollLeftRef.current = 0;
    scrollRequestRef.current = lastRequestId ?? null;
    const rail = railRef.current;
    if (rail) rail.scrollLeft = 0;
    saveState();
    measure();
    if (focusFirstRef.current) {
      focusFirstRef.current = false;
      rail?.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
    }
  }, [lastRequestId, measure, saveState]);

  /** 화살표 — 한 화면씩, 끝에서 처음으로 · 처음에서 끝으로는 **즉시**(부드럽게 되감으면 사이 카드가 노출로 쌓인다). */
  const scrollRail = useCallback(
    (direction: "next" | "prev") => {
      const rail = railRef.current;
      measure();
      const metrics = metricsRef.current;
      if (!rail || !metrics) return;
      const { left, wrapped } = direction === "next" ? railNextLeft(metrics) : railPrevLeft(metrics);
      rail.scrollTo({ left, behavior: wrapped || prefersReducedMotion() ? "auto" : "smooth" });
    },
    [measure],
  );
  const toFirst = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollTo({ left: 0, behavior: "auto" });
    rail.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
  }, []);

  const hiddenById = useMemo(() => new Map(hidden.map((entry) => [entry.contentId, entry])), [hidden]);

  let body: ReactNode;
  if (query.isPending || (query.isFetching && !query.data)) {
    body = <RailSkeleton />;
  } else if (mode === "error") {
    body = (
      <div
        role="status"
        className="mt-4 flex items-center gap-2.5 rounded-panel border border-line bg-surface px-4 py-3.5 text-sm text-ink-2"
      >
        <WarningCircle size={18} className="flex-none text-ink-3" />
        <span className="min-w-0">추천을 불러오지 못했어요.</span>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="ml-auto flex-none rounded-full border border-line bg-canvas px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-line-strong"
        >
          다시 시도
        </button>
      </div>
    );
  } else if (mode === "pick") {
    body = (
      <HomeTastePicker
        candidates={view.cards.slice(0, HOME_PICK_CANDIDATES).map((card) => card.work)}
        onSaved={refreshAfterPick}
        notify={notify}
      />
    );
  } else {
    const cards = view.cards;
    body = (
      <>
        {mode === "anon" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-surface px-5 py-4 shadow-card">
            <div>
              <p className="text-[15px] font-bold text-ink">로그인하면 여기에 취향 추천이 떠요</p>
              <p className="mt-0.5 text-[13px] text-ink-2">
                좋아요한 작품을 바탕으로 게임·영화·시리즈·웹툰·웹소설에서 골라드려요
              </p>
            </div>
            <Link
              to="/login"
              className="flex-none rounded-full bg-ink px-[18px] py-2 text-[13.5px] font-semibold text-surface transition-opacity hover:opacity-85"
            >
              로그인
            </Link>
          </div>
        )}
        {cards.length === 0 ? (
          mode !== "anon" && <p className="mt-4 text-[13.5px] text-ink-3">지금은 보여드릴 작품이 없어요.</p>
        ) : (
          <>
            <button
              type="button"
              onClick={onSkip}
              className="sr-only focus:not-sr-only focus:mt-3 focus:inline-block focus:rounded-full focus:border focus:border-line-strong focus:bg-surface focus:px-3.5 focus:py-1.5 focus:text-[13px] focus:font-semibold focus:text-ink"
            >
              추천 건너뛰기
            </button>
            <div className="relative">
              {/* 화살표는 DOM 에서 줄 앞 — 키보드로 카드 90개를 지나기 전에 닿게 */}
              {railWin && railWin.pages > 1 && (
                <>
                  <RailArrow direction="prev" controls={railId} onClick={() => scrollRail("prev")} />
                  <RailArrow direction="next" controls={railId} onClick={() => scrollRail("next")} />
                </>
              )}
              <div
                ref={railRef}
                id={railId}
                role="region"
                aria-label="추천 목록"
                aria-busy={busy}
                tabIndex={0}
                onScroll={onRailScroll}
                className={`${RAIL_CLASS} transition-opacity ${busy ? "pointer-events-none opacity-40" : ""}`}
              >
                {cards.map((card) => {
                  const entry = hiddenById.get(card.work.id);
                  const focus = focusRequestRef.current;
                  if (feedbackEnabled && entry?.slotVisible === true) {
                    return (
                      <HiddenCardSlot
                        key={card.work.id}
                        work={card.work}
                        message="덜 보여드릴게요"
                        onUndo={() => void undo(card.work.id)}
                        autoFocusUndo={focus?.contentId === card.work.id && focus.target === "undo"}
                        className="w-[168px] flex-none snap-start"
                      />
                    );
                  }
                  return (
                    <HomeRecCard
                      key={card.work.id}
                      card={card}
                      showReason={showReason}
                      onOpen={openCard}
                      autoFocus={focus?.contentId === card.work.id && focus.target === "card"}
                      feedback={
                        feedbackEnabled
                          ? {
                              liked: !!likedIds[card.work.id],
                              onLike: () => toggleLike(card),
                              onDislike: () => void dislike(card),
                            }
                          : null
                      }
                    />
                  );
                })}
                <HomeRecEndCard
                  count={cards.length}
                  personal={mode === "personal"}
                  canRefresh={canRefresh}
                  refreshing={busy}
                  onRefresh={() => void refreshSet()}
                  onFirst={toFirst}
                />
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  const platformHint =
    mode === "popular" && view.fallbackReason === "no_seed_platform" ? noSeedPlatformHint(tab) : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="home-rec-title" className="text-[21px] font-extrabold tracking-[-0.02em] text-ink">
          {title}
        </h2>
        {setLabel && (
          <span className="rounded-full bg-accent-tint px-2.5 py-0.5 text-[12px] font-semibold text-accent-ink">
            {setLabel}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {showRail && railWin && railWin.total > 0 && (
            <span className="text-[13px] tabular-nums text-ink-2">{railWindowLabel(railWin)}</span>
          )}
          {showRail && railWin && railWin.pages > 1 && (
            <span className="hidden items-center gap-[3px] md:flex" aria-hidden="true">
              {Array.from({ length: railWin.pages }, (_, index) => (
                <i
                  key={index}
                  className={`h-[3px] w-3.5 rounded-full ${index === railWin.page ? "bg-ink" : "bg-line-strong"}`}
                />
              ))}
            </span>
          )}
          {canRefresh && (
            <button
              type="button"
              onClick={() => void refreshSet()}
              aria-disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink aria-disabled:opacity-50"
            >
              {busy ? "받는 중…" : "새 추천 받기"}
              <ArrowClockwise size={14} aria-hidden="true" />
            </button>
          )}
          {canRestart && (
            <button
              type="button"
              onClick={() => void restartAfterWrites()}
              disabled={restarting}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink disabled:opacity-50"
            >
              내 취향으로 다시 받기
              <ArrowClockwise size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {mode === "personal" && likesCaption && (
        <Link
          to="/profile/likes"
          className="mt-1.5 inline-flex items-center gap-2 text-[13px] text-ink-2 transition-colors hover:text-ink"
        >
          <span className="flex" aria-hidden="true">
            {likeWorks.filter((work) => work.thumbnail).map((work, index) => (
              <img
                key={work.id}
                src={work.thumbnail ?? ""}
                alt=""
                className={`h-[30px] w-[22px] rounded-[4px] border-2 border-canvas bg-line object-cover ${index > 0 ? "-ml-1.5" : ""}`}
              />
            ))}
          </span>
          {likesCaption}
        </Link>
      )}
      {platformHint && (
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
          {platformHint.text}
          {platformHint.switchTo && (
            <button
              type="button"
              onClick={() => onTabChange(platformHint.switchTo as RecTab, "hint")}
              className="inline-flex items-center gap-[3px] font-semibold text-ink transition-colors hover:text-accent-ink"
            >
              {REC_TAB_LABELS[platformHint.switchTo]} 추천 보기
              <CaretRight size={13} aria-hidden="true" />
            </button>
          )}
        </p>
      )}

      <div className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-hide" role="group" aria-label="추천 분야">
        {REC_TABS.map((value) => (
          <DomainChip key={value} active={value === tab} onClick={() => onTabChange(value)}>
            {REC_TAB_LABELS[value]}
          </DomainChip>
        ))}
      </div>

      {exhausted && lastPage && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
          지금은 더 고를 추천이 없어요
          <button
            type="button"
            onClick={() => void restartAfterWrites()}
            disabled={restarting}
            className="font-semibold text-ink transition-colors hover:text-accent-ink disabled:opacity-50"
          >
            처음부터 다시 받기
          </button>
        </p>
      )}

      {body}
    </>
  );
}

/** 데스크톱 화살표 — 모바일은 손가락으로 넘긴다. 포스터 높이 가운데(168px × 3/2 = 252px 의 절반). */
function RailArrow({
  direction,
  controls,
  onClick,
}: {
  direction: "prev" | "next";
  controls: string;
  onClick: () => void;
}) {
  const Icon = direction === "prev" ? CaretLeft : CaretRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-controls={controls}
      aria-label={direction === "prev" ? "이전 추천" : "다음 추천"}
      className={`absolute top-[104px] z-10 hidden h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-surface text-ink shadow-card transition-colors hover:border-ink md:inline-flex ${
        direction === "prev" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"
      }`}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

function RailSkeleton() {
  return (
    <div aria-hidden="true" className="mt-4 flex gap-3.5 overflow-hidden pb-1.5">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="w-[168px] flex-none animate-pulse">
          <div className="aspect-[2/3] rounded-panel border border-line bg-line" />
          <div className="mt-[9px] h-4 w-4/5 rounded-input bg-line" />
          <div className="mt-1.5 h-3 w-3/5 rounded-input bg-canvas" />
        </div>
      ))}
    </div>
  );
}
