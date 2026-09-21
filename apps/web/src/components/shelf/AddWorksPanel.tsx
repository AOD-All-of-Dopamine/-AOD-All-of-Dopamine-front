import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  CircleNotch,
  MagnifyingGlass,
  Plus,
  X,
} from "@phosphor-icons/react";
import { useSearchWorks, useWorks } from "@aod/shared/hooks";
import { collectionDomainLabel } from "@aod/shared/constants";
import type { WorkSummary } from "@aod/shared/types";
import WorkThumb from "../ui/WorkThumb";
import { workCardMeta } from "../ui/workCardInfo";

const PAGE_SIZE = 12;
/** 둘러보기는 이미 꽂힌 작품을 걸러 내므로 넉넉히 받아 PAGE_SIZE 개를 보인다 */
const BROWSE_FETCH_SIZE = 40;
const DEBOUNCE_MS = 250;

export interface AddWorksPanelProps {
  /** 컬렉션 도메인 - 다른 도메인 작품은 담을 수 없어(400) 검색을 여기로 한정한다 */
  domain: string;
  /** 이미 꽂힌 작품 */
  shelvedContentIds: Set<number>;
  /** 지금 꽂는 중인 작품 (응답 대기) */
  pendingContentIds: Set<number>;
  onAdd: (work: WorkSummary) => void;
  onClose: () => void;
  /** 열릴 때 검색 칸에 포커스 (lg+ 옆 패널). 시트는 키보드가 화면을 덮으므로 끈다 */
  autoFocus?: boolean;
}

/**
 * 작품 꽂기 - 검색해서 한 번 누르면 꽂힌다. **닫히지 않는다** - 연달아 꽂는 것이 수집이다.
 * 검색어가 없으면 그 도메인의 작품 목록을 먼저 보여 준다(빈 화면에서 시작하지 않게).
 * 둘러보기는 **패널을 열 때 이미 꽂혀 있던 작품을 숨긴다** - 누를 수 있는 행만 남게.
 * 이번에 꽂은 작품은 그 자리에 "꽂힘"으로 남는다(행이 사라지면 밑의 행이 올라와 잘못 눌린다).
 * 검색 결과는 숨기지 않는다 - 찾던 작품이 이미 꽂혀 있다는 것도 답이다.
 * lg+ 는 책장 옆 패널이라 꽂히는 것이 그대로 보이고, <lg 는 바텀시트 안에 들어간다.
 */
const AddWorksPanel = ({
  domain,
  shelvedContentIds,
  pendingContentIds,
  onAdd,
  onClose,
  autoFocus = false,
}: AddWorksPanelProps) => {
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  /** 패널을 연 시점에 꽂혀 있던 작품 - 둘러보기에서 숨긴다 (열 때마다 다시 마운트되어 새로 찍힌다) */
  const [shelvedAtOpen] = useState(() => new Set(shelvedContentIds));
  const label = collectionDomainLabel(domain);

  useEffect(() => {
    const timer = window.setTimeout(() => setKeyword(input.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const searching = keyword.length > 0;
  const search = useSearchWorks(
    keyword,
    { domain, size: PAGE_SIZE },
    { enabled: searching },
  );
  const browse = useWorks(
    { domain, size: BROWSE_FETCH_SIZE },
    { enabled: !searching },
  );
  const { data, isLoading, isError } = searching ? search : browse;
  const works = searching
    ? (data?.content ?? [])
    : (data?.content ?? [])
        .filter((work) => !shelvedAtOpen.has(work.id))
        .slice(0, PAGE_SIZE);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-none items-center justify-between">
        <h2 className="text-[15px] font-extrabold tracking-[-0.01em] text-ink">
          작품 꽂기
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="작품 꽂기 닫기"
          className="-mr-1.5 grid h-9 w-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-ink/5"
        >
          <X size={18} />
        </button>
      </div>

      <label className="mt-2 flex h-10 flex-none items-center gap-2 rounded-full border border-line bg-canvas px-3.5 text-ink-3 transition-colors focus-within:border-line-strong">
        <MagnifyingGlass size={16} className="flex-none" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label={`${label} 제목 검색`}
          placeholder={`${label} 제목 검색`}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
      </label>

      <div className="mt-3 flex-none text-[12.5px] font-bold text-ink-3">
        {searching ? `'${keyword}' 검색 결과` : `${label} 둘러보기`}
      </div>

      <div className="-mx-1.5 mt-1 min-h-0 flex-1 overflow-y-auto scrollbar-rail">
        {isLoading ? (
          <ul aria-hidden="true" className="animate-pulse">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="flex items-center gap-3 px-1.5 py-2">
                <div className="aspect-[2/3] w-10 flex-none rounded-input bg-line" />
                <div className="flex-1">
                  <div className="h-3.5 w-3/5 rounded-input bg-line" />
                  <div className="mt-1.5 h-3 w-2/5 rounded-input bg-canvas" />
                </div>
              </li>
            ))}
          </ul>
        ) : isError ? (
          <p className="px-1.5 py-6 text-center text-[13.5px] text-ink-2">
            작품을 불러오지 못했어요. 잠시 후 다시 검색해 주세요.
          </p>
        ) : works.length === 0 ? (
          <p className="px-1.5 py-6 text-center text-[13.5px] text-ink-2">
            {searching
              ? `'${keyword}'에 맞는 ${label} 작품이 없어요.`
              : "둘러볼 작품은 다 꽂았어요. 제목으로 검색해 보세요."}
          </p>
        ) : (
          <ul>
            {works.map((work) => {
              const shelved = shelvedContentIds.has(work.id);
              const pending = pendingContentIds.has(work.id);
              return (
                <li
                  key={work.id}
                  className="flex items-center gap-3 rounded-input px-1.5 py-2"
                >
                  <WorkThumb
                    imageUrl={work.thumbnail}
                    domain={work.domain}
                    className="w-10 flex-none rounded-input border border-line"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-ink">
                      {work.title}
                    </div>
                    <div className="truncate text-[12.5px] text-ink-3">
                      {workCardMeta(work)}
                    </div>
                  </div>
                  {shelved ? (
                    <span className="inline-flex flex-none items-center gap-1 px-2 text-[13px] font-bold text-ink-3">
                      <CheckCircle size={15} weight="fill" aria-hidden="true" />
                      꽂힘
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAdd(work)}
                      disabled={pending}
                      aria-label={`${work.title} 꽂기`}
                      className="inline-flex h-9 flex-none items-center gap-1 rounded-full bg-accent-ink px-3.5 text-[13px] font-bold text-surface transition-opacity hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
                    >
                      {pending ? (
                        <CircleNotch size={14} className="animate-spin" />
                      ) : (
                        <Plus size={13} weight="bold" aria-hidden="true" />
                      )}
                      꽂기
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AddWorksPanel;
