# 컬렉션 기능 플랜 (2026-08-15)

사용자 승인 목업: `mockups/collections-mockup.html` (웹 4표면 + 모바일 4표면 + 6탭 확정 "일단 이대로 가보자").
신규 기능 - 코드베이스에 컬렉션 관련 구현 없음(확인 완료). 백엔드(back 레포) → 프론트 순서.

## 제품 결정 (확정)

- 컬렉션은 도메인 단위(게임/웹툰/영화·시리즈/웹소설)로 생성, 공개/나만 보기 선택
- 공개 컬렉션은 발견 페이지에 노출, 타 사용자가 좋아요·조회
- 커버 = 담긴 작품 포스터 콜라주(저장 안 함, 조회 시 파생) + 큐레이터가 고른 틴트 6종
- 작품마다 큐레이터 한 줄 코멘트(선택, 200자)
- 정렬은 큐레이터가 정한 순서(position)
- 내비: 웹 상단 메뉴 5개(+컬렉션), 모바일 하단 6탭(홈·탐색·컬렉션·랭킹·신작·프로필)

## 데이터 모델 (back, api 모듈 - 리뷰/상호작용과 같은 사용자 소유 데이터 패턴)

```
collections
  id BIGSERIAL PK
  user_id FK -> users (작성자)
  title VARCHAR(60) NOT NULL
  description VARCHAR(300)
  domain VARCHAR(16) NOT NULL        -- Domain enum명 (MOVIE/TV/GAME/WEBTOON/WEBNOVEL)
  tint VARCHAR(16) NOT NULL DEFAULT 'PINE'   -- PINE/OLIVE/SLATE/TERRACOTTA/MOCHA/PLUM
  visibility VARCHAR(10) NOT NULL DEFAULT 'PUBLIC'  -- PUBLIC/PRIVATE
  like_count INT NOT NULL DEFAULT 0  -- 비정규화 (인기 정렬용)
  view_count BIGINT NOT NULL DEFAULT 0
  created_at / updated_at

collection_items
  id BIGSERIAL PK
  collection_id FK (cascade delete)
  content_id FK -> contents
  comment VARCHAR(200)
  position INT NOT NULL
  created_at
  UNIQUE(collection_id, content_id)

collection_likes
  collection_id FK + user_id FK, UNIQUE(collection_id, user_id)
  created_at
```

주의: User는 api 모듈 소유(shared 아님) - Collection 엔티티는 api 모듈에 둔다.
@MapsId 규칙 비해당(공유 PK 아님). 대용량 조회는 Pageable(Slice/Page), unpaged 금지.

## API 계약

인증: 기존 패턴(Authorization 헤더 + JwtTokenProvider.extractUsername). 비로그인 열람 허용 표면은 헤더 optional.

- `GET /api/collections?sort=popular|latest&domain=&page=&size=` - 공개 컬렉션 목록.
  응답 항목: id, title, description, domain, tint, likeCount, viewCount, itemCount,
  curatorNickname, coverPosters(상위 3개 포스터 URL), likedByMe(로그인 시)
- `GET /api/collections/mine` - 내 컬렉션 (비공개 포함, 로그인 필수)
- `GET /api/collections/{id}` - 상세 + 조회수 +1 (PRIVATE는 소유자만 403).
  항목: 목록 필드 + items[](contentId, title, posterUrl, releaseDate, creator,
  domain별 표시 필드는 기존 WorkSummary 보강 로직 재사용, comment, position)
- `POST /api/collections` {title, description, domain, tint, visibility}
- `PATCH /api/collections/{id}` (소유자만) / `DELETE /api/collections/{id}`
- `POST /api/collections/{id}/items` {contentId, comment?} - 말미 position, 도메인 불일치 400, 중복 409
- `PATCH /api/collections/{id}/items/{itemId}` {comment?, position?} / `DELETE .../items/{itemId}`
- `PUT /api/collections/{id}/items/order` {itemIds: []} - 일괄 재정렬
- `POST /api/collections/{id}/like` / `DELETE .../like` - 멱등, like_count 원자 갱신
- 담기 팝오버용: `GET /api/collections/mine/summary?contentId=` - 내 컬렉션 + 각각에 해당 작품 포함 여부

조회수는 GET 상세마다 +1 (중복 방지 없음 - 한계로 문서화, 백로그).

## 태스크

### C-BE. 백엔드 (back 레포) - 구현 → 리뷰 → 수정
- [x] 엔티티 3종 + 리포지토리 (api 모듈, ddl-auto 환경 확인)
- [x] CollectionService: 목록(인기=like_count desc, 최신=created_at desc)/상세+조회수/CRUD/아이템/좋아요
- [x] CollectionController: 위 API 계약 전부, 기존 에러 응답 관례
- [x] 상세 items의 도메인별 표시 필드 - WorkApiService 보강 로직 재사용(중복 구현 금지)
- [x] 테스트: 기존 docs 테스트 관례(RestDocs 존재 시) 또는 서비스 슬라이스 테스트 - 좋아요 멱등, 중복 409, PRIVATE 403, 도메인 불일치 400 필수

### C-FE1. 프론트 공개 표면 (front 레포) - 구현 → 리뷰 → 수정
- [x] types + collectionApi 클라이언트
- [x] 발견 페이지 /collections (목업 1·5a): 탭(인기/최신/도메인/내 컬렉션), 콜라주 카드(포스터 3장+틴트 veil), 상태 3종
- [x] 상세 페이지 /collections/:id (목업 2·5b): 좋아요(옵티미스틱, 로그인 게이트), 공유(URL 복사), 아이템 행+코멘트, 모바일 하단 좋아요 액션 바
- [x] 내비: 웹 메뉴 +컬렉션, 모바일 하단 6탭(Stack 아이콘)
- [x] 틴트 6종 토큰: index.css @theme에 콘텐츠 색으로 추가(tint-* 네임스페이스, UI 액센트 규율과 분리 명시)

### C-FE2. 프론트 소유 표면 (front 레포) - 구현 → 리뷰 → 수정
- [x] 생성/편집 (목업 3·5c): 틴트 선택, 이름/설명, 공개 설정, 아이템 정렬(드래그)+코멘트 인라인+삭제, 저장
- [x] 담기 (목업 4·5d): 웹 팝오버 + 모바일 바텀시트(탐색 필터 시트의 네이티브 dialog 패턴 재사용), 작품 카드·상세에 진입점, 담김 토스트
- [x] 내 컬렉션 탭(발견 페이지 내) 연결

### 게이트 (태스크별 커밋 전)
- [ ] BE: 컴파일 + 테스트 그린 / FE: npm run build + grep 게이트(임의 hex·rounded-[·em-dash·비Phosphor 0)
- [ ] FE: 데스크톱+모바일(390px) 실화면 목업 대조 (오케스트레이터)
- [ ] E2E: 생성 → 담기 → 공개 상세 좋아요 → 발견 노출 (오케스트레이터)

## 비스코프 (백로그)

- 조회수 중복 방지(세션/IP 단위), 컬렉션 신고/숨김, 팔로우/구독, 컬렉션 검색, 커버 이미지 직접 업로드
- 홈에 인기 컬렉션 릴 노출 (기능 안착 후)

## 편차 기록

(구현·리뷰 중 발견 시 태스크 접두어와 함께 기록)

- C-BE: 컬렉션/작품/아이템 미존재는 404로 응답 (계약 미명시 구간 — 검증 실패 400·권한 403·중복 409는 계약대로). 에러 본문은 기존 관례 `{"error": 메시지}` 유지.
- C-BE: 인증 필요 엔드포인트에서 토큰 부재/무효는 401 (ReviewController는 400이었으나 상태코드 구분을 도입하면서 정확한 코드로).
- C-BE: 응답에 계약 외 필드 추가 — 목록·상세에 `visibility`(내 컬렉션 배지용)·`createdAt`, 상세에 `owner`(편집 진입 판단)·`updatedAt`, items에 `itemId`(아이템 수정/삭제 경로용)와 `score`·`genres`·`platforms` 등 WorkSummary 보강 필드 전체.
- C-BE: `GET /mine/summary?contentId=`는 해당 작품 도메인의 내 컬렉션만 반환 (타 도메인 컬렉션엔 어차피 담기 불가 — 400).
- C-BE: PATCH 컬렉션에서 domain 변경 미지원 (담긴 아이템 정합성 때문 — title/description/tint/visibility만 수정 가능).
- C-BE: PRIVATE 컬렉션 좋아요도 소유자 외 403 (상세 403과 일관).
- C-BE: 아이템 단건 PATCH의 position은 직접 설정(주변 시프트 없음) — 드래그 재정렬은 `PUT .../items/order` 사용 전제.
- C-BE: 좋아요/취소 응답은 기존 LikeService Map 관례 `{collectionId, liked, likeCount}`.
- C-BE: (구현 중 발견) back 레포 미추적 테스트 2건이 main 코드와 어긋나 테스트 스위트가 사전 실패 상태였음 — WorkControllerDocsTest(getWorks 시그니처 5→4 인자), InteractionControllerDocsTest(WorkSummaryDTO 2026-08 확장 9필드 미문서화). 로컬 워킹트리에서 수정해 그린 확보, 미추적 파일 정책상 커밋엔 미포함.
- C-BE: (리뷰 반영) Collection 엔티티 @DynamicUpdate + like_count/view_count `updatable=false` — PATCH의 dirty checking 전 컬럼 UPDATE가 카운트 증가분을 덮어쓰는 lost update를 구조적으로 차단(쓰기 경로는 JPQL 원자 증감만). 인증 헤더 부재도 401 관례로 통일, addItem의 exists→save 경합은 saveAndFlush + DataIntegrityViolationException catch로 409, sort 파라미터도 popular/latest 외 400.
- C-BE: unlike는 requireVisible 미적용 비대칭 — 컬렉션이 비공개로 전환된 뒤에도 자신의 좋아요 제거는 허용 (의도).
- C-BE: position 말미 산정(MAX+1)은 동시 추가 시 중복 position 가능하나 정렬이 ORDER BY position, id라 무해 (소유자 단일 조작 전제).
- C-BE: like_count/view_count의 DB 기본값(columnDefinition default)은 명목상 — 실제 삽입은 항상 JPA 경유라 Java 초기값(0)으로만 세팅됨 (비일관 인지).
- C-BE: POST 생성/아이템 추가 응답은 201이 아닌 200 (기존 컨트롤러 관례 추종).
- C-FE1: 컬렉션 목록/상세 조회는 privateApi로 호출 - 인터셉터가 토큰이 있을 때만 Authorization을 붙이므로 비로그인 열람이 유지되면서 로그인 시 likedByMe가 반영됨 (publicApi/privateApi 이원 관례 안에서의 선택).
- C-FE1: "영화·시리즈" 탭은 목록 API가 domain 단수만 받아 MOVIE·TV 2요청을 같은 페이지 번호로 발사해 병합(서버 정렬 스펙과 동일 비교자로 클라이언트 재정렬, totalPages는 둘 중 최대). 페이지 경계를 넘는 전역 정렬은 근사치 - 컬렉션 수가 적은 초기 수용, 통합 domain 파라미터는 백로그.
- C-FE1: 도메인 탭의 정렬은 인기순 고정 (목업 탭이 단일 선택이라 인기/최신 정렬 축과 조합 불가).
- C-FE1: MOVIE·TV 컬렉션의 도메인 라벨은 둘 다 "영화·시리즈"로 표기 (제품 결정의 4단위 노출, 데이터는 분리 저장).
- C-FE1: "새 컬렉션"(발견)·"편집"(상세 owner) 진입점은 라우팅만 - /collections/new·/collections/:id/edit는 404 방지용 자리 라우트(collection-wip-page, "준비 중" 안내 + 컬렉션 복귀 링크)로 받고 C-FE2가 실제 페이지로 교체. 모바일 편집 진입점은 상세 상단 바 아이콘(목업 5b에는 없던 자리).
- C-FE1: 상세 "비슷한 컬렉션" 섹션 생략 - 추천 API 부재 (work-detail의 비슷한 작품 생략 전례와 동일).
- C-FE1: 모바일 액션 바의 "담긴 작품 전부 관심 등록" 고스트 버튼 생략 - 일괄 북마크 API 부재, 좋아요 버튼만 배치. 공유는 목업대로 모바일 상단 바 아이콘.
- C-FE1: 좋아요 성공 후 상세 쿼리를 invalidate하지 않고 서버 응답값(liked/likeCount)을 캐시에 직접 반영 - 상세 재조회가 조회수를 +1 시키는 부작용 회피. 목록 캐시(["collections"])만 invalidate.
- C-FE1: 상세(/collections/:id)는 하단 탭 바 미노출 - showNav의 /collections는 정확 일치 매칭만, 상세는 work-detail 문법(자체 상단 바 + 고정 액션 바 + <lg SiteHeader 숨김) 재사용. 좋아요 버튼은 목업의 accent-ink 채움을 유지하고 liked 상태는 하트 fill/regular + aria-pressed로 전달.
- C-FE1: 아이템 행 전체를 /work/:id 링크로 (목업은 정적 행 - 작품 상세 진입 동선 추가). 행의 도메인별 표시는 CollectionItem을 WorkSummary 형태로 변환해 workCardInfo 파생 로직(meta/footer) 재사용.
- C-FE2: 담기 진입점은 작품 상세만 (lg+ 액션 행의 "담기" 고스트 필 + 팝오버, <lg 액션 바 4번째 아이콘 + 바텀시트) - 탐색/검색 카드에는 이번 라운드 미부착 (카드 어수선 방지, 백로그).
- C-FE2: 빼기 토글은 mine/summary 계약에 itemId가 없어 상세 1회 조회로 itemId를 해석 (캐시된 상세가 있으면 재사용, 없으면 조회수 +1 부작용). contentId 기반 삭제 또는 summary에 itemId 포함은 백엔드 백로그.
- C-FE2: 담기 메뉴 행 썸네일은 포스터 2장 대신 틴트 스와치 + Stack 아이콘 - mine/summary 계약(MyCollectionSummaryDTO)에 커버 포스터가 없다.
- C-FE2: 이미 담긴 작품을 재담기 시(409, 타 탭 경합 등) mine-summary를 재조회로 동기화하고 "이미 담겨 있는 작품이에요" 토스트.
- C-FE2: 생성 폼의 도메인 선택지는 5종(영화/시리즈 분리) - 서버 domain이 Domain enum 단수라 "영화·시리즈" 통합 선택 불가 (표기는 발견/상세에서 통합). 담기 메뉴의 "새 컬렉션 만들기"는 ?domain= 프리필로 진입하며, 생성 후 원 작품 자동 담기는 하지 않는다 (백로그).
- C-FE2: 생성 성공 후 편집 화면으로 이동(replace) - 빈 컬렉션의 작품 추가 안내 동선이 편집에 있다 (플랜의 "편집 화면 or 상세" 중 전자).
- C-FE2: 편집은 드래프트 방식 - 아이템 제거도 저장 시점 일괄(DELETE, 404는 멱등 통과)로 미뤄 취소가 전부 복원되게 했다 (플랜의 저장 일괄 목록에 제거를 추가). 저장 순서: 제거 DELETE → PUT order(상대 순서 바뀐 경우만) → 코멘트 PATCH(바뀐 것만) → 메타 PATCH(바뀐 필드만). 실패 시 드래프트 유지 + 에러 배너 + 재시도(전 연산 멱등이라 전체 재실행 안전).
- C-FE2: 저장 성공 후 상세 캐시는 invalidate 대신 드래프트 값으로 직접 보정 - 재조회가 조회수를 +1 시키는 부작용 회피 (C-FE1 좋아요 전례). 목록 캐시(["collections"])는 invalidate.
- C-FE2: 정렬은 드래그(핸들 기준 HTML5 DnD)에 위/아래 버튼을 병행 - 키보드/터치 접근성 (목업은 핸들만).
- C-FE2: 데스크톱 편집 좌측 패널에도 커버 미리보기 추가 (목업 3엔 없고 5c에만 있던 요소) - 체크리스트 "커버 미리보기(틴트 즉시 반영)" 충족, 순서 변경도 즉시 반영.
- C-FE2: 컬렉션 삭제 버튼은 편집 좌측 패널 하단 (목업에 없던 진입점, 플랜 범위) - ConfirmDialog 경유 DELETE 후 발견 페이지로 replace 이동.
- C-FE2: 편집의 "이번 주 N개 추가" 성장 메타 생략 - 주간 집계 데이터가 없다. "N작품 · 좋아요 N개 받는 중"만 표시. "작품 추가" 행은 검색/관심 목록 골라 담기 대신 탐색(도메인 프리필) 링크.
- C-FE2: 편집 진입도 상세 GET을 쓰므로 진입마다 조회수 +1 (아이템 목록이 필요 - 조회수 중복 방지 백로그와 같은 한계로 수용). 비로그인은 조회 자체를 막고 로그인 게이트 표시.
- C-FE2: 생성/편집 라우트는 <lg에서 SiteHeader를 숨기고 자체 상단 바(X + 저장) 사용 (목업 5c) - public-layout에 isOwnShellRoute 추가, 상세와 달리 하단 고정 바가 없어 푸터 여백 규칙은 미적용.
- C-FE1: (리뷰 반영 Minor 4건) ①좋아요 실패 시 상세 토스트로 안내(401은 로그인 유도 문구, 훅은 롤백만·안내는 호출부 mutate 콜백) ②상세 쿼리 retry 커스텀 - 4xx는 즉시 포기해 403/404 화면 지연(~7초) 제거 ③public-layout 상세 매칭의 숫자 id 검증 제거(work/:id 문법과 정합) - 비숫자 id에서 <lg SiteHeader·페이지 상단 바 이중 렌더 해소, 정적 new만 제외 ④카드 제목 truncate 제거(목업 .col-title대로 다중행 허용).
