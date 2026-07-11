# AOD 모바일 앱 — 모노레포 + Expo(React Native) 설계

> 작성: 2026-07-11 · 상태: 승인 대기
> 목표: Android/iOS 앱 스토어 출시(포트폴리오) + 웹·모바일 UI 차별화

## 1. 배경과 전략

현재 프론트는 React 18 + Vite + Tailwind v4 웹 SPA(15화면, Vercel 배포)다. 앱을 추가하되 웹과 모바일의 UI는 서로 다르게 가져가고 싶다.

**전략 = 패턴 2 (로직 공유 + UI 분리):** API 클라이언트·React Query 훅·타입·상수 등 DOM 무관 로직만 공유 패키지로 추출하고, UI는 플랫폼별로 작성한다. 웹을 RN으로 바꾸는 것이 아니다 — 웹은 React DOM + Vite 그대로 유지하며, 웹 리디자인은 별도 후속 작업이다.

기각한 대안: ① Capacitor 웹뷰 랩핑(UI 차별화 불가), ② Expo + react-native-web 완전 통합(UI 차별화 목표와 상충, 웹 SEO/SSR 퇴로 차단).

## 2. 확정 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 코드 공유 | 패턴 2: 로직만 공유, UI 분리 | "웹·모바일 UI 다르게"가 요구사항 |
| 저장소 | **기존 front 레포를 pnpm 모노레포로 전환** (새 레포 없음) | git 히스토리 보존, 관리 단일화 |
| 모바일 | Expo (managed) + EAS Build | 솔로 개발, 네이티브 툴체인 없이 스토어 빌드 |
| 라우팅 | Expo Router (파일 기반) | React Router 경험 이전 용이, 탭+스택 기본 제공 |
| 스타일 | NativeWind | 기존 Tailwind 클래스 참조 이식으로 화면 재작성 비용 최소화 |
| v1 범위 | **15화면 전체 동등** 후 스토어 출시 | 사용자 결정 |
| 웹 shared 전환 | import 경로 즉시 교체 (UI·로직 무수정) | 로직 중복 0, tsc+빌드로 검증 가능 |
| 스토어 | Google Play 먼저 (iOS는 Apple 계정 결정 후) | 비용·심사 난이도 |

## 3. 저장소 구조

```
-AOD-All-of-Dopamine-front/          (같은 레포 — feature 브랜치에서 전환)
├── apps/
│   ├── web/                         기존 코드 git mv 이동 (히스토리 보존)
│   └── mobile/                      Expo 앱 신규
├── packages/
│   └── shared/                      @aod/shared
├── pnpm-workspace.yaml
└── package.json                     워크스페이스 루트
```

- 패키지 매니저는 **pnpm으로 통일** — 루트의 `package-lock.json`(npm)과 `pnpm-lock.yaml` 혼재 상태를 정리한다.
- 웹 이동은 `git mv`로 수행해 blame/히스토리를 보존한다.

## 4. packages/shared (`@aod/shared`)

**이동 대상 (웹 `src/`에서):** `types/api.ts`, `constants/domain.ts`, `constants/platforms.ts`, `api/*`(client, authApi, workApi, interactionApi, rankingApi), `hooks/*`(useWorks 13개, useInteractions).

**플랫폼 의존 제거 — 이 설계의 핵심 한 곳:** 현재 `client.ts`는 `localStorage`와 `import.meta.env`를 직접 참조한다. 이를 팩토리로 바꾼다:

```ts
createApiClients({ baseURL, getToken, onAuthError? })
// 웹:    getToken = () => localStorage.getItem('token'),  baseURL = VITE_API_BASE_URL
// 모바일: getToken = () => SecureStore.getItemAsync('token'), baseURL = EXPO_PUBLIC_API_BASE_URL
```

- `react`, `@tanstack/react-query`, `axios`는 **peerDependencies** — 웹(React 18)과 모바일(Expo SDK 동반 React 버전)이 각자 버전을 가진다. UI를 공유하지 않으므로 버전 차이의 충돌면이 좁다.
- `AuthContext`는 1차 공유 범위에서 **제외**(저장소 결합이 강함) — 각 앱에 두고, 중복이 아프면 후속에서 주입형으로 승격 검토.
- 원칙: DOM/네이티브 의존이 발견되는 코드는 shared에 넣지 않는다(예: dompurify는 웹 전용).

## 5. apps/mobile (Expo)

**내비게이션 (Expo Router):** 웹 NavigationBar 노출 5경로 = 하단 탭.

```
app/
├── (tabs)/
│   ├── home.tsx        홈
│   ├── explore.tsx     탐색
│   ├── ranking.tsx     랭킹 (화면 내 상단 탭: 외부/내부)
│   ├── new.tsx         신작·출시예정
│   └── profile.tsx     프로필
├── work/[id].tsx       작품 상세      ├── login.tsx / signup.tsx
├── review/[id].tsx     리뷰 상세      ├── onboarding.tsx
├── search.tsx          검색           └── profile/reviews|bookmarks|likes.tsx
```

- **인증:** 웹 AuthContext 패턴 이식, 저장소만 `expo-secure-store`. 보호는 웹 관례대로 화면 단위(비로그인 프로필 접근 시 로그인 유도 — 웹 BUG_001 픽스 패턴 준수).
- **React Query:** shared 훅 그대로. `onlineManager`←NetInfo, `focusManager`←AppState 연결.
- **UI:** 현재 웹이 모바일 퍼스트라 기존 레이아웃을 디자인 기준으로 삼되, 컴포넌트는 RN 프리미티브로 재작성. Tailwind 클래스는 NativeWind로 참조 이식. 이미지 `expo-image`, 긴 목록 `FlashList`.
- **env:** `EXPO_PUBLIC_API_BASE_URL` (백엔드는 동일 REST+JWT, 네이티브 앱은 CORS 무관 — 백엔드 무변경).

## 6. apps/web 영향 (최소)

1. `git mv`로 `apps/web/` 이동 (vercel.json 포함)
2. import 경로만 `@aod/shared`로 교체 — UI·로직·스타일 무수정
3. Vercel 대시보드 Root Directory → `apps/web` (1회), **프리뷰 배포로 선검증 후 main 머지**
4. 게이트: `tsc && vite build` + lint 그린, 프리뷰 스모크 확인

## 7. 빌드 순서

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| F0 | 모노레포 전환 + shared 추출 + 웹 전환 | 웹 빌드·프리뷰 그린 |
| F1 | Expo 부트스트랩 + 인증 플로우 (로그인/회원가입/SecureStore) | 에뮬레이터에서 로그인 왕복 |
| F2 | 탭 골격 + 홈 | 홈 3섹션 렌더 |
| F3 | 탐색·검색·작품상세 (핵심 소비 루프) | 필터→상세→리뷰·좋아요·북마크 동작 |
| F4 | 랭킹 2종·신작·리뷰상세·프로필 4종·온보딩 | 15화면 전체 동작 |
| F5 | 스토어 준비: 아이콘·스플래시·EAS Build·Play Console | 내부 테스트 트랙 업로드 |

## 8. 테스트

- **shared:** vitest + MSW(웹 devDeps에 이미 존재)로 훅·클라이언트 팩토리 단위 테스트 — 공유 코드가 가장 두터운 테스트 대상
- **mobile:** 핵심 플로우(인증, 홈 로딩) 최소 컴포넌트 테스트(jest-expo), 나머지는 에뮬레이터 눈검수
- **web:** 기존 build+lint 그린 유지가 회귀 게이트 (테스트 스위트 부재 — 현행 유지)
- E2E(Maestro)는 스코프 아웃

## 9. 스코프 아웃 (v1)

푸시 알림, 딥링크, iOS 스토어 제출, 웹 리디자인, 오프라인 지원, SSR, 추천 섹션(백엔드 M3와 함께 후속).

## 10. 리스크와 완화

| 리스크 | 완화 |
|---|---|
| Vercel 모노레포 전환 중 배포 깨짐 | feature 브랜치 + 프리뷰 배포 선검증, 설정 변경은 머지 직전 |
| pnpm 심링크 ↔ Metro 번들러 호환 | Expo 공식 모노레포 가이드 준수 (watchFolders 등) |
| 웹 Tailwind v4 vs NativeWind 지원 버전 차이 | 앱·웹 각자 config — 클래스는 "참조 이식"이며 설정 공유 아님 |
| React 버전 불일치 (웹 18 vs Expo 동반) | shared는 peerDeps, UI 비공유로 충돌면 최소 |
| 스토어 심사 리젝 (로그인 필수 앱) | 심사용 테스트 계정 제공, 비로그인 열람 가능 화면 유지 |

## 11. 성공 기준

- 웹: 기능·UI 변화 없이 프로덕션 배포 유지 (사용자 체감 무변화)
- 앱: 15화면 전체 동작 + Play 스토어 내부 테스트 트랙 업로드
- shared: 웹·앱이 동일 훅·타입을 import (로직 중복 0)
