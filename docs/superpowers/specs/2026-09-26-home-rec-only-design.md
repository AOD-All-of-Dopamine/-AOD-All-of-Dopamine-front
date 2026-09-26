# 홈 추천 한 줄 — 추천 탭 제거 설계

작성일: 2026-09-26 · 대상: `apps/web`, `packages/shared` + **백엔드 1건**(`size` 상한) · 선행: 홈 추천 릴(#51 · #52) ·
시안: 로컬 목업 `B′ 가로 줄 → 30개 순환 + 새 추천` · 이전 설계: `2026-09-25-home-rec-rail-design.md` · 추천 전체 설계: AI 리포 `recommendation/REC_TAB_DESIGN.md`
상태: **v2 · 구현됨** — v1 코드 대조 독립 검수 반영(심각 2 · 보통 7 · 사소 다수 · 빠진 것 8), 구현 후 독립 검수 반영(맨 아래 "검수 기록" · "구현 기록")

## 목표

추천 탭(`/for-you`)을 없애고 **추천은 홈 한 곳에서만** 보여 준다. 홈의 추천 섹션을 다음처럼 바꾼다.

- 추천 **30개를 가로 한 줄**로 보여 준다. 분야 칩(전체·영화·시리즈·게임·웹툰·웹소설)으로 바꿔 본다.
- 데스크톱 화살표는 **끝에서 처음으로 돌아간다**(순환). 지금 위치(`1–6 / 30`)와 쪽 막대를 보여 준다.
- **"새 추천 받기"** 를 누르면 같은 체인에서 **다음 30개**로 바꾼다. 서버가 이미 본 작품을 빼고, 그사이 누른 👍/👎 를 반영해 다시 고른다.

끝없는 목록 대신 "잘 맞는 30개 + 원할 때 새 묶음"으로 간다. 뒤로 갈수록 추천이 약해지는 문제와 로딩 빈칸이 없다.
스팀 "맞춤 추천 대기열"(한 묶음 → 다음 대기열)과 같은 구조다.

**REC_TAB_DESIGN 과의 관계**: §2-8 의 **U5**(배치 크기 · 새로고침 도입 여부)는 권고가 "10개 · 한 화면"이었다.
이 설계는 그 권고를 **뒤집어** 30개 + 새로고침으로 닫는다 — 추천 탭이 없어져 "더 보기" 대신 새 묶음 버튼이 이어 보기를 맡고,
한 줄 가로 배치라 30개도 한 화면 높이다. U1~U4(§2-9, 추천 탭 카드 수정)는 추천 탭과 함께 없어진다.

## 조사 결과 — 설계를 정한 사실들

**백엔드 · 라우터**

1. **`size` 상한은 컨트롤러 한 곳이다.** `RecommendController.MAX_SIZE = 20`(`:33-34`), 검사 `:51-52`. 테스트 `RecommendControllerTest.java:202`(`size=21` → 400).
   **엔진이 받는 k 는 `size` 와 무관하게 50 이다** — 백엔드가 `buffer = 50 - size`(`RecommendService.java:80, 256-258`)로 k+buffer 를 늘 50 으로 맞추고,
   라우터는 전체 탭 `ALL_TAB_ENGINE_K`(50), 그 밖은 `min(k+buffer, 100)` = 50 을 엔진에 넘긴다(`router/service.py:31-32`).
   **`size=30` 으로 바뀌는 것은 두 가지뿐이다**: ① 전체 탭 머리가 **M6@30** 이 된다(`service.py:60-65`, 앞 k 개 = M6@k — A5 해결 방식),
   ② 같은 후보 50개로 카드 30장을 채워야 해서(DB 에 없는·성인 작품 제외 뒤) **모자라는 쪽**이 늘 수 있다.
   제외 수 계산 주석(`RecommendService.java:92-96`, 상수 `:97`)은 "이번 쪽 ≤ 20" 을 가정한다 — 30 이면 4,530 으로 라우터 한도 5,000 밑이다. 주석만 고친다.
2. **체인은 사용자 + 탭 단위다**(표면 구분 없음). 담는 것은 본 작품(`seenIds`, `SEEN_MAX = 500` `ChainService.java:36`) · 건너뛴 키 · 쪽 깊이뿐이고,
   24시간 미사용이면 만료된다(`TTL` `:43`). 다른 탭 · 다른 사용자 · 만료 체인은 찾지 못해(`find` `:97-109`) **404** 가 된다(`RecommendService.java:195-198`).
3. **시드와 부정 신호는 요청마다 새로 읽는다**(`RecommendService.java:200-201, 236`, `SeedResolver.java:53-76`). 체인에 얼어 있지 않다.
   → 첫 묶음에서 👍 한 작품은 **다음 요청의 시드**가 되고, 👎 · 관심 없음은 다음 요청에서 빠진다. 다만 **쓰기가 끝난 뒤** 요청해야 반영된다.
4. **`hasMore`** = 체인 저장 성공 · 부른 플랫폼 중 하나라도 남음 · 본 작품 < 500 · 이번 카드 있음(`:389-391`). 30개씩이면 최대 17쪽(누르기 16번), 짧은 쪽이 오면 더.
   `hasMore:false` 는 **소진과 체인 저장 실패를 구분하지 않는다.**
5. **대체(fallback) 응답은 이어 받을 수 없다** — `hasMore:false`, `pageDepth 0`, 저장하지 않은 체인 id(`:442-465`). 인기 목록은 늘 같은 목록이다.
   **이어 받는 요청도 대체로 끝날 수 있다** — 킬 스위치 `disabled`(`:193`), `no_seed`(`:202`), 라우터 실패 · 시간 초과(`:259`), 카드 0장 `empty`(`:303`), 예외(`:188`). 모두 200 이다.
6. **`tab=all` 은 웹툰을 부르지 않는다**(`RecommendService.java:105`). 칩이 생기면 웹툰은 `tab=webtoon` 으로 따로 본다.
   전체 칩의 `no_seed_platform` 은 "게임·영화·시리즈·웹소설에 시드가 없다" = 사실상 **웹툰만 좋아한 사용자**다.
7. **요청 로그 `surface` 허용 값은 `{rec_tab, home_rec}`, 없거나 모르는 값이면 `rec_tab`**(`:74-78, 483-486`). 홈은 이미 `home_rec` 을 보낸다(#124).
8. **클라이언트 이벤트는 `eventId` 로만 중복을 거른다**(`LogWriter.java:37-38`). 같은 `impressionId` 로 새 이벤트를 보내면 두 번 쌓인다.
   이벤트 종류에 `rec_loaded_more` · `rec_tab_changed` 가 있다(`RecEventTypes.java:12-13`). 백엔드 검증은 `surface` · `payload` 모양을 보지 않는다 — 틀려도 조용히 쌓인다.

**프론트**

9. **`useRecommendations` 는 `useInfiniteQuery`**(`hooks/useRecommendations.ts:32-53`). 키 `["recommendations", tab, nonce]`, 다음 쪽 인자 `nextChainParam`(대체 · `hasMore:false` 면 없음).
   지금 홈은 `useRecommendations("all", HOME_NONCE, {size: 12, surface: "home_rec"})` 첫 쪽만 쓴다(`HomeRecRail.tsx:91-94`).
10. **`useRecChain(tab)`** 은 탭별 체인 저장소(`aod_rec_chain_{tab}`, sessionStorage)와 `remember` · `restart` · `restartOnChainExpired` 를 **제공만** 한다.
    호출하는 쪽이 `remember` effect(`for-you-page.tsx:127-132`)와 오류 effect(`:144-150`)를 직접 단다. **`remember` 를 빼면 저장소 chainId 가 null 이라 404 재시작이 동작하지 않는다**(`useRecChain.ts:97`).
    또 **캐시가 비면 저장된 chainId 를 싣지 않는다**(`:72-77`) — 쪽을 합쳐 보여 주는 추천 탭 기준 규칙이다.
11. **숨김 · 👍 상태는 마운트 때 한 번 읽는다**(`HomeRecRail.tsx:81-89`, 키는 지금 모듈 상수). 키가 바뀌어도 몸통을 다시 띄우지 않으면 앞 상태가 남는다.
    추천 탭은 몸통을 `key={\`${tab}:${nonce}\`}` 로 다시 띄운다(`for-you-page.tsx:438`).
12. **노출 추적은 카드 요소마다 계측기 하나**(`useImpressionTracker.ts:42, 63-72`). 요소가 붙어 있으면 다시 보여도 끝난 계측기는 다시 보내지 않는다.
    하지만 **다시 마운트(칩 왕복 · 상세 뒤로가기)하면 새 계측기가 같은 `impressionId` 로 또 보낸다** — 지금도 그렇다.
    잠깐이라도 50% 이상 보인 카드는 언마운트 · 탭 숨김 때 짧은 `final` 노출을 남긴다(`ImpressionMeter`).
13. **`/for-you` 를 가리키는 곳**: 라우트(`App.tsx:10, 37`), 데스크톱 메뉴(`SiteHeader.tsx:13`), 하단 탭 표시 목록(`public-layout.tsx:11`), 홈 릴 링크 3곳(`HomeRecRail.tsx:383, 411, 438`),
    **온보딩 도착지** `onboardingLandingPath()`(`packages/shared/src/rec/onboarding.ts:149-154`, 테스트 `onboarding.test.ts:142-156`),
    주석 — `pendingOnboarding.ts:9`, `onboarding-page.tsx:128, 163`, `onboarding.ts:139-147`, `HomeRecRail.tsx:36-39, 65`, `work-detail-page.tsx:273`.
    모바일 하단 탭에는 원래 "추천"이 없다(`NavigationBar.tsx:18-25`).
14. **추천 탭에만 있고 홈에 없는 기능**: 분야 칩 · 이어 받기 · "새로 보기"(체인 재시작) · 체인 만료 재시작 · **관심 없음**(+ 되돌리기) · 카드 메뉴 **북마크** · 스크롤 복원 · `rec_tab_changed`.
15. **`refreshAfterPick` 은 요청을 두 번 보낸다** — `clearRecChains()` 는 nonce 를 바꾸지만 다시 그리지 않아, `resetQueries` 가 옛 키로 한 번, 다시 그릴 때 새 키로 한 번 부른다(`HomeRecRail.tsx:264-267`).
16. **웹 앱에는 테스트가 없다.** 판단 로직은 `packages/shared` 에 두고 vitest 로 잰다.

## 범위

**포함**
- 홈 추천 섹션: 칩 · 30개 한 줄 · 순환 화살표 · 위치 표시 · 새 추천 받기 · 끝 카드 · 가로 위치 복원
- 추천 탭 제거: 라우트는 **홈으로 넘기기**, 메뉴 · 온보딩 도착지 · 홈 링크 · 주석 정리, 추천 탭 전용 코드 삭제
- **백엔드: `MAX_SIZE` 20 → 30** (선행 배포)

**제외**
- 추천 엔진 · 라우터 변경. 신작 · 인기 · 출시 예정 섹션. 탐색 화면(별건).
- **모바일 히어로 축소** — 시안에 있었지만 별도 PR(기준 · 확인 방법을 따로 정한다).
- "관심 없음" · 북마크를 홈 카드에 옮기기 — 열린 결정 2.

## 화면 구성

```
[히어로]

내 취향 추천  [새로 고른 추천 · 2번째]          1–6 / 30  ▬▭▭▭▭▭  [새 추천 받기 ↻]
좋아요한 작품 ▯▯▯ 외 N개                        ← personal 만 (지금과 같음)
(전체)(영화)(시리즈)(게임)(웹툰)(웹소설)
‹ [카드][카드][카드][카드][카드][카드] … [끝 카드] ›
                                                  끝 카드(personal): "30개를 다 봤어요" · [새 추천 받기] · [처음으로]
[새로 나온 작품] [이번 주 인기] [출시 예정]     ← 그대로
```

- **카드**: 지금 `HomeRecCard`(168px, 링크 + 👍/👎 형제, `recWorkPath` 로 rid/iid). 이유 줄은 `personal` 만.
- **칩**: `REC_TABS` · `REC_TAB_LABELS`. **모든 모드에서 보인다**(모드는 응답이 와야 정해지므로 숨기면 화면이 튄다. `pick` 에서도 칩으로 다른 분야 후보를 볼 수 있다).
  선택은 URL `?rec=<tab>`(전체는 매개변수 없음, `parseRecTab` 으로 검증) — **`replace`** 로 바꾼다(뒤로가기가 칩 이력으로 차지 않게).
  `rec_tab_changed` 는 **칩을 눌렀을 때만** 보낸다(URL 로 바뀐 경우 제외).
- **화살표(데스크톱)**: `aria-label`("이전 추천" · "다음 추천") · `aria-controls`(줄 id). 한 번에 보이는 장 수만큼 넘긴다(부드럽게).
  › 가 끝이면 처음으로, ‹ 가 처음이면 끝으로 — **순환 점프는 즉시(`behavior:"auto"`)**. 부드럽게 되감으면 사이 카드 24장이 잠깐 보이며 짧은 노출이 대량으로 쌓인다(조사 12).
  `prefers-reduced-motion` 이면 모든 이동을 즉시로. 모바일은 손가락으로 넘기고 화살표가 없다.
- **위치 표시**: 숫자는 **카드만** 센다(`첫–끝 / cards.length` — 짧은 쪽 · 닫힌 👎 자리 반영), 막대는 끝 카드를 포함한 쪽 수. 모바일은 숫자만.
  보이는 수 = `floor((clientWidth + gap) / (카드폭 + gap))`, 끝 판정 오차 4px, `ResizeObserver` + `requestAnimationFrame` 으로 갱신.
- **끝 카드**: 30장 뒤 한 장. `personal` = "N개를 다 봤어요" + [새 추천 받기] + [처음으로]. 그 밖의 모드 = [처음으로]만.
- **로딩**: 첫 요청 · 칩 첫 방문 = 스켈레톤 6장(지금 조건). **새 추천 받기 중** = `isFetchingNextPage` 로 따로 판정해 줄 자리에 스켈레톤.
  받은 뒤 줄을 처음으로 되돌리고 **포커스를 첫 카드 링크로** 옮긴다(끝 카드 버튼이 사라져 포커스가 빠지지 않게).
- **건너뛰기**: 카드 30장 × (링크 + 버튼 2) = Tab 정지 약 90개다. 줄 앞에 "추천 건너뛰기" 링크(초점 받을 때만 보임)를 두어 다음 섹션으로 보낸다.

## 묶음(세트)과 체인

- **구조**: `HomeRecRail`(바깥 — 칩 · URL · 토스트 · 쓰기 대기열) → `HomeRecRailBody key={\`${tab}:${nonce}\`}`(안 — 요청 · 숨김 · 👍 · 줄).
  몸통은 탭 · nonce 가 바뀌면 다시 뜬다(조사 11). **토스트와 쓰기 대기열은 바깥에 둔다** — 칩을 바꿔도 되돌리기 토스트 · 진행 중 쓰기가 사라지지 않게.
- **요청**: `useRecChain(tab, { continueWithoutCache: true })` → `useRecommendations(tab, nonce, { size: HOME_REC_SET_SIZE(30), surface: "home_rec", initialChainId })`.
  **홈은 캐시가 없어도 저장된 체인을 이어 받는다**(새 옵션). 마지막 묶음만 보여 주는 홈에서는 새로고침 뒤 **1번째 묶음을 다시 보는 것보다 다음 묶음이 낫다**(조사 10의 규칙은 쪽을 합쳐 보이는 화면용).
- **`remember` effect**: 마지막 쪽이 대체가 아니면 그 `chainId` 를 저장한다. **오류 effect**: 404 면 `restartOnChainExpired`(한 번) — 추천 탭(`for-you-page.tsx:127-150`)과 같다.
- **보이는 묶음 = 받은 쪽 중 마지막 쪽 하나.** `mergeRecPages([pages.at(-1)], collapsedIds(hidden))` 로 넘긴다(한 쪽짜리 — 중복 제거는 쪽 안에서만).
- **새 추천 받기** = 대기 중인 👍/👎 쓰기를 **모두 기다린 뒤** `fetchNextPage()`(조사 3). 버튼은 `hasNextPage && !isFetchingNextPage` 일 때 켠다.
  "N번째" 표시는 **서버 `pageDepth + 1`** 로 한다(체인을 이어 받으면 `pages.length` 와 다르다).
- **이어 받은 쪽이 대체면 실패로 다룬다** — `queryFn` 에서 `pageParam != null && res.fallback` 이면 던진다. react-query v5 는 `fetchNextPage` 가 실패하면 이전 쪽을 그대로 둔다.
  → 이전 묶음 유지 · 토스트 "새 추천을 받지 못했어요 · 잠시 후 다시 눌러 주세요" · 버튼 유지. (그대로 붙이면 개인 추천 줄이 인기 목록으로 바뀌고 체인도 버려진다 — 조사 5.)
  판정 함수 `isFallbackContinuation(pageParam, res)` 를 shared 에 두고 테스트한다. 401 은 토스트 없이 전역 안내에 맡긴다(지금 `reportError` 방식).
- **더 받을 게 없을 때**(`personal` 인데 `hasMore:false`): 버튼 자리에 **"지금은 더 고를 추천이 없어요"**(소진 · 저장 실패를 구분할 수 없어 중립 문구) + **[처음부터 다시 받기]** = `chain.restart()`.
- **이전 묶음으로 돌아가기는 없다.** 좋아요한 작품은 프로필 좋아요 목록에 있다.
- **칩마다 따로**: 탭마다 체인 · 쿼리 캐시 · 묶음이 따로다. 칩을 오가면 캐시가 있는 동안(30분) 보던 묶음이 그대로 나온다.
- **가로 위치 복원**: `recChainState` 항목에 `scrollLeft` 를 더해 두고(스크롤 때 rAF 로 저장), 몸통이 뜰 때 복원한다 — 상세에서 돌아오거나 칩을 오가도 보던 자리.
  새 묶음을 받으면 0 으로.
- **숨김 · 👍 상태**: `recChainStateKey(tab, nonce)`. 묶음이 바뀌면 이전 묶음의 가려진 자리는 작품과 함께 사라진다.

## 모드

`homeRecMode` 표를 그대로 쓴다(`homeRec.ts:26-42`). 바뀌는 곳만:

| 모드 | 새 추천 받기 | 끝 카드 | 바뀐 점 |
|---|---|---|---|
| `personal` | ○(`hasNextPage`) | 다 봤어요 · 새 추천 · 처음으로 | 30개 · 순환 · 묶음 |
| `popular` | 숨김 → 이 줄에서 👍 가 1개 이상이면 **[내 취향으로 다시 받기]** = `chain.restart()` | 처음으로 | 아래 |
| `anon` | 숨김 | 처음으로 | 그대로(로그인 안내 + 인기 줄) |
| `pick` | 숨김 | — | 후보는 받은 목록의 **앞 12개**(지금 수 유지). 저장 뒤 처리는 아래 |
| `error` | — | — | 그대로(다시 시도) |

- **대체 목록에 "새 추천 받기"를 두지 않는다** — 늘 같은 인기 목록이다(조사 5).
- **인기 모드에서 빠져나가는 길**: 대체 목록은 다음 쪽이 없고 캐시는 무한이라, 👍 를 눌러도 다시 요청할 수단이 없었다 → 👍 가 생기면 [내 취향으로 다시 받기].
- **`no_seed_platform` 부제**(지금 `/for-you` 링크): 전체 칩이면 **"좋아요한 웹툰으로 추천을 볼 수 있어요 [웹툰 추천 보기]"**(칩 전환 버튼 — 조사 6),
  다른 칩이면 "이 분야에서 좋아요한 작품이 아직 없어요".
- **`pick` 저장 뒤**: `removeQueries(recKeys.root())` + `clearRecChains()` + 지금 탭 `chain.restart()`(다시 그리기 유발) — 요청 한 번(조사 15).
- 제목 옆 "추천 더 보기 →" 링크와 `MoreTile` 은 **없앤다**(갈 곳이 없다).
- **좋아요 부제**는 칩과 무관하게 전체 좋아요를 보여 준다(칩별로 거르지 않는다 — 시드는 칩과 상관없이 쌓이는 것이라 정확하다). `personal` 에서만 보이므로 칩마다 나타났다 사라질 수 있다 — 받아들인다.

## 추천 탭 제거

| 대상 | 처리 |
|---|---|
| 라우트 `for-you` | `ForYouRedirect`: `parseRecTab(tab)` 이 전체가 아닌 칩이면 `/home?rec=<tab>`, 그 밖(없음 · `all` · 모르는 값) → `/home`. `replace` |
| `SiteHeader` "추천" | 삭제 |
| `public-layout.tsx` 하단 탭 표시 목록의 `"/for-you"` | 삭제 |
| `onboardingLandingPath` | `"/home"` · 웹툰만이면 `"/home?rec=webtoon"`. 테스트 기대값 변경 |
| 홈 링크 3곳 | 삭제(위 "모드") |
| `pages/for-you-page.tsx` · `components/rec/RecCardTile.tsx` · `RecFeedbackMenu.tsx` · `RecNoticeBanner.tsx` · `hooks/useScrollRestore.ts` | 삭제 (`apps/mobile` · dev-components 포함 다른 사용처 없음 — 검수 확인) |
| shared `recNotice` · `recFeedbackEnabled` · `hiddenIds` | 삭제. `parseRecTab` 은 유지 |
| 테스트 | `recUi.test.ts` 의 `recNotice` · `recFeedbackEnabled` 삭제, `recList.test.ts:128-140`(`collapsedIds` 를 `hiddenIds` 와 비교) **다시 작성**, `recUi.test.ts:86-93` surface 기대값, `recTypes.test.ts:24-25` · `REC_PAGE_SIZE` 주석(`constants/rec.ts:13`) 갱신 |
| shared `useSetNotInterested` · `useToggleBookmarkById` | **남긴다** — 열린 결정 2 까지 |
| `recCardFields` · `recCardContext` · `recTabChangedFields` · `recLoadedMoreFields` | **`surface` 를 필수 인자로**(기본값 `REC_SURFACE` 삭제) — 새 호출이 조용히 `rec_tab` 으로 기록되지 않게(조사 8) |
| 주석 | 조사 13 목록 전부 |

- `REC_SURFACE = "rec_tab"` 상수는 과거 로그 해석용 주석으로만 남기고 쓰는 곳은 없앤다. 백엔드 기본값(`rec_tab`)은 두어도 된다.

## 백엔드 (선행 배포)

- `RecommendController.MAX_SIZE` 20 → **30**, 테스트 `size=31` → 400 · `size=30` → 200, 제외 수 주석(`RecommendService.java:92-96`)을 30 기준으로.
- **배포 순서**: 백엔드 먼저. 프론트가 먼저 `size=30` 을 보내면 400 → 홈 추천이 `error` 모드. **되돌릴 때는 반대로 프론트 먼저**(백엔드만 되돌리면 전원 `error`).
- 옛 탭의 sessionStorage 체인(`aod_rec_chain_all`)은 키가 같다. 새 번들은 이어 받기로 그 체인의 다음 쪽을 받는다 — 무해하다(만료면 404 → 재시작).

## 추적

- 카드 노출 · 클릭: 지금과 같다(`recCardFields(card, "home_rec")`).
- **순환 점프는 즉시**라 사이 카드가 노출되지 않는다. 새 묶음은 새 `impressionId` 라 새 노출이다(맞다).
- **같은 `impressionId` 의 중복 노출**은 다시 마운트(칩 왕복 · 상세 뒤로가기)로 지금도 생긴다(조사 12). 칩이 생기며 늘어난다.
  → **분석은 `DISTINCT impression_id` 로 고정**한다(REC_TAB_DESIGN §5-4 "카드당 최대 2건"은 보장되지 않는다고 고친다). 계측기 전역 중복 제거는 후속.
- **새 추천 받기**: `rec_loaded_more`(`surface: home_rec`, `pageDepth` = **떠나는 쪽**의 `pageDepth` — 추천 탭과 같은 정의, `for-you-page.tsx:287`).
- **처음부터 다시 받기 · 내 취향으로 다시 받기 · 404 재시작**: 이벤트를 두지 않는다. 새 체인의 `rec_request.page_depth = 0` 으로 구분된다.
- **칩 변경**: `rec_tab_changed`(`from`, `to`, `surface: home_rec`) — 클릭만.
- 확인 SQL(배포 후) — 분모는 **개인 추천을 받은 세션만**:
  ```sql
  SELECT count(DISTINCT e.session_id) FILTER (WHERE e.event_type = 'rec_loaded_more')::float
       / nullif(count(DISTINCT e.session_id) FILTER (WHERE e.event_type = 'impression_viewed'), 0)
    FROM aod_log.event e
    JOIN aod_log.rec_request r ON r.request_id = e.request_id AND r.fallback = false
                              AND r.served_at > now() - interval '2 days'   -- 분할 테이블: 범위를 함께 준다(V8 주석)
   WHERE e.surface = 'home_rec' AND e.server_ts > now() - interval '1 day';
  ```
- **대시보드 가정 변경**: `home_rec` 이면 `tab=all` 이던 가정이 깨진다 — 탭별로 나눠 본다.

## 구성 요소

**shared**

| 변경 | 내용 |
|---|---|
| `constants/rec.ts` | `HOME_REC_SIZE` 12 → `HOME_REC_SET_SIZE = 30`, `HOME_PICK_CANDIDATES = 12` |
| `rec/homeRail.ts` (신규) | `railWindow({scrollLeft, clientWidth, cardWidth, gap, cards, hasEndCard})` → `{first, last, total, pages, page}` · `railNextLeft` / `railPrevLeft`(순환 여부 포함) · `homeRecSetLabel(pageDepth)` |
| `rec/homeRec.ts` | `homeRecCanRefresh(mode, hasNextPage)` · `homeRecCanRestart(mode, likedCount)` · `noSeedPlatformHint(tab)` |
| `rec/recList.ts` | `isFallbackContinuation(pageParam, res)` · `hiddenIds` 삭제 |
| `rec/recEvents.ts` | 네 함수 `surface` 필수 |
| `rec/onboarding.ts` | `onboardingLandingPath` → `/home` 기준 |
| `rec/recUi.ts` | `recNotice` · `recFeedbackEnabled` 삭제 |
| `hooks/useRecommendations.ts` | 이어 받은 쪽이 대체면 던지기(`isFallbackContinuation`) |

**web**

| 변경 | 내용 |
|---|---|
| `hooks/useRecChain.ts` | 옵션 `continueWithoutCache` |
| `hooks/recChainState.ts` | 항목에 `scrollLeft` |
| `components/home/HomeRecRail.tsx` | 바깥(칩 · `?rec=` · 토스트 · 쓰기 대기열) / 몸통(`key=tab:nonce` · 요청 · `remember` · 404 · 마지막 쪽 · 새 추천 · 위치 복원) 분리 · 링크 제거 · `refreshAfterPick` 수정 |
| `components/home/HomeRecPager.tsx` (신규) | 위치 숫자 + 쪽 막대(`ResizeObserver` · rAF) |
| `components/home/HomeRecEndCard.tsx` (신규) | 끝 카드 |
| `App.tsx` | `for-you` → `ForYouRedirect` |
| `components/common/SiteHeader.tsx` · `layouts/public-layout.tsx` | "추천" · `/for-you` 삭제 |
| 삭제 | `for-you-page.tsx` · `RecCardTile.tsx` · `RecFeedbackMenu.tsx` · `RecNoticeBanner.tsx` · `useScrollRestore.ts` |

## 테스트

**shared (vitest)**
- `railWindow`: 카드 30 · 보이는 6 · 끝 카드 있음 — 처음 `1–6` / 중간 / 마지막 화면(숫자는 `25–30`, 끝 카드는 막대만). 짧은 쪽(카드 23). 보이는 수 1 · 전체보다 큼. 오차 4px 경계
- `railNextLeft` · `railPrevLeft`: 끝에서 → 0(순환 표시), 0 에서 ← 끝, 중간은 한 화면
- `isFallbackContinuation`: 첫 쪽 대체 = false, 이어 받은 쪽 대체 = true, 이어 받은 쪽 정상 = false
- `useRecommendations`: 이어 받은 쪽이 대체면 오류 · 이전 쪽 유지(모킹)
- `homeRecCanRefresh` · `homeRecCanRestart` · `noSeedPlatformHint`
- `onboardingLandingPath`: `/home` · `/home?rec=webtoon`
- `recEvents`: 넷 모두 받은 `surface` 를 싣는지
- `recList.test.ts` 다시 쓴 `collapsedIds` 회귀, 삭제 함수 테스트 삭제, 나머지 통과
- `useRecChain` 은 웹 훅이라 테스트가 없다 — `continueWithoutCache` 판정을 shared 순수 함수로 떼어 잰다

**수동 (Vercel 미리보기)**
1. `/for-you` · `/for-you?tab=webtoon` · `/for-you?tab=all` · `/for-you?tab=zzz` → `/home` · `/home?rec=webtoon` · `/home` · `/home`
2. 데스크톱 › 로 끝까지 → 다음 › 에서 **즉시** 처음 · ‹ 는 반대. 위치 숫자 · 막대가 맞음. 줄임 동작 설정 켜면 모든 이동 즉시
3. 👍 두 개 → 곧바로 새 추천 받기 → 쓰기 뒤에 요청(네트워크 순서) → 다른 30개 · "2번째" · 첫 카드에 포커스
4. 새 추천 요청을 대체로 만들기(킬 스위치 `REC_ENABLED=false` 를 미리보기 백엔드에서) → 이전 묶음 유지 · 토스트
5. 칩 오가기 · 상세 갔다 오기 → 각 칩의 묶음 · 가로 위치 유지. 칩 변경 뒤 뒤로가기 한 번에 이전 페이지로(칩 이력 없음)
6. 새로고침 → 저장된 체인의 **다음** 묶음(1번째 반복 아님), 표시 "N번째"가 서버 깊이와 맞음
7. 비로그인 · 대체 목록: 새 추천 버튼 없음. 대체 목록에서 👍 → [내 취향으로 다시 받기] 등장
8. 웹툰만 좋아요한 계정: 전체 칩 부제의 [웹툰 추천 보기] → 웹툰 칩
9. 좋아요 0 → 고르기 끝 → 요청 한 번(네트워크) → 새 모드
10. 모바일: 끝 카드의 [처음으로] · [새 추천 받기]
11. 키보드: "추천 건너뛰기"로 다음 섹션, 화살표 버튼 도달 · 라벨
12. 상단 메뉴에 "추천" 없음, 온보딩 완료 → 홈(웹툰만이면 웹툰 칩)

## 순서

1. 백엔드 PR(`MAX_SIZE` 30) 병합 · 운영 배포 확인 (`size=30` 이 200)
2. 프론트 PR 병합 → Vercel 운영 반영
3. AI 리포 문서 정리: REC_TAB_DESIGN §2-8(U1~U5) · §2-9(U1~U4)를 "홈으로 통합"으로 닫고, `size=20` 예시가 있는 §2-6 · §4-1, "카드당 최대 2건"(§5-4), §7 표를 고친다. CURRENT_ISSUES 5번 갱신

## 열린 결정

1. **묶음 크기 30** — 사용자 결정. 엔진은 영향이 없고(조사 1), 바뀌는 것은 전체 칩의 **M6@30** 배분과 **30장 채우기**다.
   → **권장: 30 으로 가되, 엔진 전원 공개 전에** ① M6@30 을 M6@20 과 같은 방식으로 오프라인 평가하고,
   ② 운영에서 `served < 30` 비율 · refill 비율 · `fallback_reason='empty'` 비율 · 지연 p95 를 본다. 문제가 보이면 `HOME_REC_SET_SIZE` 하나로 20 으로 되돌린다.
2. **추천 표면에서 사라지는 기능** — "관심 없음"(90일 제외)과 되돌리기 UI, 카드 메뉴 북마크(북마크도 시드다).
   → **권장: 이번에는 넣지 않는다.** 👎(싫어요) 하나로 간다 — 두 부정 신호의 차이가 화면에서 읽히지 않는다는 문제(U3)가 있었다. 북마크는 상세에 있다.
   이미 관심 없음으로 둔 작품(90일)은 되돌릴 UI 가 없어진다 — 90일 뒤 자동 해제. 필요하면 카드 ⋯ 메뉴 · 프로필 목록으로 후속(API · 훅은 남긴다).
3. **이전 묶음으로 돌아가기** — 없음(권장). 요청이 많으면 후속.

## 알려진 한계

- 이전 묶음은 다시 볼 수 없다(열린 결정 3).
- 대체 목록은 늘 같은 목록이다 — 엔진 배포 전 로그인 사용자 대부분이 이 상태다(👍 뒤 [내 취향으로 다시 받기]로 벗어난다).
- 칩을 처음 누를 때마다 요청이 하나씩 는다(탭별 체인).
- 같은 `impressionId` 중복 노출은 남는다 — 분석은 `DISTINCT`(추적 절).

## 검수 기록

### v1 → v2 (2026-09-26, 코드 대조 독립 검수)

**사실 오류 (5)**

| # | v1 | 실제 | 반영 |
|---|---|---|---|
| A1 | 열린 결정 1: "k=30 은 평가 기준 사례에 없다(A6)" → A6 에 k=30 넣어 확인 | `size` 가 바뀌어도 **엔진 k 는 50 그대로**(`buffer = 50 - size`, 라우터 `engine_k`). A6 는 Steam 회귀 기준선 이야기. 바뀌는 것은 M6@30 머리와 30장 채우기 | 조사 1 · 열린 결정 1 다시 씀 |
| A2 | 버퍼 영향을 `rec_request.partial` 로 확인 | `partial` 은 실패 · 지연된 **엔진 플랫폼** 목록 | `served<30` · refill · `empty` · p95 로 교체 |
| A3 | "`useRecChain` 이 404 재시작을 이미 한다" | **제공만** 한다. `remember` · 오류 effect 를 호출 쪽이 단다. `remember` 가 없으면 재시작이 안 된다 | 조사 10 · 묶음 절 |
| A4 | `ChainService.java:45-52` | SQL 줄. `SEEN_MAX :36`, `TTL :43`, `find :97-109` | 조사 2 |
| A5 | "§2-8 · §2-9(U1~U5)" | U5 는 §2-8. §2-9 는 U1~U4. U5 권고(10개 · 한 화면)를 **뒤집는다**는 점이 빠짐. 정리 범위에 §2-6 · §4-1 · §5-4 · §7 누락 | 목표 · 순서 |

**설계 문제**

| # | 등급 | 문제 | 반영 |
|---|---|---|---|
| B1 | 심각 | 이어 받은 쪽이 **대체 응답(200)** 이면 `pages.at(-1)` 이 인기 목록이 되어 개인 줄이 바뀌고 체인이 버려짐(30분 갇힘) | `isFallbackContinuation` → queryFn 에서 던짐, 이전 묶음 유지 · 토스트 |
| B2 | 심각 | 몸통 재마운트 키 · `remember` · 오류 effect 미명시 → 앞 칩의 숨김 · 👍 가 새 칩에 남음, 404 재시작 불가 | 바깥 / 몸통(`key=tab:nonce`) 분리, effect 명시 |
| B3 | 보통 | 캐시가 비면 새 체인 → 3번째 묶음을 보던 사용자가 1번째를 다시 봄 | `continueWithoutCache`, 표시는 `pageDepth + 1` |
| B4 | 보통 | 가로 위치 복원 수단 없음("위치를 잃지 않는다"는 틀림) | `recChainState.scrollLeft` |
| B5 | 보통 | 순환을 부드럽게 되감으면 사이 카드 짧은 노출 대량 | 순환 점프 즉시, 줄임 동작 존중 |
| B6 | 보통 | 같은 `impressionId` 중복은 복제 없이도 재마운트로 생김 | 분석 `DISTINCT` 고정, §5-4 서술 수정 |
| B7 | 보통 | 인기 모드에서 빠져나갈 길 없음, 웹툰만 좋아한 사용자는 전체 칩이 늘 인기 | [내 취향으로 다시 받기], [웹툰 추천 보기] |
| B8 | 보통 | `refreshAfterPick` 요청 두 번 | `removeQueries` + `restart` |
| B9 | 보통 | 열린 결정 1 검증 계획이 엉뚱한 곳을 잼(A1 · A2) | M6@30 오프라인 평가 + 운영 지표 |
| 사소 | — | 칩 URL `replace` · 클릭만 추적 · 리다이렉트 검증 / pick 칩 숨김 튐 · 후보 12→30 / 위치 숫자에 끝 카드 섞임 · 짧은 쪽 · 리사이즈 / "다 봤어요"가 저장 실패와 구분 안 됨 / 👍 직후 새 추천 경쟁 / 접근성(Tab 90개 · 화살표 라벨 · 포커스 이탈 · 스켈레톤 조건 · 401 토스트) / 되돌리기 순서 / SQL 분모 · 대시보드 가정 / 모바일 히어로 별도 PR | 각 절에 반영 |

**빠진 것 (8)** — 바꿀 주석 목록 · 다시 써야 할 테스트 · `surface` 기본값 제거 · 좋아요 부제의 칩별 동작 · 토스트/쓰기 대기열 위치 · 사라지는 기능(북마크 · 관심 없음 되돌리기) · 404 재시작 뒤 화면 · `rec_loaded_more` 의 `pageDepth` 정의 → 모두 반영.

## 구현 기록 (2026-09-26)

**브랜치**: 백엔드 `feature/rec-size-30`(`MAX_SIZE` 30 · 테스트) · 프론트 `feature/home-rec-only`. **백엔드를 먼저 배포한다.**

### 설계와 달라진 점

| # | 설계 | 구현 | 이유 |
|---|---|---|---|
| I1 | 이어 받은 쪽이 대체면 던진다(`pageParam != null`) | **이미 받은 쪽이 있을 때만** 던진다(`queryFn` 안에서 캐시 확인) | 홈은 저장된 체인으로 **첫** 요청을 보낸다(`continueWithoutCache`). 그 첫 응답이 대체면 정상(인기 목록)인데, 던지면 보여 줄 것이 없어 오류 화면이 된다. 테스트 2건 추가 |
| I2 | `remember` = 대체가 아니면 저장 | **대체이거나 `hasMore:false` 면** 저장하지 않는다 | 소진 · 체인 저장 실패 체인을 새로고침 뒤 이어 받으면 404 로 헛돌거나 `empty` 대체가 된다(구현 검수 M5) |
| I3 | `HomeRecPager.tsx` 새 파일 | `HomeRecRail` 안(위치 숫자 · 막대) | 줄의 ref · 측정과 붙어 있어 떼면 props 가 늘기만 한다. 동작은 같다 |
| I4 | 화살표는 늘 | **쪽이 2개 이상일 때만**, DOM 에서 줄 **앞**(`z-10`) | 한 화면이면 눌러도 제자리. 키보드로 카드 90개를 지나기 전에 닿게 |
| I5 | 새 추천 받는 중 = 스켈레톤 | 줄은 그대로 두고 **흐리게**(`aria-busy`) · 버튼은 `aria-disabled` | 줄을 내렸다 다시 그리면 실패 때 위치 · 포커스를 잃고 같은 카드의 노출이 또 쌓인다(구현 검수 M3) |
| I6 | 위치 저장 = `scrollLeft` | `scrollLeft` + **그 묶음의 `requestId`** | 받는 중에 떠났다 돌아오면 새 묶음이 옛 묶음 끝 위치에 놓였다(구현 검수 M4) |
| I7 | — | `rec_tab_changed.payload.via = "hint"`(안내 버튼으로 바꿨을 때) | 칩 클릭과 가른다 |
| I8 | 줄 이름 = 섹션 제목 | 줄 `aria-label="추천 목록"` | 섹션 랜드마크와 같은 이름이 둘 생긴다 |

### 구현 후 독립 검수 (심각 0 · 보통 5 · 사소 9 — 모두 반영)

| # | 문제 | 반영 |
|---|---|---|
| M1 | "새 추천 받기"를 쓰기 대기 중 두 번 누르면 첫 요청이 취소되고(`cancelRefetch` 기본 true) 서버가 "본 작품"으로 올린 30개가 사라짐. 칩을 바꾸면 떠난 몸통이 요청 | 동기 잠금(`refreshingRef`) · `fetchNextPage({ cancelRefetch: false })` · 언마운트 확인 |
| M2 | "내 취향으로 다시 받기" · "처음부터 다시 받기"가 👍 쓰기를 기다리지 않아 또 인기 목록 | `restartAfterWrites` |
| M3 | 새 추천 실패 때 위치 · 포커스 상실, 노출 중복 | I5 |
| M4 | 받는 중 이탈 → 새 묶음이 옛 위치 | I6 |
| M5 | 끝난 체인도 기억 → 새로고침 헛돎 | I2 |
| 사소 | 화살표 조건 · 순서 / 랜드마크 이름 / 힌트 추적 / 대기 중 새 쓰기도 기다리기 / `useImpressionTracker` 주석 예시 / 테스트 경계(처음 쪽 4 · 5px, 간격 걸침, 배수 아닌 폭) | 반영 |
| 남김 | 흐린 👎 자리가 다시 열 때 닫히면 저장 위치가 닫힌 칸 수 × 182px 만큼 어긋난다 | 알려진 한계 — 흐린 자리는 홈에 머무는 동안만이라 드물다 |

### 확인한 것

- 백엔드: 추천 테스트 228개 통과(`size=31` → 400 · `size=30` → 200 추가).
- 프론트: shared 테스트 **231개** 통과(신규 `homeRail.test.ts` · 이어 받기 대체 2건 · 이벤트 surface), lint · typecheck(웹 · 모바일) · 빌드 통과. 바꾼 줄에 새 게이트 위반 없음.
- **브라우저(헤드리스 크롬 · API 는 Playwright 로 가로챔) 35/35**: `/for-you` 리다이렉트 2 · 첫 묶음 30장 · `size=30` · `surface=home_rec` · 메뉴에 "추천" 없음 · 위치 표시 · 순환(처음 ‹ → 끝, 끝 › → 처음) · 새 추천(체인 · "2번째" · 👍 쓰기 뒤 요청 · 첫 카드 포커스 · 처음부터) · 같은 틱 연타 → 요청 1번 · 대체 이어 받기 → 묶음 · 위치 · 제목 유지 + 토스트 · 칩(`?rec=` · history 불변 · 탭별 요청 · 돌아오면 보던 묶음) · 이벤트 surface · 새로고침 → 다음 묶음 · 인기 모드(버튼 없음 · 👍 뒤 다시 받기 · 쓰기 뒤 요청 · 개인 추천으로) · 모바일(화살표 숨김 · 끝 카드 처음으로) · 페이지 오류 0.
  검증 중 잡은 것: 화살표를 줄 앞으로 옮기자 줄 밑에 깔려 눌리지 않았다 → `z-10`.
- **못 한 것**: 실제 엔진 응답(엔진 미배포) · 실 로그인 계정 · 스크린리더 실기기.
