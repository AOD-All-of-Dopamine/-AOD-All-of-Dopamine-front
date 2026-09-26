# 탐색 가벼운 카드 — 설계

작성일: 2026-09-26 · 대상: `apps/web`, `packages/shared`(+ 모바일 표시 문구) + **백엔드**(목록 DTO 필드 추가) ·
시안: 로컬 목업 `D 가벼운 카드`(게임 · 영화) · 선행 설계: `2026-09-21-uniform-card-thumbnail-design.md`(2:3 통일 틀) · 디자인 기준: `docs/specs/2026-08-13-light-redesign-design.md`
상태: **v2** — v1 코드 대조 독립 검수 반영(사실 11 · 심각 2 · 보통 8 · 사소 9 · 빠진 것 9, 맨 아래 "검수 기록")

## 목표

탐색(`/explore`) 카드가 너무 크고 정보가 많다. 한 화면에 게임 5장 · 모바일 2장만 보인다. 게임은 가로 배너가 세로 칸의 1/3 만 차지해 알아보기 어렵다.

**카드를 "그림 + 제목 + 한 줄"로 줄인다.** 둘러볼 때 고르는 데 쓰는 정보만 남긴다.

| 남김 | 뺌 (상세 화면에 있음) |
|---|---|
| 그림 · 제목(한 줄) · 분야별 신호 한 줄(아래 표) | 장르 칩(왼쪽 필터에 있다) · 개발사 · 감독 · 카드 상자(테두리 · 그림자 · 떠오름 · 구분선) |

- **게임 탭은 가로 카드**(스팀 배너 460:215 그대로 — 잘림 · 흐림 없음). 그 밖의 탭은 세로 포스터(2:3).
- **윗부분을 가볍게**: 페이지 제목 · 필터 폭 · 펼친 장르 수를 줄인다.
- **같이 고치는 표시 문제**: 스팀 리뷰 영어 원문 한글화, **적은 표본의 점수 숨김** — TMDB 투표 20개 미만 별점, 스팀 리뷰 10개 미만 긍정 %(둘 다 "1표 · 1개로 만점" 문제).

첫 화면에 온전히 보이는 카드(시안 실측 · 1440 · 390): 게임 데스크톱 5 → **15**, 게임 모바일 2 → **7**(목록형), 영화 데스크톱 5 → 6. 모바일 세로는 2열 유지라 2 → 약 4(카드 상자 · 장르 줄이 빠진 만큼).

## 선행 결정과의 관계

**2026-09-21 설계는 탐색까지 포함해 모든 그리드 카드를 2:3 틀로 통일했다.** 배경에 "탐색: 게임만 가로 카드 4열 — 도메인마다 카드 크기가 다르다"를 고칠 문제로 적었고,
`801487c` 가 가로 카드(`GameCompactCard`) · 혼합 그리드 · `landscape`/`game-row` 스켈레톤을 지웠다.

**이 설계는 그 결정을 탐색에 한해 뒤집는다.** 근거:
- 탐색은 **탭마다 한 분야만** 보인다(`EXPLORE_DOMAINS`, `explore-page.tsx:78-79` — "전체" 탭 없음). 한 그리드 안의 카드 크기 · 제목 줄은 여전히 같다.
- 통일 뒤 게임 배너가 세로 칸의 약 1/3 만 차지해 "알아보기 어렵다"는 사용자 문제가 생겼다(이번 요청의 출발점).
- 원래 디자인 기준도 탐색은 "게임 가로 4열, 그 외 세로 5열"이었다(`light-redesign-design.md:70`, §2.3 `WorkCard(portrait|landscape)` 계획).

**검색 · 좋아요 · 북마크 · 홈 · 추천은 2:3 통일을 그대로 둔다**(여러 분야가 섞인다). 09-21 문서와 기준 문서 :70 · §2.3 에 이 설계를 링크로 적는다.
지운 코드는 `801487c^` 에서 참고할 수 있다.

## 조사 결과 — 설계를 정한 사실들

**프론트**

1. **탐색 카드는 공용 `WorkCard`**(`components/ui/WorkCard.tsx`) — 상자(`cardLift`), 제목 15.5px, 메타 · 장르 칩 3개 · 구분선 아래 꼬리 줄(`workCardFooter`).
   같은 카드를 검색 · 좋아요 · 북마크 · dev 갤러리가 쓴다(`search-page.tsx:141`, `my-likes-page.tsx:73`, `my-bookmarks-page.tsx:73`, `dev-components-page.tsx:112, 179`).
   → **`WorkCard` 모양은 고치지 않는다.** 공용 새 컴포넌트로 만든다(기준 §8 "일회성 구현 금지").
2. **썸네일은 `WorkThumb`** — 틀이 `aspect-[2/3]` 로 고정(`WorkThumb.tsx:36`), 도메인별 `cover`/`contain`+흐림(`constants/thumbnail.ts:26-32`). `thumbShapeMap`(게임 = `landscape`)이 이미 있다(`:41-47`).
   가로 썸네일 전례는 `ReleaseRow`(`:42-62`) · `RankRow`(`:61-62`) — 둘 다 `rounded-input`(8px).
3. **그리드**: 모든 도메인 `2 → 3(768) → 4(1024) → 5(1201)` 열(`explore-page.tsx:730-731`). 필터 레일은 `lg`(1024)에서 나타난다 — 같은 지점에서 열이 늘면 카드가 갑자기 작아진다(검수 B1).
   `PAGE_SIZE = 20`(`:76`), 페이지 번호 방식(`:1072-1080`). 범위를 넘는 쪽은 1쪽으로 보정(`:614-620`).
4. **윗부분**: 제목 `text-[26px] font-extrabold`(`:987`, 개수와 이미 한 줄), 레일 폭 `lg:grid-cols-[256px_1fr]`(`:817`), `GENRE_COLLAPSE_LIMIT = 12`(`:155` — 모바일 시트도 같은 값), 필터 라벨은 줄바꿈된다(`FilterGroup` 에 말줄임 없음).
5. **꼬리 줄 · 메타 원천은 web `workCardInfo.tsx`**(`:29-33` `ageLabel`, `:49-61` 메타, `:93-165` 꼬리). 웹툰 메타 = 작가, 웹툰 꼬리 = "월요웹툰"(semibold) · 연령.
6. **스팀 리뷰 한글화는 9개 판정만**(`packages/shared/src/constants/steam.ts:5-19`), 나머지 영어 원문. 최신 게임 40개 중 39개 "No user reviews", 1개 "5 user reviews". 스팀은 1개면 **"1 user review"(단수)**.
   함수를 쓰는 곳: 웹 `workCardInfo`, 모바일 `GameCompactCard.tsx:36` · `components/ui/workCardInfo.tsx:115` · `app/collection/[id]/index.tsx:91`.
   표를 직접 쓰는 곳: 웹 `work-detail-page.tsx:478`, 모바일 `apps/mobile/src/app/work/[id].tsx:334`. 테스트 없음.
7. **긍정 %는 리뷰가 1개만 있어도 계산된다**(`WorkApiService.applySteamReview`, `total_reviews > 0`). "평가 1개 100%"가 나온다 — 별점 1표 문제와 같다.
8. **목록 DTO 에 투표 수가 없다**(`WorkSummary`). 상세만 `platformInfo[TMDB*].vote_count`(`work-detail-page.tsx:491`).
9. **shared 공개 경로**: `./types · ./constants · ./api · ./queries · ./rec · ./hooks · ./tracking`(`packages/shared/package.json`). `./work` 는 없다.
10. **웹 앱에는 테스트가 없다.** 판단 로직은 `packages/shared/tests`(vitest). 웹은 빌드 · lint · 기준 §6 grep 게이트.
    **게이트는 지금도 0 이 아니다**(`rounded-[` 3건: `HomeRecRail.tsx:402, 447` · `index.css` 주석, `—` 132건 모두 주석) → 이번 기준은 **"바꾼 파일에서 새 위반 0"**.
11. **기준 제약**: 카드 라운드 12px(`rounded-panel`), 행 썸네일 8px(`rounded-input`) 전례, **액센트 1개 · 앰버=별점 · 레드=폼 오류 외 색 금지**(:52), **em-dash 금지 · 중점(·) 한 줄 1개**(:55).
    → 시안의 초록 · 노랑 · 빨강 리뷰 점은 쓸 수 없다. 영화 "2026 · 넷플릭스 · ★ 7.0"(중점 2개)도 안 된다.

**백엔드**

12. **TMDB `vote_count` 는 저장돼 있다** — `platform_data.attributes.vote_count`(`tmdb_movie.yml:18`, `tmdb_tv.yml:18`). 목록 보강이 그 맵을 이미 읽는다(`WorkApiService.applyTmdbRating :335-340`) → 필드 하나 · 쿼리 증가 없음.
    신작 · 출시 예정 목록은 같은 `enrichAndMap` 이라 자동으로 붙는다. **컬렉션은 아니다** — `CollectionItemDTO.of`(`:43-63`)가 필드를 하나씩 복사한다(`.externalRating(...) :62`). 좋아요 · 북마크(`BookmarkService.toWorkSummary`)는 보강을 아예 안 탄다.
13. **투표 수는 수집 시점 값으로 굳는다.** TMDB 매일 수집은 최근 7일 출시작만 다시 가져온다(`TmdbJobProducer.collectNewContentDaily :40-47`). 출시 1주 안에 수집된 작품은 표가 적은 채로 남는다 — 20표 기준이면 별점이 **계속 숨을 수 있다**(열린 결정 2).
14. **스팀 리뷰 요약은 표시 언어 없이 수집된다** — `language=all&purchase_type=all` 은 리뷰 필터이고 `l=` 이 없다(`SteamFetcher.java:34-35`). 숫자 판정 `review_score`(0~9)와 `total_reviews` 가 같은 맵에 있지만 API 가 내보내지 않는다.
15. **정렬은 서버가 출시일 내림차순으로 고정**(`ContentRepository.java:28-32`, `WorksQueryBuilder.java:35`), `size` 상한 없음(`WorkController.java:45`).
16. **REST Docs**: `InteractionControllerDocsTest`(`:214, :273`)가 `WorkSummaryDTO` 필드를 하나씩 문서화한다 — 새 필드를 문서에 넣지 않으면 실패한다(null 도 직렬화). `applyTmdbRating` · `applySteamReview` 테스트는 없다.

## 범위

**포함**
- 공용 가벼운 카드 `WorkLiteCard`(가로 · 세로, 가로는 좁은 화면에서 CSS 로 목록형) + 반응형 스켈레톤, `WorkThumb` 에 `shape` 추가
- 탐색 그리드(컨테이너 쿼리) · 한 쪽 개수 · 윗부분 축소
- 신호 줄 규칙(shared), **표본 기준**: 별점 20표 · 긍정 % 리뷰 10개 — **탐색뿐 아니라 `workCardFooter` 를 쓰는 모든 카드에 같이 적용**(같은 작품이 화면마다 다르게 보이지 않게)
- 스팀 리뷰 한글화(모든 문구, 웹 · 모바일 함수로 통일)
- **백엔드**: `WorkSummaryDTO.externalVoteCount` · `steamReviewCount`, `CollectionItemDTO` 에 같은 두 필드

**제외 (별건 — "발견한 문제")**
- 검색 · 좋아요 · 북마크 카드 **모양**(2:3 유지 — 문구와 표본 기준만 같이 바뀐다)
- 인기순 정렬, 장르 개수 불일치, 웹소설 장르 오염, TMDB 투표 수 주기적 재수집

## 카드 `WorkLiteCard`

```
가로(게임 · 768px 이상)              목록형(게임 · 767px 이하)        세로(그 밖)
┌──────────────────────┐            ┌────────┐ Luminescence         ┌─────────┐
│  스팀 배너 460:215     │            │ 배너    │ 매우 긍정적 · 2023 94% │ 포스터   │
└──────────────────────┘            └────────┘                      │  2:3    │
Luminescence                                                         └─────────┘
매우 긍정적 · 2023        94%                                          경찰 간부의 살인…
                                                                     2026 · 넷플릭스   ★ 7.0
```

- **구조**: `<Link>`(`rounded-panel` — 초점 고리가 모서리를 따른다) 안에 그림 → 제목 → 신호 줄. 상자 없음. 제목에 `title` 속성(말줄임 대비).
- **그림**: `WorkThumb shape="landscape"`(신규 — `aspect-[460/215]` + cover, 대체 아이콘 같음) / `shape="portrait"`(지금 그대로). 모양은 `thumbShapeMap[categoryOf(domain)]`.
  라운드: 카드 그림 `rounded-panel`, **목록형 작은 그림은 `rounded-input`**(행 썸네일 전례).
- **목록형은 prop 이 아니라 CSS** — 가로 카드 하나가 `max-[767px]:flex-row`(그림 132px)로 바뀐다. 스켈레톤도 같은 반응형 하나(첫 화면 튐 없음).
- **제목**: 한 줄 말줄임 `text-[14.5px] font-semibold`, 그림과 8px.
- **신호 줄**: `text-[12.5px] text-ink-2`(canvas 위 대비 약 4.6:1 — `ink-3` 로 바꾸지 않는다), 한 줄, **빈 값이어도 높이 유지**(`min-h`).
  왼쪽(조각 배열, 중점 최대 1개) + 오른쪽 끝 값. 오른쪽 값에 스크린리더용 이름(`sr-only` "평점" · "긍정").
- **호버**: `group-hover:brightness-95` + `motion-reduce:transition-none`(Tailwind v4 `hover` 는 터치에서 남지 않는다). 떠오름 없음.
- **그리드 간격**: 가로 `gap-x-4 gap-y-6`, 세로 `gap-x-3.5 gap-y-6`, 목록형 `gap-y-3`.

### 신호 줄 규칙 (`workLiteSignal(work)` — shared `constants`, 테스트)

반환: `{ left: {text, strong?}[], right?: {kind: "pct" | "star" | "age", text, srLabel} }`

| 분야 | 왼쪽 | 오른쪽 끝 |
|---|---|---|
| 게임 | **판정이 있으면**(9개 중 하나) `[판정(긍정이면 strong), 연도]`, **없으면** `[연도]`만 — "평가 없음"을 반복하지 않는다(최신 게임 대부분이 없음). 출시 예정(미래 날짜)이면 `["출시 예정", 연도]` | 긍정 % — 판정이 있고 **리뷰 10개 이상**일 때만 |
| 영화 · 시리즈 | `[연도, OTT 1개]` — OTT 는 `PLATFORM_LABELS` 순서로 첫째, 여러 개면 "넷플릭스 외 2" | ★ 평점(앰버) — **투표 20개 이상**일 때만 |
| 웹툰 | `[작가, "월요웹툰" · "연재중" · "완결"(strong)]` — 작가 없으면 상태만 | 연령("15세", 전체이용가 생략) |
| 웹소설 | `[작가 또는 연도]` | 연령 |

- **색**: 판정을 색으로 칠하지 않는다(조사 11). 긍정 판정만 `font-semibold text-ink`.
- **중점 규칙 보장**: 조각을 이을 때만 "·" 를 넣고, **원문(작가 · OTT 라벨)에 든 "·" 는 조립할 때 공백으로 바꾼다.** 테스트는 모든 경우의 왼쪽에 "·" 가 1개 이하인지 본다.
- **리뷰 문구 한글화**(`steamReviewDescKo` 확장, 모든 소비처): 9개 판정 그대로, `"No user reviews"` → **"평가 없음"**, `/^(\d+) user reviews?$/` → **"평가 N개"**, 모르는 값 → 원문.
  용어는 **"평가"** 로 맞춘다 — 필터 "리뷰 수 (Steam)" → "평가 수 (Steam)", 상세 "Steam 리뷰 N개" → "Steam 평가 N개"(상세의 "평가 5개 100% · Steam 리뷰 5개" 중복도 정리).
- **`ageLabel` 은 shared 로 옮기고** web `workCardFooter` 도 그것을 쓴다(규칙 원천 하나).

### 표본 기준 (탐색 · 검색 · 추천 · 컬렉션 공통)

- `EXTERNAL_RATING_MIN_VOTES = 20`, `STEAM_PCT_MIN_REVIEWS = 10`(shared 상수).
- **수가 없으면 숨긴다**(옛 응답 · 옛 수집분) — 적은 표본을 가려내는 게 목적이라 모를 때 숨기는 쪽이 안전하다.
- web `workCardFooter` 에도 같은 기준을 넣는다 → 검색 · 좋아요 · 북마크 · 추천 카드 · 컬렉션(`collection-detail-page`, `PulledWorkPanel`)이 모두 같은 규칙.
  좋아요 · 북마크 응답은 보강을 안 타 수가 늘 없으므로 **별점 · %가 숨는다** — 지금도 그 응답엔 별점이 없어 달라지지 않는다(확인 필요 — 수동 7).
- 상세 화면은 투표 · 리뷰 수를 함께 보여 주므로 그대로 둔다.

## 탐색 화면

| 항목 | 지금 | 바꿈 |
|---|---|---|
| 페이지 제목 | 26px extrabold | **20px bold** |
| 필터 레일 폭 | 256px | **216px** + 필터 라벨 말줄임(`truncate`, 개수는 오른쪽 고정) |
| 장르 펼침 | 12개(레일 · 시트 공통) | **레일 6개** · 시트는 12개 그대로(상수 분리) |
| 분야 칩 | `lg` | 그대로(`md` 와 차이가 작다) |
| 그리드 | 뷰포트 기준 열 | **`<main>` 컨테이너 쿼리(`@container`)** — 레일 유무와 상관없이 카드 폭으로 열을 정한다 |
| · 게임 | 2 → 3 → 4 → 5 | **목록형 1열(뷰포트 767 이하) → 3 → 4 → 5** — 카드 최소 폭 약 180px |
| · 그 밖 | 2 → 3 → 4 → 5 | **2 → 3 → 4 → 5 → 6** — 카드 최소 폭 약 140px(모바일 2열 유지) |
| 한 쪽 개수 | 20 | **30** — 3 · 5 · 6열은 마지막 줄이 꽉 찬다. 4열 구간은 마지막 줄 2칸이 빈다(받아들인다, 열린 결정 4) |
| 스켈레톤 | `SkeletonCard portrait` 20 | **가벼운 카드 모양** 30(가로 · 세로, 목록형은 CSS) — 기준 §4 |

- 컨테이너 폭 경계(대략): 게임 3열 ≥ 560 · 4열 ≥ 760 · 5열 ≥ 960 / 세로 3열 ≥ 440 · 4열 ≥ 600 · 5열 ≥ 760 · 6열 ≥ 920. 실제 값은 구현 때 1024 · 1200 · 1280 · 1440 폭에서 카드 폭을 재어 정한다.
  (v1 은 뷰포트 기준이라 1024px 에서 게임 카드가 313 → 131px 로 떨어졌다 — 검수 B1.)
- **한 쪽 30의 부수 효과**: 기존 `?page=N` 링크가 다른 작품을 가리킨다(공유 링크가 드물어 받아들인다). 서버 상한 없음 · 보강은 배치라 성능 영향 없음.
- **"출시 예정 포함"을 켜면** 게임 카드 왼쪽이 "출시 예정 · 2027"(위 규칙).
- 페이지 번호 · URL 상태 · 필터 동작 · "평가 수" 필터 · 출시 예정 토글 로직은 그대로.

## 백엔드

- `WorkSummaryDTO`: `Integer externalVoteCount`(`attributes.vote_count` 숫자일 때), `Integer steamReviewCount`(`review_summary.total_reviews`, 보강이 이미 읽는다).
- `CollectionItemDTO.of` 에 두 필드 복사.
- 테스트: `InteractionControllerDocsTest` 에 두 필드 문서화, `applyTmdbRating` · `applySteamReview` 서비스 테스트 신규(있음 · 없음 · 숫자 아님).
- **배포 순서: 백엔드 먼저.** 프론트가 먼저 나가면 수가 없어 **모든 별점 · %가 숨는다**.

## 구성 요소

**shared**

| 변경 | 내용 |
|---|---|
| `types/index.ts` | `WorkSummary.externalVoteCount?: number \| null`, `steamReviewCount?: number \| null` |
| `api/collectionApi.ts` | 컬렉션 항목 타입에 같은 두 필드 |
| `constants/steam.ts` | `steamReviewDescKo` 확장 · `isSteamVerdict(desc)` · `isPositiveSteamVerdict(desc)` |
| `constants/workSignal.ts`(신규, `constants` 에서 내보냄) | `workLiteSignal` · `ageLabel`(web 에서 이동) · `EXTERNAL_RATING_MIN_VOTES` · `STEAM_PCT_MIN_REVIEWS` · `showExternalRating(work)` · `showSteamPct(work)` |

**web**

| 변경 | 내용 |
|---|---|
| `components/ui/WorkThumb.tsx` | `shape: "portrait" \| "landscape"` |
| `components/ui/WorkLiteCard.tsx`(신규) | 가로 · 세로(목록형 CSS) |
| `components/ui/SkeletonCard.tsx` | `lite-landscape` · `lite-portrait` 변형(반응형) |
| `components/ui/workCardInfo.tsx` | `ageLabel` shared 로, 꼬리 줄에 표본 기준(`showExternalRating` · `showSteamPct`) |
| `components/ui/FilterGroup.tsx` | 라벨 말줄임 |
| `pages/explore-page.tsx` | 카드 · 컨테이너 쿼리 그리드 · 30 · 제목 · 레일 216 · 레일 장르 6(시트 12) · "평가 수" 문구 |
| `pages/work-detail-page.tsx` | 리뷰 문구를 함수로 · "평가" 용어 · 중복 문구 정리 |
| `pages/dev-components-page.tsx` | `WorkLiteCard` 견본(분야 5 × 모양) |

**mobile** — `app/work/[id].tsx:334` 를 함수로(한 줄). 함수를 쓰는 세 곳은 자동으로 한글 문구가 된다.

## 테스트

**shared (vitest, `packages/shared/tests`)**
- `steamReviewDescKo`: 9개 판정 · "No user reviews" · **"1 user review"** · "5 user reviews" · 모르는 값
- `workLiteSignal`: 분야 5 × 값 있음 · 없음 — 게임 판정 없음(연도만) · 긍정 strong · 리뷰 9 · 10개 경계 · 출시 예정, 영화 투표 19 · 20 · 없음 · OTT 0 · 1 · 3개 · 우선순위, 웹툰 작가 있음 · 없음 · 요일 · 완결, 웹소설
- 중점 규칙: 모든 경우 왼쪽 "·" ≤ 1, 원문에 "·" 가 든 작가 · OTT
- `showExternalRating` · `showSteamPct` 경계

**백엔드**: 위 "백엔드" 절.

**수동 (Vercel 미리보기, 기준 §4 DoD)**
1. 폭 **360 · 375 · 768 · 1024 · 1200 · 1280 · 1440** — 게임 · 영화 · 웹툰 · 웹소설 탭, 로딩 · 빈 결과 · 오류. 1024 · 1200 에서 신호 줄이 잘리지 않음
2. 게임: 배너 잘림 · 흐림 없음, 판정 없는 게임은 연도만, "출시 예정 포함" 켜면 "출시 예정 · 2027"
3. 영화: 투표 적은 신작에 ★ 없음, 인기작에 ★ 있음(열린 결정 2 측정 뒤)
4. 한 쪽 30 · 페이지 · 필터 · URL 그대로, 767 ↔ 768 에서 목록형 ↔ 카드 전환이 튀지 않음
5. 키보드 초점 고리(둥근 모서리) · 줄임 동작 · 스크린리더가 "평점 7.0"으로 읽음
6. **검색 · 좋아요 · 북마크 카드 모양은 그대로**, 리뷰 문구만 한글 · 적은 표본 점수 숨김
7. 좋아요 · 북마크 · 컬렉션 · 추천 카드의 별점 · % 표시가 기준대로(수가 없는 응답이면 숨김)
8. 모바일 앱: 상세 · 게임 목록 카드 · 컬렉션의 리뷰 문구가 한글
9. grep 게이트: **바꾼 파일에서 새 위반 0**

## 발견한 문제 (이번 범위 밖 — 별건)

| 문제 | 원인(코드) | 고치는 방향 |
|---|---|---|
| 장르 개수 > 분야 전체(인디 129,901 > 게임 122,179) | `countByGenre` 가 `COUNT(*)`(배열 원소 수 — 같은 장르가 두 번 든 작품은 두 번) · 전체 개수와 달리 1년 뒤 출시작을 빼지 않음 · 필터 미반영(`ContentRepository.java:192-194`, 캐시 30분). 수집 때 장르 중복 제거 없음(`SteamPayloadProcessor.java:38-49`) | `COUNT(DISTINCT content_id)` + 같은 조건, 수집 때 중복 제거 |
| 웹소설 장르에 작가 · 출판사 이름 | 네이버시리즈 `extractGenres` 가 정보 줄 링크를 전부 장르로 담는다(`NaverSeriesFetcher.java:234-252`) | 장르 줄만 고르기 + 기존 데이터 정리 |
| TMDB 투표 수가 출시 1주 값으로 굳음 | 매일 수집이 최근 7일 출시작만(조사 13) | 주기적 재수집(평점 · 투표 수만) |
| 탐색 인기순 없음 | 서버 정렬 고정(조사 15). 신호: 스팀 `review_count` · TMDB `vote_count` · `external_ranking` | 분야별 인기 정렬 |

## 열린 결정

1. **검색 · 좋아요 · 북마크 카드 모양** — 권장: 이번에는 탐색만. 여러 분야가 섞이는 화면은 09-21 통일을 유지.
2. **별점 기준 20표** — 투표 수가 굳는 문제(조사 13) 때문에 신작 별점이 계속 숨을 수 있다.
   → **권장: 기준을 정하기 전에 운영 DB 에서 "rating 있는 작품의 vote_count 분포"를 잰다**(`platform_data.attributes->>'vote_count'`). 20 이 너무 많이 숨기면 10 으로. 재수집은 별건.
   (참고: TMDB 랭킹 수집은 100표 기준 — `RankingCrawlerService.java:55, 59, 104, 105` 가 넘긴다.)
3. **게임 연도** — 최신순에서는 거의 같다. 권장: 넣는다(시기 필터 · 출시 예정에서 달라진다).
4. **4열 구간의 한 쪽 30** — 마지막 줄 2칸이 빈다. 권장: 받아들인다(60 은 한 쪽이 길다, 24 는 5열이 빈다).

## 검수 기록

### v1 → v2 (2026-09-26, 코드 대조 독립 검수)

**사실 오류 (11)**

| # | v1 | 실제 | 반영 |
|---|---|---|---|
| A1 | 2:3 통일은 "분야가 섞이는 화면" 때문 | 09-21 은 **탐색까지 포함**해 통일했고 탐색 게임 가로 카드를 고칠 문제로 적었다. `801487c` 가 가로 카드를 지웠다 | "선행 결정과의 관계" 절 신설 — 탐색 한정으로 뒤집는다고 명시 |
| A2 | 새 필드가 컬렉션에도 자동으로 붙는다 | `CollectionItemDTO.of` 가 필드를 하나씩 복사. 좋아요 · 북마크는 보강 경로 밖 | 컬렉션 DTO · 타입 추가, 좋아요 · 북마크는 숨김으로 명시 |
| A3 | SteamFetcher 에 언어 매개변수 없음 | `language=all` 은 리뷰 필터, 없는 것은 표시 언어 `l=` | 조사 14 |
| A4 | 모바일 상세 경로 · 소비처 | `apps/mobile/src/app/work/[id].tsx:334`, 함수 소비처 3곳 누락 | 조사 6 · 수동 8 |
| A5 | "전체 탭 없음" = `:488-498` | `:78-79`(`EXPLORE_DOMAINS`), `:488-498` 은 URL 정규화 | 선행 결정 절 |
| A6 | `TmdbRankingService` minVoteCount 100 | 100 은 `RankingCrawlerService` 가 넘긴다 | 열린 결정 2 |
| A7 | 검색 · 좋아요 · 북마크는 바뀌지 않음 | 리뷰 문구(함수)가 바뀌면 전부 바뀐다 | "모양은 그대로, 문구 · 표본 기준은 같이" |
| A8 | grep 게이트 0 | 지금도 `rounded-[` 3 · `—` 132(주석) | "바꾼 파일에서 새 위반 0" |
| A9 | 테스트 "1 user reviews" | 스팀은 "1 user review"(단수) | 테스트 입력 |
| A10 | `work/workTileSignal.ts` | shared 에 `./work` 공개 경로 없음, `ageLabel` 은 web 에만 | `constants/workSignal.ts`, `ageLabel` 이동 |
| A11 | 제목 "개수와 한 줄" · 칩 `md` 효과 | 이미 한 줄, `lg`→`md` 차이 미미 | 해당 항목 삭제 |

**설계 문제**

| # | 등급 | 문제 | 반영 |
|---|---|---|---|
| B1 | 심각 | 뷰포트 기준 열이라 1024px(레일 등장)에서 게임 카드 313 → 131px, 신호 줄 잘림 | `@container` + 카드 최소 폭 |
| B2 | 심각 | 모바일 세로 3열 = 카드 101px(375) · 96px(360), OTT 가 사라짐 | 모바일 2열 유지 |
| B3 | 보통 | 투표 수가 수집 시점에 굳어 신작 별점이 영구히 숨을 수 있음 | 열린 결정 2(분포 측정 먼저) · 재수집 별건 |
| B4 | 보통 | 리뷰 1개 게임 "100%" — 별점과 같은 문제인데 비대칭 | 리뷰 10개 기준, `steamReviewCount` |
| B5 | 보통 | 탐색만 별점을 숨기면 같은 영화가 화면마다 다름 | `workCardFooter` 공통 적용 |
| B6 | 보통 | `variant="row"` prop 은 뷰포트에 반응 못 함(튐) | CSS 반응형 하나 |
| B7 | 보통 | 웹툰 작가가 조용히 사라짐 | "작가 · 월요웹툰" |
| B8 | 보통 | `{left: string, leftStrong}` 로는 판정만 굵게 못 함 | 조각 배열 |
| B9 | 보통 | 가로 썸네일 마크업이 다시 흩어짐 | `WorkThumb shape` |
| B10 | 보통 | `InteractionControllerDocsTest` 가 새 필드로 실패, 서비스 테스트 없음 | 백엔드 절 |
| 사소 | — | 작은 그림 라운드 8px / 호버 · 초점 모서리 / sr-only · title · 대비 / 용어("평가") · 최신 게임 "평가 없음" 반복 / OTT 우선순위 · 원문 "·" / 한 쪽 30 부수 효과 / 216px 라벨 줄바꿈 · 시트 장르 수 / `number \| null` / 이름(`WorkTile` ↔ `OnboardingWorkTile`) → `WorkLiteCard` | 각 절 |

**빠진 것 (9)** — 컬렉션 전파 · shared 공개 경로 · `ageLabel` 원천 · 모바일 확인 · 그리드 간격 · 신호 줄 높이 유지 · 확인 폭(360 · 1024 · 1200) · 09-21 · 기준 문서와의 관계 · 출시 예정 표시 → 모두 반영.
