# AOD 프론트 라이트 리디자인 Implementation Plan

> **For agentic workers:** 이 계획은 Phase 단위 루프로 실행한다. 각 반복: 체크박스 순서대로 구현 → 게이트 → 커밋 → 체크오프. 이 파일의 체크박스가 진행 상황의 단일 진실이다.

**Goal:** 15개 라우트를 라이트 테마·데스크톱 우선 UI로 전면 교체. `mockups/` 6장이 목표 상태, IA·라우트·API 계약 불변.

**Spec:** `docs/specs/2026-08-13-light-redesign-design.md`

**Tech:** React 18 + TS + Vite + Tailwind v4 + React Query v5. 아이콘 `@phosphor-icons/react` (신규 설치 필요).

**Branch:** `feature/light-redesign`

## Global Constraints

- **디자인의 단일 진실 = `mockups/`** — 리뷰 기준은 "목업과 같은가"
- **토큰 밖 스타일 금지**: 임의 hex, `rounded-[`, 팔레트 컬러 유틸 (스펙 §6 grep 게이트)
- **컴포넌트 선행**: Phase 2 이후 페이지에서 일회성 카드/버튼/칩 구현 금지 — 필요하면 공용 컴포넌트에 추가 후 사용
- **페이지 DoD** (스펙 §4): 목업 일치(3폭 스크린샷) + 상태 3종 + 실데이터 + URL 동기화 + a11y + reduced-motion
- **불가침**: 라우트 slug, API 계약, AuthContext, `/internal/ranking`(후속), 온보딩 로직

## 루프 실행 프로토콜

- **반복 단위 = Phase 1개.** 게이트 통과 없이 다음 Phase 진행 금지, 게이트 2연속 실패 시 중단·보고.
- **게이트 (매 Phase 공통)**: ① `npm run build` + `npx tsc --noEmit` 그린 ② 스펙 §6 grep 5종 0건 ③ Phase별 명시 게이트 ④ 스크린샷(1440/768/375) 촬영 후 편차 기록에 링크
- **커밋 규율**: Phase당 1~2 커밋. 스크린샷은 `docs/screenshots/<phase>/`에 저장.

---

### Phase 0: 기반 — 토큰 · 목업 커밋 · 안전망

- [ ] **0.1** `mockups/` 6장 + 본 스펙·플랜 커밋 (디자인 스펙으로 고정)
- [ ] **0.2** `index.css`: Vite 기본 다크 잔재 제거(`#242424`, `color-scheme: light dark` → `light`), 스펙 §2.1 토큰을 `@theme`으로 정의, 그림자·라운드 토큰 포함
- [ ] **0.3** `@phosphor-icons/react` 설치, 기존 아이콘 사용처 인벤토리 grep (교체는 각 Phase에서)
- [ ] **0.4** 게이트: 빌드 그린 + 앱이 라이트 배경으로 뜨는지 확인 (스타일 깨짐은 허용 — 이후 Phase에서 수복)

### Phase 1: 공통 셸 — Header · Footer · 레이아웃

- [ ] **1.1** `Header` 재작성: 64px 한 줄 (로고 AOD. / 홈·탐색·랭킹·신작 / 검색 / 로그인), sticky + blur — 목업 nav와 동일
- [ ] **1.2** `Footer` 신설 (홈 목업 하단), `PublicLayout`에 편입
- [ ] **1.3** 모바일: `< 1024px` 상단 메뉴 숨김 + 기존 `NavigationBar`(하단 탭) 토큰 재스킨 유지 (스펙 §5 결정 1)
- [ ] **1.4** 게이트: 15개 라우트 전부 새 셸로 렌더 + 콘솔 에러 0

### Phase 2: 공용 컴포넌트 (스펙 §2.3 인벤토리)

- [ ] **2.1** 카드류: `WorkCard(portrait|landscape)` `RailCard` `RankRow` `PodiumCard` `ReviewCard`
- [ ] **2.2** 컨트롤류: `Chip` `DomainChip` `GenreChip` `FilterGroup` `SortSelect` `SegmentedControl` `Pagination`
- [ ] **2.3** 표시류: `Tag` `StatPill` `DdayPill` `DeltaBadge` `EmptyState` `SkeletonCard`
- [ ] **2.4** 게이트: 각 컴포넌트가 목업의 대응 요소와 시각 일치(스토리 페이지 또는 임시 갤러리 라우트로 대조), hover·active·focus 상태 포함

### Phase 3: `/explore` (최대 가치 — 여기서 페이지 이식 표준 확립)

- [ ] **3.1** (백엔드 병행 확인) platforms OR 파라미터 — 준비 전이면 플랫폼 필터는 단일 선택으로 임시 처리하고 편차 기록
- [ ] **3.2** 필터 레일(도메인별 그룹 구성) + 칩 + 정렬 + 페이지네이션, `useWorks`/`useGenres`/`usePlatforms` 연결
- [ ] **3.3** URL 쿼리 동기화 (`?domain=&genres=&platforms=&sort=&page=`) — 새로고침·공유 복원
- [ ] **3.4** 상태 3종 + 게이트: DoD 전 항목, 목업 대조 스크린샷

### Phase 4: `/work/:id`

- [ ] **4.1** 헤더(포스터/통계 필/액션/볼 수 있는 곳) — 도메인별 변형(게임 가로 포스터·리뷰 요약 필) 컴포넌트 분기
- [ ] **4.2** 본문 2단: 시놉시스·리뷰(`useReviews`)·비슷한 작품 / 정보 패널(`domainInfo`·`platformInfo`)
- [ ] **4.3** 관심·좋아요 실연결(`useInteractions`), 게이트: DoD

### Phase 5: `/home`

- [ ] **5.1** 피처드 히어로(1+2) — 선정 로직은 임시(최신 인기)로 두고 TODO 명시
- [ ] **5.2** 신작 릴(`useRecentReleases`) · 리뷰 인용(`useRecentReviewedWorks`) · 랭킹 리스트 · 출시 예정(`useUpcomingReleases`)
- [ ] **5.3** 게이트: DoD + 섹션별 레이아웃 패밀리가 목업과 일치

### Phase 6: `/new` + `/ranking`

- [ ] **6.1** `/new`: 날짜 그룹 타임라인 + D-day + 도메인 칩 (신작·출시 예정 훅 연결)
- [ ] **6.2** (백엔드 병행 확인) 랭킹 수집 축 — 미지원 축(기간·기준)은 UI에서 숨기고 편차 기록
- [ ] **6.3** `/ranking`: 포디움 + 리스트 + 필터 4축 (rankingApi 연결)
- [ ] **6.4** 게이트: DoD

### Phase 7: 잔여 페이지 + 최종 게이트

- [ ] **7.1** `/search`, 로그인/회원가입/프로필 계열, 온보딩: 토큰·공용 컴포넌트 적용 (신규 레이아웃 없음, 폼 대비 AA 확인)
- [ ] **7.2** 죽은 스타일 제거: 구 다크 스타일·미사용 클래스·구 아이콘 라이브러리 의존성 제거
- [ ] **7.3** 최종 게이트: 스펙 §6 전체 (grep 5종 + 빌드) + 15개 라우트 스크린샷 일괄 + Lighthouse (홈·탐색 LCP<2.5s, CLS<0.1)

---

## 편차 기록

| 편차 | 사유 | 기록일 |
|---|---|---|
| | | |

## 스크린샷 원장

Phase별 `docs/screenshots/<phase>/` — 파일명 `<route>-<width>.png`.
