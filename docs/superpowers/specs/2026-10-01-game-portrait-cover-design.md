# 게임 세로 표지 — 설계

- 날짜: 2026-10-01 · 상태: **v2 (검수 반영)**
- 시안: 로컬 `aod-mockups/rec-game/` (A 세로 표지 선택). 같은 게임 30개(운영 비로그인 추천)로 지금 · A · B · C 비교.
- 관련: 홈 추천 줄(`HomeRecRail` · `HomeRecCard`), 탐색 가벼운 카드 설계(표본 규칙 `workSignal.ts`)

## 목표

세로 카드 틀에 들어가는 게임을 **Steam 세로 표지**(라이브러리 캡슐 600×900)로 보여 준다.
지금은 Steam 가로 그림(header 460×215)을 2:3 틀 가운데 띠로 넣고 위아래를 블러로 채워, 카드의 2/3 가 비어 보인다(홈 추천 줄 게임 탭 · 전체 탭, 모바일은 가운데를 잘라 그림이 뭉개진다).
영화 · 웹툰 포스터와 같은 세로가 되면 **섞인 줄(전체 탭 · 검색 · 보관함)도 고르다**.

- 가로 틀(탐색 게임 탭 · 랭킹 · 신작 · 상세 머리 · 히어로)은 **지금 그대로** header 를 쓴다 — 그 틀에는 header 가 맞다.
- 표지가 없거나 깨지면 **지금 모습으로 대체**한다 — 나빠지는 카드는 없다.

## 조사 결과 — 설계를 정한 사실들

**Steam 표지 (2026-10-01 실측)**

1. 표지 주소는 **규칙으로 만들 수 없다**. 옛 고정 경로 `steam/apps/{appid}/library_600x900.jpg` 는 시안 30개 중 16개만 열린다(새 게임은 해시가 낀 경로 `steam/apps/{appid}/{hash}/library_capsule.jpg`).
2. 공개 API `IStoreBrowseService/GetItems/v1`(키 없음)에 `data_request.include_assets=true` 를 주면 `assets.library_capsule` · `library_capsule_2x` · `header` · `asset_url_format`(`steam/apps/{appid}/${FILENAME}?t=…`)이 온다.
   `context.language=koreana` 면 **한국어 표지가 있으면 그것**을 준다(시안 30개 중 7개가 `_koreana`).
   전체 주소 = `https://shared.akamai.steamstatic.com/store_item_assets/` + `asset_url_format` 의 `${FILENAME}` 자리에 파일 이름.
3. 응답 항목은 요청 순서의 **`id`** 로 짝짓는다 — 없는 appid 는 `{"id":1,"success":15,"visible":false,"appid":0}` 처럼 `appid` 가 0 이다. 유효한 게임은 `success:1`.
   유효하지만 표지 필드가 없는 앱도 있다(대개 데모 · 하위 앱).
4. 속도 · 크기: 200개 한 번에 **약 6초**(응답 약 176KB), 250개 5.3초. `input_json` 을 URL 에 넣으므로 200개면 URL 약 6KB — **200개가 상한**.
   표지 1x(600×900) **42KB**, 2x 142KB. 카드는 168px(2배 밀도 336px)라 1x 로 충분하다. `Cache-Control: max-age≈10년`, `access-control-allow-origin: *`.
5. 같은 CDN 의 header.jpg 를 이미 바로 쓰고 있다. 웹(`vercel.json` 은 rewrite 만, `index.html` 에 CSP 없음) · 모바일(expo-image 도메인 제한 없음) 모두 **추가 설정이 필요 없다**. appdetails 응답에는 600×900 필드가 없다.

**백엔드 (코드 대조)**

6. 게임의 `contents.poster_image_url` 은 `rules/game/steam.yml:7` `header_image → master.posterImageUrl` 하나에서 온다. 재수집 병합은 **비어 있을 때만** 채운다(`IngestPipeline.java:177`).
   게다가 수집 작업은 한 번 만든 appid 를 다시 만들지 않는다(`CrawlJobProducer.java:40`) — **기존 게임에 새 값을 채우려면 별도 작업이 필요하다**.
7. appid = `platform_data.platform_specific_id`(`platform_name='Steam'`). 유일한 것은 `(platform_name, platform_specific_id)` 쌍(`PlatformData.java:17-18`)이다 —
   수집은 개발사 · 제목이 같으면 다른 appid 도 한 작품으로 합치므로(`IngestPipeline.findAndMergeDuplicate :137-145`) **한 작품에 Steam 행이 여럿일 수 있다**. 선례 `findRecKeyRowsByContentIds` 는 `platform_data_id` 가 가장 작은 행을 쓴다.
8. GAME 콘텐츠 약 **18.8만**(`docs/troubleshooting/07…:151-153`). 대부분은 리뷰가 거의 없는 작품이다.
9. 목록 카드 경로는 거의 모두 `WorkApiService.toWorkSummary`(`:203-214`, `.thumbnail(content.getPosterImageUrl())` `:208`)를 지난다 — `/api/works` · 검색 · 신작 · 출시 예정 · 최근 리뷰 · **추천**(`RecommendService:344-345` → `toEnrichedSummaries`) · 대체 추천 · 오늘의 작품 · 컬렉션 항목(`CollectionItemDTO.of :45-52` 가 결과를 복사 → `posterUrl`).
   따로 만드는 곳: 북마크(`BookmarkService:118-125`) · 좋아요(`LikeService:103-110`) · 상세(`getWorkDetail :186`) · 랭킹(`external_ranking.thumbnail_url`) · 컬렉션 책등(`CollectionItemRepository.findSpines` 네이티브 SQL).
10. 그 밖의 콘텐츠 조회는 `Content` 엔티티를 통째로 읽는다(`SELECT c.*`, `ContentRepository:28,137,168,177`) — 새 열은 자동으로 실린다.
11. API Flyway 최신은 **V10**. 크롤러는 Flyway 없이 `ddl-auto: ${DDL_AUTO:update}`.
    CI 는 `deploy-api` · `deploy-crawler` 가 둘 다 `needs: build` 라 **병렬**로 배포한다(`.github/workflows/main.yml:89,246`) — 크롤러가 먼저 뜨면 Hibernate 가 열을 먼저 만든다(V11 의 `IF NOT EXISTS` 는 그때 아무것도 안 한다).
    `Content` · `GameContent` 에는 `@DynamicUpdate` 가 없다 — 수집 병합의 `save` 가 **모든 열**을 다시 쓴다.
12. 크롤러 스케줄러는 **단일 스레드**(풀 설정 없음, 크론은 KST). 예약 작업(`MasterScheduler:37-99` 외):
    TMDB 매일 01:00 · 시리즈 01:30 · **웹툰 02:00** · 주간 Steam 목 03:00 · 웹툰 완결 일 03:00 · 시리즈 완결 토 03:30 · 랭킹 04:00~ · 변환 06:00 · 변환 일 07:00,
    그리고 수집 소비자 10초마다 · 메트릭 게이지 30초마다 · 매시 정각 점검. **이 스레드에서 오래 도는 작업은 수집 전체를 막는다.**
13. 공용 `RestTemplate` 은 `new RestTemplate()`(읽기 타임아웃 없음, `RestTemplateConfig`). Steam 호출은 `SteamRateLimiter`(IP 기준 분당 120)를 지난다. Hikari `leak-detection-threshold: 60000`(crawler `application.yml:20`), 풀 5개.
14. 크롤러 `/api/**` 관리자 엔드포인트에는 인증이 없다(선례 `refresh-library`, `AdminTestController:87-124`). 크롤러 테스트는 H2(`ddl-auto=none`) — Postgres 전용 SQL 은 crawler 테스트에서 못 돈다(testcontainers 는 api 모듈에만).

**프론트 (코드 대조)**

15. 웹 `WorkThumb`(`components/ui/WorkThumb.tsx`): `shape` 기본 portrait(2:3). 게임은 `thumbFitMap.game="contain"` 이라 **블러 채움**(뒤 `blur-xl` + 앞 `object-contain`, `:60-75`). landscape 면 460:215 cover.
16. **2:3 틀 + 블러로 게임을 그리는 곳** — `HomeRecCard:47`(168px, 👍/👎 틀 `:58` 도 2:3) · `HiddenCardSlot:41-45`(props 는 `Pick<WorkSummary,"title"|"thumbnail"|"domain">` `:7`) · `RailCard:39`(홈 "새로 나온 작품" `home-page.tsx:262-269`, 프로필 줄 `profile-page.tsx:85-92`) · `WorkCard:39`(검색 · 좋아요 · 북마크) · `OnboardingWorkTile:48`(온보딩 · `HomeTastePicker:133`) · `AddWorksPanel:148-152`(`WorkSummary` — `useSearchWorks` · `useWorks`) · `PulledWorkPanel:81-85`(`CollectionItem.posterUrl`) · `ShelfSpine` 표지(`:69-98`, WorkThumb 규칙을 손으로 복제).
    그 밖에 홈 추천 줄 좋아요 아바타 22×30 cover(`HomeRecRail.tsx:777-785`, `useMyLikes`).
17. **2:3 틀 + 가운데 자르기**(블러 없음) — `RankRow` feature · panel(홈 "이번 주 인기", `external_ranking.thumbnail_url`) · `UpcomingCard`(홈 "출시 예정").
18. 이미지 `onError` 대체가 **웹 · 모바일 어디에도 없다**. 대체는 "주소가 비었으면 도메인 아이콘" 하나뿐이다. 홈 슬라이드는 `DomainRotator` 가 `thumbnail` 을 미리 불러 둔다(`home-page.tsx:253`).
19. 홈 추천 카드 아래 줄은 `workCardMeta(work, { withDomain: true })` = "게임 · 2017 · PUBG Corporation" — 게임 탭에서도 "게임"이 붙는다. 탐색 가벼운 카드의 `workLiteSignal` 은 `left`(최대 2조각) + `right`(% · ★, 오른쪽 정렬) 구조라 168px 한 줄 meta 와 모양이 다르다.
20. 모바일 세로 틀은 **3:4**(홈 신작 `RailCard` 128×170 · 프로필 줄 · 좋아요/북마크/검색 `WorkCard portrait` `aspectRatio 3/4` `WorkCard.tsx:142` · 검색 `app/search.tsx:194-201`)이고 게임을 **가운데 자른다**(`contentFit="cover"`). 모바일 홈 `ReviewRow` 44×58 도 같다. 모바일 홈에는 추천 줄이 없다.

## 범위

**포함**
- **크롤러**: Steam 세로 표지 동기화 작업(매일 조금씩 + 오래된 것 다시 확인), 관리자 실행(비동기)
- **마이그레이션 V11**: `contents.portrait_image_url` · `game_contents.portrait_checked_at`
- **API**: `WorkSummaryDTO.portraitThumbnail`(목록 경로 전부 + 북마크 · 좋아요)
- **웹**: `WorkThumb` 표지 우선 + 깨지면 대체, 16 의 카드(`ShelfSpine` · `PulledWorkPanel` 제외)와 추천 줄 좋아요 아바타, 홈 추천 카드 아래 줄(게임)
- **모바일**: 20 의 3:4 틀(홈 신작 · 프로필 줄 · 좋아요 · 북마크 · 검색)

**제외 (다음 단계)**
- 컬렉션 책등 · 표지 콜라주 · 뽑아 본 작품 패널(`ShelfSpine` · `CollectionCollage` · `PulledWorkPanel`) — `CollectionItemDTO` 에 한 줄 더하면 되지만 책등은 네이티브 SQL · 손으로 복제한 규칙이라 따로 본다
- 랭킹 행 · 출시 예정 카드(17) · 모바일 홈 `ReviewRow` — 44~58px 작은 틀이고 랭킹은 `external_ranking` 경로
- 상세 페이지 · 가로 틀 전부 · 히어로 — header 가 맞는 틀
- 영화 · 시리즈 카드 아래 줄의 ★ — 이번엔 게임만 바꾼다(열린 결정)

## 데이터 (크롤러 · 마이그레이션)

**V11** (멱등, V6 선례):
```sql
ALTER TABLE IF EXISTS contents      ADD COLUMN IF NOT EXISTS portrait_image_url varchar(1000);
ALTER TABLE IF EXISTS game_contents ADD COLUMN IF NOT EXISTS portrait_checked_at timestamptz;
-- 처음 채우는 구간(아직 확인 안 한 게임을 리뷰 순으로)만 받친다. 다시 확인 구간은 하루 1회라 정렬로 충분하다.
CREATE INDEX IF NOT EXISTS idx_game_contents_portrait_unchecked
    ON game_contents (review_count DESC NULLS LAST) WHERE portrait_checked_at IS NULL;
```
- `portrait_image_url` 은 `contents` 에 둔다 — "세로 표지"는 화면 개념이고 목록 쿼리가 이미 `Content` 를 읽는다(10). 다른 도메인은 `poster_image_url` 이 이미 세로라 비워 둔다.
- `portrait_checked_at` 은 Steam 전용이라 `game_contents` — **표지가 없다고 확인한 게임**을 매일 다시 묻지 않기 위해서다.
- **엔티티는 V11 과 같은 타입으로**(11 — 크롤러가 먼저 뜨면 엔티티가 열을 만든다): `Content` `@Column(name = "portrait_image_url", length = 1000) String portraitImageUrl`, `GameContent` `@Column(name = "portrait_checked_at") Instant portraitCheckedAt`(→ `timestamptz`).
- **`Content` · `GameContent` 에 `@DynamicUpdate`** (11) — 동기화가 JDBC 로 쓴 직후 수집 병합의 `save` 가 옛 값(null)으로 되돌리는 것을 막는다. 바뀐 열만 UPDATE 하게 될 뿐 다른 동작은 같다.

**`SteamPortraitClient`** (크롤러, 신규)
- 전용 `RestTemplate`: 연결 5초 · 읽기 30초 타임아웃(13 — 공용 것은 타임아웃이 없다).
- `GET https://api.steampowered.com/IStoreBrowseService/GetItems/v1?input_json=…` — `input_json` 은 `UriComponentsBuilder…encode()` 로(문자열 URL 에 그대로 넣으면 `{…}` 가 URI 변수로 해석된다). 한 번에 **최대 200개**(4).
- `context: {language: "koreana", country_code: "KR"}`, `data_request: {include_assets: true}`.
- 호출마다 `SteamRateLimiter.acquirePermit()` — 수집 소비자의 appdetails · appreviews 와 IP 예산을 같이 쓴다.
- 응답 해석(요청 순서의 `id` 로 짝, 3):

  | 응답 | 결과 |
  |---|---|
  | `success:1` + `assets.library_capsule` | 표지 주소(1x) — **확인함** |
  | `success:1`, 표지 필드 없음 | 표지 없음 — **확인함** |
  | `success` ≠ 1 (없는 · 숨김 앱) | 표지 없음 — **확인함** |
  | 요청한 id 가 응답에 없음 | **확인 안 함**(다음에 다시) |
  | 호출 실패 · 타임아웃 · 429 · 5xx · JSON 오류 | 묶음 전체 **확인 안 함**, 그 실행 중단 |

**`SteamPortraitSyncService`** (크롤러, 신규)
1. 대상 고르기 — 작품마다 Steam 행 하나(7, header 의 출처인 가장 먼저 수집된 행), 숫자 appid 만(숫자가 아닌 값 하나가 묶음 전체를 400 으로 만들고, 실패 묶음은 확인 시각이 안 남아 매일 맨 앞에서 다시 실패한다):
   ```sql
   SELECT content_id, appid FROM (
     SELECT DISTINCT ON (c.content_id)
            c.content_id, pd.platform_specific_id AS appid, g.portrait_checked_at, g.review_count
       FROM contents c
       JOIN game_contents g  ON g.content_id = c.content_id
       JOIN platform_data pd ON pd.content_id = c.content_id AND pd.platform_name = 'Steam'
      WHERE pd.platform_specific_id ~ '^[0-9]+$'
        AND (g.portrait_checked_at IS NULL OR g.portrait_checked_at < now() - interval '30 days')
      ORDER BY c.content_id, pd.platform_data_id
   ) t
   ORDER BY (portrait_checked_at IS NOT NULL),           -- 확인한 적 없는 것 먼저
            CASE WHEN portrait_checked_at IS NULL THEN review_count END DESC NULLS LAST,  -- 그 안에선 리뷰 많은(화면에 나올) 게임부터
            portrait_checked_at,                           -- 다시 확인은 오래된 것부터(만기가 한날 몰려도 고르게 돈다)
            content_id
   LIMIT :limit
   ```
2. 200개씩 클라이언트로 묻고, 묶음마다 **짧은 트랜잭션 하나** + `JdbcTemplate.batchUpdate`:
   - 표지가 있으면 `UPDATE contents SET portrait_image_url = ?` (바뀐 경우만)
   - 확인한 게임은 모두 `UPDATE game_contents SET portrait_checked_at = now()`
   - 표지가 없다고 나와도 기존 `portrait_image_url` 은 **지우지 않는다**(옛 주소가 살아 있을 수 있다 — 깨지면 프론트가 대체).
3. 묶음 사이 2초 쉼. 실행 하나의 **시간 상한 15분**.
4. **실행은 스케줄러 스레드 밖에서**(12) — 예약 메서드는 단일 스레드 전용 실행기(`portraitSyncExecutor`)에 넘기고 바로 돌아온다. **단일 실행 잠금**(`AtomicBoolean`) — 이미 돌고 있으면 예약 · 관리자 실행 모두 건너뛴다(같은 대상을 두 번 묻지 않게).
5. **매일 05:10**, 한 번에 최대 **40호출**(8,000개, 약 6초 응답 + 2초 쉼 ≈ **5~6분**). 05:10 은 랭킹(04:00~) 뒤 · 변환(06:00) 앞의 빈 시간이다.
6. **관리자** `POST /api/crawl/steam/portraits?calls=…`(기본 40, 최대 1,000) — 비동기로 시작하고 **202** 를 바로 돌려준다(잠금 중이면 409). 진행은 로그와 메트릭으로 본다.
   첫 채움은 이것으로: 리뷰 순이라 처음 몇백 호출이면 추천 후보 대부분이 채워진다. 전체 18.8만 개는 약 940호출 ≈ **2시간**.
7. **새로 수집된 게임**은 다음 05:10 에 확인 시각이 비어 있어 먼저 잡힌다(리뷰 순 안에서).
8. **관측** — 실행 끝에 INFO 한 줄(묻기 · 표지 · 없음 · 응답에 없음 · 실패 · 걸린 시간), 실패로 멈추면 WARN.
   Prometheus(`CrawlJobMetrics` 와 같은 방식): `steam_portrait_last_success_seconds` 게이지 · 표지/없음/실패 카운터. **3일 연속 성공이 없으면** 알림(비공식 API 가 바뀐 신호).

## API

`WorkSummaryDTO` 에 `String portraitThumbnail` — 게임 세로 표지(없으면 null). 기존 `thumbnail` 은 **그대로**(가로 틀이 쓴다).
- `WorkApiService.toWorkSummary`(9) 한 곳에서 채운다 → 목록 · 검색 · 신작 · 추천 · 대체 · 오늘의 작품이 함께 받는다(`AddWorksPanel` 도).
- `BookmarkService` · `LikeService` 의 요약에도 채운다(웹 좋아요 · 북마크 목록, 프로필 줄, 추천 줄 좋아요 아바타).
- 비게임은 null — 프론트는 값이 있으면 쓴다(도메인을 따로 보지 않는다).
- REST Docs: `works-get-all` 은 `content` 를 통째 문서화하므로 영향 없다. 필드를 낱낱이 적는 문서(`InteractionControllerDocsTest` 등)는 `optional()` 로 추가.
- **표지만 끄기**: 문제가 생기면 `UPDATE contents SET portrait_image_url = NULL WHERE domain = 'GAME'` — 화면이 바로 지금 모습으로 돌아간다(다음 동기화가 다시 채우므로 스케줄도 멈춘다).

## 화면

**웹 `WorkThumb`** — `portraitUrl?: string | null` 받기.
- `shape="portrait"` 이고 `portraitUrl` 이 있으면 **그 이미지 한 장 cover**.
- `onError` 면 **그 주소만** 실패로 기억한다(`failedSrc === portraitUrl` — 같은 컴포넌트에 다른 작품이 들어와도 새 표지가 대체 모습에 갇히지 않는다) → 지금 방식(header 블러 채움). 다시 시도하지 않는다.
- `shape="landscape"` 거나 `portraitUrl` 이 없으면 지금 그대로.

**연결**(16): `HomeRecCard` · `HiddenCardSlot`(Pick 에 `portraitThumbnail` 추가) · `RailCard`(prop 추가 — 홈 신작 줄 · 프로필 줄) · `WorkCard`(검색 · 좋아요 · 북마크) · `OnboardingWorkTile` · `AddWorksPanel` · 추천 줄 좋아요 아바타(`portraitThumbnail ?? thumbnail`).
홈 `DomainRotator` 미리 불러오기도 `portraitThumbnail ?? thumbnail`(18).

**홈 추천 카드 아래 줄**(19, 시안 A) — 새 함수 `recCardMeta(work, { tab })`(shared, 문자열 조각 반환 · 테스트):
- **게임 탭의 게임**: "**매우 긍정적 88%** · 2025" — 판정(긍정이면 굵게) + % (판정 · 리뷰 10개 이상, `showSteamPct`) · 연도. 개발사는 뺀다.
- **전체 탭의 게임**: "게임 · **매우 긍정적 88%**" — 섞인 줄이라 도메인은 남기고 연도를 뺀다(168px · 12.5px 에서 "게임 · 압도적으로 긍정적 97% · 2024" 는 약 215px 라 잘린다).
- 판정이 없으면: 게임 탭 "2026", 전체 탭 "게임 · 2026"(출시 예정이면 "출시 예정").
- 넘치면 줄 끝(연도 쪽)이 말줄임으로 잘린다 — 판정을 앞에 둔 이유.
- **비게임 카드는 지금 그대로**(`workCardMeta(work, { withDomain: true })` — 탭과 무관).
- 스크린리더: % 는 `<span class="sr-only">긍정 평가 </span>88%` 로 읽힌다.
- `HomeRecRail` 이 탭을 알고 있으므로 카드에 `tab` 을 넘긴다(대체 · 비로그인 목록도 같은 규칙).

**모바일**(20): 홈 신작 `RailCard` · 프로필 줄 · 좋아요/북마크/검색 `WorkCard portrait` 에서 `portraitThumbnail ?? thumbnail`, expo-image `onError` 면 `thumbnail` 로.
틀은 3:4 그대로 — 2:3 표지는 위아래 합쳐 약 11% 잘린다(한쪽 약 5%). 가운데 기준(표지 제목 글씨가 아래에 있는 경우가 많아 위 기준으로 두지 않는다).

**shared**: `WorkSummary.portraitThumbnail?: string | null`, `recCardMeta` + 테스트.

**용량**: 표지 1x 는 장당 약 42KB 로 지금 header(실측 35~65KB)와 비슷하다 — 데이터 사용은 늘지 않는다. 2x 를 쓰지 않는 이유(142KB).

## 구성 요소

**백엔드**

| 변경 | 내용 |
|---|---|
| `V11__game_portrait.sql` | 위 SQL |
| shared `Content` · `GameContent` | 열 · 타입(V11 과 같게) · `@DynamicUpdate` |
| crawler `SteamPortraitClient`(신규) | 전용 `RestTemplate`(타임아웃) · 인코딩 · 응답 해석 표 |
| crawler `SteamPortraitSyncService`(신규) | 대상 SQL · 묶음 트랜잭션 · 잠금 · 시간 상한 · 로그 · 메트릭 |
| crawler 스케줄 · 관리자 | 매일 05:10(실행기로 넘김) · `POST /api/crawl/steam/portraits`(202 · 409) |
| api `WorkSummaryDTO` · `WorkApiService` · `BookmarkService` · `LikeService` | `portraitThumbnail` |

**테스트**
- crawler 단위(Mockito · `MockRestServiceServer`): 주소 만들기(`asset_url_format` · 파일 이름 · koreana) · 응답 해석 표 다섯 줄 · 429/5xx/타임아웃에서 멈춤 · 잠금 중 건너뜀 · 표지 없음이면 기존 주소 유지.
- 대상 SQL(`DISTINCT ON` · 정규식 · interval)은 crawler 테스트가 H2 라 못 돈다(14) → **로컬 Postgres 에서 손으로 검증**하고 결과를 PR 에 남긴다(같은 작품 Steam 행 2개 · 숫자 아닌 appid · 확인 안 한/30일 지난/최근 확인 섞어서).
- api: `WorkSummaryEnrichTest` 확장(게임 · 비게임), 북마크 · 좋아요 DTO, REST Docs.

**web** `WorkThumb`(+ 대체 동작) · `HomeRecCard`(아래 줄 · 👍/👎 틀은 2:3 그대로) · `HomeRecRail`(탭 전달 · 좋아요 아바타) · `HiddenCardSlot` · `RailCard` · `WorkCard` · `OnboardingWorkTile` · `AddWorksPanel` · `home-page.tsx`(미리 불러오기)
**mobile** `(tabs)/index.tsx` `RailCard` · `(tabs)/profile.tsx` · `WorkCard`(좋아요 · 북마크 · 검색이 같이 받는다)
**shared** 타입 · `recCardMeta` + 테스트

## 확인

1. 첫 채움 뒤:
   ```sql
   SELECT count(*) FILTER (WHERE c.portrait_image_url IS NOT NULL) AS with_cover,
          count(*) FILTER (WHERE g.portrait_checked_at IS NOT NULL)  AS checked,
          count(*) AS games,
          count(*) FILTER (WHERE g.review_count >= 1000 AND c.portrait_image_url IS NOT NULL)::float
            / NULLIF(count(*) FILTER (WHERE g.review_count >= 1000), 0) AS cover_ratio_1k
     FROM contents c JOIN game_contents g USING (content_id) WHERE c.domain = 'GAME';
   ```
   이 SQL 을 **매주 점검**에도 쓴다.
2. `curl '/api/recommendations?tab=game&size=30&surface=home_rec'`(비로그인 헤더) — `portraitThumbnail` 30개 중 몇 개.
3. 화면(웹 1440 · 390, 모바일): 홈 추천 게임 탭 · 전체 탭, 홈 신작 줄 게임 슬라이드, 검색 "게임 이름", 좋아요 · 북마크, 컬렉션 작품 추가 패널. 일부러 깨진 표지 주소 → 그 카드만 지금 모습.
4. 크롤러 로그 · 메트릭: 05:10 실행 한 줄, 수집 소비자 · 다른 예약 작업이 밀리지 않았는지.
5. 배포 직후: 운영 `contents.portrait_image_url` · `game_contents.portrait_checked_at` 열 타입이 `varchar(1000)` · `timestamptz` 인지(크롤러가 먼저 만들었어도).

## 순서

1. 배포 전 확인: 운영 크롤러 `DDL_AUTO` 가 `update` 인지(아니면 크롤러가 API 마이그레이션보다 먼저 뜰 때 `Content` 조회가 실패한다 → 그 경우 이번만 `deploy-crawler` 를 API 뒤에 수동으로), 크롤러 포트가 외부에 열려 있지 않은지(관리자 엔드포인트, 14).
2. 백엔드(마이그레이션 · 크롤러 · API) 병합 · 배포 → 관리자 실행으로 첫 채움(리뷰 순 상위부터, 수백 호출) → 확인 1 · 2 · 5
3. 웹 — `portraitThumbnail` 이 없거나 null 이면 지금 모습이라 순서와 무관하게 안전하다
4. 모바일 — 같은 변경이 앱 업데이트(OTA 또는 스토어 빌드)로 나간다. 그 전까지 앱은 지금 모습.

**되돌리기**: 열 추가뿐이라 API · 프론트를 이전 버전으로 되돌려도 안전하다. 표지만 끄려면 위 `UPDATE`(API 절).

## 열린 결정

- **다시 확인 주기 30일** — 게임사가 표지를 바꾸면 해시 주소가 바뀐다. 옛 주소가 계속 열리는지는 모른다(깨지면 프론트 대체). 깨짐이 보이면 줄인다.
- **header 도 같이 갱신할지** — 같은 응답에 `assets.header` 가 온다. 지금 `poster_image_url`(header)도 비었을 때만 채워져 낡을 수 있다(6). 이번엔 하지 않는다(header 를 바꾸면 가로 틀 전부가 바뀐다 — 따로 본다).
- **영화 · 시리즈 아래 줄 ★** — 시안 A 의 전체 탭에는 "영화 · ★ 7.2 · 2026" 이 있었다. 이번 범위는 게임만.
- **컬렉션 · 랭킹 행으로 넓히기** — 다음 단계.
- **비공식 API 의존** — `IStoreBrowseService` 는 Steam 상점이 쓰는 공개 엔드포인트지만 문서화된 계약은 아니다. 바뀌면 동기화가 멈출 뿐 화면은 지금 모습이 유지된다(메트릭 알림으로 감지).

## 알려진 한계

- 표지가 없는 게임(오래된 · 작은 게임)은 지금처럼 블러 채움이다(모바일은 가운데 자르기).
- 한국어 표지는 Steam 이 준 것만 — 우리가 언어를 고르지 않는다.
- 표지에는 게임 제목 글씨가 들어 있는 경우가 많아 카드 아래 제목과 겹쳐 보일 수 있다(포스터와 같은 성격, 받아들인다).
- 전체 18.8만 개를 다 채우려면 매일 한도로는 약 24일 — 화면에 나오는 게임은 리뷰 순이라 먼저 채워진다.

## 검수 기록

### v1 → v2 (2026-10-01, 코드 대조 독립 검수 + Steam API 실측)

**사실 오류 (7)** — Steam 행 "유일"은 `(platform_name, platform_specific_id)` 쌍이고 한 작품에 여럿일 수 있음(조사 7) · 예약 작업 목록 누락(웹툰 02:00 등, 조사 12) · 시간 추정이 응답 시간(200개 ≈ 6초)을 빠뜨림(40호출 2분 → 5~6분, 전체 32분 → 2시간) · 표지 없는 "유효 게임" 예시 appid 870 은 하위 앱 · `BookmarkService` 줄 번호 · `AddWorksPanel` 은 `WorkSummary` 경로(제외 사유 틀림) · 모바일 틀은 3:4 이고 검색도 포함. → 조사 절 고침.

**설계 문제**

| # | 등급 | 문제 | 반영 |
|---|---|---|---|
| 1 | 높음 | 단일 스케줄러를 5~6분 막음 · 실행 전체 트랜잭션이면 누수 경고 | 전용 실행기로 넘김 · 묶음마다 짧은 트랜잭션 + `batchUpdate` · 05:10 |
| 2 | 높음 | 관리자 실행이 동기(2시간 요청) · 예약과 겹침 | 비동기 202 · 단일 실행 잠금(409) |
| 3 | 높음 | 공용 `RestTemplate` 타임아웃 없음 | 전용 클라이언트 연결 5초 · 읽기 30초 · 실행 상한 15분 |
| 4 | 높음 | 같은 작품 Steam 행 여럿 → 중복 · 덮어쓰기, 숫자 아닌 appid 가 묶음 전체 실패 | `DISTINCT ON (content_id)` 가장 먼저 수집된 행 · 숫자 정규식 |
| 5 | 중간 | 응답 매핑 규칙 없음 | `id` 로 짝 · 응답 해석 표 · 테스트 |
| 6 | 중간 | `input_json` 인코딩 · URL 길이 | `UriComponentsBuilder…encode()` · 200개 상한 |
| 7 | 중간 | 병렬 배포 시 크롤러가 열을 먼저 만듦 → 타입 어긋남 · `DDL_AUTO` 확인 | 엔티티 타입을 V11 과 같게 · 배포 전 확인 · 배포 뒤 열 타입 확인 |
| 8 | 중간 | `@DynamicUpdate` 없음 → 수집 병합이 표지를 null 로 되돌림 | 두 엔티티에 `@DynamicUpdate` |
| 9 | 중간 | 아래 줄 규칙 모순(`withDomain` 이 비게임도 바꿈) · `workLiteSignal` 재사용 모양 불일치 · 168px 넘침 · % 읽기 | 새 `recCardMeta` · 게임만 탭별 규칙 · 전체 탭은 연도 생략 · sr 라벨 |
| 10 | 사소 | `WorkThumb` 실패 상태가 boolean | `failedSrc === portraitUrl` · `HiddenCardSlot` Pick |
| 11 | 사소 | V11 인덱스가 정렬을 못 받침 | 확인 안 한 구간 부분 인덱스로 |
| 12 | 사소 | 30일 뒤 만기 파도 · 다시 확인도 리뷰 순 | 다시 확인 구간은 `portrait_checked_at` 오래된 순 |
| 13 | 사소 | Steam IP 예산을 수집과 따로 씀 | `SteamRateLimiter.acquirePermit()` 공유 |
| 14 | 선택 | header 도 낡음 | 열린 결정으로 |

**빠진 것 (9)** — 범위(모바일 검색 · 추천 줄 좋아요 아바타 · 모바일 `ReviewRow` 제외 사유) · 관측(Prometheus 게이지 · 3일 무성공 알림 · 주간 점검 SQL) · 테스트 기반(crawler 는 H2 → SQL 수동 검증, `WorkSummaryEnrichTest` 확장) · 멈춤 대비(타임아웃 · 실행 상한) · 되돌리기 · 이미지 도메인/CSP(설정 불필요 확인, 용량) · 모바일 배포 경로 · 관리자 엔드포인트 노출 확인 · 검수 기록 절. → 모두 반영.
