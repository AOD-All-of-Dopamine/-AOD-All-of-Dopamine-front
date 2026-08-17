# Steam 정제 + 혼합 그리드 플랜 (2026-08-18)

사용자 요구 4건: ①Steam 19금 제외 ②가로 썸네일이 혼합 목록에 자연스럽게 ③게임 최신출시순에서
출시 예정작은 선택 시에만 ④리뷰 수 기본 필터.
브랜치: back `feature/steam-refinements` / front `feature/steam-refinements` (main 직푸시는
자동 배포 트리거이므로 금지 - 검증 후 머지).

## 실태 (로컬 실측)

- `platform_data.attributes.required_age`: Steam 894건 전수 존재, `>= 18`이 10건
- 미래 출시작(GAME): 로컬 0건 (Steam은 출시 예정 수집하므로 prod·향후 유효)
- `review_summary.total_reviews`: 존재 (기존분은 재크롤로 채워짐)

## 설계 결정

### ① 성인 제외 - contents.is_adult 마스터 승격
- **신규 수집**: SteamGameExecutor에서 `required_age >= 18`이면 saveRaw 전에 스킵 (아예 안 담음)
- **기존분**: 삭제하지 않고 노출 차단 - `contents.is_adult boolean not null default false` 컬럼
  승격 + Flyway **V6**(컬럼 + Steam required_age>=18 백필) + 목록·검색·신작·발견 쿼리에
  `AND is_adult = false`. 상세 직접 URL은 허용(목록 비노출이 요구 범위)
- 필터 규율 준수: attr(JSONB)로 매 쿼리 필터하지 않고 마스터 컬럼으로 승격하는 이유

### ③ 출시 예정 분리 (게임 탭, 백엔드 무변경)
- 프론트가 게임 탭 기본으로 `releaseTo=오늘` 전송 → 기존 findWorks 날짜 축이 처리
- 필터에 "출시 예정 포함" 토글 - 켜면 releaseTo 해제. 신작 페이지의 예정 섹션은 기존대로

### ④ 리뷰 수 필터 - game_contents.review_count 도메인 컬럼 승격
- yml: `review_summary.total_reviews: domain.reviewCount` 매핑 추가 (신규·재크롤 시 채움)
- Flyway V6에 컬럼 + 기존 attr 백필 포함
- findWorks에 게임 축 EXISTS 서브쿼리(웹툰 3축 패턴): `reviewCountMin` 파라미터
- 필터 UI: 게임 탭 "리뷰 수" 라디오 - 전체 / 100+ / 1,000+ / 10,000+ (avg_playtime류 확장 여지)

### ② 혼합 그리드 - 썸네일 비율 기반 카드 배치 (목업 승인 필요)
- 문제: 전체 탭·검색 등 혼합 목록에서 게임(가로 원본)이 세로 크롭되거나 세로 틀에 어색
- 안: CSS grid에서 **게임 카드 = 2칸 스팬 가로형**(16:9), 포스터 카드 = 1칸(2:3) -
  이미지 높이 행 단위 통일로 벽돌식 자연 배치. 데스크톱 4열 기준 게임 2칸.
- 모바일(웹 <lg·앱): 2열 그리드에서 게임 = 풀폭 1행 가로 카드
- 목업: `mockups/mixed-grid-mockup.html` - 승인 후 웹·모바일 구현

## 태스크

### S-BE. 백엔드 (구현 → 리뷰 → 수정)
- [ ] V6 마이그레이션: is_adult 컬럼+백필, game_contents.review_count 컬럼+백필
- [ ] Content 엔티티 is_adult / GameContent reviewCount + steam.yml 매핑
- [ ] SteamGameExecutor 성인 스킵 (수집 단계)
- [ ] findWorks: is_adult 제외(전 목록 경로) + reviewCountMin 게임 축, WorkController 파라미터
- [ ] 테스트: 성인 제외·리뷰 축 케이스

### S-FE1. 웹 (구현 → 리뷰 → 수정)
- [ ] 게임 탭 기본 releaseTo=오늘 + "출시 예정 포함" 토글 (URL 축 추가)
- [ ] 게임 탭 리뷰 수 라디오 필터
- [ ] 혼합 그리드(전체 탭·검색): 게임 2칸 스팬 가로 카드 (목업 확정안)

### S-FE2. 모바일 앱 (구현 → 리뷰 → 수정)
- [ ] 필터 시트에 출시 예정 토글·리뷰 수 라디오 (웹 축 미러)
- [ ] 혼합 목록 게임 풀폭 가로 카드

### 게이트
- [ ] BE: 테스트 그린 + 로컬 부트 V6 적용 확인 / FE: 빌드·타입체크·기존 grep 게이트
- [ ] E2E: 성인 게임 목록 비노출, 출시 예정 토글 동작, 리뷰 수 필터 결과 감소, 혼합 그리드 실화면
- [ ] 머지: back 먼저(배포 트리거) → front

## 비스코프 (백로그)

- 성인 콘텐츠 정책의 타 도메인 확장(웹툰/웹소설 성인 등급 노출 정책)
- 기존 성인 게임 10건의 DB 삭제 여부 (현재는 숨김만 - 팀 결정 필요)
- 리뷰 수 외 Steam 지표 필터(동접·플레이타임)

## 편차 기록

(구현·리뷰 중 발견 시 기록)
