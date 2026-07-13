# AOD 프론트엔드 - Claude 작업 가이드

## 저장소 구조 (pnpm 모노레포)

```
├── apps/
│   ├── web/          # @aod/web — React 18 + Vite 웹 SPA (기존 웹)
│   └── mobile/       # @aod/mobile — Expo RN 앱 (F1에서 추가 예정)
├── packages/
│   └── shared/       # @aod/shared — 플랫폼 무관 로직 (api·hooks·types·constants)
├── pnpm-workspace.yaml
└── package.json      # 루트: dev:web / build / lint / test / typecheck
```

- 패키지 매니저: **pnpm** (packageManager 필드 고정). 루트에서 `pnpm install`.
- 실행: `pnpm dev:web` (포트 3000) · 전체 빌드: `pnpm build` · shared 테스트: `pnpm --filter @aod/shared test`
- 설계 스펙: `docs/superpowers/specs/2026-07-11-mobile-app-monorepo-design.md`

## 기술 스택
- **React 18 + TypeScript + Vite** (웹)
- **React Query (TanStack Query v5)** — 서버 상태. 훅은 `@aod/shared/hooks`에서 import
- **AuthContext (React Context)** — 인증 상태 (token, user) — 웹 앱 소유
- **Zustand** — 설치됨, 현재 미사용
- **Axios** — `@aod/shared/api`의 `createApiClients` 팩토리로 생성 (싱글턴 없음)
- **React Router DOM v6** — 라우팅
- **Tailwind CSS v4** — 스타일

---

## packages/shared (`@aod/shared`)

서브패스 export만 사용한다 (`@aod/shared/src/...` 내부 경로 import는 ESLint가 차단):

```
@aod/shared/types       # WorkSummary, WorkDetail, Review, PageResponse …
@aod/shared/constants   # DOMAIN_LABEL_MAP, DOMAIN_FILTERS, DOMAIN_PLATFORMS, PLATFORM_LABELS
@aod/shared/api         # createApiClients, createApis, 각 API 팩토리 + DTO 타입
@aod/shared/queries     # query key 팩토리 (workKeys, reviewKeys …)
@aod/shared/hooks       # ApiProvider, useApis, 데이터 훅 26개 (useWorks, useInteractions …)
```

**규칙 (ESLint 강제):** shared 안에서 `window`/`document`/`localStorage`/`process`/`import.meta.env`/네이티브(expo-*, react-native*) 직접 참조 금지 — 전부 앱에서 주입한다. TS 소스를 직접 소비하며 별도 빌드 없음 (Vite/Metro가 각자 transpile).

### API 클라이언트 주입 (앱 진입점 1회)

```ts
// apps/web/src/main.tsx
const clients = createApiClients({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "/api" : "http://localhost:8080"),
  getToken: () => localStorage.getItem("token"),
  isDev: import.meta.env.DEV,
});
const apis = createApis(clients);
// <QueryClientProvider><ApiProvider apis={apis}><App/></ApiProvider></QueryClientProvider>
```

**공통 처리:** 타임아웃 30초. 재시도(최대 2회, 지수 백오프)는 **멱등 메서드(GET/HEAD/OPTIONS)에만** 적용 — POST 등 비멱등 요청은 응답 유실 시 중복 쓰기(중복 리뷰·토글 역전) 위험 때문에 재시도하지 않는다 (2026-07 변경). 401 시 `onSessionExpired` 콜백(동시 401에도 1회, single-flight) — 웹은 현재 미전달(현행 동작 유지).

---

## apps/web 디렉토리 구조
```
apps/web/
├── api/[...path].ts       # Vercel 서버리스 프록시 (프로덕션 /api/* → 백엔드)
└── src/
    ├── pages/             # 페이지 컴포넌트 15개
    ├── components/
    │   └── common/        # Header, NavigationBar, Modal, BottomButton
    ├── contexts/
    │   └── AuthContext.tsx  # useApis()로 authApi 주입받음
    ├── constants/
    │   ├── platforms.ts   # PLATFORM_META = shared 라벨 + 웹 로고 에셋 합성 (웹 전용)
    │   └── thumbnail.ts   # 썸네일 폴백 (웹 에셋 의존, 웹 전용)
    ├── layouts/ · assets/ · utils/
    └── main.tsx           # 라우터 배선 + ApiProvider 주입
```

(api·hooks·types·도메인 상수는 `packages/shared`로 이동했다 — 웹에서 새 데이터 훅이 필요하면 shared에 추가할 것)

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

## 핵심 타입 (`@aod/shared/types`)

```ts
WorkSummary   // 목록용: id, domain, title, thumbnail, score, rank, releaseDate
WorkDetail    // 상세용: + synopsis, originalTitle, domainInfo, platformInfo
Review        // id, author, score, content, createdAt
PageResponse<T> // content[], page, size, totalElements, totalPages, first, last
```

---

## 도메인 & 플랫폼 상수

**도메인:** `MOVIE` | `TV` | `GAME` | `WEBTOON` | `WEBNOVEL` (`@aod/shared/constants`)

**플랫폼 키 (백엔드와 일치):**
- 영화/TV: `TMDB_MOVIE`, `TMDB_TV`, `Netflix`, `Watcha`, `Disney Plus`, `TVING`, `wavve`, `Coupang Play`, `Apple TV`
- 게임: `Steam`
- 웹툰: `NaverWebtoon`
- 웹소설: `NaverSeries`, `KakaoPage`

라벨은 `PLATFORM_LABELS`(shared), 로고 포함 메타는 `PLATFORM_META`(웹 `src/constants/platforms.ts`).

---

## React Query 훅 목록 (`@aod/shared/hooks`)

| 훅 | 설명 |
|----|------|
| `useWorks(params)` | 작품 목록 (페이지네이션) |
| `useWorkDetail(id)` | 작품 상세 |
| `useSearchWorks(keyword, params)` | 검색 |
| `useInfiniteWorks(params)` | 무한 스크롤 |
| `useRecentReleases(params)` | 신작 |
| `useUpcomingReleases(params)` | 출시 예정작 |
| `useRecentReviewedWorks(params)` | 최근 리뷰된 작품 |
| `useGenres(domain)` / `useGenresWithCount(domain)` | 장르 목록/카운트 |
| `usePlatforms(domain)` | 플랫폼 목록 |
| `useReviews(contentId)` | 리뷰 목록 (+ 작성/수정/삭제 mutation) |
| `useMyReviews()` / `useMyBookmarks()` / `useMyLikes()` | 내 활동 |
| `useLikeStats` / `useToggleLike` / `useToggleBookmark` 등 | 상호작용 |

query key는 `@aod/shared/queries`의 팩토리(workKeys 등)로만 만든다 (인라인 키 금지).
React Query 전역 설정: staleTime 5분, 윈도우 포커스 시 refetch 비활성화 (`apps/web/src/main.tsx`)

---

## 인증 (`apps/web/src/contexts/AuthContext.tsx`)

- `localStorage`에 `"token"` 키로 JWT 저장 (웹). API 클라이언트에는 `getToken`으로 주입됨
- 앱 시작 시 `restoreUser()` 호출로 상태 복원
- 인증 보호는 라우터 레벨이 아닌 각 페이지에서 처리
- `useAuth()` 훅으로 `{ isAuthenticated, user, token, login, signup, logout }` 사용
- 백엔드는 refresh token 미사용(단일 JWT) — 도입 시 스펙 §5 정책 참조
