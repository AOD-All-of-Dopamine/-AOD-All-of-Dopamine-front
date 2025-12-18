/**
 * DTO 필드명을 사용자 친화적인 한글 레이블로 변환
 * 백엔드 WorkApiService.java의 getDomainInfo() 기반
 */

// 도메인 정보 필드 레이블 (domainInfo)
export const DOMAIN_FIELD_LABELS: Record<string, string> = {
  // === GAME (게임) ===
  developer: "개발사",
  publisher: "퍼블리셔",
  genres: "장르",
  platforms: "지원 플랫폼",
  releaseDate: "출시일",
  
  // === MOVIE (영화) ===
  runtime: "상영시간",
  directors: "감독",
  cast: "출연진",
  
  // === TV (드라마/시리즈) ===
  seasonCount: "시즌 수",
  episodeRuntime: "에피소드 러닝타임",
  firstAirDate: "첫 방영일",
  
  // === WEBTOON (웹툰) ===
  author: "작가",
  status: "연재 상태",
  weekday: "연재 요일",
  ageRating: "연령 등급",
  
  // === WEBNOVEL (웹소설) ===
  startedAt: "연재 시작일",
  
  // === 공통 필드 ===
  title: "제목",
  masterTitle: "원제",
  description: "설명",
  synopsis: "시놉시스",
};

// 플랫폼 정보 필드 레이블 (platformInfo.attributes)
export const PLATFORM_FIELD_LABELS: Record<string, string> = {
  // === 공통 플랫폼 필드 ===
  url: "작품 URL",
  platformSpecificId: "플랫폼 ID",
  
  // === NAVER_SERIES (네이버 시리즈) ===
  rating: "평점",
  comment_count: "댓글 수",
  download_count: "관심 수",
  author: "작가",
  publisher: "출판사",
  status: "연재 상태",
  age_rating: "연령 등급",
  genres: "장르",
  synopsis: "시놉시스",
  image_url: "이미지 URL",
  
  // === NAVER_WEBTOON (네이버 웹툰) ===
  weekday: "연재 요일",
  completed: "완결 여부",
  
  // === KAKAOPAGE (카카오페이지) ===
  view_count: "조회수",
  like_count: "좋아요 수",
  
  // === Steam (게임) ===
  short_description: "간단 설명",
  detailed_description: "상세 설명",
  about_the_game: "게임 소개",
  supported_languages: "지원 언어",
  header_image: "헤더 이미지",
  screenshots: "스크린샷",
  movies: "동영상",
  release_date: "출시일",
  coming_soon: "출시 예정",
  price_overview: "가격 정보",
  platforms: "지원 플랫폼",
  metacritic: "메타크리틱",
  categories: "카테고리",
  recommendations: "추천 수",
  achievements: "도전 과제",
  dlc: "DLC",
  package_groups: "패키지",
  developers: "개발사",
  publishers: "퍼블리셔",
  
  // === 기타 ===
  tags: "태그",
  content_descriptors: "콘텐츠 설명",
  legal_notice: "법적 고지",
  review_count: "리뷰 수",
  external_id: "외부 ID",
  required_age: "최소 연령",
  is_free: "무료 게임",
};

// 플랫폼명 한글 변환
export const PLATFORM_LABELS: Record<string, string> = {
  // === 게임 플랫폼 ===
  steam: "Steam",
  epic: "Epic Games Store",
  gog: "GOG",
  playstation: "PlayStation Store",
  xbox: "Xbox Store",
  nintendo: "Nintendo eShop",
  
  // === OTT 플랫폼 ===
  netflix: "넷플릭스",
  watcha: "왓챠",
  wavve: "웨이브",
  tving: "티빙",
  disney_plus: "디즈니 플러스",
  apple_tv: "Apple TV+",
  coupang_play: "쿠팡 플레이",
  
  // === 웹툰/웹소설 플랫폼 ===
  NAVER_WEBTOON: "네이버 웹툰",
  NAVER_SERIES: "네이버 시리즈",
  KAKAOPAGE: "카카오페이지",
  naver: "네이버",
  kakao: "카카오",
  ridibooks: "리디북스",
  munpia: "문피아",
  joara: "조아라",
};

/**
 * 필드명을 한글 레이블로 변환하는 함수
 * @param key - 원본 필드명
 * @param type - 필드 타입 ('domain' | 'platform')
 * @returns 한글 레이블 또는 원본 키 (변환 불가 시)
 */
export function getFieldLabel(
  key: string,
  type: "domain" | "platform" = "domain"
): string {
  const labels = type === "domain" ? DOMAIN_FIELD_LABELS : PLATFORM_FIELD_LABELS;
  return labels[key] || formatFieldName(key);
}

/**
 * snake_case나 camelCase를 읽기 좋은 형태로 변환
 * 예: "short_description" -> "Short Description"
 */
function formatFieldName(key: string): string {
  return key
    .replace(/_/g, " ") // snake_case -> space
    .replace(/([A-Z])/g, " $1") // camelCase -> space
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

/**
 * 플랫폼명을 한글로 변환
 */
export function getPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform.toLowerCase()] || PLATFORM_LABELS[platform] || platform;
}

/**
 * 필드 값을 읽기 좋게 변환 (연재 요일, 상태 등)
 */
export function formatFieldValue(key: string, value: any): string {
  if (value === null || value === undefined) return "-";
  
  // 배열인 경우 쉼표로 연결
  if (Array.isArray(value)) {
    return value.map(v => formatSingleValue(key, v)).join(", ");
  }
  
  // 객체인 경우 - 특수 처리
  if (typeof value === "object") {
    return formatObjectValue(key, value);
  }
  
  return formatSingleValue(key, value);
}

/**
 * 객체 값을 읽기 좋게 변환
 */
function formatObjectValue(key: string, obj: any): string {
  // 메타크리틱 정보
  if (key === "metacritic" && obj.score !== undefined) {
    const parts = [];
    if (obj.score) parts.push(`점수: ${obj.score}`);
    if (obj.url) parts.push(`상세: ${obj.url}`);
    return parts.join(" | ");
  }
  
  // 가격 정보
  if (key === "price_overview" || key === "priceOverview") {
    const parts = [];
    if (obj.final_formatted) {
      parts.push(`가격: ${obj.final_formatted}`);
    } else if (obj.final !== undefined) {
      parts.push(`가격: ${(obj.final / 100).toLocaleString()} ${obj.currency || 'KRW'}`);
    }
    
    if (obj.discount_percent && obj.discount_percent > 0) {
      parts.push(`할인: ${obj.discount_percent}%`);
      if (obj.initial_formatted) {
        parts.push(`정가: ${obj.initial_formatted}`);
      }
    }
    return parts.join(" | ");
  }
  
  // 출시일 정보 (Steam)
  if (key === "release_date" && obj.date) {
    const parts = [];
    if (obj.date) parts.push(obj.date);
    if (obj.coming_soon) parts.push("(출시 예정)");
    return parts.join(" ");
  }
  
  // 플랫폼 정보 (windows, mac, linux)
  if (key === "platforms" && (obj.windows !== undefined || obj.mac !== undefined || obj.linux !== undefined)) {
    const platforms = [];
    if (obj.windows) platforms.push("Windows");
    if (obj.mac) platforms.push("Mac");
    if (obj.linux) platforms.push("Linux");
    return platforms.join(", ") || "-";
  }
  
  // 기타 객체는 보기 좋게 JSON 포맷
  return JSON.stringify(obj, null, 2);
}

/**
 * 단일 값 변환
 */
function formatSingleValue(key: string, value: any): string {
  const strValue = String(value);
  
  // 카테고리 값 변환 (Steam categories)
  if (key === "categories" || key === "category") {
    const categoryMap: Record<string, string> = {
      "Multi-player": "멀티플레이어",
      "Single-player": "싱글플레이어",
      "Co-op": "협동",
      "Steam Achievements": "Steam 도전과제",
      "Steam Trading Cards": "Steam 트레이딩 카드",
      "Steam Workshop": "Steam 창작마당",
      "Steam Cloud": "Steam 클라우드",
      "Partial Controller Support": "부분 컨트롤러 지원",
      "Full controller support": "완전한 컨트롤러 지원",
      "VR Supported": "VR 지원",
      "Captions available": "자막 사용 가능",
      "Commentary available": "코멘터리 사용 가능",
      "Stats": "통계",
      "Leaderboards": "순위표",
      "Cross-Platform Multiplayer": "크로스 플랫폼 멀티플레이어",
      "Remote Play on Phone": "휴대폰 원격 플레이",
      "Remote Play on Tablet": "태블릿 원격 플레이",
      "Remote Play on TV": "TV 원격 플레이",
      "Remote Play Together": "Remote Play Together",
      "Shared/Split Screen": "화면 분할",
      "In-App Purchases": "인앱 구매",
      "Valve Anti-Cheat enabled": "Valve Anti-Cheat 사용",
      "Family Sharing": "가족 공유",
      "MMO": "MMO",
      "Includes level editor": "레벨 에디터 포함",
      "Includes Source SDK": "Source SDK 포함",
    };
    
    // 여러 카테고리가 쉼표로 구분된 경우
    if (strValue.includes(",")) {
      return strValue.split(",").map(cat => {
        const trimmed = cat.trim();
        return categoryMap[trimmed] || trimmed;
      }).join(", ");
    }
    
    return categoryMap[strValue] || strValue;
  }
  
  // 연재 요일 변환
  if (key === "weekday") {
    const weekdayLabels: Record<string, string> = {
      mon: "월요일",
      tue: "화요일",
      wed: "수요일",
      thu: "목요일",
      fri: "금요일",
      sat: "토요일",
      sun: "일요일",
    };
    return weekdayLabels[strValue.toLowerCase()] || strValue;
  }
  
  // 연재 상태 변환
  if (key === "status") {
    const statusLabels: Record<string, string> = {
      ongoing: "연재중",
      completed: "완결",
      hiatus: "휴재",
      "연재중": "연재중",
      "완결": "완결",
    };
    return statusLabels[strValue] || strValue;
  }
  
  // 연령 등급 변환
  if (key === "ageRating" || key === "age_rating") {
    const ratingLabels: Record<string, string> = {
      all: "전체 이용가",
      "12": "12세 이용가",
      "15": "15세 이용가",
      "18": "청소년 이용불가",
      "전체 이용가": "전체 이용가",
      "15세 이용가": "15세 이용가",
    };
    return ratingLabels[strValue] || strValue;
  }
  
  // 불린 값 변환
  if (value === true) return "예";
  if (value === false) return "아니오";
  
  // 큰 숫자는 천 단위 구분
  if (typeof value === "number" && value >= 1000) {
    return value.toLocaleString("ko-KR");
  }
  
  return strValue;
}
