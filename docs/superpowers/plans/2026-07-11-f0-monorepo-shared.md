# F0: pnpm 모노레포 전환 + @aod/shared 추출 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> (이 프로젝트 사용자 선호: 서브에이전트 없이 메인 모델이 직접 TDD → executing-plans 인라인 실행)

**Goal:** 기존 웹 레포를 pnpm 모노레포로 전환하고, 플랫폼 무관 로직(api·hooks·types·constants)을 `@aod/shared`로 추출해 웹이 이를 소비하게 한다. 웹의 UI·동작은 변하지 않는다.

**Architecture:** `apps/web`(기존 코드 이동) + `packages/shared`(3층: api 팩토리 → query key 팩토리 → ApiProvider 주입 훅). 플랫폼 의존(localStorage, import.meta.env)은 전부 앱 진입점에서 주입. 스펙: `docs/superpowers/specs/2026-07-11-mobile-app-monorepo-design.md`

**Tech Stack:** pnpm workspace, Vite 5, React 18, TanStack Query v5, axios, vitest + MSW + @testing-library/react (shared 테스트)

## Global Constraints

- 웹 페이지·컴포넌트의 **훅 호출부 시그니처는 무수정** (`useWorks(params)` 그대로). 바뀌는 건 import 경로와 진입점 배선뿐.
- query key의 **바이트 단위 모양 보존** (아래 Task 5 매핑표) — 캐시 동작 변화 금지.
- shared 안에서 `window`/`document`/`localStorage`/`import.meta.env`/`process.env` 직접 참조 금지 — 전부 옵션 주입.
- shared의 `react`·`@tanstack/react-query`는 peerDependencies, `axios`는 dependencies.
- 커밋은 태스크당 1개 이상, **패키지 매니저 전환·디렉터리 이동·로직 추출을 한 커밋에 섞지 않는다**.
- 각 태스크 종료 시 게이트: `pnpm --filter @aod/web build` 그린 (Task 3부터는 `pnpm --filter @aod/shared test`도).
- 작업 브랜치: `feature/f0-monorepo-shared` (main에서 분기).
- API 엔드포인트·파라미터 기본값(page 0, size 20, sortBy "masterTitle" 등) 무변경.

---

### Task 1: pnpm 단일화 (F0-A)

**Files:**
- Delete: `package-lock.json`
- Modify: `package.json` (packageManager 필드 추가)

**Interfaces:**
- Produces: pnpm이 유일한 패키지 매니저인 상태. 이후 모든 태스크는 pnpm 명령만 사용.

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout -b feature/f0-monorepo-shared
```

- [ ] **Step 2: npm 락파일 제거 + packageManager 고정**

```bash
git rm package-lock.json
pnpm --version   # 출력된 정확한 버전을 아래에 사용 (예: 10.12.1)
```

`package.json`에 추가 (버전은 위 출력값):

```jsonc
{
  "name": "aod-frontend",
  "private": true,
  "packageManager": "pnpm@<pnpm --version 출력값>",
  ...
}
```

- [ ] **Step 3: 설치·빌드 검증**

```bash
pnpm install
pnpm run build
```

Expected: `tsc && vite build` 성공, `dist/` 생성. (CI는 이미 pnpm 10 사용 중 — `.github/workflows/ci.yml` 확인됨)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: npm 락파일 제거 — pnpm 단일화"
```

---

### Task 2: 워크스페이스 전환 — 웹을 apps/web으로 이동 (F0-B)

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`(새 루트)
- Move (`git mv`): `src/`, `public/`, `api/`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`, `vercel.json`, `.env.development`, `.env.production`, `package.json` → `apps/web/`
- Root 유지: `.github/`, `.gitignore`, `CLAUDE.md`, `docs/`, `README.md`, `pnpm-lock.yaml`

**Interfaces:**
- Produces: 워크스페이스 패키지 `@aod/web` (기존 `aod-frontend` 개명). 루트 스크립트 `pnpm dev:web` / `pnpm build`.

- [ ] **Step 1: apps/web으로 git mv**

```bash
mkdir -p apps/web
git mv src public api index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.js postcss.config.js eslint.config.js vercel.json .env.development .env.production apps/web/
git mv package.json apps/web/package.json
```

주의: `api/[...path].ts`는 Vercel 서버리스 프록시 — Root Directory가 `apps/web`이 되면 Vercel이 `apps/web/api/`에서 찾으므로 반드시 함께 이동.

- [ ] **Step 2: 루트 워크스페이스 파일 생성**

`pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
```

루트 `package.json` (packageManager 버전은 Task 1과 동일값):

```json
{
  "name": "aod-front-monorepo",
  "private": true,
  "packageManager": "pnpm@<Task1과 동일>",
  "scripts": {
    "dev:web": "pnpm --filter @aod/web dev",
    "build": "pnpm -r --if-present build",
    "lint": "pnpm -r --if-present lint",
    "test": "pnpm -r --if-present test",
    "typecheck": "pnpm -r --if-present typecheck"
  }
}
```

- [ ] **Step 3: 웹 패키지 개명**

`apps/web/package.json`의 `"name": "aod-frontend"` → `"name": "@aod/web"`. `"packageManager"` 필드는 웹 패키지에서 제거(루트로 이동했으므로).

- [ ] **Step 4: .gitignore 패턴 확인·수정**

루트 `.gitignore`에서 `dist`, `node_modules`가 루트 앵커(`/dist` 형태)로 되어 있으면 비앵커(`dist/`, `node_modules/`)로 수정 — apps/web 하위에서도 무시되도록.

- [ ] **Step 5: 설치·빌드 검증**

```bash
pnpm install
pnpm build
git status --short   # dist 등 빌드 산출물이 추적 안 되는지 확인
```

Expected: `@aod/web` 빌드 성공, git status에 빌드 산출물 없음.

- [ ] **Step 6: CI 워크플로 갱신**

`.github/workflows/ci.yml`의 스텝 두 개 교체:

```yaml
      # ESLint 검사
      - name: Run ESLint
        run: pnpm lint

      # 빌드 테스트
      - name: Build project
        run: pnpm build
```

(웹 lint 스크립트는 apps/web/package.json에 이미 존재. `--ext` 플래그 제거 — eslint 9 flat config에서 무시됨)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: pnpm 워크스페이스 전환 — 웹을 apps/web으로 이동"
```

⚠️ **수동 단계 (머지 직전, Task 10에서):** Vercel 대시보드 → Settings → Root Directory = `apps/web`.

---

### Task 3: shared 스캐폴드 + types·constants 이동 (F0-C 시작)

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/vitest.config.ts`, `packages/shared/eslint.config.js`
- Move: `apps/web/src/types/api.ts` → `packages/shared/src/types/index.ts`
- Move: `apps/web/src/constants/domain.ts`, `platforms.ts` → `packages/shared/src/constants/` + `index.ts`(re-export)
- Modify: `apps/web/package.json`(dep 추가), types/constants를 import하던 웹 파일 전부

**Interfaces:**
- Produces: `@aod/shared/types` (WorkSummary, WorkDetail, PageResponse 등 — 기존 export 전부), `@aod/shared/constants` (DOMAIN_LABEL_MAP, DOMAIN_FILTERS, DOMAIN_PLATFORMS, PLATFORM_META 등 — 기존 export 전부)

- [ ] **Step 1: shared 패키지 스캐폴드**

`packages/shared/package.json`:

```json
{
  "name": "@aod/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    "./types": "./src/types/index.ts",
    "./constants": "./src/constants/index.ts",
    "./api": "./src/api/index.ts",
    "./queries": "./src/queries/index.ts",
    "./hooks": "./src/hooks/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src"
  },
  "peerDependencies": {
    "react": ">=18",
    "@tanstack/react-query": "^5"
  },
  "dependencies": {
    "axios": "^1.13.2"
  },
  "devDependencies": {
    "@tanstack/react-query": "^5.56.2",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^18.3.9",
    "eslint": "^9.11.1",
    "happy-dom": "^15.11.7",
    "msw": "^2.12.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.5.3",
    "vitest": "^2.1.8"
  }
}
```

`packages/shared/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

(`lib`에 DOM이 있어도 됨 — 타입 체크용일 뿐. **런타임 전역 참조 금지는 ESLint로 강제**, 아래 Step 2)

`packages/shared/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
  },
});
```

`packages/shared/eslint.config.js` (플랫폼 전역 금지 규칙):

```js
import tseslint from "typescript-eslint";

export default tseslint.config({
  files: ["src/**/*.{ts,tsx}"],
  extends: [...tseslint.configs.recommended],
  rules: {
    "no-restricted-globals": [
      "error",
      { name: "window", message: "플랫폼 의존 금지 — 앱에서 주입하세요." },
      { name: "document", message: "플랫폼 의존 금지 — 앱에서 주입하세요." },
      { name: "localStorage", message: "플랫폼 의존 금지 — getToken으로 주입하세요." },
    ],
  },
});
```

(devDependencies에 `typescript-eslint` 추가 필요: `pnpm --filter @aod/shared add -D typescript-eslint`)

- [ ] **Step 2: types·constants 이동**

```bash
mkdir -p packages/shared/src/types packages/shared/src/constants
git mv apps/web/src/types/api.ts packages/shared/src/types/index.ts
git mv apps/web/src/constants/domain.ts packages/shared/src/constants/domain.ts
git mv apps/web/src/constants/platforms.ts packages/shared/src/constants/platforms.ts
```

`packages/shared/src/constants/index.ts` 생성:

```ts
export * from "./domain";
export * from "./platforms";
```

- [ ] **Step 3: 웹에 workspace 의존 추가**

```bash
pnpm --filter @aod/web add "@aod/shared@workspace:*"
pnpm install
```

- [ ] **Step 4: 웹 import 교체 (types·constants)**

대상 파일 찾기:

```bash
cd apps/web && grep -rl -E "from \"[./]+(types/api|constants/(domain|platforms))\"" src
```

각 파일에서 기계적 치환:
- `from "../types/api"` · `from "../../types/api"` → `from "@aod/shared/types"`
- `from "../constants/domain"` 등 → `from "@aod/shared/constants"`

(이동 전 grep 실측: types/ 3곳 + constants/ 15곳 + api·hooks 내부 참조. `src/api/*.ts`, `src/hooks/*.ts`의 `../types/api` 참조도 이 단계에서 함께 교체)

- [ ] **Step 5: 검증**

```bash
pnpm --filter @aod/web build
pnpm --filter @aod/shared typecheck
```

Expected: 둘 다 성공. 웹 `tsconfig.app.json`의 `moduleResolution`이 `"bundler"`가 아니면 exports 해석이 실패할 수 있음 — 그 경우 `"bundler"`로 설정.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: @aod/shared 신설 — types·constants 이동"
```

---

### Task 4: createApiClients 팩토리 (TDD)

**Files:**
- Create: `packages/shared/src/api/client.ts`
- Test: `packages/shared/tests/client.test.ts`

**Interfaces:**
- Produces:

```ts
export interface ApiClientOptions {
  baseURL: string;
  getToken: () => string | null | Promise<string | null>;
  onSessionExpired?: () => void | Promise<void>;
  isDev?: boolean;                                   // 콘솔 로깅 게이트 (기본 false)
  retry?: { retries?: number; retryDelay?: number }; // 기본 { retries: 2, retryDelay: 500 }
}
export interface ApiClients { publicApi: AxiosInstance; privateApi: AxiosInstance; }
export function createApiClients(options: ApiClientOptions): ApiClients;
```

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/tests/client.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients } from "../src/api/client";

const BASE = "http://test.local";
let lastAuthHeader: string | null = null;
let hitCount = 0;

const server = setupServer(
  http.get(`${BASE}/api/ok`, ({ request }) => {
    lastAuthHeader = request.headers.get("authorization");
    return HttpResponse.json({ ok: true });
  }),
  http.get(`${BASE}/api/flaky`, () => {
    hitCount += 1;
    if (hitCount < 3) return new HttpResponse(null, { status: 500 });
    return HttpResponse.json({ ok: true });
  }),
  http.get(`${BASE}/api/secret`, () => new HttpResponse(null, { status: 401 })),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  lastAuthHeader = null;
  hitCount = 0;
});
afterAll(() => server.close());

describe("createApiClients", () => {
  it("privateApi는 getToken이 준 토큰을 Bearer 헤더로 첨부한다", async () => {
    const { privateApi } = createApiClients({
      baseURL: BASE,
      getToken: () => "tok-123",
    });
    await privateApi.get("/api/ok");
    expect(lastAuthHeader).toBe("Bearer tok-123");
  });

  it("토큰이 null이면 Authorization 헤더를 붙이지 않는다", async () => {
    const { privateApi } = createApiClients({ baseURL: BASE, getToken: () => null });
    await privateApi.get("/api/ok");
    expect(lastAuthHeader).toBeNull();
  });

  it("publicApi는 토큰을 첨부하지 않는다", async () => {
    const { publicApi } = createApiClients({ baseURL: BASE, getToken: () => "tok-123" });
    await publicApi.get("/api/ok");
    expect(lastAuthHeader).toBeNull();
  });

  it("비동기 getToken(Promise)도 지원한다", async () => {
    const { privateApi } = createApiClients({
      baseURL: BASE,
      getToken: () => Promise.resolve("tok-async"),
    });
    await privateApi.get("/api/ok");
    expect(lastAuthHeader).toBe("Bearer tok-async");
  });

  it("5xx는 retries 상한까지 재시도 후 성공한다 (2회 실패 → 3회째 성공)", async () => {
    const { publicApi } = createApiClients({
      baseURL: BASE,
      getToken: () => null,
      retry: { retries: 2, retryDelay: 1 },
    });
    const res = await publicApi.get("/api/flaky");
    expect(res.data.ok).toBe(true);
    expect(hitCount).toBe(3);
  });

  it("재시도 상한 초과 시 에러를 던진다 (retries: 1이면 2회 시도 후 실패)", async () => {
    const { publicApi } = createApiClients({
      baseURL: BASE,
      getToken: () => null,
      retry: { retries: 1, retryDelay: 1 },
    });
    await expect(publicApi.get("/api/flaky")).rejects.toThrow();
    expect(hitCount).toBe(2);
  });

  it("privateApi가 401을 받으면 onSessionExpired를 호출한다", async () => {
    const onSessionExpired = vi.fn();
    const { privateApi } = createApiClients({
      baseURL: BASE,
      getToken: () => "expired",
      onSessionExpired,
    });
    await expect(privateApi.get("/api/secret")).rejects.toThrow();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("onSessionExpired 없이 401을 받아도 조용히 에러만 전파한다", async () => {
    const { privateApi } = createApiClients({ baseURL: BASE, getToken: () => "expired" });
    await expect(privateApi.get("/api/secret")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
pnpm --filter @aod/shared test
```

Expected: FAIL — `../src/api/client` 모듈 없음.

- [ ] **Step 3: 구현**

`packages/shared/src/api/client.ts` — 기존 `apps/web/src/api/client.ts`의 로깅·재시도 인터셉터 로직을 팩토리 내부로 이동:

```ts
import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosInstance,
} from "axios";

export interface ApiClientOptions {
  baseURL: string;
  getToken: () => string | null | Promise<string | null>;
  onSessionExpired?: () => void | Promise<void>;
  isDev?: boolean;
  retry?: { retries?: number; retryDelay?: number };
}

export interface ApiClients {
  publicApi: AxiosInstance;
  privateApi: AxiosInstance;
}

export function createApiClients(options: ApiClientOptions): ApiClients {
  const { baseURL, getToken, onSessionExpired, isDev = false } = options;
  const { retries = 2, retryDelay = 500 } = options.retry ?? {};

  const logRequest = (config: InternalAxiosRequestConfig) => {
    if (isDev) {
      console.log("API Request:", config.method?.toUpperCase(), config.url, {
        params: config.params,
        data: config.data,
      });
    }
    return config;
  };

  const logRequestError = (error: AxiosError) => {
    if (isDev) console.error("API Request Error:", error);
    return Promise.reject(error);
  };

  const logResponse = (response: AxiosResponse) => {
    if (isDev) {
      console.log(
        "API Response:",
        response.config.method?.toUpperCase(),
        response.config.url,
        response.data,
      );
    }
    return response;
  };

  const logResponseError = (error: AxiosError) => {
    if (isDev) {
      if (error.response) {
        console.error(
          "API Response Error:",
          error.config?.method?.toUpperCase(),
          error.config?.url,
          error.response.status,
          error.response.data,
        );
      } else if (error.request) {
        console.error(
          "No response from server:",
          error.config?.method?.toUpperCase(),
          error.config?.url,
        );
      } else {
        console.error("Error setting up request:", error.message);
      }
    }
    return Promise.reject(error);
  };

  const addRetryInterceptor = (instance: AxiosInstance) => {
    instance.interceptors.response.use(undefined, async (error: AxiosError) => {
      const config = error.config as InternalAxiosRequestConfig & {
        __retryCount?: number;
      };
      if (!config) return Promise.reject(error);

      config.__retryCount = config.__retryCount || 0;

      const status = error.response?.status;
      const shouldRetry =
        !error.response || (status !== undefined && ((status >= 500 && status < 600) || status === 429));

      if (!shouldRetry) return Promise.reject(error);
      if (config.__retryCount >= retries) return Promise.reject(error);

      config.__retryCount += 1;
      const delay = Math.round(
        retryDelay * Math.pow(2, config.__retryCount - 1) * (0.8 + Math.random() * 0.4),
      );

      if (isDev) {
        console.warn(`Request retry #${config.__retryCount} for ${config.url} after ${delay}ms`);
      }

      await new Promise((r) => setTimeout(r, delay));
      return instance.request(config);
    });
  };

  const publicApi = axios.create({ baseURL, timeout: 30000 });
  const privateApi = axios.create({ baseURL, timeout: 30000 });

  publicApi.interceptors.request.use(logRequest, logRequestError);
  addRetryInterceptor(publicApi);
  publicApi.interceptors.response.use(logResponse, logResponseError);

  privateApi.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return logRequest(config);
  }, logRequestError);
  addRetryInterceptor(privateApi);
  privateApi.interceptors.response.use(logResponse, async (error: AxiosError) => {
    if (error.response?.status === 401 && onSessionExpired) {
      await onSessionExpired();
    }
    return logResponseError(error);
  });

  return { publicApi, privateApi };
}
```

- [ ] **Step 4: 통과 확인**

```bash
pnpm --filter @aod/shared test
```

Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): createApiClients 팩토리 — 토큰 저장소 주입"
```

---

### Task 5: query key 팩토리 (TDD)

**Files:**
- Create: `packages/shared/src/queries/keys.ts`, `packages/shared/src/queries/index.ts`
- Test: `packages/shared/tests/keys.test.ts`

**Interfaces:**
- Produces: `workKeys`, `releaseKeys`, `metaKeys`, `reviewKeys`, `interactionKeys`, `myKeys` — **기존 인라인 키와 바이트 단위 동일** 모양.

기존 키 → 팩토리 매핑표 (전수):

| 기존 인라인 키 | 팩토리 |
|---|---|
| `["works", params]` | `workKeys.list(params)` |
| `["work", id]` | `workKeys.detail(id)` |
| `["works", "search", keyword, params]` | `workKeys.search(keyword, params)` |
| `["works-infinite", params]` | `workKeys.infinite(params)` |
| `["works", "recent-reviews", params]` | `workKeys.recentReviewed(params)` |
| `["releases", "recent", params]` | `releaseKeys.recent(params)` |
| `["releases", "upcoming", params]` | `releaseKeys.upcoming(params)` |
| `["genres", domain]` | `metaKeys.genres(domain)` |
| `["genres-with-count", domain]` | `metaKeys.genresWithCount(domain)` |
| `["platforms", domain]` | `metaKeys.platforms(domain)` |
| `["reviews", contentId, page, size]` | `reviewKeys.list(contentId, page, size)` |
| `["reviews", contentId]` (invalidate 접두) | `reviewKeys.byContent(contentId)` |
| `["likeStats", contentId]` | `interactionKeys.likeStats(contentId)` |
| `["bookmarkStatus", contentId]` | `interactionKeys.bookmarkStatus(contentId)` |
| `["myReviews", page, size]` | `myKeys.reviews(page, size)` |
| `["myBookmarks", page, size]` | `myKeys.bookmarks(page, size)` |
| `["myBookmarks"]` (invalidate 접두) | `myKeys.bookmarksRoot()` |
| `["myLikes", page, size]` | `myKeys.likes(page, size)` |

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/tests/keys.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  workKeys, releaseKeys, metaKeys, reviewKeys, interactionKeys, myKeys,
} from "../src/queries/keys";

describe("query key 팩토리 — 기존 인라인 키와 동일 모양", () => {
  const params = { domain: "GAME", page: 1 };

  it("work 계열", () => {
    expect(workKeys.list(params)).toEqual(["works", params]);
    expect(workKeys.detail(7)).toEqual(["work", 7]);
    expect(workKeys.search("q", params)).toEqual(["works", "search", "q", params]);
    expect(workKeys.infinite(params)).toEqual(["works-infinite", params]);
    expect(workKeys.recentReviewed(params)).toEqual(["works", "recent-reviews", params]);
  });

  it("release·meta 계열", () => {
    expect(releaseKeys.recent(params)).toEqual(["releases", "recent", params]);
    expect(releaseKeys.upcoming(params)).toEqual(["releases", "upcoming", params]);
    expect(metaKeys.genres("GAME")).toEqual(["genres", "GAME"]);
    expect(metaKeys.genresWithCount("GAME")).toEqual(["genres-with-count", "GAME"]);
    expect(metaKeys.platforms(undefined)).toEqual(["platforms", undefined]);
  });

  it("review·interaction·my 계열", () => {
    expect(reviewKeys.list(3, 0, 20)).toEqual(["reviews", 3, 0, 20]);
    expect(reviewKeys.byContent(3)).toEqual(["reviews", 3]);
    expect(interactionKeys.likeStats(3)).toEqual(["likeStats", 3]);
    expect(interactionKeys.bookmarkStatus(3)).toEqual(["bookmarkStatus", 3]);
    expect(myKeys.reviews(0, 20)).toEqual(["myReviews", 0, 20]);
    expect(myKeys.bookmarks(0, 20)).toEqual(["myBookmarks", 0, 20]);
    expect(myKeys.bookmarksRoot()).toEqual(["myBookmarks"]);
    expect(myKeys.likes(0, 20)).toEqual(["myLikes", 0, 20]);
  });

  it("byContent는 list의 접두사다 (invalidation 전제)", () => {
    const prefix = reviewKeys.byContent(3);
    const full = reviewKeys.list(3, 0, 20);
    expect(full.slice(0, prefix.length)).toEqual(prefix);
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm --filter @aod/shared test` → FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`packages/shared/src/queries/keys.ts`:

```ts
import type { WorksQueryParams, ReleasesQueryParams } from "../api/workApi";

export const workKeys = {
  list: (params: WorksQueryParams) => ["works", params] as const,
  detail: (id: number | undefined) => ["work", id] as const,
  search: (keyword: string, params: Omit<WorksQueryParams, "keyword">) =>
    ["works", "search", keyword, params] as const,
  infinite: (params: WorksQueryParams) => ["works-infinite", params] as const,
  recentReviewed: (params: ReleasesQueryParams) =>
    ["works", "recent-reviews", params] as const,
};

export const releaseKeys = {
  recent: (params: ReleasesQueryParams) => ["releases", "recent", params] as const,
  upcoming: (params: ReleasesQueryParams) => ["releases", "upcoming", params] as const,
};

export const metaKeys = {
  genres: (domain?: string) => ["genres", domain] as const,
  genresWithCount: (domain?: string) => ["genres-with-count", domain] as const,
  platforms: (domain?: string) => ["platforms", domain] as const,
};

export const reviewKeys = {
  byContent: (contentId: number) => ["reviews", contentId] as const,
  list: (contentId: number, page: number, size: number) =>
    ["reviews", contentId, page, size] as const,
};

export const interactionKeys = {
  likeStats: (contentId: number) => ["likeStats", contentId] as const,
  bookmarkStatus: (contentId: number) => ["bookmarkStatus", contentId] as const,
};

export const myKeys = {
  reviews: (page: number, size: number) => ["myReviews", page, size] as const,
  bookmarksRoot: () => ["myBookmarks"] as const,
  bookmarks: (page: number, size: number) => ["myBookmarks", page, size] as const,
  likes: (page: number, size: number) => ["myLikes", page, size] as const,
};
```

`packages/shared/src/queries/index.ts`:

```ts
export * from "./keys";
```

(주의: `../api/workApi`는 Task 6에서 생성 — Task 5·6은 같은 브랜치에서 연달아 진행하므로, Task 5 시점에는 타입 import 없이 `Record<string, unknown>`으로 두고 Task 6에서 정식 타입으로 교체해도 된다. 순서를 바꿔 Task 6 → Task 5로 진행해도 무방.)

- [ ] **Step 4: 통과 확인** — `pnpm --filter @aod/shared test` → PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): query key 팩토리 — 기존 키 모양 보존"
```

---

### Task 6: API 모듈 팩토리 전환

**Files:**
- Move+수정: `apps/web/src/api/{authApi,workApi,interactionApi,rankingApi}.ts` → `packages/shared/src/api/`
- Create: `packages/shared/src/api/index.ts`
- Delete: `apps/web/src/api/client.ts` (Task 4에서 대체됨 — 웹이 아직 참조 중이므로 **이동은 Task 8에서**, 이 태스크는 shared 쪽 생성만)
- Test: `packages/shared/tests/workApi.test.ts`

**Interfaces:**
- Consumes: `ApiClients` (Task 4)
- Produces:

```ts
export function createAuthApi(publicApi: AxiosInstance, privateApi: AxiosInstance): AuthApi;
export function createWorkApi(publicApi: AxiosInstance): WorkApi;
export function createReviewApi(publicApi: AxiosInstance, privateApi: AxiosInstance): ReviewApi;
export function createInteractionApi(publicApi: AxiosInstance, privateApi: AxiosInstance): InteractionApi;
export function createRankingApi(publicApi: AxiosInstance): RankingApi;
// + 기존 인터페이스 전부 re-export: SignupRequest, LoginRequest, AuthResponse, UserInfo,
//   DuplicateCheckRequest/Response, WorksQueryParams, ReleasesQueryParams,
//   ReviewRequest, Review, LikeStats, BookmarkStatus, ContentInfo, ExternalRanking
```

**변환 규칙 (전 파일 공통, 기계적):** 기존 파일의 `export const xxxApi = { ...함수들 }`을 `export function createXxxApi(publicApi, privateApi) { return { ...같은 함수들 }; }`로 감싼다. **함수 본문·엔드포인트·기본값은 한 글자도 바꾸지 않는다.** `import { publicApi, privateApi } from "./client"` 제거, `import type { AxiosInstance } from "axios"` 추가, `../types/api` → `../types`. 반환 타입은 `export type WorkApi = ReturnType<typeof createWorkApi>` 형태로 export.

- [ ] **Step 1: 실패하는 테스트 작성 (workApi 기본값 검증)**

`packages/shared/tests/workApi.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients } from "../src/api/client";
import { createWorkApi } from "../src/api/workApi";

const BASE = "http://test.local";
let lastUrl: URL | null = null;

const server = setupServer(
  http.get(`${BASE}/api/works`, ({ request }) => {
    lastUrl = new URL(request.url);
    return HttpResponse.json({
      content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true,
    });
  }),
);

beforeAll(() => server.listen());
afterEach(() => { server.resetHandlers(); lastUrl = null; });
afterAll(() => server.close());

describe("createWorkApi", () => {
  it("getWorks 기본값: page=0, size=20, sortBy=masterTitle, sortDirection=asc", async () => {
    const { publicApi } = createApiClients({ baseURL: BASE, getToken: () => null });
    const workApi = createWorkApi(publicApi);
    await workApi.getWorks();
    expect(lastUrl!.searchParams.get("page")).toBe("0");
    expect(lastUrl!.searchParams.get("size")).toBe("20");
    expect(lastUrl!.searchParams.get("sortBy")).toBe("masterTitle");
    expect(lastUrl!.searchParams.get("sortDirection")).toBe("asc");
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm --filter @aod/shared test` → FAIL

- [ ] **Step 3: 4개 파일 변환 생성**

가장 작은 `rankingApi`의 완성본 (나머지 3개도 동일 패턴 — 변환 규칙 상단 참조):

```ts
// packages/shared/src/api/rankingApi.ts
import type { AxiosInstance } from "axios";

export interface ContentInfo {
  contentId: number;
  domain: string;
  masterTitle: string;
  posterImageUrl: string;
}

export interface ExternalRanking {
  id: number;
  contentId?: number;
  title: string;
  ranking: number;
  platform: string;
  thumbnailUrl: string;
  content?: ContentInfo;
  watchProviders?: string[];
}

export function createRankingApi(publicApi: AxiosInstance) {
  return {
    getAllRankings: async () => {
      const response = await publicApi.get<ExternalRanking[]>("/api/rankings/all");
      return response.data;
    },

    getRankingsByPlatform: async (platform: string) => {
      const response = await publicApi.get<ExternalRanking[]>(`/api/rankings/${platform}`);
      return response.data;
    },

    getRankingsByDomain: async (domain: string) => {
      const response = await publicApi.get<ExternalRanking[]>(`/api/rankings/domain/${domain}`);
      return response.data;
    },
  };
}

export type RankingApi = ReturnType<typeof createRankingApi>;
```

- `authApi.ts`: `signup`·`login`·`checkDuplicate`는 publicApi, `getCurrentUser`는 privateApi → `createAuthApi(publicApi, privateApi)`.
- `workApi.ts`: 8개 함수 전부 publicApi → `createWorkApi(publicApi)`. `WorksQueryParams`·`ReleasesQueryParams` export 유지.
- `interactionApi.ts`: 한 파일에 두 팩토리 — `createReviewApi(publicApi, privateApi)` (getReviews=public, 나머지 4개=private), `createInteractionApi(publicApi, privateApi)` (getLikeStats=public, 나머지 6개=private).

`packages/shared/src/api/index.ts`:

```ts
export * from "./client";
export * from "./authApi";
export * from "./workApi";
export * from "./interactionApi";
export * from "./rankingApi";
```

- [ ] **Step 4: 통과 확인** — `pnpm --filter @aod/shared test && pnpm --filter @aod/shared typecheck` → PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared
git commit -m "refactor(shared): API 모듈 팩토리 전환 — 엔드포인트·기본값 무변경"
```

---

### Task 7: ApiProvider + 데이터 훅 이동 (TDD)

**Files:**
- Create: `packages/shared/src/hooks/ApiProvider.tsx`, `packages/shared/src/hooks/index.ts`
- Move+수정: `apps/web/src/hooks/useWorks.ts`, `useInteractions.ts` → `packages/shared/src/hooks/`
- Test: `packages/shared/tests/hooks.test.tsx`

**Interfaces:**
- Consumes: Task 4 `createApiClients`, Task 5 키 팩토리, Task 6 API 팩토리
- Produces:

```ts
export interface Apis {
  authApi: AuthApi; workApi: WorkApi; reviewApi: ReviewApi;
  interactionApi: InteractionApi; rankingApi: RankingApi;
}
export function createApis(clients: ApiClients): Apis;
export const ApiProvider: React.FC<{ apis: Apis; children: React.ReactNode }>;
export function useApis(): Apis;
// + 기존 훅 26개 전부, 시그니처 무변경:
//   useWorks, useWorkDetail, useRecentReleases, useRecentReviewedWorks, useUpcomingReleases,
//   useGenres, useGenresWithCount, usePlatforms, useSearchWorks, useInfiniteWorks,
//   useReviews, useCreateReview, useUpdateReview, useDeleteReview, useLikeStats,
//   useToggleLike, useToggleDislike, useBookmarkStatus, useToggleBookmark,
//   useMyReviews, useMyBookmarks, useMyLikes
```

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/tests/hooks.test.tsx`:

```tsx
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createApiClients, createApis } from "../src/api";
import { ApiProvider, useWorks } from "../src/hooks";

const BASE = "http://test.local";
const server = setupServer(
  http.get(`${BASE}/api/works`, () =>
    HttpResponse.json({
      content: [{ id: 1, domain: "GAME", title: "t", thumbnail: "", score: 0, rank: 1, releaseDate: "" }],
      page: 0, size: 20, totalElements: 1, totalPages: 1, first: true, last: true,
    }),
  ),
);

beforeAll(() => server.listen());
afterAll(() => server.close());

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const apis = createApis(createApiClients({ baseURL: BASE, getToken: () => null }));
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider apis={apis}>{children}</ApiProvider>
    </QueryClientProvider>
  );
}

describe("shared hooks", () => {
  it("useWorks가 ApiProvider의 API로 데이터를 가져온다", async () => {
    const { result } = renderHook(() => useWorks(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data!.content).toHaveLength(1);
  });

  it("ApiProvider 밖에서 useApis를 쓰면 명확한 에러를 던진다", () => {
    expect(() => renderHook(() => useWorks())).toThrow(/ApiProvider/);
  });
});
```

- [ ] **Step 2: 실패 확인** — `pnpm --filter @aod/shared test` → FAIL

- [ ] **Step 3: ApiProvider 구현**

`packages/shared/src/hooks/ApiProvider.tsx`:

```tsx
import React, { createContext, useContext } from "react";
import type { ApiClients } from "../api/client";
import { createAuthApi, type AuthApi } from "../api/authApi";
import { createWorkApi, type WorkApi } from "../api/workApi";
import {
  createReviewApi, createInteractionApi,
  type ReviewApi, type InteractionApi,
} from "../api/interactionApi";
import { createRankingApi, type RankingApi } from "../api/rankingApi";

export interface Apis {
  authApi: AuthApi;
  workApi: WorkApi;
  reviewApi: ReviewApi;
  interactionApi: InteractionApi;
  rankingApi: RankingApi;
}

export function createApis(clients: ApiClients): Apis {
  const { publicApi, privateApi } = clients;
  return {
    authApi: createAuthApi(publicApi, privateApi),
    workApi: createWorkApi(publicApi),
    reviewApi: createReviewApi(publicApi, privateApi),
    interactionApi: createInteractionApi(publicApi, privateApi),
    rankingApi: createRankingApi(publicApi),
  };
}

const ApiContext = createContext<Apis | undefined>(undefined);

export const ApiProvider: React.FC<{ apis: Apis; children: React.ReactNode }> = ({
  apis,
  children,
}) => <ApiContext.Provider value={apis}>{children}</ApiContext.Provider>;

export function useApis(): Apis {
  const apis = useContext(ApiContext);
  if (apis === undefined) {
    throw new Error("useApis must be used within an ApiProvider");
  }
  return apis;
}
```

- [ ] **Step 4: 훅 파일 이동·변환**

```bash
git mv apps/web/src/hooks/useWorks.ts packages/shared/src/hooks/useWorks.ts
git mv apps/web/src/hooks/useInteractions.ts packages/shared/src/hooks/useInteractions.ts
```

**변환 규칙 (양 파일 공통, 기계적):**
1. `import { workApi, ... } from "../api/workApi"` → `import type { WorksQueryParams, ReleasesQueryParams } from "../api/workApi"` (타입만) + `import { useApis } from "./ApiProvider"`
2. 각 훅 함수 첫 줄에 `const { workApi } = useApis();` (해당 API만 구조분해)
3. 인라인 queryKey → Task 5 팩토리 호출로 교체 (매핑표 그대로)
4. `../types/api` → `../types`
5. **그 외 로직(enabled, placeholderData, optimistic update, invalidation 대상) 무변경**

변환 예 — `useWorks`와 `useToggleBookmark` (나머지 24개 동일 패턴):

```ts
// useWorks.ts (발췌)
import {
  useQuery, UseQueryOptions, keepPreviousData, useInfiniteQuery,
} from "@tanstack/react-query";
import type { WorksQueryParams, ReleasesQueryParams } from "../api/workApi";
import type { PageResponse, WorkSummary, WorkDetail } from "../types";
import { useApis } from "./ApiProvider";
import { workKeys, releaseKeys, metaKeys } from "../queries/keys";

export const useWorks = (
  params: WorksQueryParams = {},
  options?: Omit<UseQueryOptions<PageResponse<WorkSummary>>, "queryKey" | "queryFn">,
) => {
  const { workApi } = useApis();
  return useQuery<PageResponse<WorkSummary>>({
    queryKey: workKeys.list(params),
    queryFn: () => workApi.getWorks(params),
    ...options,
  });
};
```

```ts
// useInteractions.ts (발췌)
export const useToggleBookmark = (contentId: number) => {
  const { interactionApi } = useApis();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => interactionApi.toggleBookmark(contentId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: interactionKeys.bookmarkStatus(contentId) });
      // ...기존 optimistic update 로직 그대로, 키만 팩토리로...
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.bookmarkStatus(contentId) });
      queryClient.invalidateQueries({ queryKey: myKeys.bookmarksRoot() });
    },
  });
};
```

`packages/shared/src/hooks/index.ts`:

```ts
export * from "./ApiProvider";
export * from "./useWorks";
export * from "./useInteractions";
```

- [ ] **Step 5: 통과 확인** — `pnpm --filter @aod/shared test && pnpm --filter @aod/shared typecheck` → 전체 PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(shared): ApiProvider + 데이터 훅 26개 이동 — 시그니처·캐시 키 보존"
```

---

### Task 8: 웹 전환 — @aod/shared 소비

**Files:**
- Modify: `apps/web/src/main.tsx`(Provider 배선), `apps/web/src/contexts/AuthContext.tsx`, `apps/web/src/pages/home-page.tsx`, `apps/web/src/pages/ranking-page.tsx`, 훅 import 파일 11곳
- Delete: `apps/web/src/api/`(4파일 + client.ts), `apps/web/src/hooks/`(빈 디렉터리)

**Interfaces:**
- Consumes: `@aod/shared/api`, `@aod/shared/hooks` (Task 4~7 전부)

- [ ] **Step 1: main.tsx 배선**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createApiClients, createApis } from "@aod/shared/api";
import { ApiProvider } from "@aod/shared/hooks";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const clients = createApiClients({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    (import.meta.env.PROD ? "/api" : "http://localhost:8080"),
  getToken: () => localStorage.getItem("token"),
  isDev: import.meta.env.DEV,
});
const apis = createApis(clients);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ApiProvider apis={apis}>
        <App />
      </ApiProvider>
    </QueryClientProvider>
  </StrictMode>
);
```

(기존 client.ts의 `console.log("API_BASE_URL = ...")` 상시 출력은 isDev 게이트로 흡수 — 의도된 미세 개선. `onSessionExpired`는 웹에 전달하지 않음 — 현행 401 동작 보존)

- [ ] **Step 2: AuthContext 전환**

`apps/web/src/contexts/AuthContext.tsx` 수정 (3곳):

```tsx
// 변경 1: import
import { useApis } from "@aod/shared/hooks";
import type { AuthResponse, UserInfo } from "@aod/shared/api";

// 변경 2: AuthProvider 첫 줄에
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authApi } = useApis();
  ...

// 변경 3: restoreUser의 useCallback 의존성 배열
}, [clearAuth, authApi]);
```

나머지 로직(localStorage TOKEN_KEY, restoreUser, login/signup/logout) 무변경. `AuthProvider`가 `ApiProvider` 안쪽(App.tsx 내부)에 있는지 확인 — main.tsx 배선상 자동 충족.

- [ ] **Step 3: rankingApi 직접 사용 페이지 2곳**

`home-page.tsx`: `import { rankingApi } from "../api/rankingApi"` 제거 → `import { useApis } from "@aod/shared/hooks"`, 컴포넌트 상단에 `const { rankingApi } = useApis();` 추가. `useQuery({ queryKey: ["home-all-rankings"], queryFn: () => rankingApi.getAllRankings() })` 부분 무변경 (페이지 전용 키는 페이지에 남는다).

`ranking-page.tsx`: 동일 패턴. `import { rankingApi, ExternalRanking } from "../api/rankingApi"` → `import type { ExternalRanking } from "@aod/shared/api"` + `const { rankingApi } = useApis();`. **주의: `rankingApi.getRankingsByPlatform` 호출이 useEffect 내 async 함수에 있으므로, `useApis()`는 반드시 컴포넌트 본문 최상위에서 호출.**

- [ ] **Step 4: 훅 import 일괄 교체**

```bash
cd apps/web && grep -rl -E "from \"[./]+hooks/(useWorks|useInteractions)\"" src
```

각 파일(실측 11곳)에서 `from "../hooks/useWorks"` → `from "@aod/shared/hooks"` (useInteractions 동일). `contexts/AuthContext`·`hooks/` 외 웹 전용 훅이 있으면 남긴다 (grep으로 useWorks/useInteractions만 대상 확인).

- [ ] **Step 5: 구 파일 삭제**

```bash
git rm apps/web/src/api/client.ts apps/web/src/api/authApi.ts apps/web/src/api/workApi.ts apps/web/src/api/interactionApi.ts apps/web/src/api/rankingApi.ts
# hooks/는 Task 7에서 git mv로 이미 비어 있음 — 디렉터리 잔재 확인만
```

- [ ] **Step 6: 전체 검증**

```bash
pnpm --filter @aod/web build     # tsc && vite build
pnpm --filter @aod/web lint
pnpm --filter @aod/shared test
```

Expected: 전부 그린. tsc가 남은 참조 누락을 전수 검출한다.

- [ ] **Step 7: 수동 스모크 (로컬)**

```bash
pnpm dev:web
```

브라우저에서: 홈 로딩(랭킹·신작·최근리뷰 3섹션), 로그인, 작품 상세에서 북마크 토글, 새로고침 후 상태 유지 확인.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(web): @aod/shared 소비로 전환 — UI·동작 무변경"
```

---

### Task 9: 가드레일 + 문서 정리

**Files:**
- Modify: `apps/web/eslint.config.js`(내부 경로 import 금지), `CLAUDE.md`(경로 갱신)

- [ ] **Step 1: 웹에서 shared 내부 경로 import 금지**

`apps/web/eslint.config.js`의 rules에 추가:

```js
"no-restricted-imports": [
  "error",
  { patterns: [{ group: ["@aod/shared/src/*"], message: "서브패스 export(@aod/shared/api 등)만 사용하세요." }] },
],
```

- [ ] **Step 2: CLAUDE.md 경로 갱신**

`CLAUDE.md`의 디렉터리 구조 섹션을 모노레포 구조(apps/web, packages/shared)로 수정. api/·hooks/·types/·constants/가 `packages/shared`로 이동했음을 명기.

- [ ] **Step 3: 검증 + Commit**

```bash
pnpm lint && pnpm test && pnpm build
git add -A
git commit -m "chore: 모노레포 가드레일(ESLint) + CLAUDE.md 경로 갱신"
```

---

### Task 10: Vercel 프리뷰 검증 + 머지

- [ ] **Step 1: 푸시 + PR 생성**

```bash
git push -u origin feature/f0-monorepo-shared
gh pr create --title "F0: pnpm 모노레포 전환 + @aod/shared 추출" --body "스펙: docs/superpowers/specs/2026-07-11-mobile-app-monorepo-design.md (F0-A/B/C)"
```

- [ ] **Step 2: 수동 — Vercel Root Directory 변경**

Vercel 대시보드 → 프로젝트 Settings → Build & Development → Root Directory = `apps/web` 저장. (Install Command가 기본이면 Vercel이 워크스페이스 루트에서 pnpm install을 수행하고 apps/web을 빌드한다)

- [ ] **Step 3: 프리뷰 배포 스모크**

PR의 프리뷰 URL에서: 홈 3섹션, 로그인, `/api/*` 프록시(api/[...path].ts) 동작, 작품 상세 확인.

- [ ] **Step 4: 리뷰 게이트**

superpowers:requesting-code-review로 리뷰 → APPROVE 후 main 머지. **머지 직후 프로덕션 배포가 새 Root Directory로 성공하는지 즉시 확인** (실패 시 Root Directory 되돌리면 원복됨 — main 코드는 apps/web 구조이므로 되돌리기보다 설정 재확인 우선).

---

## Self-Review 결과

- 스펙 F0-A/B/C ↔ Task 1/2/(3~9) 커버 확인. F1 이후는 별도 계획(shared 표면 확정 후 작성).
- 타입 일관성: `ApiClients`(T4) → `createApis`(T7) → `main.tsx`(T8), 키 팩토리 이름(T5 매핑표 = T7 변환 규칙) 일치 확인.
- 알려진 유의점: ① Task 5의 keys.ts가 Task 6의 타입을 import — 실행 시 Task 6을 먼저 해도 됨(명기). ② happy-dom + MSW node 조합에서 axios가 XHR 어댑터를 잡으면 인터셉트 실패 가능 — 그 경우 vitest environment를 테스트 파일 단위로 `// @vitest-environment node`(client·workApi 테스트) 지정, hooks 테스트만 happy-dom 유지.
