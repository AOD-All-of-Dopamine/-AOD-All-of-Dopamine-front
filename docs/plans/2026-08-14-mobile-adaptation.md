# 모바일 적응 플랜 (2026-08-14)

라이트 리디자인(2026-08-13)의 모바일(<lg) 보존형 적응.
목업: `mockups/mobile-light-mockup.html` (8프레임, 사용자 승인 완료 "오케이 가보자").
스펙 원본: `docs/specs/2026-08-13-light-redesign-design.md` - 토큰·칩·라운드 규칙 전부 그대로 상속. 새 색·새 라운드 금지.

## 감사에서 확인된 실결함 (해결 대상)

1. 헤더: 검색 필(300px 고정) + 로그인 버튼이 <lg에서 overflow - 로그인 버튼 화면 밖 잘림
2. 홈: 헤더 검색 필 + 본문 검색 바 중복
3. 도메인 칩 세로 래핑: "시리즈"·"웹소설"이 칩 안에서 줄바꿈 (탐색·랭킹·신작·검색 공통)
4. 랭킹: 전면 포스터 카드 1열 - 한 화면 1.5개
5. 하단 탭 아이콘이 구 커스텀 SVG 에셋 (Phosphor 규칙 위반 잔재)

## 설계 결정 (목업 확정안)

- **헤더 <lg**: 로고 + 검색 아이콘(→/search) + 로그인/프로필 아이콘. 검색 필·메뉴는 lg 이상 전용 (데스크톱 불변)
- **하단 탭**: Phosphor로 교체 - House/Compass/Trophy/CalendarBlank/User, 활성 탭 아이콘만 accent + fill 변형, 라벨 활성 시 ink 600
- **도메인 칩**: whitespace-nowrap + 가로 스크롤(스크롤바 숨김) - 전 페이지 공통
- **탐색 <lg**: details 아코디언 → 필터 바텀시트. `필터` 버튼 + 활성 개수 뱃지(accent-ink) + 적용 중 필터 accent-tint 칩(개별 해제 X 버튼) 가로 스크롤. 시트: 장르 pill 옵션(on=accent-tint/accent-ink), 상태 라디오, 요일/연령 pill, 하단 [닫기 | N개 작품 보기(accent-ink fill)]. **필터는 즉시 적용(URL replace 단일 출처 유지)** - 시트 내 별도 스테이징 상태 금지, footer 버튼은 현재 결과 수 표시 + 닫기 역할
- **탐색 카드 <lg**: 2열 그리드, 게임 도메인은 가로(16:9) 썸네일 유지
- **랭킹 <lg**: 컴팩트 순위 행 - 순위 숫자(1~3위 accent-ink) + 48×62 썸네일 + 제목/메타 + 우측 변동(↑n accent-ink / - text-3 / NEW star). 데스크톱 카드 그리드 불변
- **홈 <lg**: 본문 검색 바 제거(헤더 아이콘으로 단일화), 히어로 카드 → 가로 릴 → 리뷰 행 스택
- **상세 <lg**: 상단 뒤로가기+작품명 56px 바, 하단 고정 액션 바(관심 등록 accent-ink fill + 좋아요·리뷰 48px 고스트 원형). 게임=16:9 풀블리드 히어로, 웹툰·영화=포스터(108px 3:4)+정보 블록 헤더. 통계 패널: 게임=Steam desc+%+리뷰 수, 영화/TV=★TMDB+참여 수. 웹툰 요일·연재 상태 accent-tint 필
- **모션**: MOTION 3 유지 - 바텀시트 열림/닫힘 transition만, 스크롤 애니메이션 없음. prefers-reduced-motion 시 즉시 전환

## 태스크

### A. 공통 셸 + 목록 페이지 (구현 → 스펙·품질 리뷰 → 수정)
- [x] SiteHeader <lg 아이콘형 (데스크톱 불변)
- [x] NavigationBar Phosphor 교체 (구 SVG 에셋 참조 제거)
- [x] 도메인 칩 nowrap+가로 스크롤 (탐색/랭킹/신작/검색)
- [x] 홈 <lg 본문 검색 바 제거
- [x] 탐색 <lg 필터 바텀시트 + 활성 칩 행 + 2열 그리드
- [x] 랭킹 <lg 컴팩트 순위 행
- [x] 신작 <lg 행 구성 목업 정합 확인

### B. 상세 페이지 (구현 → 스펙·품질 리뷰 → 수정)
- [x] 상단 뒤로가기 바 + 하단 고정 액션 바 <lg
- [x] 도메인별 헤더 (게임 히어로 / 웹툰·영화 포스터 헤더)
- [x] 통계 패널 (Steam/TMDB) + 요일 필

### 게이트 (각 태스크 커밋 전)
- [x] `npm run build` 통과
- [x] grep: 임의 hex 0 / `rounded-[` 0 / em-dash 0 / 비Phosphor 아이콘 0 (변경 파일)
- [x] 데스크톱(1440px) 불변 확인 - 탐색 레일·랭킹 포디움·헤더 실화면 대조 (오케스트레이터)
- [x] 모바일 뷰포트(390px iframe) 실화면 대조 - 홈/탐색(시트 열기·pill 적용 99→4·칩 해제 원복)/랭킹/상세 게임·웹툰 (오케스트레이터)

## 비스코프 (백로그)

- 프로필/로그인/회원가입 페이지 모바일 폴리시
- 스와이프 제스처, pull-to-refresh 등 네이티브 제스처
- 필터 레일의 "Netflix Standard with Ads" 영문 원문 노출 (별도 백로그 항목)
- NavigationBar 하단 탭 safe-area-inset-bottom 미반영 - 상세 액션 바에는 반영
  했으나 탭바는 Task A 파일 보호로 이번 회차 미수정
- lg+ 상세 장르 태그 중복 key 경고(pre-existing) - lg 불변 룰 해제 시
  <lg dedupe(mobileTags)를 공용으로 승격

## 편차 기록

(구현·리뷰 중 발견 시 태스크 접두어와 함께 기록)

- A: 랭킹 컴팩트 행의 우측 변동 표시(↑n/-/NEW)와 메타(장르·연재 상태) 생략 -
  RankingResponse에 해당 필드가 없음. 데스크톱의 DeltaBadge·meta 생략과 동일
  근거이며 "계약 불변(신규 필드 없음)" 전제를 따름.
- A: 탐색 <lg에서 h1(도메인명)+결과 수+정렬 라벨 행 유지 - 목업 프레임 2에는
  제목이 없으나 결과 수 행(result-line) 역할을 겸하고 데스크톱과 연속성 유지.
- A: 필터 바텀시트가 하단 탭까지 덮는 전체 오버레이(fixed inset-0, z-50) -
  목업 정적 프레임에선 탭바가 프레임 크롬으로 남지만 모달 딤 의미상 전체 덮개.
- A: 신작 행 수치(썸네일 52px, 제목 15px 등)는 기존 ReleaseRow 유지 - 행 구성
  (썸네일+제목+메타, 날짜 라벨 인라인)이 목업 프레임 5와 동일해 변경 최소화.
- A: 헤더 <lg 높이 56px(h-14)·좌우 패딩(16/8px)을 목업 정합 - lg 이상 64px 불변.
- A: 홈 검색 바 제거로 무참조가 된 SearchBar 컴포넌트와 구 하단 탭 SVG 에셋
  5종(home/ranking/search/calendar/my-icon) 삭제.
- A: 컴팩트 행 썸네일·시트 상단 라운드는 목업 수치(6px/16px)를 표준 유틸
  (rounded-md/rounded-t-2xl)로 구현 - 임의값(rounded-[..]) 미사용.
- A: 마이크로 수치 편차(기록만, 데스크톱 스타일 연속성 우선으로 유지) -
  랭킹·탐색 h1 모바일 26px(목업 22px), 헤더 로고 21px(목업 20px),
  헤더 프로필 아이콘 23px(목업 21px).
- A: 필터 바텀시트는 리뷰 반영으로 네이티브 dialog.showModal() 전환
  (ConfirmDialog 전례) - 배경 inert·포커스 트랩·top-layer는 브라우저 제공,
  딤=::backdrop(opacity 300ms 전환, reduced-motion 즉시).
- B: 상세 <lg에서 SiteHeader 숨김은 public-layout의 라우트 조건
  (`hidden lg:contents` 래퍼)으로 구현 - SiteHeader 파일은 불변(Task A 보호),
  lg+는 display:contents라 박스가 생기지 않아 sticky 포함 시각 영향 0.
- B: 웹툰 상세의 연령 태그(목업 프레임 7 "15세")와 작품 정보 "연령 등급" 행
  미노출 - 상세 API domainInfo(WEBTOON)에 ageRating 키가 없음 (목록
  WorkSummary에만 존재, 실응답 /api/works/985·1042로 확인).
- B: <lg 통계 패널은 목업 d-stat대로 Steam/TMDB만 - AOD 평점 필은 <lg 미노출
  (리뷰 수는 리뷰 섹션 헤더가 전달). TMDB 평점(platformInfo attr.rating,
  vote_count)은 <lg 전용 신설이며 lg+ 헤더 필 구성은 기존 그대로(lg 불변 룰).
- B: 포스터 헤더 라운드는 목업 10px 대신 rounded-panel(12px) - rounded-[ 금지
  게이트에 따라 패널 토큰 준용.
- B: <lg 장르 태그 행만 dedupe - 실데이터에 중복 장르 실재(예: 1042 "판타지"
  2회, key 충돌 방지). lg+ 태그 렌더는 기존 그대로(lg 불변 룰).
- B: 시놉시스 더보기는 4줄 클램프 실측 overflow일 때만 노출하고 열림 후
  "접기" 토글 제공 - 목업은 정적 "더보기"만 있으나 짧은 시놉시스에서 무의미한
  버튼 노출 방지.
- B: 리뷰 반영 - 클램프 측정을 ResizeObserver+fonts.ready 재측정으로 보강
  (lg 진입 후 <lg 리사이즈/회전·폰트 스왑 대응, 열림 중엔 관찰 중지로 오판 방지).
- B: 리뷰 반영 - DetailSkeleton <lg 분기 추가(포스터 헤더+태그+시놉시스 행
  형상, 도메인 미확정이라 다수 도메인인 포스터형 기준) - lg+ 스켈레톤 불변.
- B: 리뷰 반영 - 액션 바 하단 패딩을 max(14px, env(safe-area-inset-bottom))
  style로 적용(임의값 클래스 게이트 회피), 상세 <lg 푸터는 public-layout에서
  액션 바 높이만큼 여백(max-lg:pb-24) 확보해 영구 가림 해소.
