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

- [x] **0.1** `mockups/` 6장 + 본 스펙·플랜 커밋 (디자인 스펙으로 고정) — 7884034
- [x] **0.2** `index.css`: Vite 기본 다크 잔재 제거(`#242424`, `color-scheme: light dark` → `light`), 스펙 §2.1 토큰을 `@theme`으로 정의, 그림자·라운드 토큰 포함. 전역 스크롤바 숨김도 제거(웹 표준 스크롤 — `.scrollbar-hide` 유틸은 릴용으로 유지)
- [x] **0.3** `@phosphor-icons/react` 설치. 기존 외부 아이콘 라이브러리 의존 0건 확인 (인라인 SVG는 각 Phase에서 교체)
- [x] **0.4** 게이트: `npm run build`(tsc+vite) 그린 + dev 서버(포트 3000) 스크린샷으로 라이트 캔버스 확인 — `docs/screenshots/phase0/home-1512-light-canvas-legacy-components.jpg` (기존 컴포넌트는 자체 다크 스타일 잔존 — 예정된 상태)

### Phase 1: 공통 셸 — Header · Footer · 레이아웃

- [x] **1.1** `SiteHeader` 신설: 64px 한 줄 (로고 AOD. / 홈·탐색·랭킹·신작 NavLink / 검색 필→/search / 로그인·내 정보), sticky + blur. 기존 `Header`(페이지 앱바)는 rename 대신 유지 + `lg:hidden` — 12개 페이지가 back/title 계약으로 사용 중이라 페이지 이식 시 개별 제거 (편차 기록 참조)
- [x] **1.2** `SiteFooter` 신설, `PublicLayout`에 SiteHeader/SiteFooter 편입 + flex 컬럼 구조
- [x] **1.3** `NavigationBar` 토큰 재스킨(surface/line/accent, `lg:hidden`) — 모바일 하단 탭 유지. 홈의 `SearchBar`(자체 고정 다크 검색바)도 `lg:hidden` 전환기 처리
- [x] **1.4** 게이트: 빌드+tsc 그린, home/explore/ranking/new/search/login/profile 렌더 + 콘솔 에러 0 — `docs/screenshots/phase1/home-1512-new-shell.jpg`

### Phase 2: 공용 컴포넌트 (스펙 §2.3 인벤토리)

- [x] **2.1** 카드류: `WorkCard(portrait|landscape)` `RailCard` `RankRow(panel|feature+accent)` `PodiumCard` `ReviewCard` (+공용 `cardStyles.ts`)
- [x] **2.2** 컨트롤류: `Chip` `DomainChip(md|lg)` `GenreChip` `FilterGroup(checkbox|radio 판별 유니언)` `SortSelect` `SegmentedControl` `Pagination` (+`SoonBadge`)
- [x] **2.3** 표시류: `Tag(canvas|surface)` `StatPill` `DdayPill` `DeltaBadge` `EmptyState` `SkeletonCard(aria-hidden)`
- [x] **2.4** 게이트: 스펙 리뷰(목업 CSS 수치 대조, 이슈 6건 수정 후 ✅) + 품질 리뷰(11건 수정 후 ✅ Approved) + 기계 게이트 grep 0건 + 빌드·tsc 그린 + `/dev/components` 갤러리 DOM 렌더 검증(접근성 트리). 픽셀 스크린샷은 브라우저 뷰포트 0x0(창 최소화)으로 보류 — Phase 3 게이트에서 재시도

### Phase 3: `/explore` (최대 가치 — 여기서 페이지 이식 표준 확립)

- [x] **3.1** platforms OR 미지원 확인(백엔드 `@>` 실코드 검증) → 플랫폼 필터 단일 선택(radio) 임시 처리 + "준비 중" 항목(SOON_PLATFORMS, API 목록 도착 시 자동 은퇴)
- [x] **3.2** 필터 레일(도메인별 구성, 백엔드 지원 축만) + 칩 + 페이지네이션. 정렬은 서버가 sortBy를 버려 정적 라벨 "최신 출시순"으로 (편차 기록)
- [x] **3.3** URL 쿼리 단일 출처(`?domain=&genres=&platform=&page=`) — 직접 진입·새로고침·뒤로가기 복원, 히스토리 정책(탭·페이지=push, 필터=replace, no-op 가드) 확립
- [x] **3.4** 상태 3종(스켈레톤 그리드/EmptyState/에러 EmptyState+재시도) + 게이트: 스펙 리뷰 ✅(목업 수치 전수 대조, 편차 7건 백엔드 실코드 확정 승인) + 품질 리뷰 ✅(I-2건·M-5건 반영) + grep 0건 + 실브라우저 확인(게임 landscape 4열·웹툰 portrait 5열 전환, URL 동기화) — `docs/screenshots/phase3/`

### Phase 4: `/work/:id`

- [x] **4.1** 헤더(포스터 도메인 분기/통계 필 실데이터만/액션 3버튼/볼 수 있는 곳) — 게임=가로 포스터+Steam 리뷰 요약 % 필(한글화 9종). Tag accent variant·ConfirmDialog(네이티브 dialog) ui 추가
- [x] **4.2** 본문 2단: 시놉시스·리뷰(useReviews+keepPreviousData 누적 로드)·정보 패널(domainInfo 한글화, 고정 키 순서). 비슷한 작품은 추천 API 부재로 생략(편차)
- [x] **4.3** 관심·좋아요 실연결 + 게이트: 품질 리뷰가 **Critical 1건 적발·수정**(좋아요 전환 이중 발사 → 경합 시 서버에 DISLIKE 기록 가능 — 단독 발사로 수정, 옵티미스틱을 서버 상태기계(userLikeType 전이)와 1:1 정렬, LikeStats 타입을 서버 실응답으로 교정). 이중 리뷰 승인 + StrictMode 유령 close 가드 실브라우저 검증(다이얼로그 유지·ESC·포커스 복원) + grep 0건 + 빌드 그린 — `docs/screenshots/phase4/`

### Phase 5: `/home`

- [x] **5.1** 피처드 히어로(1+2) — 임시 선정(최근 리뷰작 1+신작 2, TODO 명시), 하위 섹션 중복 제외, FeatureCard ui 신설
- [x] **5.2** 신작 릴(RailCard+scrollbar-rail·snap) · 리뷰 인용(ReviewQuoteCard 신설 — 인용문·닉네임은 API 부재로 생략 편차) · 이번 주 인기(useAllRankings 훅 신설, 외부 랭킹 라운드 로빈 6개, RankRow feature) · 출시 예정(UpcomingCard 신설, D-day 클라 계산·과거 제외) · SearchBar 토큰 재스킨(모바일 전용 유지)
- [x] **5.3** 게이트: 스펙 리뷰 ✅(목업 수치 대조, 편차 6건 실코드 승인) + 품질 리뷰 ✅(I-2건: FeatureCard 마크업 유효성·헤딩 아웃라인(sr-only h1), SearchBar 전환기 배경 + M-6건 반영) + grep 0건 + 빌드 그린 + 실브라우저(히어로 2fr+1fr·릴·섹션 독립 스켈레톤) — `docs/screenshots/phase5/`

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
| Phase 1: 기존 `Header` 재작성 대신 `SiteHeader` 신설 + 구 Header `lg:hidden` 전환기 유지 | 구 Header는 12개 페이지가 back/title 앱바로 사용 — 일괄 재작성은 페이지 계약 파괴. 데스크톱=새 셸, 모바일=기존 UX 유지 후 페이지 이식 시 개별 제거 | 2026-08-13 |
| Phase 1: 홈 `SearchBar`도 `lg:hidden` 전환기 처리 | 홈은 구 Header 대신 자체 고정 검색바 사용 — 데스크톱에서 SiteHeader와 겹침 | 2026-08-13 |
| Phase 3: 정렬 셀렉트 → 정적 라벨 "최신 출시순" | 백엔드 getWorks가 모든 필터 경로에서 sortBy 무시(release_date DESC 고정) — 스펙 §7 정렬 결정 대기 | 2026-08-13 |
| Phase 3: 플랫폼 필터 단일 선택(radio) | `platforms @>` = AND 시맨틱, OR 미지원 — §7 배열 겹침 파라미터 추가 시 checkbox 복원 | 2026-08-13 |
| Phase 3: 영화 OTT 필터·웹툰 상태/요일/연령·출시 시기 필터 미렌더 | usePlatforms가 수집 소스만 반환, findWorks에 도메인 컬럼·날짜 범위 파라미터 부재 — §7 백엔드 트랙 | 2026-08-13 |
| Phase 3: 카드에 장르 태그·제작자·리뷰% 미표시 | WorkSummary가 id/domain/title/thumbnail/score/releaseDate만 제공 — summary API 확장 후 목업 완전체 | 2026-08-13 |
| Phase 3: 페이지 전환 시 스켈레톤 유지(placeholderData 미사용) | 도메인 전환 잔상 방지 우선 — 의도적 트레이드오프 (코드 헤더 주석 기록) | 2026-08-13 |

## 스크린샷 원장

Phase별 `docs/screenshots/<phase>/` — 파일명 `<route>-<width>.png`.
