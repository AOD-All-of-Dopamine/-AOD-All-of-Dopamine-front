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
- [ ] 엔티티 3종 + 리포지토리 (api 모듈, ddl-auto 환경 확인)
- [ ] CollectionService: 목록(인기=like_count desc, 최신=created_at desc)/상세+조회수/CRUD/아이템/좋아요
- [ ] CollectionController: 위 API 계약 전부, 기존 에러 응답 관례
- [ ] 상세 items의 도메인별 표시 필드 - WorkApiService 보강 로직 재사용(중복 구현 금지)
- [ ] 테스트: 기존 docs 테스트 관례(RestDocs 존재 시) 또는 서비스 슬라이스 테스트 - 좋아요 멱등, 중복 409, PRIVATE 403, 도메인 불일치 400 필수

### C-FE1. 프론트 공개 표면 (front 레포) - 구현 → 리뷰 → 수정
- [ ] types + collectionApi 클라이언트
- [ ] 발견 페이지 /collections (목업 1·5a): 탭(인기/최신/도메인/내 컬렉션), 콜라주 카드(포스터 3장+틴트 veil), 상태 3종
- [ ] 상세 페이지 /collections/:id (목업 2·5b): 좋아요(옵티미스틱, 로그인 게이트), 공유(URL 복사), 아이템 행+코멘트, 모바일 하단 좋아요 액션 바
- [ ] 내비: 웹 메뉴 +컬렉션, 모바일 하단 6탭(Stack 아이콘)
- [ ] 틴트 6종 토큰: index.css @theme에 콘텐츠 색으로 추가(tint-* 네임스페이스, UI 액센트 규율과 분리 명시)

### C-FE2. 프론트 소유 표면 (front 레포) - 구현 → 리뷰 → 수정
- [ ] 생성/편집 (목업 3·5c): 틴트 선택, 이름/설명, 공개 설정, 아이템 정렬(드래그)+코멘트 인라인+삭제, 저장
- [ ] 담기 (목업 4·5d): 웹 팝오버 + 모바일 바텀시트(탐색 필터 시트의 네이티브 dialog 패턴 재사용), 작품 카드·상세에 진입점, 담김 토스트
- [ ] 내 컬렉션 탭(발견 페이지 내) 연결

### 게이트 (태스크별 커밋 전)
- [ ] BE: 컴파일 + 테스트 그린 / FE: npm run build + grep 게이트(임의 hex·rounded-[·em-dash·비Phosphor 0)
- [ ] FE: 데스크톱+모바일(390px) 실화면 목업 대조 (오케스트레이터)
- [ ] E2E: 생성 → 담기 → 공개 상세 좋아요 → 발견 노출 (오케스트레이터)

## 비스코프 (백로그)

- 조회수 중복 방지(세션/IP 단위), 컬렉션 신고/숨김, 팔로우/구독, 컬렉션 검색, 커버 이미지 직접 업로드
- 홈에 인기 컬렉션 릴 노출 (기능 안착 후)

## 편차 기록

(구현·리뷰 중 발견 시 태스크 접두어와 함께 기록)
