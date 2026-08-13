# AOD 프론트 라이트 리디자인 — 설계 스펙

- 날짜: 2026-08-13
- 상태: 목업 승인됨 (`mockups/` 6장이 디자인의 단일 진실)
- 모드: **Redesign - Overhaul** (시각 전면 교체, IA·라우트·API 계약 보존)
- 실행 방식: 루프 엔지니어링 (반복 단위·게이트·중단 조건은 implementation plan 참고)

## 1. 목표

앱 스타일의 다크 기본 UI를 **라이트 테마, 데스크톱 우선(웹다운) UI**로 전면 교체한다.
`mockups/` 의 6개 HTML(홈·탐색·랭킹·신작·상세 3변형)이 목표 상태이며, 모든 페이지 리뷰 기준은
"목업과 같은가"이다. 라우트 15개, React Query 훅, API 계약은 변경하지 않는다.

### 스코프 제외
- AOD 내부 랭킹 (`/internal/ranking`) — 유저 데이터 축적 후 후속 (목업에서 의도적으로 제외됨)
- 다크모드 — 토큰 구조만 준비, 라이트 우선 출시 (아래 §5 결정 2)
- 온보딩 플로우 재설계 — 토큰만 입힘
- 백엔드 API 변경 — 별도 트랙 (§7)

## 2. 디자인 시스템 (목업에서 추출한 단일 진실)

### 2.1 토큰 (Tailwind v4 `@theme`)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-bg` | `#f7f6f4` | 페이지 배경 (웜 뉴트럴, 순백 금지) |
| `--color-surface` | `#fdfdfc` | 카드·패널·내비 표면 |
| `--color-border` | `#e7e5e1` | 기본 테두리 |
| `--color-border-strong` | `#d8d5cf` | 호버 테두리 |
| `--color-ink` | `#1c1b19` | 본문 텍스트 (순흑 금지) |
| `--color-ink-2` | `#716f6a` | 보조 텍스트 |
| `--color-ink-3` | `#9c9993` | 힌트·비활성 |
| `--color-accent` | `#e2542c` | 유일한 액센트 (번트 오렌지) |
| `--color-accent-ink` | `#b23d1c` | 액센트 텍스트·호버 |
| `--color-accent-tint` | `#faeee9` | 액센트 배경 틴트 (칩·뱃지) |
| `--color-star` | `#d9930d` | 별점 전용 (시맨틱 예외) |

그림자 2단계(`shadow`, `shadow-lift`)는 배경 색조로 틴트(`rgb(58 48 40 / …)`), 순흑 그림자 금지.

### 2.2 고정 규칙
- **필터 출처 규율**: 필터 축은 **contents 마스터 컬럼(genres/platforms/release_date) +
  도메인 엔티티 컬럼(status/weekday/ageRating 등)만** 허용. `platform_data.attributes`(JSONB)
  필드는 필터 축 금지 — 표시(카드의 리뷰 %, 무료 뱃지, 평점)로만 사용한다.
  attr 기반 축이 필요해지면 genres/platforms 전례처럼 **컬럼 승격이 선행**돼야 한다.
- **라운드**: 카드·패널 12px, 입력 8px, 칩·태그·버튼 pill — 예외 없음
- **폰트**: Pretendard Variable (자가호스팅 유지). 디스플레이 세리프 금지
- **아이콘**: Phosphor 단일 (`@phosphor-icons/react`), strokeWidth 통일. 손그림 SVG 금지
- **액센트 규율**: 액센트 1개. 앰버=별점, 레드=폼 에러만 시맨틱 허용. 그 외 컬러 유틸 금지
- **em-dash(—) 표시 텍스트 금지**, 중점(·)은 한 줄에 1개까지
- **칩 위계**: 1차(도메인 등) 활성=다크, 2차(장르 등) 활성=액센트 틴트
- 내비 64px 한 줄, 컨테이너 페이지별 max-w(탐색 1440 / 홈 1280 / 상세 1200 / 랭킹·신작 1080)

### 2.3 공용 컴포넌트 인벤토리 (Phase 2에서 선행 구현, 이후 일회성 구현 금지)

`WorkCard(portrait|landscape)` · `Tag` · `Chip(removable)` · `DomainChip` · `GenreChip` ·
`FilterGroup(checkbox|radio)` · `SortSelect` · `SegmentedControl` · `Pagination` · `StatPill` ·
`ReviewCard` · `RailCard` · `RankRow` · `PodiumCard` · `DdayPill` · `DeltaBadge` ·
`EmptyState` · `SkeletonCard` · `Header` · `Footer` · `DomainTabs`

## 3. 페이지별 목표 (라우트 → 목업 매핑)

| 라우트 | 목업 | 핵심 |
|---|---|---|
| `/explore` | explore-light-mockup.html | 좌측 256px sticky 필터 레일 + 도메인별 카드 그리드(게임 가로 4열, 그 외 세로 5열), 칩, 페이지네이션. 필터 구성 — 게임: 장르/플랫폼/출시 시기, 웹툰: 장르/플랫폼/상태/요일/연령, 영화: 장르/OTT/개봉 시기 (전부 마스터·도메인 컬럼) |
| `/work/:id` | work-detail-mockup.html (3변형) | 포스터+통계 필+액션 3버튼, 2단 본문(시놉시스·리뷰·비슷한 작품 / 정보 패널) |
| `/home` | home-light-mockup.html | 피처드 히어로(1+2) → 신작 릴 → 리뷰 인용 카드 → 랭킹 리스트 → 출시 예정 (섹션별 레이아웃 패밀리 상이) |
| `/new` | new-releases-mockup.html | 날짜 그룹 타임라인 + 출시 예정 D-day, 도메인 칩 필터 |
| `/ranking` | ranking-mockup.html | 톱3 포디움 + 4위~ 리스트, 필터 5축(도메인/**플랫폼**(네이버웹툰·Steam·TMDB·네이버시리즈, 미수집은 "준비 중")/기간/집계 기준/장르 부문) |
| `/search`, 로그인/프로필 계열 | (목업 없음) | 토큰·컴포넌트만 적용, 신규 레이아웃 불필요 |

## 4. 페이지 완료 정의 (DoD — 전부 충족해야 "완료")

1. 목업과 시각 일치 — 1440/768/375 3개 폭 스크린샷 대조
2. 로딩(스켈레톤은 최종 레이아웃 모양) · 빈 · 에러 상태 3종 구현
3. 실데이터 연결 (기존 React Query 훅) + 필터·정렬 상태 **URL 쿼리 동기화**
4. 키보드 포커스 링(`focus-visible` 액센트), 버튼·폼 대비 WCAG AA
5. `prefers-reduced-motion` 대응 (호버 리프트 등 전부)
6. 모바일 폴백 명시 (필터 레일→서랍, 그리드 열 축소, 포디움→1열)

## 5. 확정 결정

1. **모바일 하단 탭 유지** — 데스크톱은 상단 내비만, `< 1024px`에서 기존 NavigationBar(하단 탭) 유지.
   근거: 모바일 한 손 조작성. 하단 탭도 토큰으로 재스킨.
2. **다크모드 연기** — 시맨틱 토큰 구조(`--color-*`)로 심어 후일 값 스왑만으로 가능하게 하되,
   라이트 단일 테마로 출시. `color-scheme: light` 고정.
3. **페이지네이션** — explore는 페이지네이션(웹다움), 홈 릴은 가로 스크롤. 무한 스크롤은 사용 안 함.

## 6. 성공 기준 (기계 게이트 — grep/명령으로 검증)

```bash
FR=./src
# 1) 토큰 밖 색 사용 0건 (임의 hex/arbitrary 컬러)
grep -rn "bg-\[#\|text-\[#\|border-\[#\|#[0-9a-fA-F]\{6\}" $FR/components $FR/pages   # → 0건 (토큰 정의 파일 제외)
# 2) 액센트 일탈 0건 (앰버=별점, 레드=에러 외 컬러 팔레트 유틸 금지)
grep -rEn "(bg|text|border|from|to)-(purple|violet|indigo|pink|teal|cyan|sky|blue|emerald|lime|green)-[0-9]" $FR  # → 0건
# 3) 임의 라운드 0건
grep -rn "rounded-\[" $FR                                                             # → 0건
# 4) 아이콘 단일 (Phosphor 외 아이콘 import 0건)
grep -rn "lucide-react\|react-icons\|@heroicons" $FR                                  # → 0건
# 5) 표시 텍스트 em-dash 0건
grep -rn "—" $FR                                                                      # → 0건
# 6) 빌드·타입 그린
npm run build && npx tsc --noEmit
```

- 전 페이지 DoD(§4) 체크 완료, 페이지별 스크린샷이 plan의 편차 기록에 첨부됨
- Lighthouse: LCP < 2.5s, CLS < 0.1 (홈·탐색 기준)

## 7. 백엔드 선행/병행 트랙 (이 스펙과 별도 커밋)

| 항목 | 내용 | 필요 시점 |
|---|---|---|
| platforms OR 검색 | `findWorks`에 배열 겹침(`&&`, GIN 동일 활용) 파라미터 추가 — OTT 다중 선택은 OR가 자연스러움 | Phase 3 (explore) 전 |
| 도메인 컬럼 필터 | `findWorks`는 현재 contents 단일 쿼리 — 웹툰 상태/요일/연령 필터에 도메인 테이블 조인(또는 EXISTS) 추가 필요 | Phase 3 (explore) 전 |
| 랭킹 수집 축 확인 | 랭킹 크롤러가 플랫폼·기간(일/주/월)·집계 기준(최다 플레이/최고 판매 등)별 스냅샷을 구분 저장하는지 확인, 미지원 축은 UI에서 숨김 | Phase 6 (ranking) 전 |
| (검토) 평점 정렬 | "평점 높은 순" 정렬을 유지하려면 마스터 레벨 score 컬럼 승격 필요 — 미승격 시 해당 정렬 옵션 제외 | Phase 3 전 결정 |

## 8. 리스크와 대응

| 리스크 | 대응 |
|---|---|
| 페이지 이식이 진행될수록 토큰 이탈 (하드코딩 색·라운드) | §6 기계 게이트를 매 Phase 실행, 위반=게이트 실패 |
| 컴포넌트 대신 일회성 구현 (페이지마다 다른 카드) | Phase 2 선행 + "신규 UI는 컴포넌트에 추가 후 사용" 규칙 |
| 상태 3종(로딩/빈/에러) 누락 | DoD 항목 — 미구현 시 페이지 미완료 |
| 기존 하단 탭·모달 등과 신규 셸 충돌 | Phase 1에서 PublicLayout 기준으로 일괄 정리 |
| 목업의 데모 편의(랭킹 회전 시뮬 등)를 실코드로 오인 | 목업 주석에 명시됨. 실서비스는 축별 API 조회 |
