import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './RankingPage.module.css'

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

// Mock data
const mockRankings: RankingItem[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  rank: i + 1,
  title: `랭킹 ${i + 1}위 작품`,
  thumbnail: 'https://via.placeholder.com/60x80',
  score: 9.5 - i * 0.1,
  change: i < 3 ? 'new' : i % 3 === 0 ? 'up' : i % 3 === 1 ? 'down' : i % 5,
}))

function RankingPage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<Category>('game')
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('daily')

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
        {mockRankings.length > 0 ? (
          <div className={styles.rankingList}>
            {mockRankings.map((item) => (
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
