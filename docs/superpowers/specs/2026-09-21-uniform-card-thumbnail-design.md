# 통일 카드 + 도메인별 썸네일 맞춤 — 설계

작성일: 2026-09-21 · 대상: `apps/web`

## 배경

썸네일 원본 비율이 도메인마다 다르다 (로컬 DB 실측):

| 도메인 | 원본 | 가로÷세로 |
|---|---|---|
| 영화·시리즈 (TMDB) | 500×750 | 0.667 (2:3) |
| 게임 (Steam header) | 460×215 | 2.14 |
| 웹툰 (네이버) | 480×623 | 0.77 |
| 웹소설 (네이버시리즈) | 216~228×314 | 0.69~0.73 |

지금은 화면마다 다르게 대응한다.

- 탐색: 게임만 가로 카드(460:215) 4열, 나머지는 세로 카드(2:3) 5열 — 도메인마다 카드 크기가 다르다.
- 검색: 게임만 `GameCompactCard` 가로 행을 쓰는 혼합 그리드(`utils/mixedGrid.ts`).
- 추천·홈 레일·좋아요·북마크: 전부 2:3 틀 + `object-cover` — 게임 이미지는 가운데 세로 띠만 남는다.
- 웹툰은 어디서든 좌우가 약 13% 잘린다.
- 썸네일 마크업이 `WorkCard`·`RecCardTile`·`OnboardingWorkTile`·`RailCard`에 복사돼 있다.

## 목표

카드 크기와 썸네일 틀(2:3)을 모든 도메인에서 똑같이 두고, 틀 안의 이미지만 도메인에 맞게 넣는다.
이미지는 잘리지 않고, 그리드 열 수·제목 줄 위치가 도메인과 무관하게 같다.

## 범위

**포함 (그리드 카드 전부):** 탐색(게임 탭 포함) · 검색 · 추천 · 온보딩 · 홈 레일 · 프로필 레일 · 좋아요 · 북마크 · dev 갤러리.

**제외:** 랭킹·신작 행의 작은 썸네일(`RankRow`·`ReleaseRow`의 `thumbShape`), 작품 상세, 홈 히어로(`FeatureCard`), 컬렉션, `UpcomingCard`, `ReviewQuoteCard`.

**후속 과제(이번에 안 함):** Steam 세로 표지(`library_600x900.jpg`) 크롤링 — 샘플 7개 중 6개 존재. 도입해도 없는 게임은 이 설계의 contain 방식으로 떨어진다.

## 설계

### 1. `constants/thumbnail.ts`

- 추가: `thumbFitMap: Record<Category, "cover" | "contain">`
  - `movie`·`tv` = `cover` (원본이 2:3이라 틀에 꽉 참, 추가 레이어 없음)
  - `game`·`webtoon`·`webnovel` = `contain`
- 추가: `categoryOf(domain?: string): Category` — 소문자로 바꿔 `thumbnailFallbackMap` 키에 있으면 그 값, 없으면 `"movie"`. (12개 파일에 복사된 동일 함수의 원본. 이번에 손대는 파일만 이걸로 교체한다.)
- 삭제: 사용처 없는 `imageAspectMap`, `thumbnailIconSizeMap`.
- `Record<Category, …>` 타입이므로 새 도메인을 `Category`에 추가하면 맵 항목 누락이 컴파일 에러로 잡힌다.

### 2. `components/ui/WorkThumb.tsx` (신규)

2:3 틀 안에 썸네일을 그리는 일만 맡는다.

```ts
interface WorkThumbProps {
  imageUrl: string | null;
  /** 도메인 문자열(대소문자 무관) — 맞춤 방식과 폴백 아이콘을 정한다 */
  domain?: string;
  /** 제목이 인접 텍스트로 함께 렌더되므로 기본은 장식 이미지("") */
  alt?: string;
  /** 틀에 덧붙일 클래스 (라운드 등) */
  className?: string;
}
```

- 틀: `relative aspect-[2/3] overflow-hidden bg-canvas` + `className`.
- `imageUrl` 없음 → `thumbnailFallbackMap[categoryOf(domain)]` 아이콘을 중앙 표시 (`w-[clamp(32px,30%,64px)] opacity-80`, 기존 규약 그대로).
- `cover` → `<img class="h-full w-full object-cover" loading="lazy">` 한 장.
- `contain` → 두 레이어:
  - 뒤: 같은 URL, `absolute inset-0 h-full w-full scale-110 object-cover blur-xl opacity-70`, `alt=""` + `aria-hidden`, `loading="lazy"`. 같은 URL이라 추가 네트워크 요청이 없다.
  - 앞: `relative h-full w-full object-contain`, `loading="lazy"`.

### 3. 카드 컴포넌트

- `WorkCard`: `variant`·`fallbackIconUrl` props 삭제, `domain?: string` 추가. 썸네일 영역을 `<WorkThumb>`로 교체.
- `RailCard`: `fallbackIconUrl` 삭제, `domain?: string` 추가. 호버 리프트 래퍼(`cardLift`)는 그대로 두고 안쪽을 `<WorkThumb>`로 교체.
- `RecCardTile`: 썸네일 마크업 → `<WorkThumb className="rounded-t-panel">` (카드가 `overflow-hidden`이 아니라 위 모서리를 썸네일 상자가 맡는 기존 규약 유지). 로컬 `categoryOf` 삭제.
- `OnboardingWorkTile`: 게임 가로 비율 분기 제거, `<WorkThumb>` 사용. 로컬 `categoryOf` 삭제.
- `SkeletonCard`: `landscape`·`game-row` variant 삭제.
- `cardStyles.ts`: 주석의 `GameCompactCard` 언급 정리.

### 4. 화면

- `explore-page`: `variant` 계산과 landscape `gridClass` 분기 삭제 → 5/4/3/2열 그리드 하나. `WorkCard`에 `domain` 전달.
- `search-page`: 혼합 그리드 제거 → `data.content`를 그대로 `WorkCard`로. 스켈레톤은 portrait만.
- `onboarding-page`: 스켈레톤 variant를 항상 `portrait`.
- `my-likes-page`·`my-bookmarks-page`·`home-page`(RailCard)·`profile-page`(RailCard): `fallbackIconUrl` → `domain`.
- `dev-components-page`: landscape 전시를 도메인별 `WorkThumb` 맞춤 전시로 교체, `SkeletonCard landscape` 전시 삭제.

### 5. 삭제

- `components/ui/GameCompactCard.tsx`
- `utils/mixedGrid.ts`
- `workCardInfo.tsx`의 `steamRating` 등 `GameCompactCard` 전용이 된 export는 다른 사용처가 없을 때만 삭제한다.

## 검증

웹에는 테스트 러너가 없다.

1. `tsc` + `vite build` 통과. lint는 기존 오류 1건(`workCardInfo.tsx`) 외에 새 오류가 없어야 한다.
2. 브라우저 확인 (데스크톱 1280폭 + 모바일 375폭): 추천 · 검색 · 탐색(게임/웹툰/웹소설/영화) · 홈 레일 · 온보딩.
   - 게임·웹툰·웹소설 이미지가 잘리지 않고 블러 배경이 틀을 채운다.
   - 영화·시리즈는 이전과 같다.
   - 같은 행의 카드 제목 줄이 정렬된다.
   - 썸네일 없는 작품은 폴백 아이콘이 나온다.
   - 스켈레톤 → 실데이터 전환에서 레이아웃이 튀지 않는다.
