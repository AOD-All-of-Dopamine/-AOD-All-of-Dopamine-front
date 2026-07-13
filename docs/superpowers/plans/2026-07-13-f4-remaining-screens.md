# F4: 나머지 화면 — 웹 UI 충실 이식 계획

> executing-plans 인라인 (사용자 선호). 사용자 지시: **"웹의 UI를 그대로 옮겨줘"** — 각 화면은 대응 웹 페이지를 전체 읽고 레이아웃·수치·색을 tokens 기반으로 미러한다. 플랫폼 관례상 불가피한 차이만 허용하고 커밋에 명시.

**Goal:** 15화면 전체 동등 달성 (스펙 F4).

| 태스크 | 모바일 | 웹 원본 | 데이터 |
|---|---|---|---|
| T1 | (tabs)/new | new-releases-page(306) | useRecentReleases·useUpcomingReleases |
| T2 | (tabs)/ranking | ranking-page(380)+internal(143) 상단탭 | rankingApi + 내부랭킹 훅/api |
| T3 | (tabs)/profile + profile/reviews·bookmarks·likes | profile(260)+my-*(187/83/85) | useMyReviews·useMyBookmarks·useMyLikes |
| T4 | 리뷰 작성(작품상세 연결) + review/[id] | review-page(135) + work-detail 리뷰작성 흐름 | useCreateReview·useUpdateReview |
| T5 | (auth)/onboarding | onboarding-page(103) | — |
| T6 | 상세 화면 정밀화(별점보내기 팝업·필드표) + 전체 검증·에뮬레이터 스크린샷·푸시 | work-detail(855) | 기존 훅 |

**공통 규칙:** 진입 전 웹 파일 전체 읽기. 색은 tokens(신규 색은 웹 실측으로 추가). 아이콘 svg는 icons.tsx 인라인 추가. 게이트: 태스크당 typecheck+커밋, 마지막에 test·export·에뮬레이터.
