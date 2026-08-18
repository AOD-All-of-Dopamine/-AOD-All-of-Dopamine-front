# 탐색·랭킹 정리 플랜 (2026-08-18)

사용자 요구 4건: ①탐색 "전체" 탭 제거 ②신작·랭킹의 게임 썸네일 가로(460:215)
③랭킹 포디움 제거(전 순위 동일 행) ④장르 필터 개수 내림차순 + 개수 뱃지.
브랜치: front feature/explore-refinements (백엔드 무변경 - genres-with-count API 기존재,
성인 제외 집계 반영됨). 웹·모바일 동시 적용.

## 설계 결정

- ① 전체 탭 제거 후 기본 도메인 = **게임** (콘텐츠 최다). 웹 /explore 무파라미터 진입 시
  domain=game으로 정규화(URL replace). 구 URL의 domain 부재·기존 공유 링크 호환.
  혼합 그리드(1-C 게임 컴팩트 행)는 검색 페이지 전용으로 존속.
- ② 신작(최근 출시·출시 예정 행)과 랭킹 행의 게임 도메인 썸네일 = 460:215 가로
  (기존 세로 크롭 제거). 행 높이는 유지하고 썸네일 폭만 도메인별 분기.
- ③ 웹 랭킹의 1~3위 포디움 카드 제거 - 전 순위를 동일한 컴팩트 행으로(모바일과 동일 문법,
  1~3위 순번 accent-ink 강조는 유지). 관련 컴포넌트(PodiumCard) 참조 0이면 삭제.
- ④ 장르 필터 축 데이터를 useGenres → genres-with-count(기존 API, 개수 내림차순 정렬 제공)로
  교체. 옵션 라벨 옆 개수 뱃지(ink-3, tabular-nums). 웹 레일·바텀시트·모바일 시트 공통.
  선택 상태·URL 축 형식은 불변(장르명만 사용).

## 태스크

### E-FE1. 웹 (구현 → 리뷰 → 수정)
- [x] 전체 탭 제거 + 기본 game 정규화 (탐색)
- [x] 랭킹 포디움 제거·전 순위 동일 행 + 게임 가로 썸네일
- [x] 신작 행 게임 가로 썸네일
- [x] 장르 필터 genres-with-count 전환 + 개수 뱃지 (레일·시트)

### E-FE2. 모바일 앱 (구현 → 리뷰 → 수정)
- [ ] 탐색 전체 탭 제거(기본 game 유지) - 혼합 행 로직은 검색 전용화
- [ ] 랭킹·신작 게임 가로 썸네일
- [ ] 장르 시트 genres-with-count + 개수 뱃지

### 게이트
- [ ] web build + mobile typecheck + shared test + grep 게이트
- [ ] 실화면: 탐색 기본 게임 탭, 랭킹 동일 행, 장르 개수 뱃지 (오케스트레이터)

## 비스코프 (백로그)
- 검색 페이지의 도메인 필터 UX 개선(전체 탭 제거로 검색이 유일한 혼합 표면)

## 편차 기록
(구현·리뷰 중 발견 시 기록)

- E-FE1: shared 무변경 - workApi.getGenresWithCount·useGenresWithCount·
  metaKeys.genresWithCount가 이미 존재해 플랜이 허용한 "shared 1곳 추가"가
  불필요했다. 웹은 소비만 전환.
- E-FE1: PodiumCard는 랭킹 페이지 외에 dev 컴포넌트 갤러리
  (dev-components-page)도 참조하고 있어 갤러리 섹션까지 제거(22종으로 갱신)한 뒤
  참조 0 확인 후 파일 삭제. SkeletonCard "panel-row"·RankRow "panel" 변형은
  dev 갤러리 전시가 남아 존속(주석에 실사용처 소멸 명시).
- E-FE1: 신작 GroupSkeleton도 게임 탭에서 460:215 가로 썸네일 골격으로 분기 -
  플랜은 랭킹 스켈레톤만 명시했으나 로드 후 레이아웃 시프트 방지 목적의
  동일 관례 적용(행 높이 78px 불변).
- E-FE1: 탐색 URL 정규화는 도메인 값 표기 자체를 canonicalize하는 이펙트로 구현
  (domain 부재·all·미지 값·대문자 표기 모두 domain=game/소문자로 replace).
