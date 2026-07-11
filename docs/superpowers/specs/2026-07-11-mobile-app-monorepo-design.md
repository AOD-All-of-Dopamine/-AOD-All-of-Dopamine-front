# AOD 모바일 앱 — 모노레포 + Expo(React Native) 설계

> 작성: 2026-07-11 · 개정: 2026-07-11 v2 (외부 리뷰 반영) · 상태: 승인 대기
> 목표: Android/iOS 앱 스토어 출시(포트폴리오) + 웹·모바일 UI 차별화

## 1. 배경과 전략

현재 프론트는 React 18 + Vite + Tailwind v4 웹 SPA(15화면, Vercel 배포)다. 앱을 추가하되 웹과 모바일의 UI는 서로 다르게 가져가고 싶다.

**전략 = 패턴 2 (로직 공유 + UI 분리):** API 클라이언트·query 정의·타입·상수 등 DOM 무관 로직만 공유 패키지로 추출하고, UI는 플랫폼별로 작성한다. 웹을 RN으로 바꾸는 것이 아니다 — 웹은 React DOM + Vite 그대로 유지하며, 웹 리디자인은 별도 후속 작업이다.

기각한 대안: ① Capacitor 웹뷰 랩핑(UI 차별화 불가), ② Expo + react-native-web 완전 통합(UI 차별화 목표와 상충, 웹 SEO/SSR 퇴로 차단).

## 2. 확정 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 코드 공유 | 패턴 2: 로직만 공유, UI 분리 | "웹·모바일 UI 다르게"가 요구사항 |
| 저장소 | **기존 front 레포를 pnpm 모노레포로 전환** (새 레포 없음) | git 히스토리 보존, 관리 단일화 |
| 모바일 | Expo (managed) + EAS Build | 솔로 개발, 네이티브 툴체인 없이 스토어 빌드 |
| 라우팅 | Expo Router (파일 기반, `_layout` 그룹 구조) | React Router 경험 이전 용이, 탭+스택 기본 제공 |
| 스타일 | NativeWind — 간격·색·타이포 등 단순 utility의 의미만 참조 이식. 레이아웃(`grid`,`fixed`,`sticky`)·상태 selector(`hover:`)는 RN 방식으로 재설계 | 웹 실측: hover: 36곳, fixed 19곳, grid 6곳 등 존재 — "그대로 이식"은 불가 |
| v1 범위 | **15화면 전체 동등** 후 스토어 출시 | 사용자 결정 |
| 웹 shared 전환 | import 교체 + 앱 진입점에 Provider 1회 배선. **페이지 호출부 시그니처는 유지** (`useWorkDetail(id)` 그대로) | 웹 UI 무수정 원칙 |
| shared 소비 방식 | **TS 소스 직접 소비** (dist 빌드 없음) — Vite·Metro가 각자 transpile. 번들 문제 발생 시 tsup 빌드로 전환 | v1 규모에서 watch 빌드 오버헤드 회피 |
| 스토어 | Google Play 먼저 (iOS는 Apple 계정 결정 후) | 비용·심사 난이도 |

## 3. 저장소 구조

```
-AOD-All-of-Dopamine-front/          (같은 레포 — feature 브랜치에서 전환)
├── apps/
│   ├── web/                         @aod/web — 기존 코드 git mv 이동 (히스토리 보존)
│   └── mobile/                      @aod/mobile — Expo 앱 신규
├── packages/
│   └── shared/                      @aod/shared
├── pnpm-workspace.yaml              packages: [apps/*, packages/*]
└── package.json                     워크스페이스 루트 (dev:web / dev:mobile / typecheck / lint / test 스크립트)
```

- 패키지 매니저는 **pnpm으로 통일** — 루트의 `package-lock.json`(npm)과 `pnpm-lock.yaml` 혼재 상태를 정리한다.
- 웹 이동은 `git mv`로 수행해 blame/히스토리를 보존한다.
- **Metro 설정은 Expo의 모노레포 자동 구성을 우선 사용**하고, 커스텀(`watchFolders`/`nodeModulesPaths`)은 실제 해석 문제가 발생할 때만 추가한다.

### 모노레포 규칙 (ESLint로 강제 가능한 것은 강제)

1. **의존성 방향:** `apps/* → packages/shared` 단방향. shared는 apps를 절대 import하지 않는다.
2. **플랫폼 감지 금지:** shared 안에서 `Platform.OS`, `window`, `document`, `localStorage`, `SecureStore`, `import.meta.env`, `process.env.EXPO_PUBLIC_*` 직접 참조 금지 — 전부 앱에서 주입.
3. **공개 API 제한:** 서브패스 export만 허용 (`@aod/shared/api` 등). `@aod/shared/src/...` 내부 경로 import 금지.

## 4. packages/shared (`@aod/shared`)

**이동 대상 (웹 `src/`에서):** `types/api.ts`, `constants/{domain,platforms}.ts`, `api/*`(client, authApi, workApi, interactionApi, rankingApi), `hooks/*`(useWorks 13개, useInteractions 13개).

검증 결과 현재 훅 26개는 전부 순수 데이터 훅(toast/navigate 없음, optimistic update는 `useQueryClient()` 기반)이라 공유 가능하다. 단, 현재 `client.ts`가 모듈 로드 시점에 `import.meta.env`+`localStorage`를 참조하고 훅이 API 싱글턴을 직접 import하므로, **싱글턴 제거 + 주입 구조로 재편**한다.

### 내부 3층 구조 + 서브패스 export

```
packages/shared/src/
├── types/            DTO·도메인 타입 (이동만)
├── constants/        domain, platforms (이동만)
├── api/              createApiClient(옵션 주입) + createAuthApi/createWorkApi/... (AxiosInstance 주입)
├── queries/          query key 팩토리 + queryOptions 빌더 (API 객체 주입)
└── hooks/            기존 훅 시그니처 유지 — ApiProvider 컨텍스트에서 API를 주입받음
```

```jsonc
// package.json (발췌)
{
  "name": "@aod/shared",
  "exports": {
    "./types": "./src/types/index.ts",
    "./constants": "./src/constants/index.ts",
    "./api": "./src/api/index.ts",
    "./queries": "./src/queries/index.ts",
    "./hooks": "./src/hooks/index.ts"
  },
  "peerDependencies": { "react": ">=18", "@tanstack/react-query": "^5" },
  "dependencies": { "axios": "^1" }
}
```

- `react`, `@tanstack/react-query` = **peerDependencies** (동일 인스턴스 필수). `axios` = **일반 dependencies** (내부 구현 의존성, 호스트와 인스턴스 공유 불필요).
- **클라이언트 팩토리:** `createApiClients({ baseURL, getToken, onSessionExpired?, isDev? })` → `{ publicApi, privateApi }`. 기존 재시도(2회 exponential backoff)·타임아웃 30s·로깅 인터셉터 로직을 팩토리 내부로 이동.
- **query key 팩토리:** `workKeys.list(params)` / `workKeys.detail(id)` 식으로 키를 한곳에서 관리 (mutation invalidation 범위 명확화).
- **훅과 Provider:** shared가 `ApiProvider`(컴포즈된 API들을 컨텍스트로 제공)를 export. 훅은 컨텍스트에서 API를 읽는다. → 웹 페이지 호출부는 `useWorkDetail(id)` 시그니처 그대로, import 경로만 변경.
- **플랫폼 UX 규칙:** 화면 이동·토스트·햅틱 등 플랫폼 반응은 shared 훅에 넣지 않는다. 필요 시 화면에서 mutation 콜백으로 처리 (현재도 그런 로직 없음 — 이 상태를 규칙으로 고정).
- `AuthContext`는 1차 공유 범위에서 **제외**(저장소 결합) — 각 앱에 두고, 중복이 아프면 후속에서 주입형으로 승격 검토.
- dompurify 등 DOM 의존 코드는 shared에 넣지 않는다.

## 5. 인증 정책

백엔드는 **refresh token 없는 단일 JWT** (`AuthResponse { token, username, userId }` — 코드 확인됨). 따라서:

- v1은 access token 단일 체제 유지. 401 시 `onSessionExpired` 콜백으로 로그아웃 처리 (재발급 시도 없음).
- **refresh token 기계장치(single-flight, `_retry` 1회 재시도)는 구현하지 않는다(YAGNI).** 백엔드에 refresh가 도입되면 그때 이 스펙의 정책대로 구현: refresh 요청은 single-flight로 합치고, 원 요청은 1회만 재시도.
- 저장 정책 — 웹: 현행 localStorage 유지 (장기적으로 HttpOnly cookie 검토). 모바일: `expo-secure-store`에 토큰 저장, 로그아웃 시 삭제.
- **모바일 auth hydration 필수:** SecureStore는 비동기라 부팅 시 `loading → authenticated | unauthenticated` 3상태가 필요 (없으면 로그인 화면 깜빡임 발생).

```ts
type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: UserInfo }
  | { status: "unauthenticated" };
```

## 6. apps/mobile (Expo)

**내비게이션 (Expo Router, `_layout` 그룹 구조):**

```
app/
├── _layout.tsx            QueryClientProvider + ApiProvider + AuthProvider + 루트 Stack
├── (tabs)/
│   ├── _layout.tsx        하단 탭 5개
│   ├── index.tsx          홈 (앱 진입점)
│   ├── explore.tsx        탐색
│   ├── ranking.tsx        랭킹 (화면 내 상단 탭: 외부/내부)
│   ├── new.tsx            신작·출시예정
│   └── profile/
│       ├── _layout.tsx
│       ├── index.tsx      프로필
│       ├── reviews.tsx / bookmarks.tsx / likes.tsx
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx / signup.tsx / onboarding.tsx
├── work/[id].tsx          작품 상세
├── review/[id].tsx        리뷰 상세
└── search.tsx             검색 (modal presentation)
```

- 하단 탭 5개(홈/탐색/랭킹/신작/프로필)는 웹 NavigationBar 대응이 기본안이나, **모바일 와이어프레임 검토 후 확정** — 웹 경로와 1:1 대응이 필수는 아니다.
- **인증:** 화면 단위 보호 (비로그인 프로필 접근 시 로그인 유도 — 웹 BUG_001 픽스 패턴 준수) + §5 hydration.
- **React Query:** shared 훅 사용. `onlineManager`←NetInfo, `focusManager`←AppState 연결.
- **UI:** 현재 웹이 모바일 퍼스트라 기존 레이아웃을 디자인 기준으로 삼되, 컴포넌트는 RN 프리미티브로 재작성. 이미지 `expo-image`. 목록은 **FlatList로 시작**, 무한 스크롤·렌더링 병목이 확인되는 목록만 FlashList 적용.

### 환경변수 (3환경)

- `EXPO_PUBLIC_API_BASE_URL` — 공개 가능 값만 (`EXPO_PUBLIC_*`는 번들에 노출, 비밀값 금지).
- EAS Build 프로필: `development`(devClient, internal) / `preview`(internal) / `production`.
- 개발 시 주소: 웹 `http://localhost:8080` / Android 에뮬레이터 `http://10.0.2.2:8080` / 실기기 PC LAN IP.

## 7. apps/web 영향 (최소)

1. `git mv`로 `apps/web/` 이동 (vercel.json 포함)
2. import 경로를 `@aod/shared/*`로 교체 + `main.tsx`에 `ApiProvider` 1회 배선 — 페이지·컴포넌트 호출부 무수정
3. Vercel 대시보드 Root Directory → `apps/web` (1회), **프리뷰 배포로 선검증 후 main 머지**
4. 게이트: `tsc && vite build` + lint 그린, 프리뷰 스모크 확인

## 8. 빌드 순서

한 커밋에 패키지 매니저 전환·디렉터리 이동·shared 추출을 섞지 않는다 (장애 원인 격리).

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| F0-A | npm→pnpm 전환만 (lockfile 정리) | 기존 웹 로컬 빌드 성공 |
| F0-B | `apps/web` 이동 + 워크스페이스 루트 구성 | Vercel 프리뷰 성공 |
| F0-C | `packages/shared` 추출 + 웹 전환 (Provider 배선) | 웹 기능·UI 동일, 빌드 그린 |
| F1-A | Expo 앱 생성 + 모노레포 연결 | 기본 화면 Android 에뮬레이터 실행 |
| F1-B | API client 조립 + SecureStore + auth hydration | 부팅 시 3상태 전이 확인 |
| F1-C | 로그인·회원가입 화면 | 로그인 왕복 성공 |
| F2 | 탭 골격 + 홈 | 홈 3섹션 렌더 |
| F3 | 탐색·검색·작품상세 (핵심 소비 루프) | 필터→상세→리뷰·좋아요·북마크 동작 |
| F4 | 랭킹 2종·신작·리뷰상세·프로필 4종·온보딩 | 15화면 전체 동작 |
| F5-A | 실기기 QA | 주요 플로우 통과 |
| F5-B | EAS production build | AAB 생성 |
| F5-C | Play Console 내부 테스트 트랙 | 테스터 설치 성공 |

## 9. 테스트

우선순위 순:

1. **API 클라이언트 팩토리** (shared, vitest): 토큰 유무별 Authorization 헤더, 401 시 `onSessionExpired` 호출, 재시도 상한.
2. **query 정의** (shared, vitest + MSW Node): key가 파라미터별로 구분되는지, 응답 변환, 파라미터 정확성.
3. **모바일 auth hydration** (jest-expo): 토큰 있음→authenticated / 없음→unauthenticated / 손상→로그아웃.
4. **화면 smoke** (jest-expo, 최소): 로그인 제출, 홈 로딩/성공/실패.

- 테스트 환경 분리: shared=Vitest+MSW(Node), mobile=jest-expo (혼용 금지).
- web: 기존 build+lint 그린 유지가 회귀 게이트 (테스트 스위트 부재 — 현행 유지).
- E2E(Maestro)는 스코프 아웃.

## 10. 스코프 아웃 (v1)

푸시 알림, 딥링크, iOS 스토어 제출, 웹 리디자인, 오프라인 지원, SSR, 추천 섹션(백엔드 M3와 함께 후속), refresh token(백엔드 미지원 — §5).

## 11. 리스크와 완화

| 리스크 | 완화 |
|---|---|
| Vercel 모노레포 전환 중 배포 깨짐 | feature 브랜치 + 프리뷰 배포 선검증, 설정 변경은 머지 직전. F0 3분할로 원인 격리 |
| pnpm ↔ Metro 해석 문제 | Expo 자동 모노레포 구성 우선, 커스텀은 문제 발생 시만 |
| NativeWind 이식 범위 과대평가 | 단순 utility만 참조, 레이아웃·상태 selector는 재설계 전제로 견적 |
| React 버전 불일치 (웹 18 vs Expo 동반) | shared는 peerDeps, UI 비공유로 충돌면 최소 |
| 개발 중 API 접속 불가 (에뮬레이터) | `10.0.2.2`/LAN IP 문서화 (§6). Android cleartext 정책 — dev만 예외 허용, prod는 HTTPS |
| 스토어 심사 리젝 (로그인 필수 앱) | 심사용 테스트 계정 제공, 비로그인 열람 가능 화면 유지 |
| Dependabot 취약점 143건 (기존) | F0-A pnpm 전환 시 주요 의존성 버전 정리 기회로 활용 (별도 태스크, 무리한 메이저 범프는 금지) |

## 12. 성공 기준

- 웹: 기능·UI 변화 없이 프로덕션 배포 유지 (사용자 체감 무변화)
- 앱: 15화면 전체 동작 + Play 스토어 내부 테스트 트랙 업로드
- shared: **서버 계약·API 호출·query key·순수 도메인 로직의 비의도적 중복 0** — 플랫폼 UX 차이로 인한 의도적 중복은 허용
