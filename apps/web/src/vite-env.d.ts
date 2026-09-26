/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}

declare module '*.css' {
  const content: { [key: string]: string }
  export default content
}

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** "1" 이면 홈에 추천 릴을 넣는다 (홈 설계 2026-09-25). 빌드 때 박히므로 켜고 끌 때 재배포. */
  readonly VITE_HOME_REC?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
