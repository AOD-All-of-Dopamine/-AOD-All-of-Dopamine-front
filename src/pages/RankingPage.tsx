import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './RankingPage.module.css'
import { rankingApi, ExternalRanking } from '../api/rankingApi'

type Category = 'av' | 'game' | 'webtoon' | 'webnovel'
type Period = 'daily' | 'weekly' | 'monthly'

interface RankingItem {
  id: string
  rank: number
  title: string
  thumbnail: string
  score: number
  change?: 'up' | 'down' | 'new' | number
}

const categories: { id: Category; label: string }[] = [
  { id: 'av', label: 'AV' },
  { id: 'game', label: '게임' },
  { id: 'webtoon', label: '웹툰' },
  { id: 'webnovel', label: '웹소설' },
]

const periods: { id: Period; label: string }[] = [
  { id: 'daily', label: '일간' },
  { id: 'weekly', label: '주간' },
  { id: 'monthly', label: '월간' },
]

const PLATFORM_MAPPING: Record<Category, string> = {
  av: 'TMDB_MOVIE', // TMDB 영화
  game: 'STEAM_GAME',
  webtoon: 'NAVER_WEBTOON',
  webnovel: 'NAVER_SERIES',
}

function RankingPage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<Category>('game')
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('daily')
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchRankings = async () => {
      setLoading(true)
      try {
        const platform = PLATFORM_MAPPING[selectedCategory]
        const data = await rankingApi.getRankingsByPlatform(platform)
        
        const mappedData: RankingItem[] = data.map((item: ExternalRanking) => ({
          id: String(item.contentId),
          rank: item.ranking,
          title: item.title,
          thumbnail: 'https://via.placeholder.com/60x80', // 백엔드 데이터에 썸네일 없음
          score: 0, // 백엔드 데이터에 점수 없음
          change: 'new', // 백엔드 데이터에 변동폭 없음
        }))
        
        setRankings(mappedData)
      } catch (error) {
        console.error('Failed to fetch rankings:', error)
        setRankings([])
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()
  }, [selectedCategory])

  const handleCardClick = (id: string) => {
    navigate(`/work/${id}`)
  }

  const renderChange = (change?: 'up' | 'down' | 'new' | number) => {
    if (!change) return null
    if (change === 'new') return <span className={`${styles.change} ${styles.new}`}>NEW</span>
    if (change === 'up') return <span className={`${styles.change} ${styles.up}`}>▲</span>
    if (change === 'down') return <span className={`${styles.change} ${styles.down}`}>▼</span>
    if (typeof change === 'number') {
      return change > 0 ? (
        <span className={`${styles.change} ${styles.up}`}>▲ {change}</span>
      ) : (
        <span className={`${styles.change} ${styles.down}`}>▼ {Math.abs(change)}</span>
      )
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.filterSection}>
        <div className={styles.categorySelector}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.categoryButton} ${
                selectedCategory === cat.id ? styles.active : ''
              }`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className={styles.periodTabs}>
          {periods.map((period) => (
            <button
              key={period.id}
              className={`${styles.periodTab} ${
                selectedPeriod === period.id ? styles.active : ''
              }`}
              onClick={() => setSelectedPeriod(period.id)}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.contentArea}>
        {loading ? (
          <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : rankings.length > 0 ? (
          <div className={styles.rankingList}>
            {rankings.map((item) => (
              <div
                key={item.id}
                className={styles.rankingItem}
                onClick={() => handleCardClick(item.id)}
              >
                <div
                  className={`${styles.rank} ${
                    item.rank === 1
                      ? styles.top1
                      : item.rank === 2
                      ? styles.top2
                      : item.rank === 3
                      ? styles.top3
                      : ''
                  }`}
                >
                  {item.rank}
                </div>
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className={styles.thumbnail}
                />
                <div className={styles.info}>
                  <div className={styles.title}>{item.title}</div>
                  <div className={styles.meta}>
                    <span className={styles.score}>⭐ {item.score.toFixed(1)}</span>
                    {renderChange(item.change)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>랭킹 데이터가 없습니다.</div>
        )}
      </div>
    </div>
  )
}

export default RankingPage
