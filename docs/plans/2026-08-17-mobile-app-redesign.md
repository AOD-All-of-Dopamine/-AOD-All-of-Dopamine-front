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
- [ ] theme.ts AOD 토큰 재정의 + 라이트 락, Pretendard 확인/도입
- [ ] phosphor-react-native 도입, 탭바 6탭(컬렉션 탭 신설, 라우트 스텁 포함) - 목업 하단 탭 문법
- [ ] 공용: WorkCard 계열을 목업 카드 문법(포스터/가로 썸네일, meta·tags·foot)으로 재작성 +
      RN용 workCardInfo 파생 모듈(shared 상수 소비)
- [ ] 상단 바 공통(아이콘 헤더 56px / 상세용 뒤로가기+제목 바) 컴포넌트

### M-B. 목록 화면 (구현 → 리뷰 → 수정)
- [ ] 홈: 히어로 카드·가로 릴·리뷰 행 (목업 프레임 1)
- [ ] 탐색: 도메인 칩 가로 스크롤 + 필터 시트(즉시 적용, 활성 칩 행) + 2열 카드 (프레임 2·3)
- [ ] 랭킹: 컴팩트 순위 행(1~3위 accent) (프레임 4)
- [ ] 신작: 날짜 그룹 행 (프레임 5)
- [ ] 검색: 카드 문법 통일

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
