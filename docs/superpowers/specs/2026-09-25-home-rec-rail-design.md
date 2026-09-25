# 홈 추천 릴 — 설계

작성일: 2026-09-25 · 대상: `apps/web`, `packages/shared` (+ 백엔드 1줄 · 선행 PR #49 병합됨) · 목업: 홈 추천 릴 세부안(아티팩트) · 추천 전체 설계: AI 리포 `recommendation/REC_TAB_DESIGN.md`
상태: **v2** — 코드 대조 독립 검수 21건 반영 (맨 아래 "검수 기록")

## 목표

홈에서 "방금 올라온 리뷰" 섹션을 빼고, 그 자리에 **개인화 추천 한 줄**을 넣는다. 추천 탭(`/for-you`)은
"추천 더 보기"로 들어가는 깊은 화면으로 남는다. 서비스 목표(여러 플랫폼을 한곳에서 고르고 오래 머무르기)에
맞춰, 가장 많이 보이는 화면에서 추천을 보여주고 반응(👍/👎)을 받는다.

시안 A·B·C 중 **A(히어로 아래 가로 한 줄)**를 골랐다. 추천이 빗나가도 첫 화면(히어로)은 편집 영역이 지키고,
기존 신작 릴과 같은 카드 규격이라 구현이 작다. B(추천을 히어로로)는 엔진 배포와 품질 확인 뒤 다시 검토한다.

## 고른 조합(목업 권장안)과 달라진 점

| 항목 | 목업 권장안 | 이 설계 | 이유 |
|---|---|---|---|
| 섹션 제목 | "지호님을 위한 추천" | **"내 취향 추천"** | 닉네임 필드가 없다. 사용자에는 `username`(로그인 아이디)만 있다 (`authApi.ts:21-25`) |
| 👍/👎 노출 | 호버 때만 (터치는 항상) | **항상 보임** | REC_TAB_DESIGN §2-4 가 "모든 입력에서 상시 노출"로 이미 확정했다. 호버 분기는 키보드·터치 노트북 예외만 늘린다 |
| 대체 목록의 👍/👎 | 없음 | **로그인 상태면 있음** (비로그인만 없음) | 엔진 배포 전에는 로그인 사용자 전원이 대체 목록을 본다. 여기서 반응을 안 받으면 홈이 신호를 하나도 못 모은다. 추천 탭도 같은 규칙이다 (`recFeedbackEnabled`, `recUi.ts:64-65`) |
| 취향 고르기 후보 | "인기작" | **같은 응답의 대체 목록** | 온보딩 페이지는 인기작이 아니라 분야별 최신순을 쓴다 (`onboarding-page.tsx:45-48`). `no_seed` 응답이 이미 랭킹 기반 인기 목록(성인 제외)이라 요청이 늘지 않는다 |
| 모바일 카드 | 132px | **168px 그대로** | 132px 카드는 없다. 기존 릴(`RailCard.tsx:35`)과 같게 둔다 |

## 조사 결과 — 설계를 바꾼 사실들

1. **토큰이 만료되면 추천 API 는 401 을 준다** (`RecommendController.java:68-71`). 그런데 프론트는
   `onSessionExpired` 를 연결하지 않았다 — `createApiClients` 는 받을 수 있지만(`client.ts:11,93`) `main.tsx` 가 넘기지 않았다.
   → **PR #49 에서 연결했다** (2026-09-25 병합, `90c63d2`).
   그래서 토큰이 남은 채 "로그인 상태"로 보이고 요청만 계속 실패한다. REC_TAB_DESIGN §0-2 의 "401 이면 토큰을 지운다"는 서술과도 다르다.
2. **추천 탭의 숨김·♡ 상태는 모듈 메모리에 있다** (`hooks/recChainState.ts`, 최근 12 체인). 상세에 갔다 돌아오면
   목록은 다시 마운트되지만 react-query 캐시는 남으므로, 같은 수명의 저장소가 없으면 숨긴 카드가 되살아난다.
3. **카드에서 숨긴 것을 빼는 곳은 리듀서가 아니라 `mergeRecPages`** 다 (`recList.ts:47`). 리듀서(`recHiddenReducer`)만 고치면 안 된다.
4. **체인 저장 키는 탭 이름만 쓴다** (`aod_rec_chain_{tab}`). 홈이 `tab=all` 로 `useRecChain` 을 쓰면 추천 탭 "전체"와
   저장 키뿐 아니라 **react-query 캐시 항목까지** 공유한다 (`recKeys.list("all", nonce)`).
5. **`RailCard` 는 통째로 하나의 `<Link>`** 다 (`RailCard.tsx:35`). 링크 안에 버튼을 넣을 수 없다. `RecCardTile` 은 이 때문에 링크와 버튼 줄을 형제로 둔다.
6. **추적 `surface` 는 `"rec_tab"` 상수로 고정**돼 있다 (`constants/rec.ts:17`, `recEvents.ts:11,17,27,33`, 추천 탭 되돌리기 `for-you-page.tsx:200-204`).
   백엔드는 이벤트 `surface`·반응 `source` 를 자유 문자열로 받는다(검증 없음) — 프론트만 고치면 된다.
7. **그런데 요청 로그(`rec_request.surface`)는 백엔드에서 `"rec_tab"` 으로 고정**이다 (`RecommendService.java:74`).
   그대로 켜면 홈의 요청·대체 비율·노출 수가 추천 탭 지표에 섞인다.
8. **`fallbackReason` 에 `empty` 가 있다** (`RecommendService.java:299` — 라우터 결과가 전부 카드가 되지 못했을 때).
   `disabled` 판정은 시드 판정보다 먼저다 — 킬 스위치가 켜지면 `pick` 은 나오지 않는다.
9. **`recNotice()` 는 이 섹션의 기반이 될 수 없다** — `no_seed_platform` 을 탐색 안내로 보내는 등 추천 탭 전용 분기다 (`recUi.ts:49-61`).
10. **온보딩 저장 흐름은 페이지 안에 얽혀 있다** (`onboarding-page.tsx:172-216` — 인증 실패 시 `/login` 이동, 저장 중 가드, 캐시 정리).
    다시 쓰려면 훅으로 떼어내야 한다. 공용 함수 이름은 `runOnboardingSave` · `onboardingSaveMessage` 다 (`onboardingSave.ts:32,87`).
11. **히어로 메인 작품은 "방금 올라온 리뷰" 쿼리에서 나온다** (`home-page.tsx:193,209-210,212`). 섹션 화면만 지우고 쿼리는 남긴다.
12. **Vite 환경변수는 빌드 때 박힌다.** 플래그를 운영에서 켜려면 Vercel 환경변수를 바꾸고 **다시 빌드·배포**해야 한다. 기능 플래그 선례는 없다.
13. **`useMyLikes` 는 인증 헤더가 필수이고, 실패는 400 으로 온다** (`InteractionController.java:134-150`). 응답 타입이 `any` 다 (`interactionApi.ts:175-180`).
14. **`tab=all` 은 웹툰을 넣지 않는다** (평가된 M6 규칙). 웹툰만 좋아요한 사용자는 `no_seed_platform` 을 받는다.

## 범위

**선행 — 완료 (PR #49):** `main.tsx` 에서 `onSessionExpired` 연결 — 요청 중 401 이면 토큰을 지우고 로그아웃 상태로 바꾸고 "로그인이 만료됐어요"를 한 번 알린다(토큰이 있었던 경우만).
앱 전체 동작이 바뀌므로 이 작업과 섞지 않는다. REC_TAB_DESIGN §0-2 서술과 코드를 일치시키는 일이기도 하다.

**포함:** 홈 추천 섹션(모드 5종), 인라인 취향 고르기, 👍/👎 와 자리 유지 가려짐, 히어로 머리말 변경,
모바일 홈·추천 전환 제거, 추적 `surface` 분리, 기능 플래그, **백엔드 `surface` 파라미터(1줄)**.

**제외:** 추천 탭(`/for-you`) 화면 변경 — U1~U4 는 별건(이 작업의 공용 조각을 재사용한다). 추천 탭 자체의 "홈·추천 전환"
세그먼트(`for-you-page.tsx:409-423`)도 그때 정리한다. "새로 나온 작품"·"이번 주 인기"·"출시 예정" 섹션은 그대로.

## 화면 구성

```
[히어로: 오늘의 작품 · 메인 1 + 서브 2]

내 취향 추천                                        추천 더 보기 →   ← 제목·링크는 모든 모드에서 그린다
[▯▯▯] 좋아요한 작품 외 12개                                           ← personal 모드만
┌────────┐┌────────┐┌────────┐          ┌──────────┐
│ 포스터  ││        ││ (흐림)  │   …      │ 추천      │
│    👍 👎││        ││되돌리기 │          │ 더 보기 → │
└────────┘└────────┘└────────┘          └──────────┘
 제목        제목       제목
 ○○을 좋아해서                       ← personal 모드만 (백엔드 reason.text)
 분야 · 연도

[새로 나온 작품]  [이번 주 인기]  [출시 예정]   ← 그대로
```

- **자리**: 히어로 바로 아래, "새로 나온 작품" 위. 섹션 간격은 기존 `mt-14`.
- **릴 컨테이너**: 기존 홈 릴과 같은 클래스(`role="region"`, `tabIndex=0`, `snap-x` — `home-page.tsx:238-243`).
- **카드 `HomeRecCard`**: `relative` 감싸개 안에 **형제 두 개** — ① `<Link>`(포스터·제목·이유·메타, `recWorkPath(card)`)
  ② 포스터 오른쪽 아래에 절대 배치한 👍/👎 버튼 묶음. 폭 168px(기존 `RailCard` 와 같음). 노출 추적 ref 는 감싸개에 단다.
- **👍/👎**: **항상 보인다**(§2-4). 버튼 36px 이상, 둘 사이 간격 8px 이상(오조작 방지). 👍 는 `aria-pressed`, 라벨은 §2-4 대로
  `"{제목} 좋아요"`/`"{제목} 좋아요 취소"`, 👎 는 `"{제목} 관심 없어요"`. 아이콘 `ThumbsUp`·`ThumbsDown`(phosphor —
  `ThumbsDown` 은 아직 쓰인 곳이 없으니 빌드로 확인).
- **👎 누르면**: 카드가 **그 자리에서 흐려지고** "덜 보여드릴게요 · 되돌리기"가 남는다(`HiddenCardSlot`). 이 자리는 노출 추적을 붙이지 않는다.
- **끝 처리**: 12장 뒤에 "추천 더 보기" 타일 + 제목 옆 링크. 둘 다 `/for-you`.
- **분야 칩 없음.** 홈은 `tab=all` 한 줄.

## 모드

`homeRecMode({ status, view, isAuthenticated })` — `status` 는 요청 상태(성공·401·그 밖의 실패).

| 조건 | 모드 | 부제 | 이유 줄 | 👍/👎 | 본문 |
|---|---|---|---|---|---|
| 성공 · `fallback:false` | `personal` | 미니 포스터 + 외 N개 | ○ | ○ | 추천 12장 + 타일 |
| 비로그인(`anonymous`) **또는 401** | `anon` | — | — | — | 로그인 안내 + "지금 많이 찾는 작품" 줄(같은 응답의 대체 목록 · 401 이면 대체 목록이 없으니 안내만) |
| `no_seed` | `pick` | — | — | — | 인라인 취향 고르기 |
| `no_seed_platform` | `popular` | "웹툰 추천은 추천 탭에서 볼 수 있어요 →" (`/for-you?tab=webtoon`) | — | ○ | "지금 많이 찾는 작품" 줄 |
| `service_error`·`timeout`·`circuit_open`·`disabled`·`empty`·**모르는 값** | `popular` | — | — | ○ | "지금 많이 찾는 작품" 줄 |
| 그 밖의 요청 실패 | `error` | — | — | — | "추천을 불러오지 못했어요 · 다시 시도" |
| 로딩 | — | — | — | — | 기존 릴 스켈레톤 6장 |

- **제목 줄은 모든 모드에서 그린다** — `personal` 은 "내 취향 추천", `popular`·`anon` 은 "지금 많이 찾는 작품", `pick` 은 "취향을 알려주세요".
  제목 옆 "추천 더 보기 →"는 모든 모드에 둔다. 모바일에서 추천 탭으로 가는 길이 이 섹션뿐이기 때문이다(하단 탭에 추천이 없다).
- **대체 목록에는 "추천"·"취향"·이유 문구를 쓰지 않는다.** 인기 목록을 개인화처럼 보이게 하면 신뢰를 잃는다.
  👍/👎 는 둔다 — 로그인 사용자의 👍 는 곧 시드가 되어 대체 상태를 벗어나게 한다.
- **엔진 배포 전인 지금은 로그인 사용자 대부분이 `popular` 를 본다.** 정상 동작이다. 엔진이 올라가면 코드 변경 없이 `personal` 이 된다.
- `recNotice()` 는 쓰지 않는다(조사 9). 모드 함수를 새로 두고 모든 사유를 표로 테스트한다.

### 인라인 취향 고르기 (`pick`)

```
취향을 알려주세요                                        추천 더 보기 →
좋아하는 작품을 3개 고르면 취향 추천을 시작할게요          [0 / 3 골랐어요]
[포스터✓][포스터][포스터][포스터] …                      → 3개면 [고르기 끝]
```

- **후보**: 이 `no_seed` 응답의 대체 목록 그대로(랭킹 기반 · 성인 제외 · 웹툰 없음 — 추천 설계 §2-7). 추가 요청 없음.
  웹툰이 없으니 고른 작품이 모두 `tab=all` 시드가 된다(조사 14의 함정을 피한다). 검색은 두지 않고 "더 많은 작품에서 고르기 →"로 온보딩 페이지에 잇는다.
- **타일**: `OnboardingWorkTile` 을 168px 폭 감싸개에 넣어 쓴다(원래 그리드용이라 폭이 없다).
- **저장**: 온보딩 페이지의 완료 흐름을 **`useTasteSave()` 훅으로 떼어내** 두 곳이 같이 쓴다 (`runOnboardingSave` · 저장 중 가드 · 캐시 정리).
  온보딩 페이지 동작은 바뀌지 않아야 한다(수동 확인 항목).
- **저장 `source`**: `"home_pick"`. 시드 규칙(`SeedResolver`)은 `source` 를 보지 않으므로 효과는 같고, 로그에서 온보딩 페이지와 구분된다.
- **상태**
  - 저장 중: 타일 비활성, 버튼 "담는 중…"
  - 전부 성공: `clearRecChains()` · 홈 추천 쿼리 무효화 → 다시 받는 동안 스켈레톤(`isFetching`) → 새 모드로
  - 일부 실패: **무효화하지 않는다.** 성공한 작품은 "담김"으로, 실패한 작품은 고른 채로 남기고 "1개를 담지 못했어요 · 다시 시도"
    (`onboardingSaveMessage` 문구). 전부 담기면 그때 무효화한다 — 무효화하면 시드가 생겨 모드가 바뀌면서 실패 작품과 재시도 수단이 사라진다.
  - 인증 실패: 로그인 페이지로 보내지 않고 `anon` 모드로 바꾼다(#49 로 전역 로그아웃이 같이 일어나고, 다음 요청부터는 비로그인 응답이 와서 자연히 `anon` 이 된다).
- 토스트: 홈에는 토스트 자리가 없다 → `useToast` + `<Toast>` 를 `HomeRecRail` 안에 둔다.

## 상태 보관

- **요청**: `useRecommendations("all", HOME_NONCE, { size: 12 })`, 첫 페이지만. `HOME_NONCE = "home:" + 세션 UUID` 모듈 상수.
  `useRecChain` 은 쓰지 않는다(조사 4). 캐시(`staleTime ∞` · `gcTime` 30분)가 홈 재방문 때 같은 목록을 준다.
- **숨김·👍 상태**: 추천 탭과 **같은 모듈 저장소**(`recChainState`)에 `home:all:{HOME_NONCE}` 키로 둔다.
  상세에 갔다 돌아와도 유지되고, `clearRecChains()`(계정 전환·취향 저장)가 같이 지운다.
- **가려진 자리의 정리**: 다시 마운트될 때 `slotVisible:true` 항목을 `false` 로 바꾼다 → 흐린 자리가 사라지고 그 작품은 목록에서 빠진다.
  즉 "그 자리 되돌리기"는 **홈에 머무는 동안만** 된다.
- **공용 조각 확장은 선택형**이다 — `recHiddenReducer`·`mergeRecPages` 에 `slotVisible` 을 더하되, 추천 탭은 지금처럼 바로 빼는 쪽을 그대로 쓴다.
  (추천 탭의 자리 유지는 U2 에서 켠다.) 회귀 테스트로 추천 탭 동작 불변을 확인한다.
- **알려진 한계**: 추천 탭에서 👎 한 작품이 이미 받아 둔 홈 목록에는 남는다(캐시 30분). 다음 요청부터는 서버가 뺀다.
  세션 단위 "싫어요 목록"을 두 화면이 같이 거르는 방법은 U2 에서 검토한다.

## 데이터

- **부제**: `useMyLikes(0, 3, enabled)` — `enabled = isAuthenticated && mode === "personal"`(비로그인 호출은 400).
  응답을 `PageResponse<WorkSummary>` 로 타입 지정. 포스터 3장 + "외 N개"(`N = totalElements - 3`, **N ≤ 0 이면 "외"를 생략**).
  좋아요가 0이면 부제를 그리지 않는다(북마크·리뷰만으로 시드가 있는 경우). 누르면 `/profile/likes`.
- **반응**: `useSetReaction` · `useSetNotInterested` 그대로. 맥락은 `recCardContext(card, HOME_REC_SURFACE)`.
  👎 = `state: DISLIKE`, 되돌리기 = 응답의 `previousState` 로(좋아요였던 작품은 좋아요로). 👍 는 카드를 가리지 않는다.
- **요청 수**: 홈에 이어 추천 탭을 열면 `all` 요청이 한 번 더 나가고(다른 nonce) 상위 작품이 반복된다. 세션당 `rec_request`·`rec_chain` 행이 늘어난다. 받아들인다.

## 백엔드 (1줄, 플래그 켜기 전)

`GET /api/recommendations` 가 `surface` 쿼리 파라미터를 받아 `rec_request.surface` 에 쓴다.
허용 값 `{rec_tab, home_rec}`, 그 밖은 `rec_tab`(`RecommendService.SURFACE` 고정값을 기본값으로 돌린다).
이게 없으면 홈 요청이 추천 탭 요청으로 기록돼 추천 탭의 대체 비율·노출 수가 부풀려진다(조사 7).

## 추적

- 카드 노출·클릭: `recCardFields(card, HOME_REC_SURFACE)` → `useImpressionTracker(fields)`. 훅은 `surface` 를 필드로 받으므로 바꿀 필요가 없다.
  카드가 사라질 때 최종 `impression_viewed` 가 한 번 더 나간다(훅 동작).
- 가려진 자리(`HiddenCardSlot`)는 별도 컴포넌트라 노출 훅이 붙지 않는다.
- `popular`·`anon` 모드 카드도 같은 추적을 쓴다 — 대체 목록 노출도 분모다(추천 설계 §2-7).
- 서버 이벤트(`reaction_changed`·`not_interested_changed`)는 `surface` 칸에 `source` 가 들어가므로 `home_rec` 으로 같이 잡힌다.
- 확인 SQL (배포 후):
  ```sql
  -- 홈에서 난 이벤트 종류별
  SELECT event_type, count(*) FROM aod_log.event
   WHERE surface = 'home_rec' AND server_ts > now() - interval '1 day' GROUP BY 1;
  -- 홈 노출 → 상세 체류로 이어진 비율 (상세 이벤트는 surface='detail' 이라 impression_id 로 잇는다)
  SELECT count(DISTINCT d.impression_id)::float / nullif(count(DISTINCT i.impression_id), 0)
    FROM aod_log.event i
    LEFT JOIN aod_log.event d ON d.impression_id = i.impression_id AND d.event_type = 'detail_viewed'
   WHERE i.surface = 'home_rec' AND i.event_type = 'impression_viewed'
     AND i.server_ts > now() - interval '1 day';
  ```

## 플래그 · 배포

- `VITE_HOME_REC=1` 일 때만 새 섹션을 그린다. `vite-env.d.ts` 에 선언한다.
- **꺼졌을 때 지금 홈과 같아야 한다**: 리뷰 섹션·모바일 세그먼트·"오늘의 추천" 모두 그대로, 추천·좋아요 요청은 **하나도 나가지 않는다** —
  `useRecommendations`·`useMyLikes` 는 조건부로 그려지는 `HomeRecRail` 안에서만 부른다(`home-page` 최상단에서 부르지 않는다).
- **Vercel 프로젝트 환경변수로 켠다.** 저장소의 `apps/web/.env.production` 은 배포본과 이미 다르다(파일 `VITE_API_BASE_URL=/api`, 배포본은 절대 주소) — 이 파일에 넣지 않는다.
  빌드 때 박히므로 켜고 끌 때마다 **재배포**가 필요하다.
- 순서: ~~선행 PR(401) 병합~~(#49 완료) → 백엔드 `surface` 배포 → 이 PR 병합(꺼진 채) → Vercel 미리보기에서 켜서 확인 → 운영에서 켜고 재배포.

## 히어로 문구

플래그가 켜졌을 때만: 머리말 `오늘의 추천 · {분야}` → `오늘의 작품 · {분야}` (`home-page.tsx:391`),
오류 문구 "추천 작품을 불러오지 못했어요." → "작품을 불러오지 못했어요." (`:375`), 파일 머리 주석(`:24-50`)의 섹션 설명도 고친다.

## 구성 요소

**shared (`packages/shared`)** — 판단 로직은 여기에 둔다. 웹 앱에는 테스트 러너가 없다.

| 변경 | 내용 |
|---|---|
| `constants/rec.ts` | `HOME_REC_SURFACE = "home_rec"`, `HOME_PICK_SOURCE = "home_pick"` |
| `rec/recEvents.ts` | `recCardFields` · `recCardContext` 등에 `surface` 인자(기본값 `REC_SURFACE`) |
| `rec/homeRec.ts` (신규) | `homeRecMode(...)` · 부제 문구(`외 N개`) 계산 |
| `rec/recList.ts` | `slotVisible` 선택형 확장 — `recHiddenReducer`·`mergeRecPages` |
| `api/interactionApi.ts` | `getMyLikes` 응답 타입 `PageResponse<WorkSummary>` |

**web (`apps/web`)**

| 변경 | 내용 |
|---|---|
| `hooks/useTasteSave.ts` (신규) | 온보딩 완료 흐름을 떼어낸 훅. `onboarding-page.tsx` 도 이걸 쓰도록 바꾼다 |
| `hooks/recChainState.ts` | `home:` 키 사용 (구조 변경 없음) |
| `components/rec/RecThumbs.tsx` (신규) | 👍/👎 버튼 묶음 |
| `components/rec/HiddenCardSlot.tsx` (신규) | 흐린 자리 + 되돌리기, 노출 추적 없음 |
| `components/home/HomeRecCard.tsx` (신규) | 링크 + 버튼 묶음을 형제로 둔 168px 카드 |
| `components/home/HomeRecRail.tsx` (신규) | 모드 분기, 제목·부제·링크, 릴, 더 보기 타일, 토스트 |
| `components/home/HomeTastePicker.tsx` (신규) | 인라인 취향 고르기 |
| `pages/home-page.tsx` | 플래그 분기 — 히어로 아래 `<HomeRecRail/>`, 리뷰 섹션 제거(쿼리 유지), 모바일 세그먼트 제거, 히어로 문구 |
| `vite-env.d.ts` | `VITE_HOME_REC` 선언 |

## 테스트

**shared (vitest)**
- `homeRecMode`: 표의 모든 행 — `anonymous`, 401, `no_seed`, `no_seed_platform`, `service_error`, `timeout`, `circuit_open`, `disabled`, **`empty`**, 모르는 값, 그 밖의 실패, `fallback:false`
- 부제: `totalElements` 0 · 3 · 4 · 15 에서 "외 N개" 표시 여부
- `slotVisible` 확장: 가림 → 되돌리기 → 재마운트 시 정리, 좋아요였던 작품의 되돌리기가 좋아요 복원, **추천 탭 경로(선택 안 함)는 지금과 같은 결과**(회귀)
- `recEvents`: `surface` 없이 부르면 지금 값(회귀)

**수동 (Vercel 미리보기)**
1. 비로그인 → 로그인 안내 + 인기 줄, 👍/👎 없음
2. 토큰 만료 상태 → 로그인 안내(섹션이 사라지지 않음)
3. 좋아요 0 → 3개 고르기 → "고르기 끝" → 스켈레톤 → 새 모드. 저장 중 타일 비활성
4. 저장 하나를 실패시켜(네트워크 차단) 부분 실패 문구와 재시도 확인
5. 로그인·좋아요 있음(엔진 미배포) → "지금 많이 찾는 작품", 이유 없음, 👍/👎 있음
6. 👎 → 제자리 흐려짐 → 되돌리기 / 👎 → 상세 갔다 돌아옴 → 그 작품이 빠져 있음
7. 키보드만으로 👍/👎 도달, 터치 기기에서 카드 누르기와 버튼 누르기가 겹치지 않음
8. 온보딩 페이지(`/onboarding`) 동작이 그대로인지 — 저장·이동·실패 문구
9. 플래그 끔 → 지금 홈과 같고, 네트워크 탭에 추천·좋아요 요청이 없음

## 열린 결정

1. **섹션 제목** — 기본 "내 취향 추천". 닉네임 필드가 생기면 "{닉네임}님을 위한 추천".
2. **데스크톱 상단 메뉴의 "추천"** — 기본 **유지**. 비용 없이 입구가 하나 더 있다.

## 후속

- 추천 탭 U1~U4(REC_TAB_DESIGN §2-9) — `RecThumbs`·`HiddenCardSlot`·`slotVisible` 을 재사용한다. 추천 탭의 하트 아이콘도 그때 엄지로 바꾼다
  (그 전까지 같은 "좋아요"가 홈은 엄지, 추천 탭은 하트로 보인다).
- 엔진 배포 후 홈의 클릭 → 상세 체류 → 외부 이동 전환이 대체 목록보다 나은지 확인 → 시안 B 재검토.

## 검수 기록 (v1 → v2, 2026-09-25)

코드를 모르는 검수자가 프론트(`main`)·백엔드(`origin/main`)와 대조했다. 주장 14개 중 10개 확인, 4개 틀림. 설계 빈틈 21건.

| # | 등급 | 지적 | 반영 |
|---|---|---|---|
| 1 | 필수 | 토큰 만료 401 에서 섹션이 조용히 사라진다 · `onSessionExpired` 미연결 | 401 → `anon` 모드 · 전역 연결은 PR #49 로 완료 |
| 2 | 필수 | 👎 한 카드가 홈 재방문 때 되살아난다 | `recChainState` 에 `home:` 키 · 재마운트 시 정리 |
| 3 | 필수 | 호버 전용 👍/👎 가 §2-4 확정과 충돌 | 항상 보임 |
| 4 | 필수 | `RailCard` 링크 안에 버튼을 넣을 수 없다 | `HomeRecCard` — 링크·버튼 형제 |
| 5 | 필수 | "온보딩 인기작 조회"가 없다 | 같은 응답의 대체 목록 사용 |
| 6 | 필수 | 엔진 전에는 홈이 반응을 하나도 못 받는다 | 로그인 대체 목록에도 👍/👎 |
| 7 | 권장 | `no_seed_platform`·웹툰 전용 사용자 안내 없음 | 웹툰 추천 링크 · 후보에서 웹툰 제외(응답이 이미 제외) |
| 8 | 권장 | 고르기 저장 중·재조회·부분 실패·인증 실패 미정 | 상태 4가지 명시 · `useTasteSave` 추출 |
| 9 | 권장 | 요청 로그가 홈을 `rec_tab` 으로 적는다 | 백엔드 `surface` 파라미터를 플래그 전에 |
| 10 | 권장 | 인라인 고르기가 `onboarding` 으로 기록된다 | `home_pick` |
| 11 | 권장 | 공용 확장이 추천 탭을 바꿀 수 있다 · 플래그 끔 동일성 · 빌드 타임 변수 | 선택형 확장 + 회귀 테스트 · 훅 위치 · 재배포 명시 |
| 12 | 권장 | 모바일에서 추천 탭 입구가 사라질 수 있다 | 제목·링크를 모든 모드에 · 오류 시 재시도 |
| 13 | 권장 | 화면 간 숨김·♡ 가 이어지지 않는다 | ♡ 는 같은 저장소 · 교차 반영은 알려진 한계로 U2 에 |
| 14 | 권장 | "외 N개" 음수 · 비로그인 400 · 타입 없음 | N ≤ 0 생략 · `enabled` 조건 · 타입 지정 |
| 15 | 사소 | `empty`·모르는 사유 누락 | `popular` 로 · 테스트 추가 |
| 16 | 사소 | 모바일 132px 카드 없음 | 168px 로 · 기존 릴 컨테이너 클래스 재사용 |
| 17 | 사소 | 히어로 오류 문구·주석도 "추천" | 같이 변경 |
| 18 | 사소 | 👍 라벨이 §2-4 와 다름 · 아이콘이 화면마다 다름 | §2-4 라벨 · 차이는 U4 까지 알려진 상태로 명시 |
| 19 | 사소 | 가려진 자리 노출 추적 | 별도 컴포넌트 · 훅 변경 불필요 명시 |
| 20 | 사소 | 홈+추천 탭 요청 중복 | 받아들임 · 명시 |
| 21 | 사소 | 확인 SQL 로 상세 전환을 못 본다 | `impression_id` 조인 SQL 추가 |
