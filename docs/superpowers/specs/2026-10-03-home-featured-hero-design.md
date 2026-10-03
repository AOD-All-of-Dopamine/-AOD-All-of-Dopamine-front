# 홈 맨 위 "오늘의 작품" 히어로 — 시네마틱 + 리뷰 한 줄 설계

- 날짜: 2026-10-03 · 상태: **v2 (검수 반영)** — 구현 · PR 기록은 맨 아래 "기록"
- 시안: 로컬 `aod-mockups/hero-today/` — "B + 리뷰 · 고친 전후"의 **AFTER**
- 앞선 설계: `2026-09-26-home-featured-today-design.md`(선정 규칙 — 그대로), `2026-10-01-game-portrait-cover-design.md`(Steam `GetItems` 클라이언트)

## 결정 기록 (사용자와 정한 것)

| 날짜 | 결정 | 버린 것 · 이유 |
|---|---|---|
| 10-03 | 히어로의 역할 = **모두에게 같은 "오늘의 작품"**(바로 아래 추천 줄이 개인화) | 개인화 히어로 — 추천 줄과 겹친다 |
| 10-03 | 처음엔 A(포스터 + 정보 패널)로 정했다가 **B 시네마틱**으로 | A 는 리뷰 없는 날이 밋밋하다. B 는 배경이 화면을 채운다 |
| 10-03 | **줄거리 자리에 리뷰 한 줄**, 없으면 줄거리 2줄 | 배너 위 유리 카드 — 시선이 두 곳으로 갈린다 |
| 10-03 | 한 줄 칸 = **우리 사이트 리뷰 → 외부 리뷰 원문 인용** | AI 리뷰 요약 · 공식 문구(tagline) — 쓰지 않는다 |
| 10-03 | **보조 칸 없음**(옆 신작 2장 삭제) | 신작 포스터 줄 · 다른 분야 오늘의 작품 |
| 10-03 | 디자인 피드백 1~7 반영 | — |
| 10-03 | "구현 → 검토 → PR → PR 검수 → 병합, 기록은 문서에" — 검수에서 나온 결정은 구현자가 정하고 아래 검수 기록에 이유를 남긴다 | — |

## 목표

맨 위 "오늘의 작품"을 **넓은 배경 그림 + 로고/제목 + 고른 근거 + 리뷰 한 줄(없으면 줄거리) + 버튼**의 한 장짜리 배너로 바꾼다.
지금은 큰 카드 왼쪽 60%가 포스터 블러이고, 글은 머리말 · 제목 · 한 줄뿐이며, 옆 두 장은 오늘의 작품과 상관없는 신작이다.

## 조사 결과 — 설계를 정한 사실들 (v2 실측 반영)

**그림**

1. **Steam 배경** — `GetItems`(`include_assets`) 의 `assets.library_hero` 1x = **1920×620**(220~470KB), `_2x` = 3840×1240. 1x 를 쓴다.
2. **Steam 로고** — `GetItems` 에 **로고 필드가 없다**(오는 것: main/small/header/page_background/hero/library_capsule/library_hero/community_icon). 옛 고정 경로 `store_item_assets/steam/apps/{appid}/logo.png`(640×360 PNG)가 표본 6개 모두 열렸고, `logo_koreana.png` 는 2개만 열렸다 → **`logo_koreana.png` → `logo.png` 순으로 HEAD** 확인. `logo.png` 가 영어라는 보장은 없어 언어는 `ko` / `other` 두 값. 배경(해시 경로)과 로고(고정 경로)가 다른 세대 그림일 수 있다(받아들인다).
3. **TMDB 배경** — discover 항목의 `backdrop_path`(`TmdbRankingMapper` 는 지금 `poster_path` 만 쓴다) → `w1280`. **로고** — `/{movie|tv}/{id}/images?include_image_language=ko,en,null` 의 `logos`, 언어는 `iso_639_1`. SVG 가 섞일 수 있어 **`.png` 만** 쓴다.

**리뷰**

4. **Steam 리뷰** `appreviews?language=koreana&filter=all` — `filter=all` 의 `day_range` 는 Steam 이 **365 로 묶는다**(3650 과 결과 같음). 그래서 **구작(히어로 문턱에 유리)은 인용 후보가 적다** — 실측 통과 수 Hades 0 · 다크 소울 III 1 · P3R 2 · P5R 3 · 검은 신화 1. 게임 날에도 인용이 없을 수 있다(줄거리 대체).
5. 시안 규칙으로 고른 1위가 실제로 **욕설(좆 · 씹 · ㅈㄴ) · 공략성 스포일러 · 추천인데 부정 문장**이었다. `[spoiler]` 태그를 지운 뒤 거르면 **내용이 남는다**. → 거름 강화 · 끄기 스위치 · 차단 목록 · 짧은 캐시가 필요하다.
6. 필드: `voted_up` · `votes_up` · `votes_funny` · `weighted_vote_score`(**문자열**) · `author.steamid` · `author.playtime_at_review`(분) · `recommendationid`. 원문 `steamcommunity.com/profiles/{steamid}/recommended/{appid}/` 200. 작성자 이름은 `ISteamUser/GetPlayerSummaries`(키 필요 — 크롤러 `steam.api.key`).
7. **우리 리뷰** `reviews` — rating · title(100) · review_content(TEXT) · created_at, `(content_id, rating)` 인덱스. **공감 기능이 없다.** 지금 거의 0건 → 누구든 별점 4 · 짧은 리뷰로 **전체 사용자의 홈 맨 위**에 오를 수 있다(악용).

**코드**

8. 선정 `FeaturedWorkService.choose` → `featured_pick` insert-if-absent(근거 값 복사 · 하루 고정). 응답 `Cache-Control: public, max-age=다음 05:00`(`WorkController`) — **문제 인용을 회수할 수 없다**.
9. `RankingUpsertHelper` 는 기존 행 갱신 때 ranking · title · content · rating 3종 · fetchedAt 만 복사(`:58-69`). 새 칸은 명시해야 한다.
10. TMDB 매퍼는 이미 100개 작품마다 watch/providers 를 순차 호출한다(속도 제한 없음). Steam 은 공용 리미터 분당 120(`SteamRateLimiter`).
11. 오늘의 작품 문턱은 API(`FeaturedWorkService` 상수)에만 있다.
12. 웹 히어로 `home-page.tsx`(`FeatureCard` main + side 2, `heroSides`), 북마크 문구는 상세에서 "관심 등록"(`work-detail-page.tsx:782-784`), 비로그인은 로그인 확인 대화상자(`:355-357, :1072-1076`). `useBookmarkStatus(id, enabled)` · `useToggleBookmark(id, rec)`. `FeatureCard` 는 `dev-components-page` 에서도 쓴다.
13. `outbound_clicked` 는 "볼 수 있는 곳" 이동 · 결정 전환율의 주 지표다(AI `REC_TAB_DESIGN.md`) — 리뷰 원문 링크에 쓰면 오염된다.
14. 모바일 히어로 `(tabs)/index.tsx` 16:10 카드, 추적 없음.
15. 웹 CSP 없음 · expo-image 도메인 제한 없음 — 그림 도메인(steamstatic · image.tmdb.org) 추가 설정 불필요.

## 범위

**포함** — 크롤러(배경 · 로고 · Steam 리뷰 인용), 마이그레이션 V12, shared 문턱 · 인용 규칙, API(응답 확장 · 우리 리뷰 우선 · 스위치 · 짧은 캐시), 웹 히어로, 모바일 히어로
**제외** — 우리 리뷰 공감(다음), AI 요약 · 공식 문구(결정), **Steam 인용을 상세 페이지에 내기**(상세는 지금처럼 우리 리뷰만), 웹툰 · 웹소설(순환에 없음), 모바일 히어로 추적(추적 기반이 없다 — 따로)

## 데이터

### V12 마이그레이션 (멱등)

```sql
ALTER TABLE IF EXISTS external_ranking
  ADD COLUMN IF NOT EXISTS backdrop_url     varchar(1000),
  ADD COLUMN IF NOT EXISTS logo_url         varchar(1000),
  ADD COLUMN IF NOT EXISTS logo_lang        varchar(8),      -- ko | other
  ADD COLUMN IF NOT EXISTS quote_text       varchar(400),
  ADD COLUMN IF NOT EXISTS quote_author     varchar(100),
  ADD COLUMN IF NOT EXISTS quote_votes      integer,
  ADD COLUMN IF NOT EXISTS quote_hours      integer,
  ADD COLUMN IF NOT EXISTS quote_url        varchar(1000),
  ADD COLUMN IF NOT EXISTS quote_review_id  varchar(32);     -- Steam recommendationid (차단용)
ALTER TABLE IF EXISTS featured_pick
  ADD COLUMN IF NOT EXISTS backdrop_url     varchar(1000),
  ADD COLUMN IF NOT EXISTS logo_url         varchar(1000),
  ADD COLUMN IF NOT EXISTS logo_lang        varchar(8),
  ADD COLUMN IF NOT EXISTS quote_text       varchar(400),
  ADD COLUMN IF NOT EXISTS quote_author     varchar(100),
  ADD COLUMN IF NOT EXISTS quote_votes      integer,
  ADD COLUMN IF NOT EXISTS quote_hours      integer,
  ADD COLUMN IF NOT EXISTS quote_url        varchar(1000),
  ADD COLUMN IF NOT EXISTS quote_review_id  varchar(32);
```
엔티티 `ExternalRanking` 에 같은 필드(`@Column` 길이 명시 — 크롤러가 먼저 떠도 같은 타입) + **`@Transient mediaChecked · quoteChecked`**(아래 "실패는 옛 값 유지").
`featured_pick` 은 **외부 인용만** 저장한다. 우리 리뷰는 표시할 때 다시 읽는다(삭제 · 탈퇴가 바로 반영되게).

### shared (백엔드)

- **`FeaturedGates`** — 오늘의 작품 문턱 상수(30위 · Steam Positive · 0.90 · 1만 · TMDB 7.5 · 500)를 shared 로 옮기고 API · 크롤러가 같이 쓴다(크롤러는 **문턱을 넘는 30위 이내 · 연결된 행만** 인용 · 로고를 받는다 — 호출을 줄인다).
- **`ReviewQuotes`** — 정리 · 거름 · 고르기. 욕설 · 스포일러 낱말은 **classpath 리소스**(`quote-blocklist.txt`)에 둔다(코드와 분리, 늘릴 때 같은 파일). 띄어쓰기 우회 검사는 `[profanity-squash]`(초성 · 강한 낱말)만 — 짧고 흔한 조합은 정상 문장을 막는다(PR 검수).
  - **거름 순서**: ① `[spoiler]` 가 있으면 **탈락**(지우기 전에) ② BBCode · URL 제거, 공백 하나로, `->` → `→` ③ 길이 **20~70자**(모바일 4줄에 들어가게) ④ 욕설 — 낱말 목록(초성 ㅅㅂ · ㅆㅂ · ㅈㄴ · ㅂㅅ · ㄲㅈ 포함)을 **공백 · 문장부호를 지운 글**에서도 찾는다(띄어쓰기 우회) ⑤ 스포일러 의심 낱말(결말 · 엔딩 · 죽는 · 죽인 · 범인 · 반전 · 보스전 · 공략 …) ⑥ 추천인데 부정 신호(하지 마 · 말아주세요 · 비추 · 환불 · 미완성 · 최악 …) ⑦ 반복(같은 글자 7번 이상 · 서로 다른 글자 12개 미만)
  - 외부 리뷰 추가 거름: 추천(`voted_up`)만 · 도움 10 이상 · 웃겨요 ≤ 도움 × 0.5 · **리뷰 당시 플레이 2시간 이상**.
  - 고르기: 도움 많은 순 → `weighted_vote_score`(문자열 → 숫자) 높은 순, 처음 통과한 것.

### 크롤러

- **Steam 랭킹**(`SteamRankingService`, 저장 전):
  1. 배경: `SteamPortraitClient` 에 **새 메서드 `fetchAssets` · record `Assets`**(세로 표지 `fetch` · `Portrait` 는 그대로) → `library_hero`(1x). 묶음 실패면 `mediaChecked=false`.
  2. 로고 · 인용: **문턱 통과 · 30위 이내 · 연결된 행만**. 로고 = `logo_koreana.png` → `logo.png` HEAD. 인용 = `appreviews`(`language=koreana&filter=all&num_per_page=100&purchase_type=all`) → `ReviewQuotes`, 작성자 이름은 고른 리뷰만 `GetPlayerSummaries`(키 없거나 실패면 "Steam 사용자").
  3. 로그 한 줄: 배경 · 로고 · 인용 채움 수 / 대상 수, 고른 인용(appid · recommendationid · 글 앞 30자).
- **TMDB 랭킹**(`TmdbRankingMapper`): `backdrop_path` → `w1280`(discover 에 있으니 100개 모두, 추가 호출 없음). **문턱 통과 · 30위 이내만** `/images` 로 로고(ko → 그 밖, 같은 언어 안에선 `vote_average` 높은 것, `.png` 만) → `w500`, `logo_lang` = `iso_639_1 == "ko" ? "ko" : "other"`.
- **실패는 옛 값 유지**: `RankingUpsertHelper` 는 `backdropChecked` 면 배경을, `logoChecked` 면 로고를, `quoteChecked` 면 인용 6칸을 덮는다(없다고 확인 → null, 호출 실패 → 그대로). 그림은 거의 안 바뀌고 하루 실패로 히어로가 무너지면 안 된다.
- 호출 수(하루): Steam 요약 100 + GetItems 1 + 로고 HEAD ≤60 + 리뷰 ≤30 + 이름 ≤30 — 문턱 통과는 보통 5~10개라 실제로는 더 적다. 공용 리미터 아래서 05:00 전에 끝난다.

### API

- 고를 때(`choose`): 고른 랭킹 행의 배경 · 로고 · **외부 인용**을 `featured_pick` 에 복사(하루 고정).
- 표시할 때(`toDto`):
  1. **스위치** `featured.quote.enabled`(기본 true)가 꺼져 있으면 인용 없음.
  2. **우리 리뷰**(다시 읽기): 그 작품의 `reviews` 중 별점 ≥ 4.0 · `review_content` 정리 후 20~70자 · 거름 통과 · **작성자 가입 14일 이상 · 리뷰 3개 이상** → 별점 높은 순, 같으면 최신. 닉네임은 내지 않는다("AOD 사용자 리뷰 · ★ 4.5"). 공감이 생기면 공감 순으로.
  3. 없으면 저장된 **외부 인용** — 단, `featured.quote.blocked-ids`(쉼표 목록, recommendationid)에 있으면 뺀다.
  4. 둘 다 없으면 `quote: null`.
- 응답 추가(200): `synopsis` · `facts{seasons, runtimeMinutes}`(`toDto` 에서 `TvContent` · `MovieContent` 1회 조회) · `media{backdropUrl, logoUrl, logoLang}` · `quote{source: "OURS"|"STEAM", text, author, votes, hours, rating, url}`.
- **캐시**: 인용이 있으면 `max-age=600`(10분 — 회수 가능), 없으면 지금처럼 다음 05:00 까지.
- **회수 절차**: ① `featured.quote.blocked-ids` 에 추가(재시작) 또는 ② `UPDATE featured_pick SET quote_text = NULL, quote_review_id = NULL … WHERE featured_date = :d` → 10분 안에 사라진다.
- **수동 지정 절차**(앞선 설계의 "행을 고치면 그날 작품이 바뀐다"): `content_id` 를 바꿀 때 **새 칸(backdrop · logo · quote_*)도 NULL** 로 — 옛 작품의 그림 · 인용이 붙지 않게.

## 화면 (웹)

새 컴포넌트 `FeaturedHero` — 시안 AFTER, 피드백 1~7:

1. **근거 · 정보 나눔** — 1줄(굵게): 게임 "매우 긍정적 94% · 스팀 인기 3위", 영화 · 시리즈 "★ 8.6 · 이번 주 인기 5위". 2줄(흐리게): 연도 · 시즌/러닝타임 · 장르 · 평가 수.
2. **로고 아래 한국어 제목** — 로고가 있고 `logoLang !== "ko"` 면 로고 밑에 한국어 제목. 그때 로고 `alt=""`(두 번 읽히지 않게), 한국어 제목이 보이지 않으면 로고 `alt` = 제목.
3. **제목** — `strong`(헤딩 아님, `FeatureCard` 선례) · 최대 2줄 · 16자 넘으면 한 단계 작게 · 끝의 괄호 부제 떼기.
4. **리뷰** — 18px · 600 · 최대 3줄(모바일 4줄) + 출처 줄. Steam: "**{작성자}** · Steam 한국어 리뷰 · {N}시간 플레이 · 👍 {N} · 원문 ↗"(새 창, `rel="noopener noreferrer"`, 새 창 안내). 우리: "AOD 사용자 리뷰 · ★ {별점}". 리뷰가 없으면 줄거리 2줄.
5. **높이** — `clamp(360px, 46vh, 420px)`.
6. **모바일** — 배경 16:9 위에 머리말 · 제목을 겹치고 그림 아래쪽을 어둡게, 버튼 반반.
7. **배너 전체가 상세 링크** — 투명 링크(이름 = "{제목} 자세히 보기")를 깔고 버튼 · 원문 링크는 z-index 로 위에(링크 안에 링크를 넣지 않는다). 올리면 그림이 살짝 커진다(`prefers-reduced-motion` 이면 안 커진다).

**글자 대비** — 웹도 왼쪽 · 아래 스크림을 고정으로 깐다(어떤 그림이어도 글이 읽히게). **그림** — 히어로 그림은 LCP: `loading` 안 씀 · `fetchpriority="high"`. 배경 `object-position: center 25%`(TMDB 16:9 를 넓게 자를 때 얼굴이 잘리지 않게).

**대체 규칙** — 배경 없음 → 세로 표지 · 포스터를 크게 흐려 깐다 / 로고 없음 → 글자 제목 / 오늘의 작품 없음(204 · 오류) → 같은 배너에 최신 출시작("{연도} 출시", 줄거리 없음) / 로딩 → 같은 높이 어두운 뼈대. 응답에 새 칸이 없어도(옛 캐시) 동작한다 — 타입은 모두 선택(`media?` · `quote?` · `synopsis?` · `facts?`).

**버튼** — "자세히 보기", **"♡ 관심 등록"/"♥ 관심 작품"**(상세와 같은 문구 · `useBookmarkStatus(id, isAuthenticated)` · `useToggleBookmark(id, {source: "home_hero"})` · 비로그인은 상세와 같은 로그인 확인 대화상자).
**옆 신작 두 장 삭제** — `heroSides` · 신작 줄에서 빼던 로직 · 서브 스켈레톤 · 머리 주석. `FeatureCard` 는 `dev-components-page` 가 쓰므로 남긴다.
**추적** — 배너 · 자세히 보기 클릭 `card_clicked`(surface `home_hero`, payload에 `quote_source`). **리뷰 원문 링크는 추적하지 않는다**(`outbound_clicked` 는 "볼 수 있는 곳" 주 지표라 오염된다).

## 화면 (모바일 앱)

`(tabs)/index.tsx` 히어로: 배경이 있으면 배경(16:9) · 머리말 · 제목 · 근거 줄 · 리뷰 한 줄과 출처 줄(작성자 · Steam · 원문 — 출처 줄을 누르면 원문, 없으면 줄거리 2줄). 카드 나머지를 누르면 상세(지금과 같다).

## 구성 요소

**백엔드**: V12 · `ExternalRanking` 9필드 + transient 2 · shared `FeaturedGates` · `ReviewQuotes` + `quote-blocklist.txt` · `SteamPortraitClient.fetchAssets` · Steam 리뷰 · 로고 · 작성자 조회 · `SteamRankingService` · `TmdbRankingMapper`(+ 로고 조회) · `RankingUpsertHelper` · `FeaturedPickStore`/`FeaturedPick` · `FeaturedWorkService`(복사 · 우리 리뷰 · 스위치 · 차단 · DTO) · `FeaturedWorkDTO` · `WorkController`(캐시) · REST Docs
**shared(프론트)**: `FeaturedWork` 타입(선택 칸) · `featuredReasonParts` · `featuredFactsLine` · `heroTitle` + 테스트
**web**: `FeaturedHero.tsx`(+ 뼈대) · `home-page.tsx`
**mobile**: `(tabs)/index.tsx` 히어로

**테스트** — `ReviewQuotes`(실측 표본: 욕설 · 초성 · 띄어쓰기 우회 · `[spoiler]` · BBCode · 밈 · 추천인데 부정 · 플레이 2시간 미만 · 길이), 자산 파싱 · 로고 HEAD 대체, `RankingUpsertHelper` 확인/실패별 복사, `FeaturedWorkService`(복사 · 우리 리뷰 우선 · 작성자 조건 · 스위치 · 차단 · 캐시), 기존 `SteamRankingReviewSummaryTest` 생성자, REST Docs 새 필드, 프론트 shared 함수 · 브라우저 확인(대체 4종).

## 확인

1. 다음 날 05:05 이후 `curl -i /api/works/featured-today` — `media` · `quote`(게임 날, 있으면 `max-age=600`) · `synopsis` · `facts`.
2. **매일 아침 인용 미리 보기**(도입 첫 2주): 
   ```sql
   SELECT platform, ranking, quote_review_id, quote_author, quote_text
     FROM external_ranking WHERE quote_text IS NOT NULL ORDER BY platform, ranking;
   ```
   문제 있으면 회수 절차 ①.
3. 채움 비율: `SELECT platform, count(*) FILTER (WHERE backdrop_url IS NOT NULL), count(*) FILTER (WHERE logo_url IS NOT NULL), count(*) FILTER (WHERE quote_text IS NOT NULL) FROM external_ranking WHERE ranking <= 30 GROUP BY 1;`
4. 화면(웹 1440 · 1024 · 390): 게임 날(인용) · 영화/시리즈 날(줄거리) · 로고 있음/없음 · 배경 없음 · 204 · 긴 제목 · 비로그인 관심 등록.

## 순서

1. 백엔드 병합 · 배포 → 다음 날 04:00 크롤부터 새 칸이 찬다(그 전 오늘의 작품은 대체 모습).
2. 웹 · 모바일 — 새 칸이 없어도 대체 규칙으로 동작한다.

## 열린 결정

- **사람 확인** — 앞선 설계(09-26)는 인용을 "사람 확인 뒤"로 미뤘다. 매일 승인을 거치면 사실상 인용이 안 보이므로 **이번엔 하지 않는다**: 강화된 거름 · 스위치 · 차단 목록 · 10분 캐시 · 첫 2주 아침 미리 보기로 대신한다. 사고가 나면 스위치를 끄고 승인제로 바꾼다.
- **Steam 리뷰 인용 약관** — 짧은 원문을 작성자 이름 · 원문 링크와 함께 싣는다(저작권법 제37조 출처 명시). 법률 검토는 하지 않았다 — 문제가 되면 스위치로 끈다.
- 우리 리뷰 공감 기능 — 생기면 공감 순 · 작성자 조건 완화.
- 영화 · 시리즈 외부 인용 — 없음(결정).

## 알려진 한계

- 영화 · 시리즈 날은 우리 리뷰가 쌓일 때까지 줄거리가 보인다. 게임 날도 구작이면 인용 후보가 적어(365일) 줄거리일 수 있다.
- 거름은 낱말 목록 기반이라 새 욕설 · 은어를 놓칠 수 있다 — 아침 미리 보기로 늘린다.
- Steam 배경(해시 경로)과 로고(고정 경로)가 다른 세대 그림일 수 있다.

## 기록

### 검수 v1 → v2 (2026-10-03, 코드 대조 독립 검수 + Steam 공개 API 실측)

**사실 오류 (4)** — Steam `GetItems` 에 `library_logo` 없음(→ 고정 경로 `logo_koreana.png`/`logo.png` HEAD) · `library_hero` 1x 는 1920×620 · `day_range` 는 365 로 묶임(구작 인용 적음) · 예시 "87%"는 문턱 0.90 미만이라 불가. → 조사 절 고침.

**설계 문제 (16)**

| # | 등급 | 문제 | 반영 |
|---|---|---|---|
| 1 | 높음 | 실측 1위 인용에 욕설 · 스포일러 · 추천인데 부정, `[spoiler]` 를 지우고 거르면 내용이 남음, 사람 확인 누락, 짧은 플레이 | `[spoiler]` 선탈락 · 초성 · 띄어쓰기 우회 · 부정 신호 · 플레이 2시간 · 스위치 · 차단 목록 · 아침 미리 보기(사람 확인 대신 — 열린 결정) |
| 2 | 높음 | 다음 05:00 까지 public 캐시라 회수 불가 | 인용 있으면 max-age 600 · 회수 절차 |
| 3 | 높음 | 우리 리뷰 악용 · 본문 복사로 삭제 안 됨 · 무엇을 인용하는지 불명 | 가입 14일 · 리뷰 3개 조건 · 표시할 때 다시 읽기(복사 안 함) · `review_content` · 닉네임 비노출 |
| 4 | 높음 | 전문 게재 · 작성자 표시 없음 · 약관 확인 누락 · 모바일 출처 없음 | 70자 상한 · 작성자 이름 + 원문 링크(웹 · 모바일) · 약관은 열린 결정 |
| 5 | 중간 | 실패해도 null 로 덮어 히어로가 무너짐 | `mediaChecked` · `quoteChecked` — 실패는 옛 값 유지 |
| 6 | 중간 | 수동 지정 때 옛 그림 · 인용이 붙음 | 수동 지정 절차에 NULL 비우기 |
| 7 | 중간 | `outbound_clicked` 주 지표 오염 | 원문 링크는 추적하지 않음 |
| 8 | 중간 | 옛 캐시 응답에 새 칸 없음 | 프론트 타입 모두 선택 |
| 9 | 중간 | 30위 전부 호출은 과함 · 리미터 | 문턱 통과 · 연결 행만(shared `FeaturedGates`), 배경은 discover/GetItems 로 추가 호출 없음 |
| 10 | 중간 | 링크 중첩 · 로고 alt 중복 · 헤딩 · 새 창 안내 · 웹 스크림 · LCP · 자르기 | 화면 절에 모두 명시 |
| 11 | 중간 | 북마크 문구 · 비로그인 관례 · 401 · 이벤트 연결 | "관심 등록" · 로그인 확인 대화상자 · `useBookmarkStatus(id, isAuthenticated)` · `source: home_hero` |
| 12 | 사소 | 90자는 모바일 4줄 넘음 | 70자 |
| 13 | 사소 | 욕설 목록 위치 · 스포일러 정의 | classpath 리소스 · 낱말 목록 명시 |
| 14 | 사소 | `Portrait` 를 바꾸면 세로 표지가 흔들림 | 별도 `fetchAssets` · `Assets` |
| 15 | 사소 | TMDB 로고 SVG · 언어 출처 | `.png` 만 · `iso_639_1` |
| 16 | 사소 | facts · synopsis 조회 위치 | `toDto` 에서 1회 조회 명시 |

**빠진 것 (9)** — 테스트 목록 · 관측(채움 로그 · 고른 인용 로그) · 스위치 · 차단 · `quote_review_id` · 출처 표시 · 안 쓰는 코드 정리(`FeatureCard` 는 남김 · 주석 · `heroSideIds`) · 모바일 추적(범위 밖으로 명시) · CSP(불필요 명시) · "상세 리뷰" 문구 정리 · 첫 2주 아침 미리 보기 → 모두 반영.

### 구현 (2026-10-03)

**백엔드** (`feature/featured-hero` — `a9cc066`, `2f53689`)
- V12 · `ExternalRanking` 9칸 + transient `backdropChecked` · `logoChecked` · `quoteChecked`(설계의 `mediaChecked` 를 배경 · 로고로 나눴다 — 배경은 성공했는데 로고만 실패한 날 배경을 버리지 않게).
- shared `FeaturedGates` · `ReviewQuotes` · `quote-blocklist.txt`. API 의 문턱 상수는 shared 를 가리킨다(값 그대로).
- crawler `SteamPortraitClient.fetchAssets` · `SteamHeroClient`(로고 HEAD · 리뷰 · 작성자) · `SteamHeroEnricher` · TMDB `backdrop_path` · `fetchLogo` · `RankingUpsertHelper.copyHeroFields`.
- api `FeaturedPickStore`(Hero · 우리 리뷰 · 시즌/러닝타임) · `FeaturedWorkService`(복사 · 우리 리뷰 → Steam · 스위치 · 차단) · DTO · 캐시 600초 · REST Docs.
- **설계와 달라진 점**
  1. "작성자 가입 14일" → **"작성자의 첫 리뷰가 14일 이상 전"** — `users` 에 가입일 열이 없다(대체 지표).
  2. 크롤러의 로고 · 인용 대상에서 "연결된 행만" 조건을 뺐다 — 연결(content 매핑)은 저장(`RankingUpsertHelper`) 때 일어나 저장 전에는 알 수 없다. 문턱 통과 · 30위 이내면 받는다(하루 몇 호출 차이).
  3. 우리 리뷰 후보 쿼리를 이 작품 작성자만 세도록(LATERAL) 고쳤다(자체 검토 1).
- 테스트: api 351 · crawler 79 통과(새: ReviewQuotes 8 · 서비스 4 · 히어로 보강 3 · 복사 2 · TMDB 로고 3 · fetchAssets 1 · REST Docs 갱신). V12 는 로컬 Postgres 에 두 번 적용(멱등), 우리 리뷰 쿼리 · 대상 SQL 손으로 확인.
- **실측(실제 Steam)**: 8개 인기작 중 6개에서 인용 — 「발더스 게이트 3」 "내 인생 마지막 소원이 있다면 이 게임을 4인 멀티로 끝까지 해보는 것이오." · 「스타듀 밸리」 "1년에 한 번 갑자기 문득 스듀가 하고 싶을 때가…" 등. Hades · 다크 소울 III 은 없음(365일 · 거름). 엘든 링 인용에 보스 이름이 들어 있어 스포일러 낱말 목록을 지켜볼 대상으로 남긴다. 로고: 한국어판 2 · 그 밖 6.

**프론트** (`feature/featured-hero`)
- shared: `FeaturedWork` 선택 칸(media · quote · synopsis · facts) · `featuredReasonParts` · `featuredFactsLine` · `compactCount` · `heroTitle` + 테스트(266 통과).
- web: `components/home/FeaturedHero.tsx`(배너 · 뼈대 · 대체 · 관심 등록 · 추적), `home-page.tsx`(히어로 교체 · 옆 두 장 · `heroSides` · 머리 주석 정리), `thumbnail.ts` 주석. `FeatureCard` 는 개발용 화면이 써서 남겼다.
- mobile: `(tabs)/index.tsx` 히어로 — 배경(16:9) · 겹친 머리말 · 제목 · 근거 · 리뷰(출처 줄 누르면 원문) 또는 줄거리.
- 확인: 웹 · 모바일 타입 · eslint, 모바일 jest 7, **브라우저 19/19**(게임 인용 · 시리즈 로고+한국어 제목 · 배경 없음 · 긴 제목 · 옛 캐시 응답 · 204 · 비로그인 관심 등록 · 배너 빈 곳 클릭 → 상세 · 원문 새 창 · 모바일 넘침).

### 구현 자체 검토 (2026-10-03)

| # | 본 것 | 판단 · 조치 |
|---|---|---|
| 1 | 우리 리뷰 쿼리가 요청마다 `reviews` 전체를 GROUP BY | 고침 — LATERAL 로 이 작품 작성자만 |
| 2 | `featured-today` 는 서버 캐시가 없어 요청마다 우리 리뷰 · 시즌 쿼리 1~2개 | 받아들임 — 브라우저 캐시(10분~다음 05:00) · 작은 쿼리. 트래픽이 늘면 서버 캐시 |
| 3 | 오늘(배포 전) 이미 고른 날은 새 칸이 비어 있다 | 의도 — 대체(포스터 흐린 배경 · 글자 제목 · 줄거리)로 보인다(브라우저 "옛 캐시 응답" 확인) |
| 4 | 배경이 해시 경로(Steam)라 바뀌면 옛 주소가 깨질 수 있다 | 다음 크롤에서 갱신(확인한 칸은 덮는다). 깨진 날은 검은 배경 + 글 — 받아들임 |
| 5 | 모바일 원문 링크(`Linking.openURL`)는 카드 누르기 안에 겹친 Pressable | RN 은 안쪽이 먼저 받는다 — 문제없음 |

### PR 검수 (2026-10-03, 독립 검수 2건)

**백엔드 PR #131** — 막을 문제 없음, 사소 5건 모두 고침(`fix: PR #131 검수 반영`):

| # | 문제 | 조치 |
|---|---|---|
| 1 | 낱말 거름 오탐 — 띄어쓰기를 지운 글에서 "다시바로"(시바) · "thishit"(shit), 원문에서 "꺼져도" · "스포츠"(스포) · "죽인다"(칭찬) · "고민하지 마세요"(하지마)가 걸림 | 목록을 `[profanity-squash]`(초성 · 강한 낱말, 우회 검사) / `[profanity]`(원문 · 영어는 낱말 경계)로 나눔, 스포 → 스포일러 · 스포 주의, 죽인 · 하지마 · 꺼져 뺌. 정상 문장 7개 테스트 추가 |
| 2 | HEAD 는 리다이렉트를 안 따라가 3xx 도 "로고 있음" | 2xx 일 때만 로고 |
| 3 | `reviews.user_id` 인덱스 없음(LATERAL 이 작성자마다 훑음) | V12 에 `(user_id, created_at)` 인덱스 |
| 4 | 인용 없을 때 캐시(다음 05:00) 테스트가 사라짐 | REST Docs 테스트 추가(61200) |
| 5 | `updateRanking` Javadoc 이 `attachLogos` 위에 붙음 | 자리 정리 |
| — | 문서 "인용 7칸" → 6칸 | 고침 |

확인된 것(검수자 실측): V12 두 번 적용 · INSERT 17열/17값 · LATERAL 결과 · shared jar 에 목록 포함 · CDN 404 · 보강 예외 격리 · 키가 로그에 남지 않음 · package-private `@Value` 주입 · RowMapper 캐스트.

**프론트 PR #60** — 막을 문제 없음, 중간 2 · 사소 3 고침(`fix(home): PR 검수 반영`):

| # | 등급 | 문제 | 조치 |
|---|---|---|---|
| 1 | 중간 | 전역 `:focus-visible`(레이어 밖)이 Tailwind 유틸리티를 이겨 배너 링크 테두리가 바깥 2px → `overflow-hidden` 에 잘려 안 보임 | important(`!`)로 3px 안쪽 테두리 — 브라우저로 확인 |
| 2 | 중간 | 그림이 하나도 없으면 모바일에서 본문이 −92px 당겨져 머리말 · 제목이 잘림 | 그림 없을 때 16:9 자리를 잡는 빈 칸 — 확인 |
| 3 | 사소 | 앱 카드가 원문 링크를 한 요소로 합쳐 스크린리더로 따로 못 엶 | 카드 접근성 이름(제목 · 리뷰) + `openReview` 접근성 동작 |
| 4 | 사소 | 앱 로딩 뼈대(16:10)가 새 히어로보다 훨씬 짧다 | 비율 0.95 |
| 5 | 사소 | 남은 주석 · 로고 + 3줄 리뷰면 높이 454px(min-h 라 깨지지 않음) | 주석 고침, 높이는 받아들임(뼈대와 차이 작음) |

확인된 것(검수자 실측): 훅 순서 · id 0 보호 · 클릭 층(elementFromPoint) · `isolate` 겹침 · 임의 클래스 생성 · `fetchpriority` · 정규식 · 추적 payload.

### 병합

- 백엔드 #131 → 배포(main 푸시 자동) → 프론트 #60(검사 통과 뒤).
- **백엔드 #131** 병합 `cfde770`. 첫 CI 는 **실패** — 코드가 아니라 Docker 이미지 빌드 중 러너가 `archive.ubuntu.com` 이름을 못 찾았다(`Could not resolve`, 일시적 네트워크). 실패한 작업만 다시 돌려 build · deploy-api · deploy-crawler 모두 성공.
  운영 확인: `GET /api/works/featured-today` 200 — `synopsis` · `facts{seasons: 9}` · `media`(모두 null) · `quote: null`. 오늘(10-03) 작품은 배포 전에 골라 그림 · 인용 칸이 비어 있다(의도 — 다음 날 04:00 크롤부터 찬다).
- **프론트 #60** 병합 `88305de`(build-and-test · Vercel 통과 뒤). 운영 웹 번들에 새 코드 확인, 운영 홈(1440 · 390): 새 배너 · 대체 모습(포스터 흐린 배경 · 글자 제목 · 줄거리) · 높이 414 · 가로 넘침 없음 · 페이지 오류 없음.
- 남은 확인: 다음 날 05:05 이후 배경 · 로고 · (게임 날) 인용이 차는지, 첫 2주 아침 인용 미리 보기(설계 "확인" 2).
