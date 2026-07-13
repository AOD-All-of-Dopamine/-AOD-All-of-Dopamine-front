# F3: 작품상세·검색·탐색 (핵심 소비 루프) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (인라인, 사용자 선호).

**Goal:** 카드 탭→작품 상세→리뷰·좋아요·북마크, 검색, 탐색(필터+무한스크롤)까지 — 스펙 F3 완료 기준 충족. 홈의 "준비 중" 알림을 실제 라우팅으로 교체.

**Architecture:** 데이터는 전부 @aod/shared 훅(웹과 동일 — 상세: useWorkDetail/useReviews/useLikeStats/useBookmarkStatus + toggle 4종, 검색: useSearchWorks, 탐색: useInfiniteWorks+useGenresWithCount). 스타일 tokens.ts. 스펙: `2026-07-11-mobile-app-monorepo-design.md`

## Global Constraints (F2와 동일 + 추가)

- 웹·shared 기존 파일 무수정. 브랜치 `feature/f1-expo-bootstrap` 이어서.
- 비로그인 보호 동작은 웹과 동일: 좋아요/싫어요/북마크 시 로그인 유도(Alert 2버튼 → /login).
- 좋아요·싫어요 상호 배타 로직 웹 미러 (disliked면 dislike 먼저 해제 후 like).
- 게이트: typecheck·test·export + 에뮬레이터 스크린샷.

## Tasks

### T1: 작품 상세 `/work/[id]` + 홈 연결
- Create `apps/mobile/src/app/work/[id].tsx`: 헤더(뒤로/제목), 포스터(도메인 비율 — 웹 imageAspectMap 미러: movie·tv 2/3, game 21.5/10, webtoon 19/25, webnovel 17/25), 제목·도메인·연도·★평점(리뷰 수), 액션 행(좋아요/싫어요/북마크 — 카운트·활성 상태 표시), 탭(정보=synopsis 접기/펼치기+플랫폼 라벨 칩 / 리뷰=목록+내 리뷰 강조)
- **v1 의도적 축소(문서화):** 웹의 domainInfo 필드 상세표(field-labels util)·FlyingIcon 애니메이션·공유·리뷰 작성/수정은 F4. 리뷰 삭제는 포함(내 리뷰만).
- WorkCard에 `width`·`imageHeight` optional props 추가(그리드 재사용)
- 홈 `notReady` → `router.push('/work/'+id)` 교체 (랭킹·캐러셀)
- 게이트: 에뮬레이터에서 홈 카드 탭→상세 로드

### T2: 검색 `/search` + 홈 검색바 연결
- Create `apps/mobile/src/app/search.tsx` (modal presentation — 스펙 §6): TextInput(autoFocus, 제출 시 검색) + DOMAIN_FILTERS 탭 + 3열 그리드(FlatList numColumns=3, WorkCard 유동폭) + **"더 보기" 페이지 누적**(웹 숫자 페이지네이션의 모바일 대체 — 의도적 차이)
- 홈 검색바 → `router.push('/search')`

### T3: 탐색 탭 교체
- Rewrite `(tabs)/explore.tsx`: 도메인 탭 5개(기본 game — 웹 동일) + 장르 칩 가로스크롤(useGenresWithCount 내림차순, 다중선택) + 플랫폼 칩(DOMAIN_PLATFORMS+PLATFORM_LABELS — 로고는 웹 전용이라 라벨만, 의도적 차이) + useInfiniteWorks(size 60, sortBy releaseDate) 그리드 + onEndReached
- URL 동기화(웹 searchParams)는 모바일 무의미 — 로컬 state만 (의도적 차이)

### T4: 검증 + 푸시
- typecheck·test·export·웹 무회귀, 에뮬레이터 플로우 스크린샷(홈→상세→리뷰 탭, 검색, 탐색 필터), 커밋·푸시

## Self-Review
- 스펙 F3 완료 기준 "필터→상세→리뷰·좋아요·북마크 동작" 충족. 비로그인 보호 웹 패턴 유지.
- 의도적 차이 목록: 더보기 페이지네이션, 플랫폼 로고 생략, URL 동기화 생략, field-labels 상세표·공유·리뷰작성 F4 이관.
