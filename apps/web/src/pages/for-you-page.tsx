import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { WarningCircle } from "@phosphor-icons/react";
import {
  useRecommendations,
  useSetNotInterested,
  useSetReaction,
  useToggleBookmarkById,
} from "@aod/shared/hooks";
import { REC_SURFACE, REC_TAB_LABELS } from "@aod/shared/constants";
import { REC_TABS, type ReactionState, type RecCard, type RecTab } from "@aod/shared/types";
import type { RecRequestContext } from "@aod/shared/tracking";
import {
  hiddenIds,
  mergeRecPages,
  parseRecTab,
  recCardContext,
  recCardFields,
  recFeedbackEnabled,
  recHiddenReducer,
  recLoadedMoreFields,
  recNotice,
  recTabChangedFields,
  type RecFeedbackKind,
  type RecHiddenEntry,
} from "@aod/shared/rec";
import { useRecChain, type RecChain } from "../hooks/useRecChain";
import { readChainState, recChainStateKey, writeChainState } from "../hooks/recChainState";
import { useScrollRestore } from "../hooks/useScrollRestore";
import { useToast } from "../hooks/useToast";
import { useTracker } from "../tracking/trackerContext";
import DomainChip from "../components/ui/DomainChip";
import EmptyState from "../components/ui/EmptyState";
import SegmentedControl from "../components/ui/SegmentedControl";
import SkeletonCard from "../components/ui/SkeletonCard";
import Toast from "../components/ui/Toast";
import RecCardTile from "../components/rec/RecCardTile";
import RecNoticeBanner from "../components/rec/RecNoticeBanner";

/**
 * /for-you — 칩별 개인화 추천 (설계 §3·§4·§5).
 * 상태의 단일 출처: 칩은 URL 쿼리(?tab=), 목록은 react-query 캐시, 체인은 sessionStorage,
 * 숨김·좋아요는 체인 단위 화면 상태다. 판정 로직은 전부 @aod/shared/rec 에 있다.
 *
 * 목록 부분은 `${tab}:${nonce}` 를 key 로 한 내부 컴포넌트다 — 칩을 바꾸거나 새 체인을 열면
 * 숨김·좋아요·스크롤 복원 상태가 통째로 새로 시작한다.
 *
 * 쓰기는 전부 mutateAsync 로 보낸다. useMutation 의 옵저버는 화면당 하나뿐이라
 * 두 번째 mutate() 가 첫 번째의 콜백을 떼어 버린다(v5) — 카드 A 를 누른 직후 B 를 누르면
 * A 의 성공·실패 처리가 통째로 사라진다. 약속(promise)은 호출마다 따로이므로 안전하다.
 */

const GRID_CLASS =
  "mt-5 grid grid-cols-2 gap-x-3 gap-y-3.5 min-[768px]:grid-cols-3 min-[768px]:gap-x-[18px] min-[768px]:gap-y-5 min-[1201px]:grid-cols-4";

const PRIMARY_BUTTON =
  "rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]";

const NO_HIDDEN: readonly RecHiddenEntry[] = [];
const NO_LIKED: Record<number, boolean> = {};

/** 숨김 쓰기 1건의 결과. ok=false 면 서버에 남은 것이 없다 — 되돌릴 것도 없다. */
interface HideOutcome {
  ok: boolean;
  previousState: ReactionState;
}

function RecChainView({ tab, chain }: { tab: RecTab; chain: RecChain }) {
  const tracker = useTracker();
  const toast = useToast();
  const chainKey = recChainStateKey(tab, chain.nonce);

  const [hidden, dispatchHidden] = useReducer(
    recHiddenReducer,
    chainKey,
    (key: string) => readChainState(key)?.hidden ?? NO_HIDDEN,
  );
  /**
   * ♡ 는 빈 하트로 시작한다. 개인화 추천에는 이미 좋아요한 작품이 오지 않는다
   * (서버가 시드와 그 확장분을 목록에서 뺀다) — 그러니 개인화 목록에서는 이게 맞다.
   * 대체 목록에는 이미 좋아요한 작품이 섞여 올 수 있는데, 응답에 "내 반응" 필드가 없어
   * 채워진 하트로 시작할 방법이 없다(API 가 반응을 돌려주기 전까지의 한계).
   */
  const [likedIds, setLikedIds] = useState<Record<number, boolean>>(
    () => readChainState(chainKey)?.liked ?? NO_LIKED,
  );
  const hiddenRef = useRef(hidden);

  useEffect(() => {
    hiddenRef.current = hidden;
    writeChainState(chainKey, { hidden, liked: likedIds });
  }, [chainKey, hidden, likedIds]);

  const query = useRecommendations(tab, chain.nonce, { initialChainId: chain.initialChainId });
  const view = useMemo(
    () => mergeRecPages(query.data?.pages ?? [], hiddenIds(hidden)),
    [query.data, hidden],
  );
  const notice = recNotice(view);
  const feedbackEnabled = recFeedbackEnabled(view);

  const setReaction = useSetReaction();
  const setNotInterested = useSetNotInterested();
  const toggleBookmark = useToggleBookmarkById();

  const { remember, restartOnChainExpired } = chain;
  const { hide: hideToast, show: showToast } = toast;
  const { mutateAsync: setReactionAsync } = setReaction;
  const { mutateAsync: setNotInterestedAsync } = setNotInterested;
  const { mutateAsync: toggleBookmarkAsync } = toggleBookmark;
  const { fetchNextPage } = query;

  /** contentId → 날아가는 중인 숨김 쓰기. 되돌리기는 이 약속이 끝난 뒤에 반대 요청을 보낸다. */
  const pendingHideRef = useRef(new Map<number, Promise<HideOutcome>>());
  /** contentId → 그 카드의 되돌리기 토스트 id (되돌리면 그 토스트만 걷는다). */
  const undoToastRef = useRef(new Map<number, number>());
  /** 반응 쓰기가 날아가는 중인 카드 — ♡ 연타로 요청 순서가 뒤집히지 않게 한다. */
  const likeBusyRef = useRef(new Set<number>());
  /** 포커스를 가져갔던 토스트가 사라질 때 돌아올 자리. */
  const gridRef = useRef<HTMLDivElement>(null);

  const focusGrid = useCallback(() => {
    gridRef.current?.focus({ preventScroll: true });
  }, []);

  // 서버가 준 체인을 기억한다. 대체 응답의 chainId 는 저장된 값이 아니라 다음 요청에 보내면 404 다.
  useEffect(() => {
    const pages = query.data?.pages;
    if (!pages || pages.length === 0) return;
    const last = pages[pages.length - 1];
    remember(last.fallback ? null : last.chainId);
  }, [query.data, remember]);

  const showError = useCallback(() => {
    showToast({ message: "잠시 후 다시 시도해 주세요" }, 2500);
  }, [showToast]);

  /**
   * 오류 처리는 한 곳에서 한다.
   * 404 = 체인 없음·만료 → chainId 를 버리고 새 nonce 로 딱 한 번 다시 요청한다(재시도가 아니다).
   * 새 체인으로 못 바꾼 오류는 알린다 — 보여 줄 목록이 아예 없으면 아래 오류 화면이 대신 나온다.
   */
  const reportedErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (!query.isError) return;
    if (reportedErrorRef.current === query.error) return;
    reportedErrorRef.current = query.error;
    if (restartOnChainExpired(query.error)) return;
    if (query.data) showError();
  }, [query.data, query.error, query.isError, restartOnChainExpired, showError]);

  // 목록이 있든(성공) 없든(오류) 한 번 결판난 뒤에 복원한다 — 0건이어도 위치를 잃지 않는다.
  useScrollRestore(`for-you:${chainKey}`, query.isSuccess || query.isError);

  const openCard = useCallback(
    (card: RecCard) => tracker.track("card_clicked", recCardFields(card)),
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
        rec: recCardContext(card),
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
      const toastId = undoToastRef.current.get(contentId);
      if (toastId !== undefined) hideToast(toastId);
      undoToastRef.current.delete(contentId);
      dispatchHidden({ type: "restore", contentId });

      // 원래 쓰기가 아직 날아가는 중이면 먼저 끝나기를 기다린다 — 두 요청이 뒤집히면
      // 서버에는 "싫어요"가 남은 채 화면만 되돌아간다.
      const pending = pendingHideRef.current.get(contentId);
      const { ok, previousState } = await (pending ??
        Promise.resolve<HideOutcome>({ ok: true, previousState: entry.previousState }));
      // 서버가 아무것도 기록하지 못했으면 되돌릴 것도 없다 (카드는 이미 되살렸다).
      if (!ok) return;

      const rec: RecRequestContext = {
        source: REC_SURFACE,
        requestId: entry.requestId,
        impressionId: entry.impressionId,
      };
      try {
        if (entry.kind === "dislike") {
          // 돌려놓을 상태는 서버가 알려 준 previousState 다 (확정값).
          await setReactionAsync({ contentId, state: previousState, rec });
        } else {
          await setNotInterestedAsync({ contentId, on: false, rec });
        }
      } catch {
        dispatchHidden({ type: "hide", entry });
        showError();
      }
    },
    [hideToast, setNotInterestedAsync, setReactionAsync, showError],
  );

  const hideCard = useCallback(
    async (card: RecCard, kind: RecFeedbackKind) => {
      const contentId = card.work.id;
      const entry: RecHiddenEntry = {
        contentId,
        kind,
        title: card.work.title,
        requestId: card.requestId,
        impressionId: card.impressionId,
        previousState: "NONE",
      };
      dispatchHidden({ type: "hide", entry });
      const toastId = showToast({
        message: kind === "dislike" ? "이 작품은 덜 보여드릴게요" : "이제 이 작품은 안 보여드릴게요",
        actionLabel: "되돌리기",
        onAction: () => void undo(contentId),
        // 카드가 사라지면서 포커스가 갈 곳이 없다 — 유일한 되돌리기 수단인 토스트가 받는다.
        focusAction: true,
      });
      undoToastRef.current.set(contentId, toastId);

      const rec = recCardContext(card);
      // 이 약속은 절대 거부되지 않는다 — 되돌리기가 그대로 await 할 수 있어야 한다.
      const write: Promise<HideOutcome> = (async () => {
        try {
          if (kind === "dislike") {
            const result = await setReactionAsync({ contentId, state: "DISLIKE", rec });
            return { ok: true, previousState: result.previousState };
          }
          await setNotInterestedAsync({ contentId, on: true, rec });
          return { ok: true, previousState: "NONE" };
        } catch {
          return { ok: false, previousState: "NONE" };
        }
      })();
      pendingHideRef.current.set(contentId, write);

      const outcome = await write;
      if (outcome.ok) {
        // 되돌릴 때 돌려놓을 상태를 확정한다 (이미 되돌렸으면 아무 일도 일어나지 않는다).
        dispatchHidden({ type: "confirm", contentId, previousState: outcome.previousState });
      } else if (hiddenRef.current.some((item) => item.contentId === contentId)) {
        dispatchHidden({ type: "restore", contentId });
        hideToast(toastId);
        undoToastRef.current.delete(contentId);
        showError();
      }
      if (pendingHideRef.current.get(contentId) === write) pendingHideRef.current.delete(contentId);
    },
    [hideToast, setNotInterestedAsync, setReactionAsync, showError, showToast, undo],
  );

  const bookmark = useCallback(
    (card: RecCard) => {
      // 토글이다 — 담았는지 뺐는지는 응답이 알려 준다.
      void toggleBookmarkAsync({ contentId: card.work.id, rec: recCardContext(card) })
        .then((result) => {
          showToast({ message: result.bookmarked ? "북마크에 담았어요" : "북마크에서 뺐어요" }, 2500);
        })
        .catch(showError);
    },
    [showError, showToast, toggleBookmarkAsync],
  );

  const loadMore = useCallback(() => {
    tracker.track(
      "rec_loaded_more",
      recLoadedMoreFields({ requestId: view.requestId, pageDepth: view.pageDepth, tab }),
    );
    void fetchNextPage();
  }, [fetchNextPage, tab, tracker, view.pageDepth, view.requestId]);

  if (query.isLoading) {
    return (
      <div className={GRID_CLASS} aria-hidden="true">
        {Array.from({ length: 8 }, (_, index) => (
          <SkeletonCard key={index} variant="portrait" />
        ))}
      </div>
    );
  }

  // 요청 자체가 실패했고 보여 줄 것이 아무것도 없을 때만 오류 화면이다 (설계 §3 표 마지막 행).
  if (query.isError && !query.data) {
    return (
      <div className="mt-7">
        <EmptyState
          icon={<WarningCircle size={44} />}
          title="추천을 불러오지 못했어요"
          description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
          action={
            <button type="button" onClick={() => void query.refetch()} className={PRIMARY_BUTTON}>
              다시 시도
            </button>
          }
        />
      </div>
    );
  }

  return (
    <>
      {notice && <RecNoticeBanner notice={notice} />}

      {view.cards.length === 0 ? (
        <div className="mt-7">
          <EmptyState title="보여드릴 작품이 없어요" description="잠시 후 다시 확인해 주세요." />
        </div>
      ) : (
        <div ref={gridRef} tabIndex={-1} className={`${GRID_CLASS} focus:outline-none`}>
          {view.cards.map((card) => (
            <RecCardTile
              key={card.impressionId}
              card={card}
              liked={!!likedIds[card.work.id]}
              feedbackEnabled={feedbackEnabled}
              onOpen={openCard}
              onToggleLike={toggleLike}
              onDislike={(target) => void hideCard(target, "dislike")}
              onNotInterested={(target) => void hideCard(target, "not_interested")}
              onBookmark={bookmark}
            />
          ))}
        </div>
      )}

      {view.hasMore && (
        <div className="mt-7 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={query.isFetchingNextPage}
            className="rounded-full border border-line bg-surface px-[22px] py-2.5 text-sm font-semibold text-ink transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {query.isFetchingNextPage ? "불러오는 중…" : "더 보기"}
          </button>
        </div>
      )}

      {view.exhausted && view.cards.length > 0 && (
        <div className="mt-7">
          <EmptyState
            variant="note"
            title="여기까지 봤어요"
            description="좋아요를 더 담으면 새로 추천해드려요."
            action={
              <button type="button" onClick={chain.restart} className={PRIMARY_BUTTON}>
                새로 보기
              </button>
            }
          />
        </div>
      )}

      {toast.toast && (
        <Toast
          key={toast.toast.id}
          message={toast.toast.message}
          actionLabel={toast.toast.actionLabel}
          onAction={toast.toast.onAction}
          focusAction={toast.toast.focusAction}
          onFocusRelease={focusGrid}
        />
      )}
    </>
  );
}

export default function ForYouPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = parseRecTab(searchParams.get("tab"));
  const tracker = useTracker();
  const chain = useRecChain(tab);

  // 칩 전환은 push (탭 성격 — ranking-page 관례). 기본값(all)은 파라미터를 지운다.
  const changeTab = (next: RecTab) => {
    if (next === tab) return;
    tracker.track("rec_tab_changed", recTabChangedFields({ from: tab, to: next }));
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === "all") params.delete("tab");
      else params.set("tab", next);
      return params;
    });
  };

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-20 pt-7">
      {/* 모바일 진입점 — 홈과 같은 세그먼트로 돌아갈 길을 둔다 (하단 탭은 늘리지 않는다) */}
      <div className="mb-4 lg:hidden">
        <SegmentedControl
          ariaLabel="홈·추천 전환"
          size="sm"
          value="for-you"
          options={[
            { value: "home", label: "홈" },
            { value: "for-you", label: "추천" },
          ]}
          onChange={(value) => {
            if (value === "home") navigate("/home");
          }}
        />
      </div>

      <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-ink">추천</h1>
      <p className="mt-1.5 text-[13.5px] text-ink-3">
        좋아요·북마크·리뷰를 바탕으로 고른 작품이에요.
      </p>

      <div className="mt-4 flex gap-1.5 overflow-x-auto scrollbar-hide lg:flex-wrap lg:overflow-visible">
        {REC_TABS.map((id) => (
          <DomainChip key={id} active={id === tab} onClick={() => changeTab(id)}>
            {REC_TAB_LABELS[id]}
          </DomainChip>
        ))}
      </div>

      <RecChainView key={`${tab}:${chain.nonce}`} tab={tab} chain={chain} />
    </div>
  );
}
