import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CaretDown,
  CaretUp,
  CircleNotch,
  DotsSixVertical,
  GlobeHemisphereEast,
  LockSimple,
  PencilSimple,
  PlusCircle,
  SignIn,
  Trash,
  TrendUp,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import {
  useApis,
  useCollectionDetail,
  useDeleteCollection,
} from "@aod/shared/hooks";
import {
  CollectionDetail,
  CollectionTint,
  CollectionUpdateBody,
  CollectionVisibility,
} from "@aod/shared/api";
import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";
import CollectionCollage from "../components/ui/CollectionCollage";
import TintPicker from "../components/ui/TintPicker";
import VisibilityOption from "../components/ui/VisibilityOption";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";

/**
 * /collections/:id/edit - mockups/collections-mockup.html 섹션 3(편집)·5c(모바일).
 * lg+: 상단 edit-bar(편집 모드 · 취소·저장) + 좌 380px 꾸미기 패널(커버
 * 미리보기·틴트·소개·공개 설정·삭제) / 우 아이템 리스트(정렬·코멘트·제거).
 * <lg: X+저장 상단 바, 커버·틴트 상단, 필드, 리스트 (목업 5c).
 *
 * 편집은 드래프트 방식 - 화면 조작은 로컬 상태만 바꾸고, 저장 시
 * 제거(DELETE, 404 멱등)·순서(PUT order, 바뀐 경우만)·코멘트(PATCH, 바뀐 것만)·
 * 메타(PATCH, 바뀐 필드만)를 순차 일괄 실행한다. 취소는 전부 복원.
 * 실패 처리 2분기: 5xx/네트워크는 드래프트 유지 + 재시도(전 연산이 멱등이라
 * 전체 재실행 안전). 4xx(예: 다른 탭의 아이템 추가로 PUT order 집합 불일치
 * 400)는 재시도해도 영원히 실패하므로 "최신 상태로 새로고침"(재조회 + 드래프트
 * 재구성, 부모가 key 재마운트) 분기. 어느 쪽이든 부분 성공(제거 DELETE만 반영
 * 등)으로 캐시가 어긋나지 않게 onError에서 상세를 무효화한다.
 *
 * 목업 대비 편차:
 * - 정렬은 드래그(HTML5 DnD, 핸들 기준)에 위/아래 버튼 병행 - 키보드/터치
 *   접근성 확보 (목업은 드래그 핸들만).
 * - 좌측 패널에 커버 미리보기 추가 - 체크리스트의 "틴트 즉시 반영" 확인 표면
 *   (데스크톱 목업에는 모바일 5c에만 있던 요소).
 * - 컬렉션 삭제 버튼(ConfirmDialog 경유)을 좌측 패널 하단에 배치 - 목업에 없던
 *   진입점이나 플랜 범위.
 * - "이번 주 N개 추가" 성장 메타 생략 - 주간 집계 데이터가 없다.
 * - 작품 추가 행은 탐색으로 연결 - 담기 진입점이 작품 상세에 있다.
 */

const TITLE_MAX = 60;
const DESC_MAX = 300;
const COMMENT_MAX = 200;

const fieldInputClass =
  "w-full rounded-input border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-3";

const fieldLabelClass = "mb-1.5 block text-[13px] font-bold text-ink";

const primaryBtnClass =
  "rounded-full bg-ink px-[22px] py-2.5 text-sm font-semibold text-surface transition-opacity hover:opacity-85 active:scale-[0.98]";

const categoryOf = (domain: string): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};

interface DraftItem {
  itemId: number;
  contentId: number;
  title: string;
  posterUrl: string | null;
  domain: string;
  /** 빈 문자열 = 코멘트 없음 (저장 시 trim - 빈 값은 코멘트 삭제) */
  comment: string;
}

/** 페이지 골격 - <lg 상단 바(X + 제목 + 우측 액션), lg+는 본문이 자체 구성 */
function Shell({
  onClose,
  actions,
  children,
}: {
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center gap-0.5 border-b border-line bg-surface/90 px-2 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="grid h-11 w-11 flex-none place-items-center rounded-full text-ink transition-colors active:bg-ink/5"
        >
          <X size={21} />
        </button>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-ink">
          컬렉션 편집
        </span>
        {actions && <div className="mr-2 flex flex-none">{actions}</div>}
      </div>
      <div className="mx-auto max-w-[1200px] px-4 pb-16 lg:px-6 lg:pb-20 lg:pt-6">
        {children}
      </div>
    </>
  );
}

/** 편집 리스트의 아이템 행 (목업 .edit-item) */
function EditItemRow({
  item,
  index,
  total,
  onMove,
  onCommentChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  dragging,
}: {
  item: DraftItem;
  index: number;
  total: number;
  onMove: (index: number, delta: -1 | 1) => void;
  onCommentChange: (itemId: number, comment: string) => void;
  onRemove: (itemId: number) => void;
  onDragStart: (index: number, e: React.DragEvent) => void;
  onDragOver: (index: number, e: React.DragEvent) => void;
  onDragEnd: () => void;
  dragging: boolean;
}) {
  const moveBtnClass =
    "grid h-7 w-8 place-items-center rounded-input text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-3";
  return (
    <div
      onDragOver={(e) => onDragOver(index, e)}
      onDrop={(e) => e.preventDefault()}
      className={`grid grid-cols-[32px_52px_1fr_34px] items-center gap-2.5 rounded-panel border bg-surface p-2.5 lg:grid-cols-[32px_72px_1fr_40px] lg:gap-3.5 lg:px-3.5 lg:py-3 ${
        dragging ? "border-accent-ink shadow-lift" : "border-line"
      }`}
    >
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          aria-label={`${item.title} 위로 이동`}
          className={moveBtnClass}
        >
          <CaretUp size={14} />
        </button>
        <span
          draggable
          onDragStart={(e) => onDragStart(index, e)}
          onDragEnd={onDragEnd}
          aria-hidden="true"
          className="grid h-7 w-8 cursor-grab place-items-center text-ink-3 active:cursor-grabbing"
        >
          <DotsSixVertical size={18} />
        </span>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          aria-label={`${item.title} 아래로 이동`}
          className={moveBtnClass}
        >
          <CaretDown size={14} />
        </button>
      </div>
      <div className="aspect-[3/4] w-full overflow-hidden rounded-input border border-line bg-canvas">
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
              className="w-[clamp(18px,40%,32px)] opacity-80"
            />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13.5px] font-bold text-ink lg:text-[14.5px]">
          {item.title}
        </div>
        <input
          value={item.comment}
          maxLength={COMMENT_MAX}
          onChange={(e) => onCommentChange(item.itemId, e.target.value)}
          placeholder="이 작품을 담은 이유를 한 줄로 남겨보세요"
          aria-label={`${item.title} 코멘트`}
          className="mt-1.5 w-full rounded-input border border-dashed border-line-strong bg-canvas px-[11px] py-2 text-[12.5px] text-ink-2 placeholder:text-ink-3 lg:text-[13px]"
        />
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.itemId)}
        aria-label={`${item.title} 컬렉션에서 빼기`}
        className="grid h-[34px] w-[34px] place-items-center justify-self-center rounded-full text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/**
 * 드래프트 편집기 - collection은 마운트 시점 스냅샷.
 * onRefresh: 상세 재조회 후 부모가 key를 바꿔 이 컴포넌트를 재마운트한다
 * (드래프트 폐기 + 최신 서버 상태로 재구성 - 4xx 충돌 복구 경로)
 */
function CollectionEditor({
  collection,
  onRefresh,
}: {
  collection: CollectionDetail;
  onRefresh: () => Promise<unknown>;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { collectionApi } = useApis();

  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState(collection.description ?? "");
  const [tint, setTint] = useState<CollectionTint>(collection.tint);
  const [visibility, setVisibility] = useState<CollectionVisibility>(
    collection.visibility,
  );
  const [items, setItems] = useState<DraftItem[]>(() =>
    collection.items.map((i) => ({
      itemId: i.itemId,
      contentId: i.contentId,
      title: i.title,
      posterUrl: i.posterUrl,
      domain: i.domain,
      comment: i.comment ?? "",
    })),
  );
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [showTitleError, setShowTitleError] = useState(false);
  const [confirming, setConfirming] = useState<"delete" | "discard" | null>(
    null,
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 재시도 시 diff 재계산의 기준점 - 저장 성공 전까지 고정
  const baselineRef = useRef({
    title: collection.title,
    description: collection.description ?? "",
    tint: collection.tint,
    visibility: collection.visibility,
    order: collection.items.map((i) => i.itemId),
    // 트림해 저장 - 서버 값의 공백 차이만으로 무편집 코멘트가 PATCH로 새지 않게
    comments: new Map(
      collection.items.map((i) => [i.itemId, (i.comment ?? "").trim()]),
    ),
  });
  const baseline = baselineRef.current;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ===== diff =====
  const currentOrder = items.map((i) => i.itemId);
  const baselineRemaining = baseline.order.filter(
    (id) => !removedIds.includes(id),
  );
  const orderChanged =
    currentOrder.join(",") !== baselineRemaining.join(",");
  const metaDiff: CollectionUpdateBody = {};
  if (title !== baseline.title) metaDiff.title = title.trim();
  if (description !== baseline.description)
    metaDiff.description = description.trim();
  if (tint !== baseline.tint) metaDiff.tint = tint;
  if (visibility !== baseline.visibility) metaDiff.visibility = visibility;
  const commentChanges = items.filter(
    (i) => i.comment.trim() !== (baseline.comments.get(i.itemId) ?? ""),
  );
  const dirty =
    orderChanged ||
    removedIds.length > 0 ||
    Object.keys(metaDiff).length > 0 ||
    commentChanges.length > 0;
  const valid = title.trim().length > 0;

  // ===== 저장 - 순차 일괄, 전 연산 멱등 (재시도 = 전체 재실행) =====
  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const removedId of removedIds) {
        try {
          await collectionApi.deleteItem(collection.id, removedId);
        } catch (error) {
          // 404 = 이미 삭제됨 (직전 시도에서 성공) - 멱등 통과
          if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
            throw error;
          }
        }
      }
      if (orderChanged) {
        await collectionApi.reorderItems(collection.id, currentOrder);
      }
      for (const item of commentChanges) {
        await collectionApi.updateItem(collection.id, item.itemId, {
          comment: item.comment.trim(),
        });
      }
      if (Object.keys(metaDiff).length > 0) {
        await collectionApi.updateCollection(collection.id, metaDiff);
      }
    },
    onSuccess: () => {
      // 상세 캐시를 드래프트로 직접 보정 - invalidate 재조회는 조회수를 +1
      // 시키므로 피한다 (C-FE1 좋아요 전례)
      queryClient.setQueryData<CollectionDetail>(
        ["collection", collection.id],
        (old) => {
          if (!old) return old;
          const byId = new Map(old.items.map((i) => [i.itemId, i]));
          const newItems = items.flatMap((draft, index) => {
            const orig = byId.get(draft.itemId);
            return orig
              ? [
                  {
                    ...orig,
                    comment: draft.comment.trim() || null,
                    position: index,
                  },
                ]
              : [];
          });
          return {
            ...old,
            title: title.trim(),
            description: description.trim() || null,
            tint,
            visibility,
            itemCount: newItems.length,
            coverPosters: newItems
              .map((i) => i.posterUrl)
              .filter((p): p is string => !!p)
              .slice(0, 3),
            items: newItems,
            updatedAt: new Date().toISOString(),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      navigate(`/collections/${collection.id}`);
    },
    onError: () => {
      // 부분 성공(예: 제거 DELETE만 반영) 시 상세 캐시에 삭제된 아이템이
      // 유령으로 남지 않게 무효화 - 활성 쿼리 재조회의 조회수 +1 한 번은
      // 정합성 비용으로 수용
      queryClient.invalidateQueries({
        queryKey: ["collection", collection.id],
      });
    },
  });

  // 4xx = 재시도 무의미(서버 상태와 드래프트가 어긋남 - 예: PUT order 집합
  // 불일치 400, 중복 409). 5xx/네트워크만 재시도 대상.
  const saveStatus = axios.isAxiosError(saveMutation.error)
    ? saveMutation.error.response?.status
    : undefined;
  const saveConflict =
    saveStatus !== undefined && saveStatus >= 400 && saveStatus < 500;

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const deleteMutation = useDeleteCollection();

  const handleSave = () => {
    if (saveMutation.isPending) return;
    if (!valid) {
      setShowTitleError(true);
      return;
    }
    if (!dirty) {
      navigate(`/collections/${collection.id}`);
      return;
    }
    saveMutation.mutate();
  };

  const handleClose = () => {
    if (dirty) setConfirming("discard");
    else navigate(`/collections/${collection.id}`);
  };

  const handleDelete = () => {
    if (deleteMutation.isPending) return;
    deleteMutation.mutate(collection.id, {
      // 삭제 후 발견 페이지로 (replace - 뒤로가기가 죽은 상세로 가지 않게)
      onSuccess: () => navigate("/collections", { replace: true }),
    });
  };

  // ===== 아이템 조작 =====
  const move = (index: number, delta: -1 | 1) => {
    setItems((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const changeComment = (itemId: number, comment: string) => {
    setItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, comment } : i)),
    );
  };

  const removeItem = (itemId: number) => {
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
    setRemovedIds((prev) => [...prev, itemId]);
  };

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Firefox는 데이터가 없으면 드래그가 시작되지 않는다
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex === null || dragIndex === index) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(index);
  };

  const handleDragEnd = () => setDragIndex(null);

  // ===== 부분 뷰 =====
  const saveLabel = saveMutation.isPending ? (
    <span className="inline-flex items-center gap-1.5">
      <CircleNotch size={15} className="animate-spin" aria-hidden="true" />
      저장 중
    </span>
  ) : (
    "저장"
  );

  const saveErrorBanner = saveMutation.isError && (
    <div
      role="alert"
      className="mt-4 flex flex-wrap items-center gap-2 rounded-panel border border-danger/40 bg-danger/5 px-4 py-3 text-[13.5px] text-danger"
    >
      <WarningCircle size={17} className="flex-none" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        {saveConflict
          ? "다른 곳에서 컬렉션이 바뀌었어요. 최신 상태로 새로고침한 뒤 다시 편집해 주세요."
          : "저장하지 못한 변경이 있어요. 네트워크 확인 후 다시 시도해 주세요."}
      </span>
      {saveConflict ? (
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex-none rounded-full border border-danger px-3.5 py-1.5 text-[13px] font-bold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? (
            <span className="inline-flex items-center gap-1.5">
              <CircleNotch
                size={13}
                className="animate-spin"
                aria-hidden="true"
              />
              새로고침 중
            </span>
          ) : (
            "최신 상태로 새로고침"
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          className="flex-none rounded-full border border-danger px-3.5 py-1.5 text-[13px] font-bold text-danger transition-colors hover:bg-danger/10"
        >
          다시 시도
        </button>
      )}
    </div>
  );

  const coverPreviewPosters = items
    .map((i) => i.posterUrl)
    .filter((p): p is string => !!p)
    .slice(0, 3);

  // <lg·lg+ 두 곳에 렌더되므로 id는 접두사로 충돌 방지 (숨은 쪽은 display:none)
  const renderIntroFields = (idPrefix: string) => (
    <>
      <div>
        <label htmlFor={`${idPrefix}-title`} className={fieldLabelClass}>
          이름
        </label>
        <input
          id={`${idPrefix}-title`}
          value={title}
          maxLength={TITLE_MAX}
          onChange={(e) => {
            setTitle(e.target.value);
            if (e.target.value.trim()) setShowTitleError(false);
          }}
          aria-invalid={showTitleError}
          className={fieldInputClass}
        />
        <div className="mt-1 flex items-baseline justify-between gap-2">
          {showTitleError ? (
            <p className="text-xs font-semibold text-danger">
              이름을 입력해 주세요.
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs tabular-nums text-ink-3">
            {title.length}/{TITLE_MAX}
          </span>
        </div>
      </div>
      <div className="mt-2.5">
        <label htmlFor={`${idPrefix}-desc`} className={fieldLabelClass}>
          설명
        </label>
        <textarea
          id={`${idPrefix}-desc`}
          value={description}
          maxLength={DESC_MAX}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="이 컬렉션에 담을 이야기를 소개해 주세요"
          className={`${fieldInputClass} resize-none`}
        />
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className="text-xs text-ink-3">
            컬렉션 카드와 상세 상단에 보여요.
          </p>
          <span className="text-xs tabular-nums text-ink-3">
            {description.length}/{DESC_MAX}
          </span>
        </div>
      </div>
      <div className="mt-2.5">
        <span className={fieldLabelClass}>공개 설정</span>
        <div
          role="radiogroup"
          aria-label="공개 설정"
          className="flex gap-2"
        >
          <VisibilityOption
            active={visibility === "PUBLIC"}
            onClick={() => setVisibility("PUBLIC")}
            icon={<GlobeHemisphereEast size={16} aria-hidden="true" />}
            label="공개"
          />
          <VisibilityOption
            active={visibility === "PRIVATE"}
            onClick={() => setVisibility("PRIVATE")}
            icon={<LockSimple size={16} aria-hidden="true" />}
            label="나만 보기"
          />
        </div>
      </div>
    </>
  );

  const deleteButton = (
    <button
      type="button"
      onClick={() => setConfirming("delete")}
      disabled={deleteMutation.isPending}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-input border border-line bg-surface py-2.5 text-sm font-semibold text-danger transition-colors hover:border-danger hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {deleteMutation.isPending ? (
        <CircleNotch size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        <Trash size={16} aria-hidden="true" />
      )}
      컬렉션 삭제
    </button>
  );

  const itemList = (
    <>
      {items.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {items.map((item, index) => (
            <EditItemRow
              key={item.itemId}
              item={item}
              index={index}
              total={items.length}
              onMove={move}
              onCommentChange={changeComment}
              onRemove={removeItem}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              dragging={dragIndex === index}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          variant="note"
          title="아직 담긴 작품이 없어요"
          description="탐색에서 작품을 열고 담기 버튼으로 채워보세요."
        />
      )}
      <Link
        to={`/explore?domain=${collection.domain.toLowerCase()}`}
        className="mt-2.5 flex items-center gap-2.5 rounded-panel border border-dashed border-line-strong bg-surface px-4 py-3.5 text-sm text-ink-2 transition-colors hover:border-ink hover:text-ink"
      >
        <PlusCircle
          size={18}
          className="flex-none text-accent-ink"
          aria-hidden="true"
        />
        작품 추가 - 탐색에서 작품을 열고 담기로 채울 수 있어요
      </Link>
      <p className="mt-3.5 flex items-center gap-1.5 text-[13px] text-ink-3">
        <TrendUp size={15} aria-hidden="true" />
        {items.length}작품 · 좋아요 {collection.likeCount.toLocaleString()}개
        받는 중
      </p>
    </>
  );

  return (
    <>
      <Shell
        onClose={handleClose}
        actions={
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="rounded-full bg-accent-ink px-4 py-2 text-[13.5px] font-bold text-surface transition-opacity active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveLabel}
          </button>
        }
      >
        {/* lg+ edit-bar (목업 3) */}
        <div className="hidden items-center gap-3 rounded-panel border border-accent-ink bg-accent-tint py-3 pl-4 pr-3 text-sm font-semibold text-accent-ink lg:flex">
          <PencilSimple size={17} aria-hidden="true" />
          편집 모드
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-accent-ink bg-surface px-4 py-2 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-tint active:scale-[0.98]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="rounded-full bg-accent-ink px-5 py-2 text-sm font-bold text-surface transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveLabel}
          </button>
        </div>

        {saveErrorBanner}

        {/* <lg: 커버 -> 틴트 -> 필드 -> 리스트 (목업 5c) / lg+: 380px + 1fr */}
        <div className="mt-3.5 lg:mt-5 lg:grid lg:grid-cols-[380px_1fr] lg:items-start lg:gap-8">
          <div>
            {/* <lg 커버 미리보기 (목업 .m-edit-cover) - 틴트 즉시 반영 */}
            <div className="lg:hidden">
              <CollectionCollage
                posters={coverPreviewPosters}
                tint={tint}
                domain={collection.domain}
                className="aspect-video rounded-panel shadow-card"
              />
              <TintPicker
                value={tint}
                onChange={setTint}
                size="sm"
                className="mt-3 justify-center"
              />
              <div className="mt-4">{renderIntroFields("m-edit")}</div>
              {deleteButton}
            </div>

            {/* lg+ 꾸미기 패널 2장 + 삭제 */}
            <div className="hidden lg:block">
              <section className="rounded-panel border border-line bg-surface p-[18px] shadow-card">
                <h2 className="text-sm font-extrabold text-ink">커버 틴트</h2>
                <CollectionCollage
                  posters={coverPreviewPosters}
                  tint={tint}
                  domain={collection.domain}
                  className="mt-3 aspect-video rounded-input"
                />
                <TintPicker value={tint} onChange={setTint} className="mt-3.5" />
                <p className="mt-2.5 text-xs leading-relaxed text-ink-3">
                  커버는 담긴 작품 포스터로 자동 구성되고, 틴트가 살짝 덮여
                  컬렉션의 분위기를 만듭니다.
                </p>
              </section>
              <section className="mt-4 rounded-panel border border-line bg-surface p-[18px] shadow-card">
                <h2 className="mb-3 text-sm font-extrabold text-ink">소개</h2>
                {renderIntroFields("d-edit")}
              </section>
              {deleteButton}
            </div>
          </div>

          <div className="mt-5 lg:mt-0">{itemList}</div>
        </div>
      </Shell>

      {confirming === "discard" && (
        <ConfirmDialog
          title="변경사항을 저장하지 않고 나갈까요?"
          description="지금 나가면 편집한 내용이 사라져요."
          cancelLabel="계속 편집"
          confirmLabel="나가기"
          onCancel={() => setConfirming(null)}
          onConfirm={() => navigate(`/collections/${collection.id}`)}
        />
      )}
      {confirming === "delete" && (
        <ConfirmDialog
          title="컬렉션을 삭제할까요?"
          description="담긴 작품 목록과 코멘트, 받은 좋아요가 함께 삭제되고 되돌릴 수 없어요."
          confirmLabel="삭제"
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            setConfirming(null);
            handleDelete();
          }}
        />
      )}
    </>
  );
}

/** 편집 진입 골격의 로딩 자리 표시 */
function EditSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse">
      <div className="hidden h-[58px] rounded-panel bg-line lg:block" />
      <div className="mt-3.5 lg:mt-5 lg:grid lg:grid-cols-[380px_1fr] lg:items-start lg:gap-8">
        <div>
          <div className="aspect-video rounded-panel bg-line" />
          <div className="mx-auto mt-3 h-[30px] w-56 rounded-full bg-canvas" />
          <div className="mt-4 h-11 rounded-input bg-canvas" />
          <div className="mt-3 h-20 rounded-input bg-canvas" />
        </div>
        <div className="mt-5 flex flex-col gap-2.5 lg:mt-0">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-[104px] rounded-panel bg-line" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CollectionEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const collectionId = id ? Number(id) : 0;
  const { isAuthenticated } = useAuth();
  // 4xx 충돌 복구용 - 새로고침 완료 시 +1 해 편집기를 재마운트(드래프트 재구성)
  const [editorEpoch, setEditorEpoch] = useState(0);

  // 비로그인은 조회 자체를 막는다 (게이트 화면 + 불필요한 조회수 증가 방지)
  const { data, isLoading, isError, error, refetch } = useCollectionDetail(
    collectionId,
    { enabled: isAuthenticated && !!collectionId },
  );

  const handleRefresh = async () => {
    // refetch는 staleTime을 우회해 항상 서버를 친다 (조회수 +1 비용 수용) -
    // 완료 후 epoch를 올려 최신 데이터로 편집기를 새로 구성
    await refetch();
    setEditorEpoch((epoch) => epoch + 1);
  };

  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const notFound =
    !collectionId || Number.isNaN(collectionId) || status === 404;
  // 403 = 서버가 열람 자체를 막은 타인 비공개 컬렉션 (상세로 보내도 같은 403)
  const isForbidden = status === 403;
  const notOwner = isForbidden || (data ? !data.owner : false);

  const guard = (content: ReactNode) => (
    <Shell onClose={() => navigate("/collections")}>
      <div className="mt-4">{content}</div>
    </Shell>
  );

  if (!isAuthenticated) {
    return guard(
      <EmptyState
        icon={<SignIn size={44} />}
        title="로그인하면 컬렉션을 편집할 수 있어요"
        description="내가 만든 컬렉션만 편집할 수 있어요."
        action={
          <button
            type="button"
            onClick={() => navigate("/login")}
            className={primaryBtnClass}
          >
            로그인
          </button>
        }
      />,
    );
  }

  if (isLoading) {
    return (
      <Shell onClose={() => navigate("/collections")}>
        <EditSkeleton />
      </Shell>
    );
  }

  if (notFound) {
    return guard(
      <EmptyState
        title="컬렉션을 찾을 수 없어요"
        description="주소가 잘못되었거나 삭제된 컬렉션일 수 있어요."
        action={
          <Link to="/collections" className={`inline-block ${primaryBtnClass}`}>
            컬렉션 둘러보기
          </Link>
        }
      />,
    );
  }

  if (notOwner) {
    return guard(
      <EmptyState
        icon={<LockSimple size={44} />}
        title="내 컬렉션만 편집할 수 있어요"
        description="이 컬렉션은 다른 큐레이터의 것이에요."
        action={
          // 403(타인 비공개)은 상세도 같은 403이라 발견 페이지로 보낸다
          isForbidden ? (
            <Link
              to="/collections"
              className={`inline-block ${primaryBtnClass}`}
            >
              컬렉션 둘러보기
            </Link>
          ) : (
            <Link
              to={`/collections/${collectionId}`}
              className={`inline-block ${primaryBtnClass}`}
            >
              컬렉션 보기
            </Link>
          )
        }
      />,
    );
  }

  if (isError || !data) {
    return guard(
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
      />,
    );
  }

  return (
    <CollectionEditor
      key={editorEpoch}
      collection={data}
      onRefresh={handleRefresh}
    />
  );
}
