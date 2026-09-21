import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  Eye,
  Heart,
  LockSimple,
  PencilSimple,
  PlusCircle,
  ShareNetwork,
  StackPlus,
  WarningCircle,
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import {
  isAlreadyInCollectionError,
  useCollectionDetail,
  useShelfItemMutations,
  useToggleCollectionLike,
} from "@aod/shared/hooks";
import { CollectionItem } from "@aod/shared/api";
import { WorkSummary } from "@aod/shared/types";
import { collectionDomainLabel } from "@aod/shared/constants";
import { categoryOf, thumbnailFallbackMap } from "../constants/thumbnail";
import { useIsLg } from "../hooks/useIsLg";
import { useToast } from "../hooks/useToast";
import { workCardFooter } from "../components/ui/workCardInfo";
import { CuratorAvatar } from "../components/ui/CollectionCard";
import {
  AddToCollectionPopover,
  AddToCollectionSheet,
} from "../components/ui/AddToCollectionMenu";
import BottomSheet from "../components/ui/BottomSheet";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import SegmentedControl from "../components/ui/SegmentedControl";
import Toast from "../components/ui/Toast";
import Shelf from "../components/shelf/Shelf";
import PulledWorkPanel from "../components/shelf/PulledWorkPanel";
import AddWorksPanel from "../components/shelf/AddWorksPanel";
import {
  itemMetaLine,
  toWorkSummary,
} from "../components/shelf/collectionItemInfo";

/**
 * /collections/:id - 컬렉션 책장 (mockups/collection-shelf-mockup.html,
 * docs/superpowers/specs/2026-09-21-collection-shelf-design.md).
 * 작품은 책등으로 꽂히고(Shelf), 누르면 뽑혀 나와 "뽑아든 작품"에 놓인다
 * (lg+ 옆 패널 / <lg 하단 카드). 소유자는 이 화면에서 바로 꽂고·빼고·메모하고·옮긴다 -
 * 제목·틴트·공개 범위·일괄 정리는 편집 화면(/collections/:id/edit) 몫.
 *
 * - 꽂기: lg+ 는 옆 패널이 "작품 꽂기"로 바뀌어 책장이 보이는 채로 연달아 꽂는다.
 *   <lg 는 바텀시트 - 닫으면 그동안 꽂은 책등이 차례로 떨어져 들어온다.
 * - 빼기: 확인 창 없이 즉시 + 되돌리기 토스트(같은 자리·같은 메모로 복원).
 * - 상세 캐시는 직접 고친다(useShelfItemMutations) - invalidate 는 조회수를 +1 시킨다.
 * - "책장 | 목록" 전환: 목록은 기존 행 리스트(평점·메타가 한눈에). 선택은 기억한다.
 * - 좋아요·공유·편집 진입·비공개/미존재/오류 화면은 이전과 같다.
 *
 * 편차: 컬렉션은 단일 도메인이라 목업의 섞어 꽂기는 없다(책등 변주로 윤곽을 살린다).
 * 내 컬렉션 탭·발견 카드·담기 팝오버의 미니 책장은 2단계(요약 응답에 포스터가 더 필요).
 */

type ShelfView = "shelf" | "list";
const VIEW_KEY = "aod:collection-view";
const VIEW_OPTIONS = [
  { value: "shelf", label: "책장" },
  { value: "list", label: "목록" },
];

const readView = (): ShelfView => {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "list" ? "list" : "shelf";
  } catch {
    return "shelf";
  }
};

/** 꽂히는 모션(0.62s) + 책등 간 간격이 끝난 뒤 표시를 걷는다 */
const dropClearMs = (count: number) => 800 + count * 90;

/** 401 은 재시도가 아니라 로그인이다 (좋아요 토스트와 같은 관례) */
const failMessage = (error: unknown, what: string): string =>
  axios.isAxiosError(error) && error.response?.status === 401
    ? "로그인이 만료됐어요. 다시 로그인해 주세요."
    : `${what} 실패했어요. 잠시 후 다시 시도해 주세요.`;

/** "8월 12일 업데이트" (올해가 아니면 연도 포함) */
const updatedLabel = (iso: string | undefined): string | undefined => {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  const monthDay = `${date.getMonth() + 1}월 ${date.getDate()}일`;
  const year =
    date.getFullYear() === new Date().getFullYear()
      ? ""
      : `${date.getFullYear()}년 `;
  return `${year}${monthDay} 업데이트`;
};

const primaryBtnClass =
  "rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]";

const ghostPillClass =
  "inline-flex items-center gap-[7px] rounded-full border border-line-strong bg-surface px-[18px] py-[11px] text-sm font-semibold text-ink transition-colors hover:border-ink active:scale-[0.98]";

/**
 * 페이지 골격 - <lg 상단 바(뒤로가기 + 제목 truncate + 우측 액션) +
 * lg+ 텍스트 뒤로가기 (work-detail Shell 문법 재사용)
 */
function Shell({
  title,
  actions,
  children,
}: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center gap-0.5 border-b border-line bg-surface/90 px-2 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="뒤로 가기"
          className="grid h-11 w-11 flex-none place-items-center rounded-full text-ink transition-colors active:bg-ink/5"
        >
          <ArrowLeft size={21} />
        </button>
        {title && (
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
            {title}
          </span>
        )}
        {actions && <div className="ml-auto flex flex-none">{actions}</div>}
      </div>
      {/* <lg는 하단 고정 액션 바 높이만큼 pb 확보 */}
      <div className="mx-auto max-w-[1440px] px-4 pb-28 lg:px-6 lg:pb-16 lg:pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="-ml-2.5 hidden items-center gap-1.5 rounded-input px-2.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink lg:inline-flex"
        >
          <ArrowLeft size={16} />
          뒤로 가기
        </button>
        {children}
      </div>
    </>
  );
}

/** 정보 블록 + 책장 최종 모양의 페이지 스켈레톤 */
function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="mt-2">
        <div className="h-3.5 w-24 rounded-input bg-canvas" />
        <div className="mt-2.5 h-7 w-3/5 rounded-input bg-line lg:h-8" />
        <div className="mt-3 h-4 w-4/5 max-w-[480px] rounded-input bg-canvas" />
        <div className="mt-4 flex items-center gap-2.5">
          <div className="h-[26px] w-[26px] flex-none rounded-full bg-line" />
          <div className="h-3.5 w-40 rounded-input bg-canvas" />
        </div>
      </div>
      <div className="mt-6 h-8 w-32 rounded-full bg-line" />
      <div className="mt-3.5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-[260px] rounded-panel bg-line lg:h-[492px]" />
        <div className="hidden h-[300px] rounded-panel bg-line lg:block" />
      </div>
    </div>
  );
}

/** 담긴 작품 행 (목업 .item-row) - 게임은 가로 16:9 썸네일, 그 외 3:4 */
function CollectionItemRow({
  item,
  index,
  curator,
}: {
  item: CollectionItem;
  index: number;
  curator: string;
}) {
  const work = toWorkSummary(item);
  const isGame = item.domain === "GAME";
  const meta = itemMetaLine(work);
  const footer = workCardFooter(work);

  return (
    <Link
      to={`/work/${item.contentId}`}
      className={`grid items-start gap-3 rounded-panel border border-line bg-surface p-3 transition-colors hover:border-line-strong lg:items-center lg:gap-4 lg:py-3.5 lg:pl-3.5 lg:pr-[18px] ${
        isGame
          ? "grid-cols-[24px_88px_1fr] lg:grid-cols-[32px_128px_1fr_auto]"
          : "grid-cols-[24px_64px_1fr] lg:grid-cols-[32px_92px_1fr_auto]"
      }`}
    >
      <div className="pt-0.5 text-center text-[13.5px] font-extrabold tabular-nums text-ink-3 lg:pt-0 lg:text-[15px]">
        {index}
      </div>
      <div
        className={`overflow-hidden rounded-input border border-line bg-canvas ${
          isGame ? "aspect-video" : "aspect-[3/4]"
        }`}
      >
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <img
              src={thumbnailFallbackMap[categoryOf(item.domain)]}
              alt=""
              loading="lazy"
              className="w-[clamp(20px,34%,36px)] opacity-80"
            />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold text-ink lg:text-[15.5px]">
          {item.title}
        </div>
        {meta && (
          <div className="mt-0.5 text-xs text-ink-3 lg:text-[13px]">{meta}</div>
        )}
        {/* <lg 인라인 스탯 (목업 .item-inline-stat) - lg+는 우측 열이 담당 */}
        {footer && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs tabular-nums text-ink-2 lg:hidden">
            {footer}
          </div>
        )}
        {item.comment && (
          <p className="mt-2 rounded-input border border-line bg-canvas px-3 py-2 text-[12.5px] leading-[1.55] text-ink-2 lg:mt-[9px] lg:max-w-[62ch] lg:px-[13px] lg:py-[9px] lg:text-[13.5px]">
            <b className="font-bold text-ink">{curator}:</b> {item.comment}
          </p>
        )}
      </div>
      {footer && (
        <div className="hidden flex-col items-end gap-1 text-[12.5px] tabular-nums text-ink-2 lg:flex">
          {footer}
        </div>
      )}
    </Link>
  );
}

export default function CollectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const collectionId = id ? Number(id) : 0;
  const { isAuthenticated } = useAuth();
  const isLg = useIsLg();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [view, setView] = useState<ShelfView>(readView);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  /** 소유자의 "작품 꽂기" - lg+ 옆 패널 모드 / <lg 바텀시트 */
  const [adding, setAdding] = useState(false);
  const [pendingContentIds, setPendingContentIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [droppedItemIds, setDroppedItemIds] = useState<number[]>([]);
  /** <lg 담기 바텀시트 (방문자가 뽑아든 작품을 자기 컬렉션에 담는다) */
  const [collectSheetOpen, setCollectSheetOpen] = useState(false);

  const dropTimerRef = useRef<number | undefined>(undefined);
  /** 시트가 열린 동안 꽂은 itemId - 시트가 책장을 가리므로 닫을 때 한꺼번에 떨어뜨린다 */
  const sheetAddedRef = useRef<number[]>([]);
  /** 첫 진입 자동 선택·자동 열기는 컬렉션마다 한 번 */
  const primedForRef = useRef<number | null>(null);

  const { toast, show: showToast, hide: hideToast } = useToast();
  const { data, isLoading, isError, error, refetch } =
    useCollectionDetail(collectionId);
  const toggleLike = useToggleCollectionLike(collectionId);
  const shelf = useShelfItemMutations(collectionId);

  useEffect(() => {
    window.scrollTo(0, 0);
    setSelectedItemId(null);
    setAdding(false);
  }, [collectionId]);

  useEffect(() => () => window.clearTimeout(dropTimerRef.current), []);

  // 첫 진입: lg+ 는 첫 작품을 뽑아 둔다(옆 패널이 비어 보이지 않게). 소유자의 빈 책장은
  // "작품 꽂기"를 열어 둔다. <lg 는 하단 카드·시트가 화면을 가리므로 아무것도 하지 않는다.
  useEffect(() => {
    if (!data || primedForRef.current === data.id) return;
    primedForRef.current = data.id;
    if (!isLg) return;
    if (data.items.length > 0) setSelectedItemId(data.items[0].itemId);
    else if (data.owner) setAdding(true);
  }, [data, isLg]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const shelvedContentIds = useMemo(
    () => new Set(items.map((i) => i.contentId)),
    [items],
  );
  const selectedIndex = items.findIndex((i) => i.itemId === selectedItemId);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : undefined;

  const dropIn = (itemIds: number[]) => {
    if (itemIds.length === 0) return;
    setDroppedItemIds(itemIds);
    window.clearTimeout(dropTimerRef.current);
    dropTimerRef.current = window.setTimeout(
      () => setDroppedItemIds([]),
      dropClearMs(itemIds.length),
    );
  };

  const changeView = (next: string) => {
    const value: ShelfView = next === "list" ? "list" : "shelf";
    setView(value);
    try {
      window.localStorage.setItem(VIEW_KEY, value);
    } catch {
      // 저장소를 못 써도 이번 화면에서는 그대로 동작한다
    }
  };

  const handleSelect = (itemId: number | null) => {
    setSelectedItemId(itemId);
    if (itemId !== null) setAdding(false);
  };

  const openAdd = () => {
    sheetAddedRef.current = [];
    setAdding(true);
    if (!isLg) setSelectedItemId(null);
  };

  const closeAdd = () => {
    setAdding(false);
    // <lg: 시트가 가리고 있던 책장에 그동안 꽂은 책등이 차례로 떨어진다
    if (!isLg) dropIn(sheetAddedRef.current);
    sheetAddedRef.current = [];
  };

  const handleAdd = (work: WorkSummary) => {
    setPendingContentIds((prev) => new Set(prev).add(work.id));
    shelf.add.mutate(
      { contentId: work.id },
      {
        onSuccess: (item) => {
          if (isLg) dropIn([item.itemId]);
          else sheetAddedRef.current.push(item.itemId);
          navigator.vibrate?.(8);
        },
        onError: (err) =>
          showToast(
            {
              message: isAlreadyInCollectionError(err)
                ? "이미 꽂혀 있는 작품이에요"
                : failMessage(err, "작품 꽂기에"),
            },
            2400,
          ),
        onSettled: () =>
          setPendingContentIds((prev) => {
            const next = new Set(prev);
            next.delete(work.id);
            return next;
          }),
      },
    );
  };

  const handleRemove = (item: CollectionItem, index: number) => {
    // lg+ 는 옆 작품을 이어서 뽑아 패널이 비지 않게, <lg 는 카드를 닫는다
    const neighbor = items[index + 1] ?? items[index - 1];
    setSelectedItemId(isLg && neighbor ? neighbor.itemId : null);
    shelf.remove.mutate(
      { itemId: item.itemId, contentId: item.contentId },
      {
        onError: (err) =>
          showToast({ message: failMessage(err, "작품 빼기에") }, 2400),
      },
    );
    const toastId = showToast({
      message: `'${item.title}' 뺐어요`,
      actionLabel: "되돌리기",
      focusAction: true,
      onAction: () => {
        hideToast(toastId);
        shelf.restore.mutate(
          { item, index },
          {
            onSuccess: ({ created }) => {
              dropIn([created.itemId]);
              if (isLg) setSelectedItemId(created.itemId);
            },
            onError: (err) =>
              showToast({ message: failMessage(err, "되돌리기에") }, 2400),
          },
        );
      },
    });
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    if (!data) return;
    // 실패 시 훅이 옵티미스틱 전이를 롤백한 뒤 여기서 토스트로 안내한다
    toggleLike.mutate(data.likedByMe, {
      onError: (err) =>
        showToast({ message: failMessage(err, "좋아요 처리에") }, 2000),
    });
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast({ message: "링크를 복사했어요" }, 2000);
    } catch {
      showToast({ message: "링크 복사에 실패했어요" }, 2000);
    }
  };

  const handleEdit = () => navigate(`/collections/${collectionId}/edit`);

  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const isPrivate = status === 403;
  const notFound =
    !collectionId || Number.isNaN(collectionId) || status === 404;

  if (isLoading) {
    return (
      <Shell>
        <DetailSkeleton />
      </Shell>
    );
  }

  if (isPrivate) {
    return (
      <Shell>
        <div className="mt-4">
          <EmptyState
            icon={<LockSimple size={44} />}
            title="비공개 컬렉션이에요"
            description="큐레이터만 볼 수 있는 컬렉션이에요."
            action={
              <Link
                to="/collections"
                className={`inline-block ${primaryBtnClass}`}
              >
                컬렉션 둘러보기
              </Link>
            }
          />
        </div>
      </Shell>
    );
  }

  if (!data || notFound) {
    if (isError && !notFound) {
      return (
        <Shell>
          <div className="mt-4">
            <EmptyState
              icon={<WarningCircle size={44} />}
              title="컬렉션을 불러오지 못했어요"
              description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
              action={
                <button
                  type="button"
                  onClick={() => refetch()}
                  className={primaryBtnClass}
                >
                  다시 시도
                </button>
              }
            />
          </div>
        </Shell>
      );
    }
    return (
      <Shell>
        <div className="mt-4">
          <EmptyState
            title="컬렉션을 찾을 수 없어요"
            description="주소가 잘못되었거나 삭제된 컬렉션일 수 있어요."
            action={
              <Link
                to="/collections"
                className={`inline-block ${primaryBtnClass}`}
              >
                컬렉션 둘러보기
              </Link>
            }
          />
        </div>
      </Shell>
    );
  }

  const domainLabel = collectionDomainLabel(data.domain);
  const updated = updatedLabel(data.updatedAt);
  const liked = data.likedByMe;
  const owner = data.owner;

  const mobileActions = (
    <>
      {owner && (
        <button
          type="button"
          onClick={handleEdit}
          aria-label="편집"
          className="grid h-11 w-11 place-items-center rounded-full text-ink transition-colors active:bg-ink/5"
        >
          <PencilSimple size={21} />
        </button>
      )}
      <button
        type="button"
        onClick={handleShare}
        aria-label="공유"
        className="grid h-11 w-11 place-items-center rounded-full text-ink transition-colors active:bg-ink/5"
      >
        <ShareNetwork size={21} />
      </button>
    </>
  );

  /** 뽑아든 작품 - lg+ 옆 패널과 <lg 하단 카드가 같은 내용을 쓴다 */
  const pulledPanel = (surface: "aside" | "card") =>
    selected && (
      <PulledWorkPanel
        key={selected.itemId}
        item={selected}
        curator={data.curatorNickname}
        owner={owner}
        index={selectedIndex}
        total={items.length}
        onMove={(delta) =>
          shelf.move.mutate(
            { itemId: selected.itemId, delta },
            {
              onError: (err) =>
                showToast({ message: failMessage(err, "자리 옮기기에") }, 2400),
            },
          )
        }
        onRemove={() => handleRemove(selected, selectedIndex)}
        onSaveComment={(comment) =>
          shelf.setComment.mutate(
            { itemId: selected.itemId, comment },
            {
              onError: (err) =>
                showToast({ message: failMessage(err, "메모 저장에") }, 2400),
            },
          )
        }
        onClose={surface === "card" ? () => setSelectedItemId(null) : undefined}
        collectSlot={
          owner ? undefined : surface === "aside" ? (
            <AddToCollectionPopover
              contentId={selected.contentId}
              domain={selected.domain}
              isAuthenticated={isAuthenticated}
              onRequireLogin={() => setIsLoginOpen(true)}
            />
          ) : (
            <button
              type="button"
              onClick={() =>
                isAuthenticated
                  ? setCollectSheetOpen(true)
                  : setIsLoginOpen(true)
              }
              className={`w-full justify-center ${ghostPillClass}`}
            >
              <StackPlus size={16} aria-hidden="true" />내 컬렉션에 담기
            </button>
          )
        }
      />
    );

  const addPanel = (
    <AddWorksPanel
      domain={data.domain}
      shelvedContentIds={shelvedContentIds}
      pendingContentIds={pendingContentIds}
      onAdd={handleAdd}
      onClose={closeAdd}
      autoFocus={isLg}
    />
  );

  return (
    <>
      <Shell title={data.title} actions={mobileActions}>
        {/* 정보 블록 - 콜라주 히어로는 없다. 책장이 히어로다 */}
        <div className="mt-1 lg:mt-2 lg:flex lg:items-end lg:gap-6">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-accent-ink">
              {domainLabel} 컬렉션
            </div>
            <h1 className="mt-1 text-[21px] font-extrabold leading-[1.2] tracking-[-0.02em] text-ink lg:mt-1.5 lg:text-[30px]">
              {data.title}
            </h1>
            {data.description && (
              <p className="mt-1.5 max-w-[60ch] text-[13.5px] leading-[1.65] text-ink-2 lg:mt-2 lg:text-[15px]">
                {data.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-2 lg:mt-3.5 lg:text-[13.5px]">
              <CuratorAvatar
                name={data.curatorNickname}
                tint={data.tint}
                className="h-[26px] w-[26px] text-xs"
              />
              <b className="font-bold text-ink">{data.curatorNickname}</b>
              {updated && (
                <>
                  <span className="text-ink-3">·</span>
                  <span>{updated}</span>
                </>
              )}
              <span className="text-ink-3">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Eye size={13} aria-hidden="true" />
                조회 {data.viewCount.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="hidden flex-none items-center gap-2.5 lg:flex">
            <button
              type="button"
              onClick={handleLike}
              aria-pressed={liked}
              disabled={toggleLike.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-accent-ink px-[22px] py-[11px] text-[14.5px] font-bold text-surface transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Heart size={17} weight={liked ? "fill" : "regular"} />
              좋아요 {data.likeCount.toLocaleString()}
            </button>
            <button type="button" onClick={handleShare} className={ghostPillClass}>
              <ShareNetwork size={16} aria-hidden="true" />
              공유
            </button>
            {owner && (
              <button type="button" onClick={handleEdit} className={ghostPillClass}>
                <PencilSimple size={16} aria-hidden="true" />
                편집
              </button>
            )}
          </div>
        </div>

        {/* 도구 줄 - 보기 전환 · 작품 수 · (소유자) 작품 꽂기 */}
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 lg:mt-7">
          <SegmentedControl
            options={VIEW_OPTIONS}
            value={view}
            onChange={changeView}
            size="sm"
            ariaLabel="보기 방식"
          />
          <span className="text-[13.5px] text-ink-2">
            <b className="font-bold tabular-nums text-ink">{items.length}</b>
            작품{owner && view === "shelf" && " · 빈 칸 3"}
          </span>
          {owner && (
            <button
              type="button"
              onClick={openAdd}
              className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]"
            >
              <PlusCircle size={17} weight="fill" aria-hidden="true" />
              작품 꽂기
            </button>
          )}
        </div>

        {items.length === 0 && !owner ? (
          <div className="mt-3.5">
            <EmptyState
              variant="note"
              title="아직 꽂힌 작품이 없어요"
              description="큐레이터가 작품을 꽂으면 여기에 보여요."
            />
          </div>
        ) : view === "shelf" ? (
          <div className="mt-3.5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <Shelf
                items={items}
                tint={data.tint}
                selectedItemId={selectedItemId}
                onSelect={handleSelect}
                onRequestAdd={owner ? openAdd : undefined}
                droppedItemIds={droppedItemIds}
              />
              {items.length === 0 && (
                <p className="mt-3 text-[13.5px] text-ink-2">
                  빈 책장이에요. 첫 작품을 꽂아 보세요.
                </p>
              )}
            </div>
            <aside className="sticky top-[84px] hidden lg:block">
              {adding && owner ? (
                <div className="flex h-[min(620px,calc(100dvh-108px))] flex-col rounded-panel border border-line bg-surface p-4 shadow-card">
                  {addPanel}
                </div>
              ) : (
                pulledPanel("aside") || (
                  <div className="rounded-panel border border-dashed border-line-strong px-5 py-8 text-center text-[13.5px] leading-[1.6] text-ink-2">
                    책등을 누르면
                    <br />
                    여기에서 뽑아 볼 수 있어요.
                  </div>
                )
              )}
            </aside>
          </div>
        ) : items.length > 0 ? (
          <div className="mt-3.5 flex flex-col gap-2.5">
            {items.map((item, i) => (
              <CollectionItemRow
                key={item.itemId}
                item={item}
                index={i + 1}
                curator={data.curatorNickname}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3.5">
            <EmptyState
              variant="note"
              title="아직 꽂힌 작품이 없어요"
              description="작품 꽂기로 첫 작품을 꽂아 보세요."
            />
          </div>
        )}

        {/* <lg: 하단 카드가 마지막 단을 가리지 않게 그만큼 더 스크롤되게 한다 */}
        {selected && view === "shelf" && <div className="h-64 lg:hidden" />}
      </Shell>

      {/* <lg 하단 고정 - (뽑아든 작품 카드) + 좋아요 액션 바 */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        {view === "shelf" && selected && (
          <div className="px-3 pb-2">{pulledPanel("card")}</div>
        )}
        <div
          style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom))" }}
          className="flex items-center gap-2.5 border-t border-line bg-surface/95 px-4 pt-2.5 backdrop-blur-md"
        >
          <button
            type="button"
            onClick={handleLike}
            aria-pressed={liked}
            disabled={toggleLike.isPending}
            className="flex h-12 flex-1 items-center justify-center gap-[7px] rounded-full bg-accent-ink text-[14.5px] font-bold text-surface transition-opacity active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Heart size={17} weight={liked ? "fill" : "regular"} />
            좋아요 {data.likeCount.toLocaleString()}
          </button>
        </div>
      </div>

      {/* <lg 작품 꽂기 시트 - lg+ 는 옆 패널이 맡는다 */}
      {owner && (
        <BottomSheet
          open={adding && !isLg}
          onClose={closeAdd}
          ariaLabel="작품 꽂기"
        >
          <div className="flex min-h-0 flex-1 flex-col px-5 pb-5 pt-2">
            {addPanel}
          </div>
        </BottomSheet>
      )}

      {selected && !owner && (
        <AddToCollectionSheet
          contentId={selected.contentId}
          domain={selected.domain}
          open={collectSheetOpen}
          onClose={() => setCollectSheetOpen(false)}
        />
      )}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          focusAction={toast.focusAction}
        />
      )}

      {isLoginOpen && (
        <ConfirmDialog
          title="로그인이 필요한 기능이에요"
          description="로그인 후 이용해 주세요."
          confirmLabel="로그인"
          onCancel={() => setIsLoginOpen(false)}
          onConfirm={() => navigate("/login")}
        />
      )}
    </>
  );
}
