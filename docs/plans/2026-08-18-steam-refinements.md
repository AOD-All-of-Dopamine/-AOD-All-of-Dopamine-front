# Steam 정제 + 혼합 그리드 플랜 (2026-08-18)

사용자 요구 4건: ①Steam 19금 제외 ②가로 썸네일이 혼합 목록에 자연스럽게 ③게임 최신출시순에서
출시 예정작은 선택 시에만 ④리뷰 수 기본 필터.
브랜치: back `feature/steam-refinements` / front `feature/steam-refinements` (main 직푸시는
자동 배포 트리거이므로 금지 - 검증 후 머지).

## 실태 (로컬 실측)

- `platform_data.attributes.required_age`: Steam 894건 전수 존재, `>= 18`이 10건
- 미래 출시작(GAME): 로컬 0건 (Steam은 출시 예정 수집하므로 prod·향후 유효)
- `review_summary.total_reviews`: 존재 (기존분은 재크롤로 채워짐)

## 설계 결정

### ① 성인 제외 - contents.is_adult 마스터 승격
- **판정 기준 (2026-08-17 변경)**: Steam `content_descriptors.ids`에 **3(Adult Only Sexual
  Content) 또는 4(Frequent Nudity or Sexual Content)** = 성적 콘텐츠(야겜)만 제외.
  **required_age는 판정에 사용하지 않음** — 폭력성 18금(GTA류)은 노출 유지.
  (구 required_age>=18 기준은 기각 — 편차 기록 참고)
- **신규 수집**: SteamGameExecutor에서 descriptor 3/4면 saveRaw 전에 스킵 (아예 안 담음)
- **기존분**: 삭제하지 않고 노출 차단 - `contents.is_adult boolean not null default false` 컬럼
  승격(Flyway **V6**) + 목록·검색·신작·발견 쿼리에 `AND is_adult = false`.
  과거 수집분엔 descriptor가 없어 V6 백필 불가 — yml `attr.content_descriptor_ids` 수집을
  추가하고, 재크롤로 채워지면 **부팅 reconcile**(SteamRefinementReconciler)이 자동 플래그.
  상세 직접 URL은 허용(목록 비노출이 요구 범위)
- 필터 규율 준수: attr(JSONB)로 매 쿼리 필터하지 않고 마스터 컬럼으로 승격하는 이유

### ③ 출시 예정 분리 (게임 탭, 백엔드 무변경)
- 프론트가 게임 탭 기본으로 `releaseTo=오늘` 전송 → 기존 findWorks 날짜 축이 처리
- 필터에 "출시 예정 포함" 토글 - 켜면 releaseTo 해제. 신작 페이지의 예정 섹션은 기존대로

### ④ 리뷰 수 필터 - game_contents.review_count 도메인 컬럼 승격
- yml: `review_summary.total_reviews: domain.reviewCount` 매핑 추가 (신규·재크롤 시 채움)
- Flyway V6에 컬럼 + 기존 attr 백필 포함
- findWorks에 게임 축 EXISTS 서브쿼리(웹툰 3축 패턴): `reviewCountMin` 파라미터
- 필터 UI: 게임 탭 "리뷰 수" 라디오 - 전체 / 100+ / 1,000+ / 10,000+ (avg_playtime류 확장 여지)

### ② 혼합 그리드 - 게임 = 컴팩트 가로 행 x2 스택 (**1-C 확정**, 사용자 선택)
- 문제: 전체 탭·검색 등 혼합 목록에서 게임(가로 원본)이 세로 크롭되거나 세로 틀에 어색
- **확정안(목업 1-C)**: 그리드 2칸 셀 안에 컴팩트 가로 미니 카드를 상하 2개 스택 -
  좌측 460:215 원본(Steam header) 무크롭 썸네일(42% 폭) + 우측 제목·meta·평가.
  **게임 1개 = 포스터 1개 면적**.
  랭킹 컴팩트 행과 같은 문법. 게임이 홀수 개면 마지막 셀은 1개만(하단 여백 허용).
- 모바일(웹 <lg·앱): 2열 그리드에서 게임 = 풀폭 컴팩트 가로 행 1개씩
- 기각안: 4열 게임 2칸(점유 과다), 5열 게임 2칸(카드 축소 부담) - 목업에 기록 보존

## 태스크

### S-BE. 백엔드 (구현 → 리뷰 → 수정)
- [x] V6 마이그레이션: is_adult 컬럼+백필, game_contents.review_count 컬럼+백필
- [x] Content 엔티티 is_adult / GameContent reviewCount + steam.yml 매핑
- [x] SteamGameExecutor 성인 스킵 (수집 단계)
- [x] findWorks: is_adult 제외(전 목록 경로) + reviewCountMin 게임 축, WorkController 파라미터
- [x] 테스트: 성인 제외·리뷰 축 케이스

### S-FE1. 웹 (구현 → 리뷰 → 수정)
- [x] 게임 탭 기본 releaseTo=오늘 + "출시 예정 포함" 토글 (URL 축 `upcoming=1`)
- [x] 게임 탭 리뷰 수 라디오 필터 (URL 축 `reviewMin` -> API `reviewCountMin`)
- [x] 혼합 그리드(전체 탭·검색): 게임 2칸 스팬 가로 카드 (목업 1-C 확정안)

### S-FE2. 모바일 앱 (구현 → 리뷰 → 수정)
- [x] 필터 시트에 출시 예정 토글·리뷰 수 라디오 (웹 축 미러)
- [x] 혼합 목록 게임 풀폭 가로 카드

### 게이트
- [ ] BE: 테스트 그린 + 로컬 부트 V6 적용 확인 / FE: 빌드·타입체크·기존 grep 게이트
- [ ] E2E: 성인 게임 목록 비노출, 출시 예정 토글 동작, 리뷰 수 필터 결과 감소, 혼합 그리드 실화면
- [ ] 머지: back 먼저(배포 트리거) → front

## 비스코프 (백로그)

- 성인 콘텐츠 정책의 타 도메인 확장(웹툰/웹소설 성인 등급 노출 정책)
- 성적 콘텐츠 판정 게임의 DB 삭제 여부 (현재는 숨김만 - 팀 결정 필요)
- 컬렉션 기존 성인 아이템 정리 정책 (addItem은 차단 — 이미 담긴 아이템·상세 노출은 잔존 허용 중)
- 리뷰 수 외 Steam 지표 필터(동접·플레이타임)

## 편차 기록

- S-BE: 계획의 목록 경로 외에 `findAll(pageable)` 폴백(전체 탭 무필터 목록)이 성인 노출 구멍이라
  `findAllVisible`(is_adult=false JPQL)로 교체. 미사용 목록 메서드 `findByDomain`/`findByPlatforms`에도
  필터 부여(향후 사용 대비). 목록 경로 가드는 리플렉션 테스트(ContentRepositoryAdultFilterTest)로
  고정 — Page 반환 @Query 전수에 is_adult 필터 강제.
- S-BE (정책 변경, 2026-08-17): **required_age>=18 기준 기각** — 로컬 실측 10건이 전부
  폭력계 클래식(Quake/BioShock/Witcher/Borderlands류)으로, 걸러야 할 성적 콘텐츠는 못 걸고
  노출해야 할 폭력성 18금만 걸러 정반대로 작동했다. `content_descriptors.ids` 3/4 기준으로
  교체 — Executor 스킵·reconcile 동일 기준, V6는 구 백필 철회 UPDATE로 로컬 10건 원복.
  과거 수집분엔 descriptor가 없어 즉시 백필 불가 — 재크롤로 attr이 채워지면 부팅
  reconcile이 자동 플래그(재발 창 안전망 겸용, review_count 충전 포함).
- S-BE: 성인 스킵은 리뷰 집계 API 호출 전에 수행(호출 절약)하고 성공(true)으로 반환.
  (문구 정정: 구 "false면 재시도" 근거는 부정확 — 실제 시맨틱은 false→markAsFailed로
  maxRetries까지 RETRY 재클레임 후 **영구 FAILED**(RETRY→PENDING 복원 스케줄러는 TODO 미구현).
  의도된 스킵을 실패 처리하면 불필요 재시도 + 영구 FAILED 노이즈만 남는다.)
- S-BE (리뷰 반영): 랭킹 매핑 조회 2종(ExternalRankingRepository *WithContent)에 매핑 콘텐츠
  성인 행 제외. **미매핑 행의 크롤 시점 title/썸네일 노출은 판별 불가로 허용**.
- S-BE (리뷰 반영): 컬렉션 addItem에서 성인 콘텐츠 400("담을 수 없는 작품입니다") — 상세
  직접 접근으로 담아 공개 컬렉션에 재노출하는 능동 우회 봉쇄. 기존 담긴 아이템·상세 노출은
  잔존 허용(사례 희박, 큐레이터 카운트 정합 우선) — 백로그에 정리 정책 추가.
- S-BE (리뷰 반영): 장르/플랫폼 집계 3종(countByGenre·findDistinctGenres·findDistinctPlatforms)에도
  is_adult=false — 목록에 없는 콘텐츠가 필터 옵션·카운트에 새지 않게 정합.
- S-BE: V6 로컬 적용 결과(신 기준 재적용) — 구 백필 10건 → **is_adult=true 0건으로 원복**,
  review_count 백필 3건 유지(나머지는 재크롤 시 yml 매핑으로 채워짐).
- S-BE 게이트: api+crawler 테스트 그린, flyway history v6 삭제 후 bootRun 재적용 확인, 서버 종료.
- S-FE1: era·upcoming 충돌 처리 - era 선택 시 era 범위가 우선(플랜 ③)이라
  upcoming을 URL 파싱 단계에서 무시(정규화)하고 토글은 disabled + "해당 기간 우선"
  안내 문구로 대체. URL 값은 지우지 않아 era 해제 시 토글 상태가 복원된다.
  따라서 era="2024년 이후"(to 없음) 선택 시엔 게임 탭에도 출시 예정작이 섞인다.
- S-FE1: 목업 섹션 3(<lg 게임 카드)은 이미지 상단형(1-C 이전 시안)이지만 플랜
  확정 문구 "풀폭 컴팩트 가로 행"에 따라 1-C 가로 행(GameCompactCard)을 풀폭으로
  재사용. 페어 셀이 <lg에서 풀폭 행 1~2개로 풀린다(내부 gap = 그리드 y-gap).
- S-FE1: reviewMin·upcoming을 활성 필터 칩·필터 카운트에 포함(기존 era/status 축
  관례 준수 - 목업에는 칩 언급 없음).
- S-FE1: 검색 페이지는 max-w-2xl(lg에서도 3열)이라 게임 페어 셀이 3열 중 2칸을
  차지 - 1-C 4열 프레임과 비율은 다르나 문법 동일.
- S-FE1: FilterGroup·SheetGroup title을 string -> ReactNode로 완화 - 목업의
  "리뷰 수 (Steam)" 보조 표기(연한 색) 렌더 목적. 기존 소비처 시각 불변.
- S-FE1 (리뷰 반영): GameCompactCard 썸네일 비율 aspect-video(16:9) ->
  aspect-[460/215] (Steam header 원본 2.14:1, WorkCard landscape와 동일 관례) +
  "16:9 무크롭" 문구를 "460:215 원본 무크롭"으로 정정. 혼합 목록(전체 탭·검색)
  로딩 스켈레톤에 게임 페어 형상(SkeletonCard game-row) 반영 - 로드 후 레이아웃
  시프트 완화. Steam desc/pct 파생은 workCardInfo.steamRating으로 추출해
  카드 foot과 GameCompactCard의 중복 제거.
- S-FE1: groupMixedGrid 단위 테스트 미작성 - apps/web에 테스트 러너가 없다
  (test 스크립트·vitest 의존성 부재, 검증은 tsc+build와 grep 게이트뿐).
  러너 신설은 비스코프 - 도입 시 페어링 규칙(연속 2개 페어·비게임 개입 시 절단·
  홀수 페어 허용) 케이스부터 추가할 것.
- S-FE1: 탐색 전체 탭 >=1201px는 5열 그리드라 게임 페어 셀이 5열 중 2칸(40% 폭) -
  1-C 4열 프레임(50%)보다 좁다. 검색 3열 편차와 같은 계열(문법 동일, 비율 상이).
- S-FE1: 2칸 페어 셀이 행의 마지막 1칸 앞에 걸리면 auto-placement가 셀을 다음
  행으로 내려 1칸 홀이 생길 수 있다 - grid-auto-flow: dense는 뒤 항목을 앞으로
  끌어와 서버 정렬 순서를 깨므로 미사용(순서 보존 우선, 홀 허용).
- S-FE2: RN FlatList는 한 목록에서 numColumns를 아이템별로 섞을 수 없어(2칸 스팬
  상당 불가) 목록 데이터를 행 단위로 재구성(utils/mixedList.ts toListRows) -
  게임 = 풀폭 GameCompactCard 행 1개, 포스터 = 2개 페어 행(게임이 끼면 끊고
  빈 자리는 스페이서 View로 카드 폭 유지). 탐색·검색 모두 numColumns=2를 걷어내고
  행 렌더로 통일 - 도메인 단독 탭도 페어 행으로 렌더하지만 시각은 기존 2열
  그리드와 동일(게임 탭 가로 카드 유지). FlatList 가상화는 행 단위로 유지된다.
- S-FE2: era·upcoming 충돌은 웹 정책 미러 - era 선택 시 쿼리에서 upcoming 무시
  (upcomingOn 파생값) + 토글 disabled + "해당 기간 우선" 안내. 로컬 상태(URL이
  없는 앱의 단일 출처)는 지우지 않아 era 해제 시 토글이 복원된다. 활성 칩·개수
  뱃지도 파생값 기준(웹의 파싱 정규화와 동일 결과).
- S-FE2: 모바일 ToggleSwitch 신설 - 웹 ui/ToggleSwitch(36x21 트랙 + 16px 노브)
  수치 이식, Pressable + accessibilityRole="switch". SheetGroup title도 웹 편차와
  같은 이유로 string -> ReactNode 완화.
- S-FE2: GameCompactCard 썸네일 폴백은 웹 svg 에셋 대신 Phosphor GameController
  (M-A 관례 준수). 검색은 도메인 칩으로 게임만 좁혀도 웹과 동일하게 컴팩트 행
  유지(웹 search-page가 groupMixedGrid를 무조건 적용하는 것의 미러).
