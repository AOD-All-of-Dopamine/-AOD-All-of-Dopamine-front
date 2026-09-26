# 홈 "오늘의 작품" 선정 기준 — 설계

작성일: 2026-09-26 · 대상: **백엔드**(크롤러 · 마이그레이션 · 새 API) + `apps/web` · `apps/mobile` · `packages/shared` · 시안: 로컬 목업 `hero-review`(D 메인 카드 아래 인용) ·
관련: 홈 추천 한 줄(`2026-09-26-home-rec-only-design.md`) · 탐색 가벼운 카드(`2026-09-26-explore-light-card-design.md` — 적은 표본 점수 규칙) · 디자인 기준 `docs/specs/2026-08-13-light-redesign-design.md`
상태: **v2** — v1 코드 대조 독립 검수 반영(사실 8 · 심각 1 · 보통 4 · 사소 11 · 빠진 것 6, 맨 아래 "검수 기록")

## 목표

홈 맨 위 "오늘의 작품"(히어로 메인 카드)을 **지금 인기 있고 평가가 좋은 작품**으로, **하루에 한 작품씩** 바꿔 보여 준다. 웹 · 모바일 앱 모두.

지금은 **가장 최근에 리뷰가 달린 작품**이 오늘의 작품이 된다. 운영 확인(2026-09-26): 리뷰가 달린 작품은 12개, 대부분 리뷰 1개 · 본문 1~11자다.
지금 히어로 "How to Fish · 평점 5.0"도 리뷰 1개(본문 2자)로 정해졌고, 5.0 은 그 한 명의 점수다. 누가 리뷰를 달 때마다 홈 맨 위가 바뀐다.

이 설계는 시안의 **1단계**다 — 고르는 기준과 평가 요약만 바꾼다. 리뷰 인용(2단계 — 스팀 공감 리뷰 · 걸러내기 · 사람 확인 · 약관)은 별건이다.

## 조사 결과 — 설계를 정한 사실들

**데이터 (운영 측정 2026-09-26)** — 외부 랭킹 상위 100 중 우리 DB 에 연결된 작품과, "고평가" 문턱(게임: 긍정 판정 · 90% · 평가 1만 / 영화 · 시리즈: 7.5 · 투표 500)을 넘는 작품 수:

| 플랫폼 | 랭킹 | DB 연결 | 고평가 통과 | 예 |
|---|---|---|---|---|
| Steam | 100 | 100 | 31 | 페르소나3 리로드 · 다크 소울 III · 페르소나 5 더 로열 |
| TMDB 영화 | 100 | 86 | 63 | 어벤져스: 엔드게임 · 인터스텔라 · 쇼생크 탈출 |
| TMDB 시리즈 | 100 | 92 | 72 | 심슨 가족 · 그레이 아나토미 |
| 네이버웹툰 | 100 | 92 | 0 | — 평점 신호가 없다 |
| 네이버시리즈 | 100 | 84 | 0 | — 평점 신호가 없다 |

⚠ 이 측정은 **수집 시점에 굳은 값**(아래 3)으로 잰 것이다 — 구작이 많이 통과한 이유이기도 하다.

**백엔드**

1. **`external_ranking` 은 플랫폼마다 최신 한 벌**이다 — 한 트랜잭션 안에서 갱신(`RankingUpsertHelper.java:56-62`)하고 목록에서 빠진 행을 지운다(`:103-113`, 호출 `:78`).
   받아온 결과가 비면 전날 한 벌이 그대로 남는다. **중간 상태가 보이는 창은 없다.** 이력은 없다.
   **`content_id` 는 매일 다시 연결**된다(`existing.setContent(...)` `:61`, 연결 `mapToInternalContent :81-95`) — 연결 조회가 예외면 그날은 null 로 덮여 후보에서 빠질 수 있다.
2. **랭킹 수집 시작 시각** 04:00 웹툰 · 04:02 시리즈 · **04:04 Steam(Selenium) · 04:06 TMDB**(`RankingScheduler.java:28, 36, 44, 52`). 크롤러 스케줄러는 **단일 스레드**라 다른 배치에 밀려 늦게 끝날 수 있다.
3. **평가 신호가 수집 시점에 굳어 있다.**
   - TMDB `rating` · `vote_count` 는 콘텐츠 수집 때 저장되고, 매일 수집은 **최근 7일 출시작만** 다시 가져온다 → 개봉 주에 수집된 흥행 신작은 투표 500 을 영영 넘지 못한다.
   - Steam `review_summary` 는 목 03:00 에 appId 를 큐에 넣지만 **이미 있는 job 은 건너뛰고 완료 job 을 지우는 자동 경로가 없어**(`CrawlJobProducer.createJobs`) 사실상 재수집되지 않는다.
     출시 때 "매우 긍정적"이던 게임이 뒤에 "복합적"이 돼도 히어로에 옛 값이 나온다.
   - 반면 **랭킹 수집은 매일 신선한 값을 이미 읽는다**: TMDB discover 응답의 `vote_average` · `vote_count`(`TmdbRankingMapper:46, :101` — 지금은 100표 필터에만 쓰고 버린다),
     Steam 은 랭킹 100개의 appId 를 안다(`SteamFetcher` 의 `appreviews` 요약 호출을 100번 재사용할 수 있다).
4. **Steam 긍정 %** 는 `language=all&purchase_type=all` 요약의 `total_positive / total_reviews` 를 반올림한 값이다(`SteamFetcher:35`) — 상점 기본 표시와 몇 %p 다를 수 있다.
5. **목록 보강** `WorkApiService.toEnrichedSummaries(List<Content>)`(`:238-240`, 입력 순서 유지). 비슷한 흐름의 선례 `FallbackProvider.java:79-89`(null · 성인 제외 → 중복 제거 → 보강).
6. **캐시** `ConcurrentMapCacheManager`(만료 없음 · 이름 고정 · null 도 저장). 배포는 `docker compose down/up` 이라 메모리 캐시는 재시작마다 사라진다.
7. **시간대**: 컨테이너가 KST(`docker-compose.yml:14, 17`)지만 선례 클래스는 `Clock.systemUTC()` 를 쓴다 — **존을 코드에 명시**한다.
8. **라우트**: `/api/works/featured-today` 는 `/api/works/{id}` 보다 먼저 잡힌다. `SecurityConfig` 가 `/api/works/**` 를 허용한다.
   **배포 전에는** 이 경로가 `{id}`(Long) 변환 실패로 **400** 이다.
9. **테스트 현실**: REST Docs 는 `@SpringBootTest` + Postgres, CI 는 `build -x test`. 선정 로직은 Mockito 단위 테스트(`FallbackProviderTest` 방식)로 가볍게 잰다.

**프론트**

10. **웹 히어로**(`home-page.tsx:199-209`): `heroMain = reviewed.data?.content?.[0] ?? newestReleases[0]`, 로딩 = `reviewed.isLoading || (!reviewedMain && !releasesSettled)`(`:203` — 메인이 오면 신작을 기다리지 않는다), 오류 `:204`.
    리뷰 쿼리의 웹 사용처는 히어로뿐(`:184, :200, :203-204, :349`, 머리 주석 `:42`). 부제 `heroSub :92-98` = "연도 · 평점 {우리 리뷰 평균}".
11. **"이번 주 인기"** 섹션도 랭킹에서 나오므로 오늘의 작품이 **같은 화면 아래에 또** 나올 수 있다(`rankSlides :254-286`).
12. **모바일 앱**(`apps/mobile/src/app/(tabs)/index.tsx:162-168`)도 같은 규칙, 머리말은 "오늘의 추천"(`:224`). "방금 올라온 리뷰" 섹션이 리뷰 쿼리를 계속 쓴다 — **API 는 없애지 않는다**.
13. **react-query 기본값**: 전역 `staleTime` 5분 · 재시도 3회(1 · 2 · 4초) + axios 5xx 재시도 2회. 4xx 재시도 끄는 선례 `useCollections.ts:74`.
14. **표본 기준 함수**(shared `workSignal.ts` · `steam.ts`), **중점 한 줄 1개**(디자인 기준 :55).

## 범위

**포함**
- **크롤러**: 랭킹 수집 때 신선한 평가를 `external_ranking` 에 저장(TMDB `vote_average` · `vote_count`, Steam 요약 3값) + 수집 시각
- **마이그레이션**: `external_ranking` 새 열 · `featured_pick` 표
- **API** `GET /api/works/featured-today`
- **웹 · 모바일** 히어로 메인 교체 + 부제, "이번 주 인기"에서 오늘의 작품 빼기(웹)
- 로그 · 확인 절차

**제외** — 리뷰 인용(2단계) · 서브 카드(지금대로 최신 출시) · 관리자 화면(수동 지정은 표 한 행 수정으로)

## 신선한 평가 (크롤러 · 마이그레이션)

`external_ranking` 에 열 추가(모두 null 허용):

| 열 | TMDB | Steam |
|---|---|---|
| `rating_score` numeric | `vote_average` | `total_positive / total_reviews`(0~1, 원자료 비율) |
| `rating_count` int | `vote_count` | `total_reviews` |
| `rating_label` text | — | `review_score_desc`(영문 판정) |
| `fetched_at` timestamptz | 이 한 벌을 받은 시각 | 같음 |

- TMDB: 이미 받는 discover 응답에서 옮겨 담기만 한다(추가 호출 없음).
- Steam: 랭킹 100개 appId 의 `appreviews` 요약을 받는다(하루 100회, 기존 `SteamFetcher` 재사용). 실패한 작품은 null — 후보에서 빠진다.
- **문턱 · 부제는 이 신선한 값으로** 판단한다. 콘텐츠 쪽 옛 값(`platform_data`)은 쓰지 않는다.

## 선정 규칙

1. **오늘** = `featuredDate = LocalDateTime.now(clock, Asia/Seoul).minusHours(5).toLocalDate()` — **05:00 KST 에 넘어간다**(랭킹이 04:04~ 에 갱신된 뒤). 존을 코드에 명시한다(조사 7).
   00:00~05:00 에는 전날 작품이 나온다.
2. **이미 정해졌으면 그대로** — `featured_pick` 에 그날 행이 있으면 그 작품. **없을 때만 고르고 저장**(insert-if-absent, 날짜 PK).
   → 재시작 · 배포 · 인스턴스가 여럿이어도 하루 한 작품이 바뀌지 않는다. 표가 캐시 · 기록 · 수동 지정을 겸한다(행을 고치면 그날 작품이 바뀐다).
3. **오늘의 분야** = `featuredDate.toEpochDay() % 3` → 게임 · 영화 · 시리즈 순. (예: 2026-09-26 은 영화.) 웹툰 · 웹소설은 평점 신호가 없어 넣지 않는다(서브 카드에는 계속 나온다).
4. **후보** = 그 분야 플랫폼(`Steam` · `TMDB_MOVIE` · `TMDB_TV`)의 행 중
   - **랭킹 30위 이내**(통과 작품 중 상위 30 이 아니라 **순위 자체** — "스팀 인기 97위"가 나오지 않게)
   - `content_id` 있음 · 성인 아님 · **썸네일 있음**(히어로에 그림이 필요하다) · 중복 제거
   - **고평가 문턱**(신선한 값, **원자료 비율로 판정** — 반올림 전)
     - 게임: `rating_label` 이 긍정 판정(`…Positive`) · `rating_score ≥ 0.90` · `rating_count ≥ 10,000`
     - 영화 · 시리즈: `rating_score ≥ 7.5` · `rating_count ≥ 500`
   - **최근 45일에 뽑힌 작품 제외**(`featured_pick` 으로 판단 — 반복 방지)
5. **고르기** = 남은 후보 중 **랭킹 최상위**. (v1 의 `후보[(epochDay/3) % n]` 은 후보 목록이 매일 바뀌어 사실상 임의 · 반복이 생겼다.)
6. **비었을 때** = 다음 분야(게임 → 영화 → 시리즈)로. 셋 다 비면 **204**(저장하지 않는다 — 다음 요청이 다시 시도한다). 이틀 연속 같은 분야가 될 수 있다 — 받아들인다.
7. **로그** = 고른 날 INFO 한 줄(날짜 · 분야 · 작품 · 순위 · 근거 값 · 후보 수 · 넘어간 분야). 204 · 분야 넘김 · 오늘 랭킹 `fetched_at` 이 04:00 이전(크롤 지연)이면 WARN.

## API

```
GET /api/works/featured-today           (인증 불필요 · 누구에게나 같은 작품)
200 {
  "date": "2026-09-26",
  "work": { WorkSummaryDTO },
  "reason": {
    "platform": "Steam" | "TMDB_MOVIE" | "TMDB_TV",
    "ranking": 8,
    "basis": "steam" | "tmdb",
    "ratingScore": 0.94,                // 게임: 긍정 비율(0~1) · 영화/시리즈: 평점
    "ratingCount": 61889,
    "ratingLabel": "Very Positive"      // 게임만
  }
}
204  후보 없음
Cache-Control: public, max-age={다음 05:00 KST 까지 초}   (200 일 때)
```

- 구현: 컨트롤러(또는 별도 빈)가 `Clock` 으로 `featuredDate` 를 계산해 `FeaturedWorkService.pick(LocalDate)` 를 부른다 — `@Cacheable` 은 쓰지 않는다(표가 대신한다).
- `reason` 의 평가 값은 **뽑을 때의 신선한 값**을 표에 저장해 둔 것이다 — 그날 안에서 부제가 바뀌지 않는다.

## 화면 (웹 · 모바일)

- **히어로 메인** = `featured.work`(있으면), 없으면 `newestReleases[0]`(지금 대체). 리뷰 쿼리는 **웹에서** 뺀다(모바일은 리뷰 섹션 때문에 남는다).
- **머리말** "오늘의 작품 · {분야}" — 모바일의 "오늘의 추천"도 이것으로 맞춘다.
- **부제**(중점 1개), shared `featuredSubline(reason)`:
  - 게임: `매우 긍정적 94% · 스팀 인기 8위` — 판정은 `steamReviewDescKo(ratingLabel)`, % 는 `round(ratingScore × 100)`
  - 영화 · 시리즈: `★ 8.4 · 이번 주 인기 3위`
  - 대체(최신 출시): `{연도} 출시` — **우리 리뷰 평균은 쓰지 않는다**
  - (문턱을 넘은 작품만 오므로 적은 표본 분기는 도달하지 않는다 — 데이터가 빠진 경우만. 테스트는 둔다.)
- **서브 2장** = 지금대로. **"이번 주 인기"(웹 `rankSlides`)에서 오늘의 작품을 뺀다**(같은 화면 중복 — 약 20% 날).
- **로딩** = 지금과 같은 방식: `featured.isLoading || (!featured.data && !releasesSettled)` — 오늘의 작품이 오면 신작을 기다리지 않는다. **오류** = 오늘의 작품 · 신작 모두 실패일 때만.
- **요청 규칙**: 4xx 재시도 없음, 그 밖 1회(조사 13 — 배포 전 400 · 실패 때 스켈레톤이 오래 남지 않게). 204 는 `null`(axios 는 `data === ""` — `status === 204 || !data` 로 판정; react-query 에 undefined 를 돌려주지 않는다).
  `staleTime` = 응답 `date` 기준 **다음 05:00 KST 까지**(최대 30분 · 탭을 열어 둔 채 날이 바뀌면 다음 조회에서 바뀐다).
- **추적**: 히어로 메인 클릭을 `card_clicked`(`surface: "home_hero"`, payload `date` · `platform` · `ranking`)로 — 백엔드는 surface 를 자유 문자열로 받는다. 전후 비교용.

## 구성 요소

**백엔드**

| 변경 | 내용 |
|---|---|
| 마이그레이션(신규 V?) | `external_ranking` 4열 · `featured_pick(featured_date date PK, content_id, platform, ranking, basis, rating_score, rating_count, rating_label, created_at)` |
| 크롤러 `TmdbRankingMapper` · `RankingUpsertHelper` | discover 의 평점 · 투표 수 · 수집 시각 저장(갱신 때도 덮어쓰기) |
| 크롤러 Steam 랭킹 | 100개 `appreviews` 요약 → 3값 저장 |
| `api/service/FeaturedWorkService.java`(신규) | 선정 규칙 1~7, `pick(LocalDate)` |
| `api/dto/FeaturedWorkDTO.java`(신규) | `date` · `work` · `reason` |
| `WorkController` | `GET /api/works/featured-today`, 204, `Cache-Control` |
| 테스트 | 선정 단위(Mockito, 고정 `Clock`): 04:59/05:00 경계 · 분야 순환 · 30위 경계 · 문턱(원자료 비율 0.899/0.900 · 9,999/10,000 · 7.49/7.5 · 499/500) · 45일 반복 제외 · 썸네일 없음 · 연결 안 된 행 · 분야 넘김 · 204 · 이미 저장된 날 그대로. REST Docs(`@MockBean`, 204 는 응답 필드 없음) · `index.adoc` |

**shared**: `FeaturedWork` 타입 · `getFeaturedToday()`(204 → `null`) · `useFeaturedToday()`(요청 규칙) · `workKeys.featuredToday()` · `constants/featured.ts`(`featuredSubline` · `releaseSubline` · `msUntilNextFeaturedSwitch(date)`) + 테스트

**web** `home-page.tsx`: 히어로 · 부제 · 리뷰 쿼리 제거 · 로딩 · 오류 · 재시도 · `rankSlides` 에서 제외 · 클릭 추적 · 머리 주석
**mobile** `(tabs)/index.tsx`: 히어로 메인 · 부제 · 머리말 "오늘의 작품"

## 확인 (운영)

1. 백엔드 배포 다음 날 05:05 이후 `curl /api/works/featured-today` — 200 · 근거 값 · `Cache-Control`
2. 후보 재현 SQL:
   ```sql
   SELECT er.platform, er.ranking, c.content_id, c.master_title, er.rating_score, er.rating_count, er.rating_label, er.fetched_at
     FROM external_ranking er JOIN contents c ON c.content_id = er.content_id
    WHERE er.platform IN ('Steam','TMDB_MOVIE','TMDB_TV') AND er.ranking <= 30 AND c.is_adult = false
    ORDER BY er.platform, er.ranking;
   SELECT * FROM featured_pick ORDER BY featured_date DESC LIMIT 7;
   ```
3. 배포(재시작) 전후 같은 날 같은 작품인지, 부제 순위가 "이번 주 인기" 숫자와 같은지(같은 한 벌을 본다)
4. 로그: 고른 날 INFO 한 줄, WARN 없음

## 순서

1. 백엔드(마이그레이션 · 크롤러 · API) 병합 · 배포 → **다음 날 04:06 크롤 뒤** 신선한 값이 채워진다. 그 전에는 `rating_*` 가 null 이라 **204**(프론트는 대체로 동작).
2. 프론트(웹 · 모바일) PR — API 가 없거나 204 여도 지금 대체로 동작한다.

## 열린 결정

1. **문턱 값** — 게임 긍정 90% · 평가 1만, 영화 · 시리즈 7.5 · 투표 500. 신선한 값으로 다시 재어 확정(첫 주 로그의 후보 수로).
2. **반복 금지 기간 45일** — 분야마다 15번 차례. 후보가 적으면 줄인다.
3. **웹툰 · 웹소설** — 평점 신호가 없어 제외(권장).
4. **00:00~05:00 전날 작품** — 받아들인다(권장).

## 알려진 한계

- Steam % 는 상점 기본 표시(구매자 기준)와 몇 %p 다를 수 있다(조사 4).
- 크롤이 05:00 이후에 끝나면 그날은 전날 한 벌로 고른다(WARN 로그로 안다).
- 수동 지정 · 제외는 표를 직접 고친다(관리 화면 없음).

## 검수 기록

### v1 → v2 (2026-09-26, 코드 대조 독립 검수)

**사실 오류 (8)** — `RankingUpsertHelper` 줄 번호(갱신 56-62 · 삭제 103-113 · 연결 81-95) · `content_id` 는 매일 다시 연결(한 번이 아님) · `RankingScheduler` 는 28 · 36 · 44 · 52 이고 04:00~04:06 은 **시작** 시각 · 게임 "주 1회 수집"은 사실상 재수집이 없음 · 리뷰 쿼리 사용처 누락(:203-204 · 주석 :42) · 로딩 규칙이 "지금과 같은 방식"과 어긋남 · Steam % 산식 · 디자인 기준 경로. → 조사 절 고침.

**설계 문제**

| # | 등급 | 문제 | 반영 |
|---|---|---|---|
| B1 | 심각 | 평가 신호가 수집 시점에 굳어 신작은 문턱을 못 넘고, 뒤에 나빠진 게임이 옛 값으로 히어로에 나온다 | 랭킹 수집 때 신선한 값 저장, 문턱 · 부제는 그 값으로 |
| B2 | 보통 | `후보[(epochDay/3) % n]` 은 후보가 매일 바뀌어 임의 · 반복 | 45일 반복 제외 + 랭킹 최상위, `featured_pick` |
| B3 | 보통 | 메모리 캐시라 재시작 · 비우는 시각 · 크롤 지연에 따라 하루 결과가 바뀐다 | `featured_pick` insert-if-absent |
| B4 | 보통 | 인자 없는 `@Cacheable` 은 첫 날 작품이 영구 고정 · 같은 빈 호출은 프록시 우회 | `@Cacheable` 제거, `pick(LocalDate)` |
| B5 | 보통 | 배포 전 400 · 실패 때 재시도 12회로 스켈레톤 7초+ | 4xx 재시도 없음 · 그 밖 1회 |
| B6 | 사소 | Steam "통과 중 상위 30"은 효과 없음(97위 가능) | 랭킹 30위 이내 |
| B7 | 사소 | 같은 화면 "이번 주 인기"에 중복 | `rankSlides` 에서 제외 |
| B8 | 사소 | 표본 기준 분기는 도달하지 않음 | 명시 |
| B9 | 사소 | 90% 를 반올림 정수로 판정 | 원자료 비율 |
| B10 | 사소 | 썸네일 없는 후보 | 조건 추가 |
| B11 | 사소 | 시간대 암묵 | `Asia/Seoul` 명시 |
| B12 | 사소 | 204 캐시 · axios 204 = `""` | 저장 안 함 · `null` 판정 |
| B13 | 사소 | 05:00 을 넘겨 연 탭 | `staleTime` 을 다음 05:00 까지 |
| B14 | 사소 | 폴백으로 같은 분야 이틀 연속 | 받아들임 |
| B15 | 사소 | REST Docs 현실 | `@MockBean` · 204 필드 없음 · 단위 테스트는 Mockito |
| B16 | 사소 | 중점 규칙 | 지켜짐 확인, 긴 부제 모바일 줄바꿈은 수동 확인 |

**빠진 것 (6)** — 모바일(같은 PR 로) · 관측 로그 · 운영 개입(표 한 행) · 분석(클릭 추적) · 운영 확인 절차(SQL · curl) · 열린 결정(신선도 · 반복 기간 · 새벽 시간대 · Cache-Control) → 모두 반영.
