import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CaretRight, WarningCircle } from "@phosphor-icons/react";
import { HOME_REC_SIZE, HOME_REC_SURFACE } from "@aod/shared/constants";
import { useMyLikes, useRecommendations, useSetReaction } from "@aod/shared/hooks";
import { recKeys } from "@aod/shared/queries";
import {
  collapsedIds,
  homeLikesCaption,
  homeRecFeedbackEnabled,
  homeRecMode,
  homeRecShowsReason,
  homeRecTitle,
  mergeRecPages,
  recCardContext,
  recCardFields,
  recHiddenReducer,
  type RecHiddenEntry,
} from "@aod/shared/rec";
import type { RecRequestContext } from "@aod/shared/tracking";
import type { ReactionState, RecCard } from "@aod/shared/types";
import { useAuth } from "../../contexts/AuthContext";
import { readChainState, recChainStateKey, writeChainState } from "../../hooks/recChainState";
import { clearRecChains } from "../../hooks/useRecChain";
import { useToast } from "../../hooks/useToast";
import { newUuid } from "../../tracking/browserIds";
import { useTracker } from "../../tracking/trackerContext";
import HiddenCardSlot from "../rec/HiddenCardSlot";
import Toast from "../ui/Toast";
import HomeRecCard from "./HomeRecCard";
import HomeTastePicker from "./HomeTastePicker";

/**
 * 홈 추천 릴의 체인 nonce. 탭(페이지)을 연 동안 같다 — react-query 캐시(staleTime ∞ · gcTime 30분)가
 * 홈에 다시 들어올 때 같은 목록을 준다. `home:` 으로 시작해 추천 탭 체인 키(`all:{nonce}`)와 겹치지 않는다.
 * 추천 탭의 체인 저장소(useRecChain)는 쓰지 않는다 — 같은 "all" 키를 쓰면 추천 탭 "전체"와 캐시까지 섞인다.
 */
const HOME_NONCE = `home:${newUuid()}`;
const CHAIN_KEY = recChainStateKey("all", HOME_NONCE);

const NO_HIDDEN: readonly RecHiddenEntry[] = [];
const NO_LIKED: Record<number, boolean> = {};
/** 좋아요 미니 포스터 수. */
const LIKE_MINIS = 3;

/** 가린 쓰기 1건의 결과. ok=false 면 서버에 남은 것이 없다 — 되돌릴 것도 없다. */
interface HideOutcome {
  ok: boolean;
  previousState: ReactionState;
}

/** 상세에서 돌아와 다시 그릴 때는 흐린 자리를 닫는다 — "그 자리 되돌리기"는 홈에 머무는 동안만이다. */
const initialHidden = (key: string) =>
  recHiddenReducer(readChainState(key)?.hidden ?? NO_HIDDEN, { type: "collapse" });

const RAIL_CLASS = "scrollbar-rail mt-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto pb-1.5";

/**
 * 홈의 "방금 올라온 리뷰" 자리에 들어가는 추천 한 줄 (홈 설계 2026-09-25).
 * 모드(personal·anon·pick·popular·error)는 응답의 대체 사유와 요청 상태로 정한다(homeRecMode).
 * 제목과 "추천 더 보기"는 모든 모드에서 그린다 — 모바일에서 추천 탭으로 가는 길이 이 섹션뿐이다.
 */
export default function HomeRecRail() {
  const { isAuthenticated } = useAuth();
  const tracker = useTracker();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { show: showToast } = toast;

  const [hidden, dispatchHidden] = useReducer(recHiddenReducer, CHAIN_KEY, initialHidden);
  const [likedIds, setLikedIds] = useState<Record<number, boolean>>(
    () => readChainState(CHAIN_KEY)?.liked ?? NO_LIKED,
  );
  const hiddenRef = useRef(hidden);
  useEffect(() => {
    hiddenRef.current = hidden;
    writeChainState(CHAIN_KEY, { hidden, liked: likedIds });
  }, [hidden, likedIds]);

  const query = useRecommendations("all", HOME_NONCE, {
    size: HOME_REC_SIZE,
    surface: HOME_REC_SURFACE,
  });
  const view = useMemo(
    () => mergeRecPages(query.data?.pages ?? [], collapsedIds(hidden)),
    [query.data, hidden],
  );
  const mode = homeRecMode({
    view: query.data ? view : null,
    error: query.error,
    isAuthenticated,
  });
  const title = homeRecTitle(mode, isAuthenticated);
  const showReason = homeRecShowsReason(mode);
  const feedbackEnabled = homeRecFeedbackEnabled(mode);

  // 좋아요 미니 포스터 — 개인화일 때만 부른다(비로그인 호출은 400).
  const likes = useMyLikes(0, LIKE_MINIS, isAuthenticated && mode === "personal");
  const likeWorks = likes.data?.content ?? [];
  const likesCaption = homeLikesCaption(likes.data?.totalElements ?? 0, likeWorks.length);

  const setReaction = useSetReaction();
  const { mutateAsync: setReactionAsync } = setReaction;

  /** contentId → 날아가는 중인 싫어요 쓰기. 되돌리기는 이 약속이 끝난 뒤에 반대 요청을 보낸다. */
  const pendingHideRef = useRef(new Map<number, Promise<HideOutcome>>());
  /** 반응 쓰기가 날아가는 중인 카드 — 👍 연타로 요청 순서가 뒤집히지 않게 한다. */
  const likeBusyRef = useRef(new Set<number>());

  const showError = useCallback(() => {
    showToast({ message: "잠시 후 다시 시도해 주세요" }, 2500);
  }, [showToast]);

  const notify = useCallback((message: string) => showToast({ message }, 4000), [showToast]);

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
      void setReactionAsync({
        contentId,
        state: nextLiked ? "LIKE" : "NONE",
        rec: recCardContext(card, HOME_REC_SURFACE),
      })
        .catch(() => {
          setLikedIds((prev) => ({ ...prev, [contentId]: !nextLiked }));
          showError();
        })
        .finally(() => {
          likeBusyRef.current.delete(contentId);
        });
    },
    [likedIds, setReactionAsync, showError],
  );

  const undo = useCallback(
    async (contentId: number) => {
      const entry = hiddenRef.current.find((item) => item.contentId === contentId);
      if (!entry) return;
      dispatchHidden({ type: "restore", contentId });

      // 원래 쓰기가 아직 날아가는 중이면 먼저 끝나기를 기다린다 — 두 요청이 뒤집히면
      // 서버에는 "싫어요"가 남은 채 화면만 되돌아간다.
      const pending = pendingHideRef.current.get(contentId);
      const { ok, previousState } = await (pending ??
        Promise.resolve<HideOutcome>({ ok: true, previousState: entry.previousState }));
      if (!ok) return;

      const rec: RecRequestContext = {
        source: HOME_REC_SURFACE,
        requestId: entry.requestId,
        impressionId: entry.impressionId,
      };
      try {
        // 돌려놓을 상태는 서버가 알려 준 previousState 다 — 좋아요였던 작품은 좋아요로 돌아간다.
        await setReactionAsync({ contentId, state: previousState, rec });
      } catch {
        dispatchHidden({ type: "hide", entry });
        showError();
      }
    },
    [setReactionAsync, showError],
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
      dispatchHidden({ type: "hide", entry });

      // 이 약속은 절대 거부되지 않는다 — 되돌리기가 그대로 await 할 수 있어야 한다.
      const write: Promise<HideOutcome> = (async () => {
        try {
          const result = await setReactionAsync({
            contentId,
            state: "DISLIKE",
            rec: recCardContext(card, HOME_REC_SURFACE),
          });
          return { ok: true, previousState: result.previousState };
        } catch {
          return { ok: false, previousState: "NONE" };
        }
      })();
      pendingHideRef.current.set(contentId, write);

      const outcome = await write;
      if (outcome.ok) {
        dispatchHidden({ type: "confirm", contentId, previousState: outcome.previousState });
      } else if (hiddenRef.current.some((item) => item.contentId === contentId)) {
        dispatchHidden({ type: "restore", contentId });
        showError();
      }
      if (pendingHideRef.current.get(contentId) === write) pendingHideRef.current.delete(contentId);
    },
    [setReactionAsync, showError],
  );

  /**
   * 취향을 다 골랐다 — 추천을 다시 받는다.
   * removeQueries(온보딩 페이지 방식)는 화면에 붙은 쿼리를 다시 부르지 않는다 — 온보딩은 저장 뒤
   * 페이지를 옮기지만 홈은 제자리에서 바뀌어야 하므로 resetQueries 로 다시 부른다.
   * 체인 초기화(clearRecChains)가 추천 탭 체인과 이 화면의 숨김 상태를 함께 비운다.
   */
  const refreshAfterPick = useCallback(() => {
    clearRecChains();
    void queryClient.resetQueries({ queryKey: recKeys.root() });
  }, [queryClient]);

  const hiddenById = useMemo(() => new Map(hidden.map((entry) => [entry.contentId, entry])), [hidden]);

  let body: ReactNode;
  if (query.isLoading || (query.isFetching && !query.data)) {
    body = (
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
        candidates={view.cards.map((card) => card.work)}
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
                좋아요한 작품을 바탕으로 게임·영화·시리즈·웹소설을 한 줄에 골라드려요
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
          mode !== "anon" && (
            <p className="mt-4 text-[13.5px] text-ink-3">지금은 보여드릴 작품이 없어요.</p>
          )
        ) : (
          <div role="region" aria-label={title} tabIndex={0} className={RAIL_CLASS}>
            {cards.map((card) => {
              const entry = hiddenById.get(card.work.id);
              if (entry?.slotVisible === true) {
                return (
                  <HiddenCardSlot
                    key={card.work.id}
                    work={card.work}
                    message="덜 보여드릴게요"
                    onUndo={() => void undo(card.work.id)}
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
            {mode === "personal" && <MoreTile cards={cards} />}
          </div>
        )}
      </>
    );
  }

  return (
    <section className="mt-14" aria-labelledby="home-rec-title">
      <div className="flex items-baseline gap-3">
        <h2 id="home-rec-title" className="text-[21px] font-extrabold tracking-[-0.02em] text-ink">
          {title}
        </h2>
        <Link
          to="/for-you"
          className="ml-auto inline-flex items-center gap-[3px] text-sm font-semibold text-ink-2 transition-colors hover:text-accent-ink"
        >
          추천 더 보기
          <CaretRight size={14} />
        </Link>
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
      {mode === "popular" && view.fallbackReason === "no_seed_platform" && (
        <Link
          to="/for-you"
          className="mt-1.5 inline-flex items-center gap-[3px] text-[13px] text-ink-2 transition-colors hover:text-accent-ink"
        >
          분야별 추천은 추천 탭에서 볼 수 있어요
          <CaretRight size={13} />
        </Link>
      )}

      {body}

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

/** 줄 끝의 "추천 더 보기" 타일 — 끝까지 넘겨 본 사람에게 다음 행동을 준다. 포스터 3장을 겹쳐 보여 준다. */
function MoreTile({ cards }: { cards: RecCard[] }) {
  const posters = cards.filter((card) => card.work.thumbnail).slice(-3);
  return (
    <Link
      to="/for-you"
      className="grid aspect-[2/3] w-[168px] flex-none snap-start place-content-center gap-3 rounded-panel border border-dashed border-line-strong bg-surface p-3 text-center transition-colors hover:border-ink"
    >
      <span className="flex justify-center" aria-hidden="true">
        {posters.map((card, index) => (
          <img
            key={card.work.id}
            src={card.work.thumbnail ?? ""}
            alt=""
            className={`h-12 w-[34px] rounded-[5px] border-2 border-surface bg-line object-cover shadow-card ${index > 0 ? "-ml-3" : ""}`}
          />
        ))}
      </span>
      <span className="text-[13.5px] font-bold text-ink">추천 더 보기</span>
      <span className="text-[11.5px] text-ink-2">분야별로 계속 보기</span>
    </Link>
  );
}
