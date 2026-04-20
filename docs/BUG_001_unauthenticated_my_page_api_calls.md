# [BUG-001] 비로그인 마이페이지 접근 시 인증 API 400 에러

## 현상
비로그인 상태로 `/profile` 페이지 접근 시 콘솔에 아래 에러가 반복 출력됨.

```
GET https://api.allofdophamin.com/api/my/bookmarks?page=0&size=10 400 (Bad Request)
GET https://api.allofdophamin.com/api/my/reviews?page=0&size=1 400 (Bad Request)
GET https://api.allofdophamin.com/api/my/likes?page=0&size=10 400 (Bad Request)
```

화면에는 "로그인이 필요합니다" 문구가 정상 표시되었으나 API 요청 자체는 계속 발생.

## 원인
`profile-page.tsx`는 컴포넌트 최상단에서 React Query 훅을 호출한 뒤, 그 아래에서 `isAuthenticated` 체크를 수행한다.

```tsx
// ❌ 훅이 isAuthenticated 체크보다 먼저 실행됨
const { data: reviewsData }  = useMyReviews(0, 1);
const { data: bookmarksData } = useMyBookmarks(0, 10);
const { data: likesData }    = useMyLikes(0, 10);

if (!isAuthenticated) {      // 이 시점엔 이미 API가 호출된 상태
  return <로그인 안내 화면 />;
}
```

`useMyReviews` / `useMyBookmarks` / `useMyLikes` 훅에 `enabled` 조건이 없어서 마운트 즉시 쿼리가 실행됨.  
토큰 없이 `privateApi`를 호출하므로 백엔드가 400을 반환.

## 수정 내용

### `src/hooks/useInteractions.ts`
세 훅에 `enabled` 파라미터 추가 (기본값 `true` → 기존 호출 측 영향 없음).

```ts
// Before
export const useMyReviews = (page = 0, size = 20) => {
  return useQuery({ queryKey: [...], queryFn: ... });
};

// After
export const useMyReviews = (page = 0, size = 20, enabled = true) => {
  return useQuery({ queryKey: [...], queryFn: ..., enabled });
};
```

동일 패턴을 `useMyBookmarks`, `useMyLikes`에도 적용.

### `src/pages/profile-page.tsx`
훅 호출 시 `isAuthenticated` 전달.

```tsx
// After
const { data: reviewsData }  = useMyReviews(0, 1, isAuthenticated);
const { data: bookmarksData } = useMyBookmarks(0, 10, isAuthenticated);
const { data: likesData }    = useMyLikes(0, 10, isAuthenticated);
```

## 영향 범위
- `my-reviews-page.tsx`, `my-bookmarks-page.tsx`, `my-likes-page.tsx`는 `enabled` 기본값이 `true`이므로 변경 없이 동작.

## 교훈
인증이 필요한 React Query 훅은 반드시 `enabled: isAuthenticated` 조건을 포함해야 한다.  
React Hook은 조건문 내부에서 호출할 수 없으므로, `enabled` 옵션으로 실행 여부를 제어해야 한다.
