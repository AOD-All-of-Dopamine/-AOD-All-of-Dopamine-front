import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { WarningCircle } from "@phosphor-icons/react";
import { useApis, useRecommendations, useSetNotInterested, useSetReaction } from "@aod/shared/hooks";
import { interactionKeys, myKeys } from "@aod/shared/queries";
import { REC_SURFACE, REC_TAB_LABELS } from "@aod/shared/constants";
import { REC_TABS, type RecCard, type RecTab } from "@aod/shared/types";
import type { RecRequestContext } from "@aod/shared/tracking";
import {
  hiddenIds,
  isChainExpired,
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
import { useScrollRestore } from "../hooks/useScrollRestore";
import { useToast } from "../hooks/useToast";
import { useTracker } from "../tracking/trackerContext";
import DomainChip from "../components/ui/DomainChip";
import EmptyState from "../components/ui/EmptyState";
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
 */

const GRID_CLASS =
  "mt-5 grid grid-cols-2 gap-x-3 gap-y-3.5 min-[768px]:grid-cols-3 min-[768px]:gap-x-[18px] min-[768px]:gap-y-5 min-[1201px]:grid-cols-4";

const PRIMARY_BUTTON =
  "rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]";

const NO_HIDDEN: readonly RecHiddenEntry[] = [];

/**
 * 체인별 화면 상태. 상세에 갔다 돌아오면 컴포넌트는 다시 마운트되지만 react-query 캐시는 남아 있다 —
 * 숨긴 카드가 되살아나지 않도록 같은 수명(브라우저 탭)으로 들고 있는다.
 */
const hiddenByChain = new Map<string, readonly RecHiddenEntry[]>();
const likedByChain = new Map<string, Record<number, boolean>>();

function RecChainView({ tab, chain }: { tab: RecTab; chain: RecChain }) {
  const tracker = useTracker();
  const toast = useToast();
  const { interactionApi } = useApis();
  const queryClient = useQueryClient();
  const chainKey = `${tab}:${chain.nonce}`;

  const [hidden, dispatchHidden] = useReducer(
    recHiddenReducer,
    chainKey,
    (key: string) => hiddenByChain.get(key) ?? NO_HIDDEN,
  );
  const [likedIds, setLikedIds] = useState<Record<number, boolean>>(
    () => likedByChain.get(chainKey) ?? {},
  );
  const hiddenRef = useRef(hidden);

  useEffect(() => {
    hiddenRef.current = hidden;
    hiddenByChain.set(chainKey, hidden);
  }, [chainKey, hidden]);
  useEffect(() => {
    likedByChain.set(chainKey, likedIds);
  }, [chainKey, likedIds]);

  const query = useRecommendations(tab, chain.nonce, { initialChainId: chain.initialChainId });
  const view = useMemo(
    () => mergeRecPages(query.data?.pages ?? [], hiddenIds(hidden)),
    [query.data, hidden],
  );
  const notice = recNotice(view);
  const feedbackEnabled = recFeedbackEnabled(view);

  const setReaction = useSetReaction();
  const setNotInterested = useSetNotInterested();
  const toggleBookmark = useMutation({
    mutationFn: ({ contentId, rec }: { contentId: number; rec: RecRequestContext }) =>
      interactionApi.toggleBookmark(contentId, rec),
    onSuccess: (_data, { contentId }) => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.bookmarkStatus(contentId) });
      queryClient.invalidateQueries({ queryKey: myKeys.bookmarksRoot() });
    },
  });

  const { remember, restartOnChainExpired } = chain;
  const { hide: hideToast, show: showToast } = toast;
  const { mutate: mutateReaction } = setReaction;
  const { mutate: mutateNotInterested } = setNotInterested;
  const { mutate: mutateBookmark } = toggleBookmark;
  const { fetchNextPage } = query;

  // 서버가 준 체인을 기억한다. 대체 응답의 chainId 는 저장된 값이 아니라 다음 요청에 보내면 404 다.
  useEffect(() => {
    const pages = query.data?.pages;
    if (!pages || pages.length === 0) return;
    const last = pages[pages.length - 1];
    remember(last.fallback ? null : last.chainId);
  }, [query.data, remember]);

  // 404 = 체인 없음·만료 → chainId 를 버리고 새 nonce 로 한 번만 다시 요청한다(재시도가 아니다).
  useEffect(() => {
    if (query.isError) restartOnChainExpired(query.error);
  }, [query.isError, query.error, restartOnChainExpired]);

  const showError = useCallback(() => {
    showToast({ message: "잠시 후 다시 시도해 주세요" }, 2500);
  }, [showToast]);

  // 더 보기 실패(404 제외)는 토스트로만 알린다 — 이미 본 목록은 지우지 않는다.
  const reportedErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (!query.isError || !query.data) return;
    if (reportedErrorRef.current === query.error) return;
    reportedErrorRef.current = query.error;
    if (!isChainExpired(query.error)) showError();
  }, [query.data, query.error, query.isError, showError]);

  // 체인이 바뀌면(새로 보기·404·새로고침) 저장된 위치를 따라가지 않고 맨 위에서 시작한다.
  useScrollRestore(`for-you:${chainKey}`, !query.isLoading && view.cards.length > 0);

  const openCard = useCallback(
    (card: RecCard) => tracker.track("card_clicked", recCardFields(card)),
    [tracker],
  );

  const toggleLike = useCallback(
    (card: RecCard) => {
      const contentId = card.work.id;
      const nextLiked = !likedIds[contentId];
      setLikedIds((prev) => ({ ...prev, [contentId]: nextLiked }));
      mutateReaction(
        { contentId, state: nextLiked ? "LIKE" : "NONE", rec: recCardContext(card) },
        {
          onError: () => {
            setLikedIds((prev) => ({ ...prev, [contentId]: !nextLiked }));
            showError();
          },
        },
      );
    },
    [likedIds, mutateReaction, showError],
  );

  const undo = useCallback(
    (contentId: number) => {
      const entry = hiddenRef.current.find((item) => item.contentId === contentId);
      if (!entry) return;
      hideToast();
      dispatchHidden({ type: "restore", contentId });
      const rec: RecRequestContext = {
        source: REC_SURFACE,
        requestId: entry.requestId,
        impressionId: entry.impressionId,
      };
      const onError = () => {
        dispatchHidden({ type: "hide", entry });
        showError();
      };
      if (entry.kind === "dislike") {
        mutateReaction({ contentId, state: entry.previousState, rec }, { onError });
      } else {
        mutateNotInterested({ contentId, on: false, rec }, { onError });
      }
    },
    [hideToast, mutateNotInterested, mutateReaction, showError],
  );

  const hideCard = useCallback(
    (card: RecCard, kind: RecFeedbackKind) => {
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
      showToast({
        message: kind === "dislike" ? "이 작품은 덜 보여드릴게요" : "이제 이 작품은 안 보여드릴게요",
        actionLabel: "되돌리기",
        onAction: () => undo(contentId),
      });

      const rec = recCardContext(card);
      const onError = () => {
        dispatchHidden({ type: "restore", contentId });
        hideToast();
        showError();
      };
      if (kind === "dislike") {
        mutateReaction(
          { contentId, state: "DISLIKE", rec },
          {
            // 되돌릴 때 돌려놓을 상태는 서버가 알려 준다
            onSuccess: (result) =>
              dispatchHidden({ type: "confirm", contentId, previousState: result.previousState }),
            onError,
          },
        );
      } else {
        mutateNotInterested({ contentId, on: true, rec }, { onError });
      }
    },
    [hideToast, mutateNotInterested, mutateReaction, showError, showToast, undo],
  );

  const bookmark = useCallback(
    (card: RecCard) => {
      mutateBookmark(
        { contentId: card.work.id, rec: recCardContext(card) },
        {
          onSuccess: (data) =>
            showToast(
              {
                message:
                  (data as { bookmarked?: boolean })?.bookmarked === false
                    ? "북마크를 해제했어요"
                    : "북마크에 담았어요",
              },
              2500,
            ),
          onError: showError,
        },
      );
    },
    [mutateBookmark, showError, showToast],
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
        <div className={GRID_CLASS}>
          {view.cards.map((card) => (
            <RecCardTile
              key={card.impressionId}
              card={card}
              liked={!!likedIds[card.work.id]}
              feedbackEnabled={feedbackEnabled}
              onOpen={openCard}
              onToggleLike={toggleLike}
              onDislike={(target) => hideCard(target, "dislike")}
              onNotInterested={(target) => hideCard(target, "not_interested")}
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
          message={toast.toast.message}
          actionLabel={toast.toast.actionLabel}
          onAction={toast.toast.onAction}
        />
      )}
    </>
  );
}

export default function ForYouPage() {
  const [searchParams, setSearchParams] = useSearchParams();
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
