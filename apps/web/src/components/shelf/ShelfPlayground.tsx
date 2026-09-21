import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CollectionDetail,
  CollectionItem,
  CollectionSummary,
} from "@aod/shared/api";
import {
  shelfAppend,
  shelfInsertAt,
  shelfMove,
  shelfRemove,
  shelfSetComment,
  useWorks,
} from "@aod/shared/hooks";
import type { WorkSummary } from "@aod/shared/types";
import SegmentedControl from "../ui/SegmentedControl";
import Toast from "../ui/Toast";
import { useToast } from "../../hooks/useToast";
import Shelf from "./Shelf";
import PulledWorkPanel from "./PulledWorkPanel";
import AddWorksPanel from "./AddWorksPanel";
import Bookcase from "./Bookcase";
import ShelfStrip from "./ShelfStrip";
import CollectionCard from "../ui/CollectionCard";

/**
 * dev 갤러리(/dev/components) 전용 - 로그인·소유 컬렉션 없이 책장 상호작용을 돌려 본다.
 * 작품은 실제 목록 API 에서 받고, 꽂기·빼기·메모·옮기기는 서버 대신 로컬 상태에
 * shelfOps(실제 화면이 캐시에 쓰는 것과 같은 연산)를 적용한다.
 */
const DOMAINS = [
  { value: "GAME", label: "게임" },
  { value: "WEBTOON", label: "웹툰" },
  { value: "WEBNOVEL", label: "웹소설" },
  { value: "TV", label: "시리즈" },
  { value: "MOVIE", label: "영화" },
];
const ROLES = [
  { value: "owner", label: "소유자" },
  { value: "visitor", label: "방문자" },
];
const SAMPLE_MEMOS = [
  "친구랑 하면 10배, 혼자 해도 5배 재밌음",
  "제목에 속지 말 것",
];

const toItem = (work: WorkSummary, itemId: number): CollectionItem => ({
  itemId,
  contentId: work.id,
  comment: null,
  position: itemId,
  title: work.title,
  posterUrl: work.thumbnail ?? null,
  releaseDate: work.releaseDate ?? null,
  domain: work.domain,
  score: work.score ?? null,
  creator: work.creator ?? null,
  genres: work.genres ?? null,
  platforms: work.platforms ?? null,
  weekday: work.weekday ?? null,
  status: work.status ?? null,
  ageRating: work.ageRating ?? null,
  steamReviewDesc: work.steamReviewDesc ?? null,
  steamPositivePct: work.steamPositivePct ?? null,
  externalRating: work.externalRating ?? null,
});

const emptyDetail = (domain: string): CollectionDetail => ({
  id: 0,
  title: "플레이그라운드",
  description: null,
  domain,
  tint: "PINE",
  visibility: "PRIVATE",
  likeCount: 0,
  viewCount: 0,
  itemCount: 0,
  curatorNickname: "dev",
  coverPosters: [],
  likedByMe: false,
  createdAt: "",
  owner: true,
  updatedAt: "",
  items: [],
});

const ShelfPlayground = () => {
  const [domain, setDomain] = useState("GAME");
  const [role, setRole] = useState("owner");
  const [detail, setDetail] = useState<CollectionDetail>(() => emptyDetail("GAME"));
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [dropped, setDropped] = useState<number[]>([]);
  const seqRef = useRef(1000);
  const dropTimerRef = useRef<number | undefined>(undefined);
  const { toast, show, hide } = useToast();
  const { data } = useWorks({ domain, size: 22 });

  // 도메인을 바꾸면 그 도메인의 작품으로 책장을 새로 채운다 (앞의 둘에는 메모를 달아 표지를 세운다)
  useEffect(() => {
    if (!data) return;
    const items = data.content.map((work, i) => ({
      ...toItem(work, i + 1),
      comment: i === 0 || i === 7 ? SAMPLE_MEMOS[i === 0 ? 0 : 1] : null,
    }));
    setDetail({ ...emptyDetail(domain), items, itemCount: items.length });
    setSelectedItemId(items[0]?.itemId ?? null);
    setAdding(false);
  }, [data, domain]);

  useEffect(() => () => window.clearTimeout(dropTimerRef.current), []);

  const owner = role === "owner";
  const items = detail.items;
  const shelved = useMemo(() => new Set(items.map((i) => i.contentId)), [items]);
  const index = items.findIndex((i) => i.itemId === selectedItemId);
  const selected = index >= 0 ? items[index] : undefined;

  const dropIn = (ids: number[]) => {
    setDropped(ids);
    window.clearTimeout(dropTimerRef.current);
    dropTimerRef.current = window.setTimeout(() => setDropped([]), 900);
  };

  const handleRemove = (item: CollectionItem, at: number) => {
    const neighbor = items[at + 1] ?? items[at - 1];
    setSelectedItemId(neighbor?.itemId ?? null);
    setDetail((d) => shelfRemove(d, item.itemId));
    const id = show({
      message: `'${item.title}' 뺐어요`,
      actionLabel: "되돌리기",
      onAction: () => {
        hide(id);
        setDetail((d) => shelfInsertAt(d, item, at));
        dropIn([item.itemId]);
        setSelectedItemId(item.itemId);
      },
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl options={DOMAINS} value={domain} onChange={setDomain} size="sm" ariaLabel="도메인" />
        <SegmentedControl options={ROLES} value={role} onChange={setRole} size="sm" ariaLabel="역할" />
        <span className="text-[13.5px] text-ink-2">
          <b className="font-bold tabular-nums text-ink">{items.length}</b>작품
        </span>
      </div>
      <div className="mt-3.5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Shelf
          items={items}
          tint={detail.tint}
          selectedItemId={selectedItemId}
          onSelect={(id) => {
            setSelectedItemId(id);
            if (id !== null) setAdding(false);
          }}
          onRequestAdd={owner ? () => setAdding(true) : undefined}
          droppedItemIds={dropped}
        />
        <aside>
          {adding && owner ? (
            <div className="flex h-[560px] flex-col rounded-panel border border-line bg-surface p-4 shadow-card">
              <AddWorksPanel
                domain={domain}
                shelvedContentIds={shelved}
                pendingContentIds={new Set()}
                onAdd={(work) => {
                  seqRef.current += 1;
                  const item = toItem(work, seqRef.current);
                  setDetail((d) => shelfAppend(d, item));
                  dropIn([item.itemId]);
                }}
                onClose={() => setAdding(false)}
                autoFocus
              />
            </div>
          ) : selected ? (
            <PulledWorkPanel
              key={selected.itemId}
              item={selected}
              curator={detail.curatorNickname}
              owner={owner}
              index={index}
              total={items.length}
              onMove={(delta) => setDetail((d) => shelfMove(d, selected.itemId, delta))}
              onRemove={() => handleRemove(selected, index)}
              onSaveComment={(comment) =>
                setDetail((d) => shelfSetComment(d, selected.itemId, comment))
              }
            />
          ) : (
            <div className="rounded-panel border border-dashed border-line-strong px-5 py-8 text-center text-[13.5px] text-ink-2">
              책등을 누르면 여기에서 뽑아 볼 수 있어요.
            </div>
          )}
        </aside>
      </div>
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
        />
      )}
    </div>
  );
};

/** 내 책장 전시 - 도메인별 작품 목록으로 컬렉션 요약(spines 포함)을 꾸며 Bookcase 에 넘긴다 */
const BOOKCASE_SAMPLES = [
  { domain: "GAME", title: "갓겜 모음", tint: "SLATE", count: 18, open: true },
  { domain: "WEBTOON", title: "퇴근길 웹툰", tint: "TERRACOTTA", count: 8, open: false },
  { domain: "WEBNOVEL", title: "회귀·빙의·환생", tint: "MOCHA", count: 31, open: true },
  { domain: "TV", title: "주말 순삭 시리즈", tint: "PLUM", count: 4, open: true },
] as const;

export const BookcasePlayground = () => {
  const game = useWorks({ domain: "GAME", size: 20 });
  const webtoon = useWorks({ domain: "WEBTOON", size: 20 });
  const webnovel = useWorks({ domain: "WEBNOVEL", size: 20 });
  const tv = useWorks({ domain: "TV", size: 20 });
  const byDomain: Record<string, WorkSummary[] | undefined> = {
    GAME: game.data?.content,
    WEBTOON: webtoon.data?.content,
    WEBNOVEL: webnovel.data?.content,
    TV: tv.data?.content,
  };

  const collections: CollectionSummary[] = BOOKCASE_SAMPLES.map((sample, i) => {
    const works = (byDomain[sample.domain] ?? []).slice(0, Math.min(20, sample.count));
    return {
      id: i + 1,
      title: sample.title,
      description: null,
      domain: sample.domain,
      tint: sample.tint,
      visibility: sample.open ? "PUBLIC" : "PRIVATE",
      likeCount: 0,
      viewCount: 0,
      itemCount: Math.max(sample.count, works.length),
      curatorNickname: "dev",
      coverPosters: [],
      spines: works.map((w) => ({
        contentId: w.id,
        title: w.title,
        posterUrl: w.thumbnail ?? null,
      })),
      likedByMe: false,
      createdAt: "",
    };
  });

  const first = collections[0];
  return (
    <div className="flex flex-col gap-8">
      <Bookcase collections={collections} onCreate={() => undefined} />

      {/* 발견 카드 - 커버가 선반 한 토막(ShelfScene) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 min-[1200px]:grid-cols-4">
        {collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </div>

      {/* 담기 목록의 미니 책장 - 빈 칸 / 담김 / 방금 담음 */}
      <div className="flex flex-wrap items-end gap-6 text-[12.5px] text-ink-2">
        {(
          [
            ["빈 칸 (여기 꽂힌다)", false, false],
            ["담김", true, false],
            ["방금 담음 (떨어지는 모션)", true, true],
          ] as const
        ).map(([label, contains, justAdded]) => (
          <div key={label} className="flex flex-col gap-1.5">
            <ShelfStrip
              spines={first.spines ?? []}
              domain={first.domain}
              tint={first.tint}
              contentId={-1}
              contains={contains}
              justAdded={justAdded}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShelfPlayground;
