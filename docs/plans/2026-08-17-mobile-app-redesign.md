# 모바일 앱(Expo) 라이트 리디자인 플랜 (2026-08-17)

apps/mobile을 구 디자인 미러에서 라이트 리디자인으로 전환.
**구속력 있는 스펙 = 승인 목업**: `mockups/mobile-light-mockup.html`(8프레임) +
`mockups/collections-mockup.html` 섹션 5(모바일 4프레임). 새 목업 승인 절차 없음 - 사용자 확정
("통합 끝나면 모바일도 새 디자인으로 맞추자").
전제: integration/light-redesign-monorepo 통합 완료 - @aod/shared에 컬렉션 API·카드 9필드·
useCollections(조회수 회피 캐시 설계) 이미 존재. 모바일은 이를 소비만 한다.

## 현 상태 (실측)

- expo-router 파일 라우팅: (tabs) 5탭(index/explore/ranking/new/profile) + work/[id] + search + (auth) 3 + profile 하위 3 + review/[id]
- 스타일: StyleSheet + constants/theme.ts + themed-text/view + use-color-scheme (다크 스캐폴드)
- 아이콘: 구 웹 SVG 이식본(svg-assets/tab-icons) - 웹에서 이미 폐기한 세트
- nativewind/tailwind 없음. react-native-svg 있음. .web.tsx 변형 존재 → expo web 검증 가능

## 설계 결정

- **테마**: constants/theme.ts를 AOD 라이트 토큰으로 재정의 (canvas #f7f6f4 / surface #fdfdfc /
  line #e7e5e1 / line-strong #d8d5cf / ink #1c1b19 / ink-2 #716f6a / ink-3 #9c9993 /
  accent #e2542c / accent-ink #b23d1c / accent-tint #faeee9 / star #d9930d / danger #c73e1d /
  틴트 6종은 콘텐츠 색). 라운드 12(패널)/8(인풋)/pill. **라이트 락** - 다크 매핑은 백로그
  (웹과 동일 정책), use-color-scheme 스캐폴드는 제거하지 않고 라이트 고정
- **아이콘**: phosphor-react-native 도입, 구 SVG 세트 단계적 폐기. 별점=star 토큰
- **폰트**: Pretendard(expo-font) - 이미 로드 중이면 유지, 없으면 도입
- **탭 6개**: 홈·탐색·컬렉션·랭킹·신작·프로필 (웹 확정안과 동일). 활성=accent+fill 변형
- **시트(필터/담기)**: RN Modal + Animated 슬라이드업으로 자작 (heavy 의존성 지양,
  @gorhom/bottom-sheet는 필요 판단 시 구현자 재량 - 편차 기록)
- **카드 파생 로직**: 웹 workCardInfo와 동일 규칙(도메인별 meta/tags/footer, 장르 dedupe,
  연령 공백 정규화, 스팀 한글 desc) - shared 상수를 소비하는 RN 버전 파생 모듈
- **하드 룰**: 임의 hex는 theme.ts 토큰 정의에만 / em-dash 금지 / 비Phosphor 아이콘 신규 사용 금지
  / @aod/shared 계약 수정 금지(모바일은 소비자 - 부족하면 편차 기록 후 오케스트레이터 에스컬레이션)

## 태스크

### M-A. 테마·셸 (구현 → 리뷰 → 수정)
- [x] theme.ts AOD 토큰 재정의 + 라이트 락, Pretendard 확인/도입
- [x] phosphor-react-native 도입, 탭바 6탭(컬렉션 탭 신설, 라우트 스텁 포함) - 목업 하단 탭 문법
- [x] 공용: WorkCard 계열을 목업 카드 문법(포스터/가로 썸네일, meta·tags·foot)으로 재작성 +
      RN용 workCardInfo 파생 모듈(shared 상수 소비)
- [x] 상단 바 공통(아이콘 헤더 56px / 상세용 뒤로가기+제목 바) 컴포넌트

### M-B. 목록 화면 (구현 → 리뷰 → 수정)
- [x] 홈: 히어로 카드·가로 릴·리뷰 행 (목업 프레임 1)
- [x] 탐색: 도메인 칩 가로 스크롤 + 필터 시트(즉시 적용, 활성 칩 행) + 2열 카드 (프레임 2·3)
- [x] 랭킹: 컴팩트 순위 행(1~3위 accent) (프레임 4)
- [x] 신작: 날짜 그룹 행 (프레임 5)
- [x] 검색: 카드 문법 통일

### M-C. 상세·컬렉션 (구현 → 리뷰 → 수정)
- [ ] work/[id]: 게임 16:9 히어로 / 포스터 헤더, 통계 패널(Steam/TMDB), 하단 액션 바,
      담기 진입점 (프레임 6·7·8)
- [ ] 컬렉션 4표면: 발견 탭 / 상세(+좋아요 액션 바) / 생성·편집 / 담기 시트
      (collections-mockup 5a~5d) - shared useCollections 소비
- [ ] 프로필 하위(찜/좋아요/리뷰) 카드 문법 통일

### 게이트 (태스크별)
- [ ] `pnpm --filter @aod/mobile typecheck` + `pnpm --filter @aod/web build`(shared 회귀 방지)
      + `pnpm --filter @aod/shared test`
- [ ] grep: 임의 hex(theme.ts 제외) 0 / em-dash 0 / 구 svg-assets 신규 참조 0
- [ ] expo web(`expo start --web`) 실화면 목업 대조 (오케스트레이터)
- [ ] 실기기/에뮬레이터 확인은 사용자 몫으로 문서화 (Expo Go)

## 비스코프 (백로그)

- 다크 테마 매핑, 네이티브 제스처(스와이프 등), 푸시 알림, 성능 튜닝(리스트 가상화 개선)
- 구 svg-assets 완전 삭제(참조 0 확인 후 별도 정리 커밋)

## 편차 기록

(구현·리뷰 중 발견 시 태스크 접두어와 함께 기록)

- M-A: Pretendard는 이미 expo-font로 로드 중(assets/fonts static 4 weights + 루트 useFonts) -
  신규 도입 없음, 기존 체계 유지.
- M-A: WEEKDAY_KO가 shared에 없음(웹 workCardInfo.tsx 로컬 정의) - 웹 정의를 모바일
  components/ui/workCardInfo.tsx에 미러링. shared 승격 여부는 오케스트레이터 판단
  (shared 수정 금지 룰에 따라 모바일에서 손대지 않음).
- M-A: 목업 헤더·탭바의 반투명 + backdrop blur(.92/.96)는 RN 코어 미지원 - 불투명 surface로
  대체 (heavy 의존성 지양 결정과 일관).
- M-A: 구 화면 컴파일 보존용으로 theme/tokens.ts 구 토큰명을 라이트 팔레트로 근사 매핑
  (rankGold→star, rankSilver→ink-3, rankBronze→tint-terracotta, changeUp→accent-ink,
  changeDown·blue→tint-slate, error→danger, surfaceDeep→canvas). 정식 문법은 M-B/C 리스타일에서.
- M-A: grep 게이트(임의 hex·em-dash·구 svg-assets 참조)는 M-A 신규·수정 파일 기준 0.
  구 화면(M-B/C 대상)에는 기존 hex·em-dash·svg-assets 참조가 잔존 - 각 화면 리스타일 때 제거.
- M-A: 신규 WorkCard 썸네일 폴백은 구 svg-assets 대신 Phosphor 도메인 아이콘
  (FilmSlate/TelevisionSimple/GameController/BookOpenText/Books). 구 FallbackThumb 교체는 M-B/C.
- M-A: 신규 카드 이미지 비율은 목업 실측대로 포스터 3:4, 게임 16:9 (웹 카드 2:3·460/215와
  의도적으로 다름 - 모바일 목업이 스펙).
- M-B: 홈 히어로 데이터는 추천 엔진 부재로 웹 home과 동일한 임시 선정 - 최근 리뷰작 1건,
  폴백은 신작 1건. 구 홈의 랭킹 섹션·퀵내비·AI 준비중 박스는 목업 프레임 1에 없어 제거.
- M-B: 홈 "방금 올라온 리뷰"의 더보기 버튼·인용문·닉네임 생략 (웹 홈과 동일 편차 -
  이동할 리뷰 목록 화면이 없고 API가 작품 요약만 반환).
- M-B: 랭킹의 순위 변동(rank-delta)·행 meta(장르·상태)는 생략 - RankingResponse에 필드가
  없음(웹 랭킹 페이지와 동일 편차). 목업의 "변동은 데이터 있으면" 조건 불충족.
  구 화면의 OTT 교차 클라 필터는 웹과 동일한 원천(플랫폼) 칩 선택으로 대체.
- M-B: 신작은 목업 프레임 5의 날짜 그룹 행 문법에 웹 /new 구조(최근 출시 + 출시 예정
  2섹션, 예정 행 D-day 필)를 적용 - 구 화면의 플랫폼 칩·신작/공개예정 토글 제거
  (목업·웹 모두 도메인 칩만). 양 섹션 40건 고정이라 FlatList 대신 ScrollView.
- M-B: 탐색 필터 축 데이터를 구 useGenresWithCount + DOMAIN_PLATFORMS 상수에서 웹과 동일한
  useGenres/usePlatforms API 축으로 교체 (SOON_PLATFORMS·era·웹툰 3축 웹 미러).
  전체 탭은 백엔드가 필터 미적용이라 시트에 안내문만 (웹 동일).
- M-B: 시트는 자작 BottomSheet(RN Modal + Animated 슬라이드업 260ms) - 플랜 결정대로
  @gorhom/bottom-sheet 미도입. RN에 prefers-reduced-motion 대응 개념이 없어 Animated 기본.
- M-B: 목업 흰색(#fff) 텍스트(히어로 카피·칩 on·버튼 fill)는 Palette.surface로 대체
  (웹 text-surface 관례와 통일 - 임의 hex 금지 룰). 히어로 그라데이션 종점은
  Overlay.heroGrad 토큰으로 theme.ts에 추가(additive).
- M-B: 스켈레톤 펄스는 Animated opacity 루프(SkeletonPulse)로 웹 animate-pulse 대응.
- M-B: 탐색 전체 탭의 카드 variant는 웹과 동일하게 페이지 단위(게임 탭만 landscape) -
  혼합 도메인에서 게임 카드도 portrait 크롭 수용.
