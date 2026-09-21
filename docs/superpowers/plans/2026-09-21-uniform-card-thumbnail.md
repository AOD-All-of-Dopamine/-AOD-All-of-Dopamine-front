# 통일 카드 + 도메인별 썸네일 맞춤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 그리드 카드의 크기와 썸네일 틀(2:3)을 통일하고, 틀 안의 이미지만 도메인에 맞게(cover / contain+블러 배경) 넣는다.

**Architecture:** 썸네일 렌더를 신규 `WorkThumb` 컴포넌트 하나로 모은다. 맞춤 방식은 `constants/thumbnail.ts`의 `thumbFitMap: Record<Category, "cover"|"contain">`이 정한다. `WorkCard`·`RailCard`·`RecCardTile`·`OnboardingWorkTile`이 이를 쓰고, 게임 전용 가로 카드·혼합 그리드는 삭제한다.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind CSS v4. 웹에는 테스트 러너가 없다 — 검증은 `tsc`(타입) + 브라우저 확인.

**스펙:** `docs/superpowers/specs/2026-09-21-uniform-card-thumbnail-design.md`

**공통 명령 (저장소 루트 `-AOD-All-of-Dopamine-front`에서):**
- 타입 체크: `cd apps/web && node node_modules/typescript/bin/tsc --noEmit` → 출력 없음 + exit 0 이 정상.
- `pnpm`은 PATH에 없다. 필요하면 `corepack pnpm ...`를 해당 디렉터리에서 실행.
- lint는 기존 오류 1건 때문에 원래 exit 1 이다 — 새 오류만 없으면 된다.
- 작업 트리에 이번 작업과 무관한 미커밋 변경(`apps/web/index.html`, `apps/web/public/*`, `design/`, `public/`)이 있다. **절대 stage 하지 말 것** — `git add`는 항상 파일 경로를 명시한다.

---

### Task 1: `thumbnail.ts` — 맞춤 맵 + `categoryOf`

**Files:**
- Modify: `apps/web/src/constants/thumbnail.ts`

- [ ] **Step 1: 파일 전체를 아래로 교체**

```ts
import MovieIcon from "../assets/thumbnail-icon/null_movie.svg";
import TvIcon from "../assets/thumbnail-icon/null_series.svg";
import GameIcon from "../assets/thumbnail-icon/null_game.svg";
import WebtoonIcon from "../assets/thumbnail-icon/null_webtoon.svg";
import WebnovelIcon from "../assets/thumbnail-icon/null_webnovel.svg";

export type Category = "movie" | "tv" | "game" | "webtoon" | "webnovel";

export const thumbnailFallbackMap: Record<Category, string> = {
  movie: MovieIcon,
  tv: TvIcon,
  game: GameIcon,
  webtoon: WebtoonIcon,
  webnovel: WebnovelIcon,
};

/**
 * 통일 2:3 썸네일 틀(WorkThumb) 안에 이미지를 넣는 방식.
 * - cover: 원본이 2:3(TMDB 포스터)이라 틀을 그대로 채운다.
 * - contain: 원본 비율이 다르다(Steam 460:215, 네이버웹툰 480:623, 웹소설 ~0.7) -
 *   자르지 않고 원본 비율로 넣고, 남는 자리는 같은 이미지의 블러 배경이 채운다.
 * 새 도메인을 Category에 추가하면 이 맵의 누락이 컴파일 에러로 잡힌다.
 */
export type ThumbFit = "cover" | "contain";

export const thumbFitMap: Record<Category, ThumbFit> = {
  movie: "cover",
  tv: "cover",
  game: "contain",
  webtoon: "contain",
  webnovel: "contain",
};

/** 백엔드 도메인 문자열("GAME" 등, 대소문자 무관) -> Category. 모르는 값은 movie */
export const categoryOf = (domain?: string | null): Category => {
  const key = domain?.toLowerCase() as Category;
  return key in thumbnailFallbackMap ? key : "movie";
};
```

(`imageAspectMap`·`thumbnailIconSizeMap`은 사용처가 없어 삭제한다.)

- [ ] **Step 2: 삭제한 export의 사용처가 없는지 확인**

Run: `grep -rn "imageAspectMap\|thumbnailIconSizeMap" apps/web/src`
Expected: 출력 없음

- [ ] **Step 3: 타입 체크**

Run: `cd apps/web && node node_modules/typescript/bin/tsc --noEmit`
Expected: 출력 없음, exit 0

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/constants/thumbnail.ts
git commit -m "refactor(web): 썸네일 맞춤 맵(thumbFitMap)·categoryOf 공용화, 미사용 맵 삭제"
```

---

### Task 2: `WorkThumb` 컴포넌트

**Files:**
- Create: `apps/web/src/components/ui/WorkThumb.tsx`

- [ ] **Step 1: 파일 생성**

```tsx
import {
  categoryOf,
  thumbFitMap,
  thumbnailFallbackMap,
} from "../../constants/thumbnail";

/**
 * 모든 그리드 카드가 공유하는 2:3 썸네일 틀.
 * 카드 크기는 도메인과 무관하게 같고, 틀 안의 이미지만 도메인에 맞춘다(thumbFitMap):
 * - cover: 한 장으로 틀을 채운다 (영화·시리즈 - 원본이 2:3).
 * - contain: 원본 비율 그대로 가운데에 넣고, 같은 URL의 블러 배경이 남는 자리를 채운다
 *   (게임·웹툰·웹소설). 같은 URL이라 추가 네트워크 요청은 없다.
 * imageUrl이 없으면 도메인 폴백 아이콘을 중앙 표시한다.
 */
export interface WorkThumbProps {
  /** null·빈 문자열이면 도메인 폴백 아이콘 (실데이터 썸네일 누락 대응) */
  imageUrl: string | null | undefined;
  /** 백엔드 도메인 문자열(대소문자 무관) - 맞춤 방식과 폴백 아이콘을 정한다 */
  domain?: string | null;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  alt?: string;
  /** 틀에 덧붙일 클래스 (라운드 등) */
  className?: string;
}

const WorkThumb = ({
  imageUrl,
  domain,
  alt = "",
  className = "",
}: WorkThumbProps) => {
  const category = categoryOf(domain);

  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden bg-canvas ${className}`}
    >
      {!imageUrl ? (
        <div className="grid h-full w-full place-items-center">
          <img
            src={thumbnailFallbackMap[category]}
            alt={alt}
            loading="lazy"
            className="w-[clamp(32px,30%,64px)] opacity-80"
          />
        </div>
      ) : thumbFitMap[category] === "cover" ? (
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <>
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-xl"
          />
          <img
            src={imageUrl}
            alt={alt}
            loading="lazy"
            className="relative h-full w-full object-contain"
          />
        </>
      )}
    </div>
  );
};

export default WorkThumb;
```

- [ ] **Step 2: 타입 체크**

Run: `cd apps/web && node node_modules/typescript/bin/tsc --noEmit`
Expected: 출력 없음, exit 0

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/WorkThumb.tsx
git commit -m "feat(web): WorkThumb - 통일 2:3 틀 + 도메인별 cover/contain 썸네일"
```

---

### Task 3: `WorkCard` + 호출부 (탐색·검색·좋아요·북마크·dev 갤러리)

`WorkCard`의 props가 바뀌면 호출부가 전부 타입 에러가 나므로 한 태스크에서 같이 고친다.

**Files:**
- Modify: `apps/web/src/components/ui/WorkCard.tsx`
- Modify: `apps/web/src/pages/explore-page.tsx` (19, 158-161, 631, 737-740, 1032, 1069-1081 부근)
- Modify: `apps/web/src/pages/search-page.tsx`
- Modify: `apps/web/src/pages/my-likes-page.tsx`
- Modify: `apps/web/src/pages/my-bookmarks-page.tsx`
- Modify: `apps/web/src/pages/dev-components-page.tsx` (WorkCard 섹션)

- [ ] **Step 1: `WorkCard.tsx` 전체 교체**

```tsx
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import Tag from "./Tag";
import WorkThumb from "./WorkThumb";
import { cardLift } from "./cardStyles";

/**
 * 목업 .card / .card-thumb / .card-body / .card-title / .card-meta / .card-tags / .card-foot
 * (explore-light-mockup.html). 카드 크기·썸네일 틀(2:3)은 모든 도메인에서 같고,
 * 틀 안의 이미지 맞춤만 도메인이 정한다 (WorkThumb).
 */
export interface WorkCardProps {
  title: string;
  meta?: string;
  tags?: string[];
  /** 카드 하단 행 - 페이지마다 다른 내용(평점·리뷰율·요일 등)을 그대로 전달 */
  footer?: ReactNode;
  /** null이면 도메인 폴백 아이콘을 중앙 표시 (실데이터 썸네일 누락 대응) */
  imageUrl: string | null;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") 취급 */
  imageAlt?: string;
  /** 백엔드 도메인 문자열 - 썸네일 맞춤 방식과 폴백 아이콘을 정한다 */
  domain?: string;
  to: string;
}

const WorkCard = ({
  title,
  meta,
  tags,
  footer,
  imageUrl,
  imageAlt = "",
  domain,
  to,
}: WorkCardProps) => {
  return (
    <Link to={to} className={`flex flex-col bg-surface ${cardLift}`}>
      <WorkThumb imageUrl={imageUrl} domain={domain} alt={imageAlt} />
      <div className="flex flex-1 flex-col gap-[7px] px-[15px] pb-[14px] pt-[13px]">
        <div className="truncate text-[15.5px] font-bold tracking-[-0.01em] text-ink">
          {title}
        </div>
        {meta && <div className="truncate text-[13px] text-ink-2">{meta}</div>}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-[5px]">
            {tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}
        {footer && (
          <div className="mt-auto flex items-center gap-[7px] border-t border-line pt-[9px] text-[12.5px] text-ink-2 tabular-nums">
            {footer}
          </div>
        )}
      </div>
    </Link>
  );
};

export default WorkCard;
```

- [ ] **Step 2: `explore-page.tsx`**

1. 19행 `import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";` 삭제.
2. 158-161행 로컬 `categoryOf` 정의 삭제.
3. 631행 `const variant = domainId === "game" ? "landscape" : "portrait";` 삭제.
4. `gridClass`를 분기 없이:

```ts
  // 모바일 2열 기본(목업 프레임 2 .grid2), 이후 목업 반응형 그대로 -
  // 5/4/3/2열 (1200/1023/767px). 카드 크기는 도메인과 무관하게 같다.
  const gridClass =
    "mt-[22px] grid grid-cols-2 gap-y-3.5 gap-x-3 min-[768px]:grid-cols-3 min-[768px]:gap-y-5 min-[768px]:gap-x-[18px] min-[1024px]:grid-cols-4 min-[1201px]:grid-cols-5";
```

5. 스켈레톤: `<SkeletonCard key={i} variant="portrait" />`
6. 카드:

```tsx
                  <WorkCard
                    key={work.id}
                    title={work.title}
                    meta={workCardMeta(work)}
                    tags={workCardTags(work)}
                    imageUrl={work.thumbnail}
                    domain={work.domain}
                    to={`/work/${work.id}`}
                    footer={workCardFooter(work)}
                  />
```

- [ ] **Step 3: `search-page.tsx`**

1. import 3줄 삭제: `thumbnailFallbackMap, type Category`, `GameCompactCard`, `gamePairCellClass, groupMixedGrid`.
2. 로컬 `categoryOf` 삭제.
3. 파일 상단 주석의 마지막 항목("게임 결과는 … 혼합 그리드 1-C …")을 다음으로 교체:

```
 * - 게임 결과도 같은 WorkCard - 썸네일 틀(2:3)은 통일하고 이미지 맞춤만
 *   도메인이 정한다 (WorkThumb). 혼합 그리드 1-C는 2026-09-21 폐기.
```

4. 로딩 스켈레톤:

```tsx
        <div className={gridClass} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} variant="portrait" />
          ))}
        </div>
```

5. 결과 그리드:

```tsx
          <div className={gridClass}>
            {/* 혼합 도메인 목록 - meta 앞에 도메인 라벨, foot은 도메인별 구성 */}
            {data.content.map((work) => (
              <WorkCard
                key={work.id}
                title={work.title}
                meta={workCardMeta(work, { withDomain: true })}
                tags={workCardTags(work)}
                imageUrl={work.thumbnail || null}
                domain={work.domain}
                to={`/work/${work.id}`}
                footer={workCardFooter(work)}
              />
            ))}
          </div>
```

- [ ] **Step 4: `my-likes-page.tsx`·`my-bookmarks-page.tsx` (두 파일 동일)**

1. `import { thumbnailFallbackMap, type Category } from "../constants/thumbnail";` 삭제.
2. 로컬 `categoryOf` 삭제.
3. 카드에서 `variant="portrait"` 줄 삭제, `fallbackIconUrl={…}` 줄을 `domain={work.domain}`으로 교체.

- [ ] **Step 5: `dev-components-page.tsx` WorkCard 섹션**

1. portrait 섹션 제목을 `"WorkCard"`로, 카드 4개에서 `variant="portrait"` 삭제. 웹툰 2개에 `domain="WEBTOON"`, 영화 2개에 `domain="MOVIE"` 추가.
2. `"WorkCard · landscape"` 섹션을 아래로 교체 (같은 그리드에서 게임이 contain으로 들어가는 모습 전시):

```tsx
      <Section title="WorkCard · 게임 (contain + 블러 배경)">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
          <WorkCard
            title="엘든 링"
            meta="2022 · FromSoftware"
            tags={["RPG", "소울라이크", "오픈월드"]}
            imageUrl={ELDEN_RING}
            domain="GAME"
            to="/work/game-eldenring"
            footer={
              <>
                <span>매우 긍정적</span>
                <span className="ml-auto font-bold text-ink">92%</span>
              </>
            }
          />
          <WorkCard
            title="검은 신화: 오공"
            meta="2024 · Game Science"
            tags={["액션", "RPG", "소울라이크"]}
            imageUrl={BLACK_MYTH}
            domain="GAME"
            to="/work/game-blackmyth"
            footer={
              <>
                <span>압도적으로 긍정적</span>
                <span className="ml-auto font-bold text-ink">96%</span>
              </>
            }
          />
          <WorkCard
            title="썸네일 누락 폴백"
            meta="2024 · LocalThunk"
            tags={["로그라이크", "전략", "인디"]}
            imageUrl={null}
            domain="GAME"
            to="/work/game-balatro"
          />
        </div>
      </Section>
```

- [ ] **Step 6: 타입 체크**

Run: `cd apps/web && node node_modules/typescript/bin/tsc --noEmit`
Expected: `RailCard`/`SkeletonCard` 관련은 아직 안 건드렸으므로 에러 없음. 출력 없음, exit 0.
(`BALATRO` 상수가 RailCard 섹션에서 여전히 쓰이는지 확인 - 안 쓰이면 noUnusedLocals 에러가 나므로 상수를 지운다.)

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/ui/WorkCard.tsx apps/web/src/pages/explore-page.tsx apps/web/src/pages/search-page.tsx apps/web/src/pages/my-likes-page.tsx apps/web/src/pages/my-bookmarks-page.tsx apps/web/src/pages/dev-components-page.tsx
git commit -m "feat(web): WorkCard 통일 틀 - variant 제거, 탐색·검색 게임 전용 그리드 폐기"
```

---

### Task 4: `RailCard` + 호출부 (홈·프로필·dev 갤러리)

**Files:**
- Modify: `apps/web/src/components/ui/RailCard.tsx`
- Modify: `apps/web/src/pages/home-page.tsx` (342-351 부근, 68행 로컬 `categoryOf`)
- Modify: `apps/web/src/pages/profile-page.tsx` (11, 29-32, 91-98 부근)
- Modify: `apps/web/src/pages/dev-components-page.tsx` (RailCard 섹션)

- [ ] **Step 1: `RailCard.tsx`** - props에서 `fallbackIconUrl` 삭제, `domain?: string` 추가(주석: "백엔드 도메인 문자열 - 썸네일 맞춤 방식과 폴백 아이콘을 정한다"). 썸네일 블록을 교체:

```tsx
    <Link to={to} className="group w-[168px] flex-none snap-start">
      <div
        className={`bg-canvas ${cardLift} group-hover:-translate-y-[3px] group-hover:shadow-lift motion-reduce:group-hover:translate-y-0`}
      >
        <WorkThumb imageUrl={imageUrl} domain={domain} alt={imageAlt} />
      </div>
```

상단에 `import WorkThumb from "./WorkThumb";` 추가. 파일 주석의 "imageUrl이 없으면 fallbackIconUrl 아이콘을 중앙 표시 (WorkCard와 동일 규약)"을 "썸네일은 WorkThumb(통일 2:3 틀 + 도메인별 맞춤)"으로 교체.

- [ ] **Step 2: `home-page.tsx`** - RailCard 호출의 `fallbackIconUrl={…}` 3줄을 `domain={work.domain}`으로 교체. 68행 로컬 `categoryOf` 정의를 지우고 import를 `import { categoryOf, thumbnailFallbackMap } from "../constants/thumbnail";` 형태로 바꾼다 (`Category` 타입이 다른 곳에서 안 쓰이면 import에서 뺀다).

- [ ] **Step 3: `profile-page.tsx`** - RailCard 호출의 `fallbackIconUrl={…}`을 `domain={item.domain}`으로 교체. `thumbnailFallbackMap`/`Category`/로컬 `categoryOf`가 더 안 쓰이면 import·정의 삭제.

- [ ] **Step 4: `dev-components-page.tsx` RailCard 섹션** - 게임 2개에 `domain="GAME"`, 화산귀환에 `domain="WEBTOON"`, 서울의 봄에 `domain="MOVIE"`, 폴백 카드는 `fallbackIconUrl={thumbnailFallbackMap.webtoon}` → `domain="WEBTOON"`.

- [ ] **Step 5: 타입 체크**

Run: `cd apps/web && node node_modules/typescript/bin/tsc --noEmit`
Expected: 출력 없음, exit 0

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ui/RailCard.tsx apps/web/src/pages/home-page.tsx apps/web/src/pages/profile-page.tsx apps/web/src/pages/dev-components-page.tsx
git commit -m "feat(web): RailCard 썸네일을 WorkThumb로 - 게임·웹툰 무크롭"
```

---

### Task 5: `RecCardTile`·`OnboardingWorkTile`

**Files:**
- Modify: `apps/web/src/components/rec/RecCardTile.tsx`
- Modify: `apps/web/src/components/onboarding/OnboardingWorkTile.tsx`

- [ ] **Step 1: `RecCardTile.tsx`** - `thumbnailFallbackMap, type Category` import와 로컬 `categoryOf` 삭제, `import WorkThumb from "../ui/WorkThumb";` 추가. 58-71행 썸네일 블록을 교체:

```tsx
        <WorkThumb imageUrl={work.thumbnail} domain={work.domain} className="rounded-t-panel" />
```

- [ ] **Step 2: `OnboardingWorkTile.tsx`** - 같은 import 정리 + `const category = categoryOf(work.domain);` 삭제. 54-71행 썸네일 블록을 교체:

```tsx
      <WorkThumb imageUrl={work.thumbnail} domain={work.domain} />
```

파일 주석의 "썸네일 비율(게임만 가로)은 WorkCard·SkeletonCard 와 똑같이 맞춰"를 "썸네일 틀(WorkThumb, 통일 2:3)은 WorkCard·SkeletonCard 와 똑같이 맞춰"로 교체하고, 조각 목록의 `thumbnailFallbackMap`을 `WorkThumb`로 바꾼다.

- [ ] **Step 3: 타입 체크** - 위와 동일. Expected: 출력 없음.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/rec/RecCardTile.tsx apps/web/src/components/onboarding/OnboardingWorkTile.tsx
git commit -m "feat(web): 추천·온보딩 타일 썸네일을 WorkThumb로 통일"
```

---

### Task 6: 스켈레톤 정리 + 죽은 코드 삭제

**Files:**
- Modify: `apps/web/src/components/ui/SkeletonCard.tsx`
- Modify: `apps/web/src/pages/onboarding-page.tsx:306`
- Modify: `apps/web/src/pages/dev-components-page.tsx` (SkeletonCard 섹션)
- Modify: `apps/web/src/components/ui/cardStyles.ts` (주석)
- Modify: `apps/web/src/components/ui/workCardInfo.tsx` (주석)
- Delete: `apps/web/src/components/ui/GameCompactCard.tsx`
- Delete: `apps/web/src/utils/mixedGrid.ts`

- [ ] **Step 1: `SkeletonCard.tsx`** - `variant` 타입을 `"portrait" | "row" | "panel-row"`로, `game-row` 분기 블록 삭제, 마지막 return의 비율 분기를 `<div className="aspect-[2/3] bg-line" />`로. 파일 주석에서 `"portrait"/"landscape" = WorkCard` → `"portrait" = WorkCard (통일 2:3 틀)`, `game-row` 줄 삭제.
- [ ] **Step 2: `onboarding-page.tsx`** - `variant={domain === "GAME" ? "landscape" : "portrait"}` → `variant="portrait"`.
- [ ] **Step 3: `dev-components-page.tsx`** - `<SkeletonCard variant="landscape" />`를 감싼 `<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">…</div>` 블록 삭제.
- [ ] **Step 4: 파일 삭제**

```bash
git rm apps/web/src/components/ui/GameCompactCard.tsx apps/web/src/utils/mixedGrid.ts
```

- [ ] **Step 5: 주석 정리** - `cardStyles.ts` "WorkCard · RailCard · GameCompactCard 공유" → "WorkCard · RailCard 공유". `workCardInfo.tsx`의 `steamRating` 주석 둘째 줄 "포스터 카드 foot과 GameCompactCard(혼합 목록 가로 행)가 공유한다." → "포스터 카드 foot이 쓴다." (`steamRating`은 `workCardFooter`가 계속 쓰므로 유지. 다른 파일에서 import하지 않으면 `export`는 그대로 둬도 무방.)

- [ ] **Step 6: 잔재 확인 + 타입 체크**

Run: `grep -rn "GameCompactCard\|mixedGrid\|game-row\|\"landscape\"" apps/web/src`
Expected: `RankRow.tsx`·`ReleaseRow.tsx`·`ranking-page.tsx`·`new-releases-page.tsx`의 `thumbShape` 관련 줄만 남는다 (범위 밖).

Run: `cd apps/web && node node_modules/typescript/bin/tsc --noEmit`
Expected: 출력 없음, exit 0

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/ui/SkeletonCard.tsx apps/web/src/pages/onboarding-page.tsx apps/web/src/pages/dev-components-page.tsx apps/web/src/components/ui/cardStyles.ts apps/web/src/components/ui/workCardInfo.tsx
git commit -m "chore(web): 게임 전용 가로 카드·혼합 그리드·landscape 스켈레톤 삭제"
```

---

### Task 7: 전체 검증

- [ ] **Step 1: 빌드** - `cd apps/web && node node_modules/typescript/bin/tsc --noEmit && node node_modules/vite/bin/vite.js build` → 성공.
- [ ] **Step 2: lint** - `cd apps/web && node node_modules/eslint/bin/eslint.js . --report-unused-disable-directives` → 기존 오류 1건 외 새 오류 없음.
- [ ] **Step 3: 브라우저 확인** (로컬 API 8080 + 웹 3000, `.claude/launch.json`의 `aod-api`·`aod-web`). 1280폭과 375폭에서:
  - `/for-you` - 게임 카드가 잘리지 않고 가운데 + 블러 배경.
  - `/search?keyword=the` - 게임도 일반 카드, 그리드 하나.
  - `/explore?domain=game`·`webtoon`·`webnovel`·`movie` - 전부 5열(1280폭) 같은 카드 크기, 웹툰 좌우 안 잘림, 영화는 이전과 동일.
  - `/home` 레일 - 게임·웹툰 무크롭.
  - 같은 행 카드의 제목 줄이 정렬, 썸네일 없는 작품은 폴백 아이콘.
- [ ] **Step 4: 문제 있으면 수정 후 재확인, 없으면 끝.** (푸시·PR은 사용자 요청 시)
