import client from './client'

export interface ContentInfo {
  contentId: number
  domain: string
  masterTitle: string
  posterImageUrl: string
}

export interface ExternalRanking {
  id: number
  contentId?: number              // 매핑된 Content ID (있는 경우만)
  title: string
  ranking: number
  platform: string
  thumbnailUrl: string
  content?: ContentInfo           // 상세 정보 (선택적)
}

export const rankingApi = {
  getAllRankings: async () => {
    const response = await client.get<ExternalRanking[]>('/api/rankings/all')
    return response.data
  },

  getRankingsByPlatform: async (platform: string) => {
    const response = await client.get<ExternalRanking[]>(`/api/rankings/${platform}`)
    return response.data
  },
}
