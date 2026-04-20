# AOD 프론트엔드 - Claude 작업 가이드

## 기술 스택
- **React 18 + TypeScript + Vite**
- **React Query (TanStack Query v5)** — 서버 상태 (API 데이터)
- **AuthContext (React Context)** — 인증 상태 (token, user)
- **Zustand** — 설치됨, 현재 미사용
- **Axios** — HTTP 클라이언트 (`publicApi` / `privateApi`)
- **React Router DOM v6** — 라우팅
- **Tailwind CSS v4** — 스타일

---

## 디렉토리 구조
```
src/
├── api/
│   ├── client.ts          # Axios 인스턴스 (publicApi, privateApi)
│   ├── authApi.ts         # 로그인/회원가입
│   ├── workApi.ts         # 작품 조회
│   ├── interactionApi.ts  # 리뷰·좋아요·북마크
│   └── rankingApi.ts      # 랭킹
├── hooks/
│   ├── useWorks.ts        # React Query 훅 13개
│   └── useInteractions.ts
├── pages/                 # 페이지 컴포넌트 15개
├── components/
│   └── common/            # Header, NavigationBar, Modal, BottomButton
├── contexts/
│   └── AuthContext.tsx    # isAuthenticated, user, token, login, logout
├── types/
│   └── api.ts             # WorkSummary, WorkDetail, Review, PageResponse
├── constants/
│   ├── domain.ts          # DOMAIN_LABEL_MAP, DOMAIN_FILTERS
│   └── platforms.ts       # DOMAIN_PLATFORMS, PLATFORM_META
└── App.tsx                # 라우터 + AuthProvider
```

---

## API 클라이언트 (`src/api/client.ts`)

**두 인스턴스 구분:**
- `publicApi` — 인증 불필요 (작품 목록, 랭킹 등)
- `privateApi` — `Authorization: Bearer <token>` 자동 첨부 (리뷰 작성, 북마크 등)

**Base URL:**
- 개발: `VITE_API_BASE_URL` 환경변수 또는 `http://localhost:8080`
- 프로덕션: `/api` (same-origin 프록시)

**공통 처리:**
- 타임아웃 30초
- 네트워크 오류·5xx·429 → exponential backoff로 최대 2회 자동 재시도
- 개발 환경에서 request/response 자동 콘솔 로깅

---

## 라우팅 (`src/App.tsx`)

모든 라우트는 `PublicLayout` 하위 (중첩 라우팅). `/` → `/home` 리다이렉트.

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/home` | home-page | 최근 리뷰 작품·신작·출시 예정작 |
| `/explore` | explore-page | 도메인·장르·플랫폼·정렬 필터링 |
| `/ranking` | ranking-page | 외부 랭킹 (TMDB 등) |
| `/internal/ranking` | internal-ranking-page | 내부 랭킹 |
| `/new` | new-releases-page | 신작·출시 예정작 |
| `/work/:id` | work-detail-page | 작품 상세·리뷰·좋아요·북마크 |
| `/review/:id` | review-page | 리뷰 상세 |
| `/search` | search-page | 검색 |
| `/profile` | profile-page | 내 정보 |
| `/profile/reviews` | my-reviews-page | 내 리뷰 목록 |
| `/profile/bookmarks` | my-bookmarks-page | 내 북마크 |
| `/profile/likes` | my-likes-page | 내 좋아요 |
| `/login` | login-page | 로그인 |
| `/signup` | signup-page | 회원가입 |
| `/onboarding` | onboarding-page | 온보딩 |

NavigationBar는 `/home`, `/explore`, `/ranking`, `/new`, `/profile/*` 에서만 표시 (`public-layout.tsx`에서 경로 감지).

---

## 핵심 타입 (`src/types/api.ts`)

```ts
WorkSummary   // 목록용: id, domain, title, thumbnail, score, rank, releaseDate
WorkDetail    // 상세용: + synopsis, originalTitle, domainInfo, platformInfo
Review        // id, author, score, content, createdAt
PageResponse<T> // content[], page, size, totalElements, totalPages, first, last
```

---

## 도메인 & 플랫폼 상수

**도메인:** `MOVIE` | `TV` | `GAME` | `WEBTOON` | `WEBNOVEL`

**플랫폼 키 (백엔드와 일치):**
- 영화/TV: `TMDB_MOVIE`, `TMDB_TV`, `Netflix`, `Watcha`, `Disney Plus`, `TVING`, `wavve`, `Coupang Play`, `Apple TV`
- 게임: `Steam`
- 웹툰: `NaverWebtoon`
- 웹소설: `NaverSeries`, `KakaoPage`

---

## React Query 훅 목록 (`src/hooks/useWorks.ts`)

| 훅 | 설명 |
|----|------|
| `useWorks(params)` | 작품 목록 (페이지네이션) |
| `useWorkDetail(id)` | 작품 상세 |
| `useSearchWorks(keyword, params)` | 검색 |
| `useInfiniteWorks(params)` | 무한 스크롤 |
| `useRecentReleases(params)` | 신작 |
| `useUpcomingReleases(params)` | 출시 예정작 |
| `useRecentReviewedWorks(params)` | 최근 리뷰된 작품 |
| `useGenres(domain)` | 장르 목록 |
| `usePlatforms(domain)` | 플랫폼 목록 |
| `useReviews(contentId)` | 리뷰 목록 |
| `useMyReviews()` | 내 리뷰 |
| `useInteractions(contentId)` | 좋아요·북마크 상태 |

React Query 전역 설정: staleTime 5분, 윈도우 포커스 시 refetch 비활성화 (`src/main.tsx`)

---

## 인증 (`src/contexts/AuthContext.tsx`)

- `localStorage`에 `"token"` 키로 JWT 저장
- 앱 시작 시 `restoreUser()` 호출로 상태 복원
- 인증 보호는 라우터 레벨이 아닌 각 페이지에서 처리
- `useAuth()` 훅으로 `{ isAuthenticated, user, token, login, signup, logout }` 사용
