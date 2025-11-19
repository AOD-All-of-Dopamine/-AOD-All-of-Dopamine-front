import client from './client'

export interface ExternalRanking {
  id: number
  contentId: number
  title: string
  ranking: number
  platform: string
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
