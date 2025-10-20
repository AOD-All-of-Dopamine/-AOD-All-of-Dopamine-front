// API 응답 타입 정의
export interface WorkSummary {
  id: number
  domain: string
  title: string
  thumbnail: string
  score: number
  rank?: number
  rankChange?: string
  releaseDate?: string
}

export interface WorkDetail {
  id: number
  domain: string
  title: string
  originalTitle?: string
  releaseDate?: string // yyyy-MM-dd format
  thumbnail: string
  synopsis: string
  score: number
  domainInfo: Record<string, any>
  platformInfo: Record<string, Record<string, any>>
}

export interface Review {
  id: number
  author: string
  score: number
  content: string
  createdAt: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface ApiError {
  message: string
  status: number
}
