import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  CircleNotch,
  PlusCircle,
  Stack,
  StackPlus,
  WarningCircle,
} from "@phosphor-icons/react";
import { MyCollectionSummary } from "../../api/collectionApi";
import {
  isAlreadyInCollectionError,
  useAddCollectionItem,
  useMyCollectionSummaries,
  useRemoveCollectionItem,
} from "../../hooks/useCollections";
import { collectionTintBg } from "../../constants/collections";
import { DOMAIN_LABEL_MAP } from "../../constants/domain";

/**
 * "컬렉션에 담기" 메뉴 (목업 4 팝오버 · 5d 바텀시트).
 * - AddToCollectionPopover: lg+ 전용. 트리거(고스트 필 버튼)와 앵커 팝오버를
 *   함께 렌더 - 바깥 클릭·Escape·<lg 진입 시 닫힘.
 * - AddToCollectionSheet: <lg 전용. 탐색 필터 시트의 네이티브 dialog.showModal()
 *   패턴 재사용 (top-layer + @starting-style 전환 + 유령 close 가드 +
 *   reduced-motion 즉시 닫힘).
 * 내용은 공용 PickList: mine/summary(해당 작품 도메인의 내 컬렉션 + 포함 여부)
 * 목록, 클릭 = 담기/빼기 토글, 하단 "새 컬렉션 만들기"(도메인 프리필).
 *
 * 목업·계약 대비 편차:
 * - 행 썸네일은 포스터 2장 대신 틴트 스와치 + Stack 아이콘 - mine/summary
 *   계약(MyCollectionSummaryDTO)에 커버 포스터가 없다.
 * - 빼기 토글은 상세 조회로 itemId를 해석(useRemoveCollectionItem 주석 참고).
 */

interface CollectToastState {
  message: string;
  /** 있으면 "보러 가기" 링크 노출 (담기 성공) */
  collectionId?: number;
}

const useCollectToast = () => {
  const [toast, setToast] = useState<CollectToastState | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const showToast = useCallback((next: CollectToastState) => {
    setToast(next);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  return { toast, showToast };
};

/** 담김 확인 토스트 (목업 .toast) - "보러 가기"는 담기 성공 시에만 */
const CollectToast = ({
  toast,
  onView,
}: {
  toast: CollectToastState;
  onView: (collectionId: number) => void;
}) => (
  <div
    role="status"
    className="pointer-events-none fixed inset-x-0 bottom-8 z-50 flex justify-center px-4"
  >
    <span className="pointer-events-auto flex min-w-0 items-center gap-2 rounded-full bg-ink px-[18px] py-2.5 text-[13.5px] font-semibold text-surface shadow-lift">
      <span className="truncate">{toast.message}</span>
      {toast.collectionId !== undefined && (
        <button
          type="button"
          onClick={() => onView(toast.collectionId!)}
          className="flex-none font-bold text-accent-tint underline-offset-2 hover:underline"
        >
          보러 가기
        </button>
      )}
    </span>
  </div>
);

/** 행 썸네일 - 틴트 스와치 (계약에 포스터 없음 - 파일 상단 편차 참고) */
const TintThumb = ({ tint }: { tint: string }) => (
  <span
    aria-hidden="true"
    className={`grid h-10 w-10 flex-none place-items-center rounded-input text-surface ${collectionTintBg(tint)}`}
  >
    <Stack size={18} weight="fill" />
  </span>
);

const RowSkeleton = () => (
  <div
    aria-hidden="true"
    className="flex animate-pulse items-center gap-[11px] px-2.5 py-[9px]"
  >
    <div className="h-10 w-10 flex-none rounded-input bg-line" />
    <div className="min-w-0 flex-1">
      <div className="h-3.5 w-3/5 rounded-input bg-line" />
      <div className="mt-1.5 h-3 w-2/5 rounded-input bg-canvas" />
    </div>
  </div>
);

interface PickListProps {
  contentId: number;
  /** 작품의 Domain enum명 - 새 컬렉션 프리필용 */
  domain: string;
  enabled: boolean;
  onClose: () => void;
  showToast: (toast: CollectToastState) => void;
  variant: "popover" | "sheet";
}

/** 팝오버·시트 공용 본문 - 내 컬렉션 목록 + 토글 + 새 컬렉션 */
const PickList = ({
  contentId,
  domain,
  enabled,
  onClose,
  showToast,
  variant,
}: PickListProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useMyCollectionSummaries(
    contentId,
    enabled,
  );
  const addItem = useAddCollectionItem(contentId);
  const removeItem = useRemoveCollectionItem(contentId);

  const busy = addItem.isPending || removeItem.isPending;
  const pendingId = addItem.isPending
    ? addItem.variables?.collectionId
    : removeItem.isPending
      ? removeItem.variables?.collectionId
      : undefined;

  const toggle = (summary: MyCollectionSummary) => {
    if (busy) return;
    if (summary.containsContent) {
      removeItem.mutate(
        { collectionId: summary.id },
        {
          onSuccess: () =>
            showToast({ message: `"${summary.title}"에서 뺐어요` }),
          onError: () =>
            showToast({ message: "빼기에 실패했어요. 다시 시도해 주세요" }),
        },
      );
      return;
    }
    addItem.mutate(
      { collectionId: summary.id },
      {
        onSuccess: () =>
          showToast({
            message: `"${summary.title}"에 담았어요`,
            collectionId: summary.id,
          }),
        onError: (error) => {
          if (isAlreadyInCollectionError(error)) {
            // 서버 기준 이미 담김 (다른 탭 등) - 포함 표시를 재조회로 동기화
            queryClient.invalidateQueries({
              queryKey: ["collections", "mine-summary", contentId],
            });
            showToast({ message: "이미 담겨 있는 작품이에요" });
          } else {
            showToast({ message: "담기에 실패했어요. 다시 시도해 주세요" });
          }
        },
      },
    );
  };

  const goCreate = () => {
    onClose();
    navigate(`/collections/new?domain=${encodeURIComponent(domain)}`);
  };

  const domainLabel = DOMAIN_LABEL_MAP[domain] ?? domain;
  const listClass =
    variant === "sheet"
      ? "min-h-0 flex-1 overflow-y-auto p-2"
      : "max-h-[320px] overflow-y-auto p-1.5";

  return (
    <>
      <div className={listClass}>
        {isLoading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : isError ? (
          <div className="px-3 py-5 text-center">
            <WarningCircle
              size={22}
              className="mx-auto text-ink-3"
              aria-hidden="true"
            />
            <p className="mt-1.5 text-[13px] text-ink-2">
              내 컬렉션을 불러오지 못했어요
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2.5 rounded-full border border-line-strong bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:border-ink"
            >
              다시 시도
            </button>
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="px-3 py-5 text-center text-[13px] leading-relaxed text-ink-2">
            아직 {domainLabel} 컬렉션이 없어요.
            <br />첫 컬렉션을 만들어 담아보세요.
          </p>
        ) : (
          data!.map((summary) => (
            <button
              key={summary.id}
              type="button"
              onClick={() => toggle(summary)}
              disabled={busy}
              aria-pressed={summary.containsContent}
              className="flex w-full items-center gap-[11px] rounded-input px-2.5 py-[9px] text-left transition-colors hover:bg-ink/5 disabled:cursor-not-allowed"
            >
              <TintThumb tint={summary.tint} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-bold text-ink">
                  {summary.title}
                </span>
                <span className="block text-xs text-ink-3">
                  {summary.itemCount}작품 ·{" "}
                  {summary.visibility === "PRIVATE" ? "나만 보기" : "공개"}
                </span>
              </span>
              {pendingId === summary.id ? (
                <CircleNotch
                  size={18}
                  className="flex-none animate-spin text-ink-3"
                  aria-hidden="true"
                />
              ) : (
                summary.containsContent && (
                  <CheckCircle
                    size={18}
                    weight="fill"
                    className="flex-none text-accent-ink"
                    aria-hidden="true"
                  />
                )
              )}
            </button>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={goCreate}
        style={
          variant === "sheet"
            ? { paddingBottom: "max(14px, env(safe-area-inset-bottom))" }
            : undefined
        }
        className={`flex w-full flex-none items-center gap-2.5 border-t border-line px-4 text-[13.5px] font-bold text-accent-ink transition-colors hover:bg-accent-tint/60 ${
          variant === "sheet" ? "py-3.5" : "py-3"
        }`}
      >
        <PlusCircle size={18} aria-hidden="true" />새 컬렉션 만들기
      </button>
    </>
  );
};

// ========== lg+ 팝오버 (목업 4) ==========

export interface AddToCollectionPopoverProps {
  contentId: number;
  domain: string;
  isAuthenticated: boolean;
  onRequireLogin: () => void;
}

/**
 * 트리거("담기" 고스트 필) + 앵커 팝오버 세트. work-detail lg+ 액션 행에서
 * 사용 - 래퍼가 relative 앵커라 팝오버는 버튼 바로 아래에 뜬다.
 */
export const AddToCollectionPopover = ({
  contentId,
  domain,
  isAuthenticated,
  onRequireLogin,
}: AddToCollectionPopoverProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { toast, showToast } = useCollectToast();

  useEffect(() => {
    if (!open) return;
    // 바깥 클릭 - 트리거 포함 래퍼 내부는 무시 (토글 이중 발화 방지)
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    // <lg 진입 시 닫기 - 그 폭에서는 바텀시트가 담당
    const mql = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = () => {
      if (!mql.matches) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    mql.addEventListener("change", onBreakpoint);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      mql.removeEventListener("change", onBreakpoint);
    };
  }, [open]);

  const handleTrigger = () => {
    if (!isAuthenticated) {
      onRequireLogin();
      return;
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTrigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-[7px] rounded-full border border-line bg-surface px-5 py-[11px] text-[14.5px] font-semibold text-ink transition-colors hover:border-line-strong active:scale-[0.98]"
      >
        <StackPlus size={17} aria-hidden="true" />
        담기
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="컬렉션에 담기"
          className="absolute left-0 top-full z-50 mt-2 flex w-[320px] flex-col overflow-hidden rounded-panel border border-line bg-surface shadow-lift"
        >
          <div className="border-b border-line px-4 pb-2.5 pt-3.5 text-[14.5px] font-extrabold text-ink">
            컬렉션에 담기
          </div>
          <PickList
            contentId={contentId}
            domain={domain}
            enabled={open && isAuthenticated}
            onClose={() => setOpen(false)}
            showToast={showToast}
            variant="popover"
          />
        </div>
      )}
      {toast && (
        <CollectToast
          toast={toast}
          onView={(collectionId) => {
            setOpen(false);
            navigate(`/collections/${collectionId}`);
          }}
        />
      )}
    </div>
  );
};

// ========== <lg 바텀시트 (목업 5d) ==========

export interface AddToCollectionSheetProps {
  contentId: number;
  domain: string;
  open: boolean;
  onClose: () => void;
}

/**
 * 담기 바텀시트 - 탐색 필터 시트의 dialog.showModal() 문법 재사용.
 * display:none 조상 아래에서는 top-layer가 그려지지 않으므로 페이지 루트에
 * 마운트할 것. lg+에서는 열지 않고 즉시 닫는다 (팝오버 몫).
 */
export const AddToCollectionSheet = ({
  contentId,
  domain,
  open,
  onClose,
}: AddToCollectionSheetProps) => {
  const navigate = useNavigate();
  const [shown, setShown] = useState(false);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const pressedBackdropRef = useRef(false);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const { toast, showToast } = useCollectToast();
  // onClose는 부모 렌더마다 새 함수일 수 있다 - 열림 이펙트가 그때마다
  // 재실행(cleanup이 dialog를 닫음)되지 않게 ref로 최신값만 참조
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // 닫힘 시작 - 슬라이드 다운을 먼저 돌리고 전환이 끝난 뒤 close()
  const closeSheet = () => {
    const dialog = sheetRef.current;
    if (!dialog?.open) return;
    setShown(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.close();
      return;
    }
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => dialog.close(), 300);
  };

  // 열림 동안: showModal + body 스크롤 잠금 + lg 진입 시 자동 닫기
  useEffect(() => {
    if (!open) return;
    const dialog = sheetRef.current;
    if (!dialog) return;
    const mql = window.matchMedia("(min-width: 1024px)");
    if (mql.matches) {
      // lg+에서 열림 요청 - 이 폭은 팝오버 몫이라 즉시 반려
      onCloseRef.current();
      return;
    }
    window.clearTimeout(closeTimerRef.current);
    if (!dialog.open) dialog.showModal();
    setShown(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
  }, [open]);

  return (
    <dialog
      ref={sheetRef}
      aria-label="컬렉션에 담기"
      onClose={() => {
        // 탐색 시트 전례: StrictMode 이중 이펙트가 재개방 후 흘려보내는
        // 유령 close 이벤트는 open=true 상태로 도착하므로 무시한다
        if (sheetRef.current?.open) return;
        setShown(false);
        onClose();
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
        shown
          ? "translate-y-0 backdrop:opacity-100 starting:translate-y-full starting:backdrop:opacity-0"
          : "translate-y-full backdrop:opacity-0"
      }`}
    >
      {/* 패널 전면을 덮는 래퍼 - 내부 클릭이 dialog 자신(딤 판정)으로 새지 않게 */}
      <div className="flex max-h-[82dvh] flex-col">
        <div className="mx-auto mt-2.5 h-1 w-9 flex-none rounded-full bg-line-strong" />
        <div className="flex-none border-b border-line px-5 pb-3 pt-2.5 text-base font-extrabold text-ink">
          컬렉션에 담기
        </div>
        <PickList
          contentId={contentId}
          domain={domain}
          enabled={open}
          onClose={closeSheet}
          showToast={showToast}
          variant="sheet"
        />
      </div>
      {/* 토스트는 top-layer 안(dialog 자식)이어야 딤 위로 보인다 */}
      {toast && (
        <CollectToast
          toast={toast}
          onView={(collectionId) => {
            closeSheet();
            navigate(`/collections/${collectionId}`);
          }}
        />
      )}
    </dialog>
  );
};
