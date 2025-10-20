import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecentReleases, useUpcomingReleases } from '../hooks/useWorks'
import styles from './NewReleasesPage.module.css'

type Category = 'av' | 'game' | 'webtoon' | 'webnovel'
type ReleaseType = 'released' | 'upcoming'

interface Platform {
  id: string
  name: string
  icon: string
}

const categories: { id: Category; label: string }[] = [
  { id: 'av', label: 'AV' },
  { id: 'game', label: '게임' },
  { id: 'webtoon', label: '웹툰' },
  { id: 'webnovel', label: '웹소설' },
]

const platformsByCategory: Record<Category, Platform[]> = {
  av: [
    { id: 'tmdb', name: 'TMDB', icon: '🎬' },
    { id: 'netflix', name: 'Netflix', icon: '🎥' },
  ],
  game: [{ id: 'steam', name: 'Steam', icon: '🎮' }],
  webtoon: [{ id: 'naver', name: '네이버', icon: '📱' }],
  webnovel: [
    { id: 'kakao', name: '카카오', icon: '📚' },
    { id: 'naverseries', name: '네이버시리즈', icon: '📖' },
  ],
}

function NewReleasesPage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<Category>('game')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(['steam'])
  )
  const [releaseType, setReleaseType] = useState<ReleaseType>('released')
  const [page, setPage] = useState(0)

  // 도메인 매핑
  const domainMap: Record<Category, string> = {
    av: 'AV',
    game: 'GAME',
    webtoon: 'WEBTOON',
    webnovel: 'WEBNOVEL',
  }

  // API 호출
  const {
    data: recentData,
    isLoading: isLoadingRecent,
    error: recentError,
  } = useRecentReleases(
    {
      domain: domainMap[selectedCategory],
      page,
      size: 20,
    },
    { enabled: releaseType === 'released' }
  )

  const {
    data: upcomingData,
    isLoading: isLoadingUpcoming,
    error: upcomingError,
  } = useUpcomingReleases(
    {
      domain: domainMap[selectedCategory],
      page,
      size: 20,
    },
    { enabled: releaseType === 'upcoming' }
  )

  const availablePlatforms = platformsByCategory[selectedCategory]
  
  // API 데이터 사용
  const isLoading = releaseType === 'released' ? isLoadingRecent : isLoadingUpcoming
  const error = releaseType === 'released' ? recentError : upcomingError
  const works = releaseType === 'released' 
    ? recentData?.content || [] 
    : upcomingData?.content || []

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category)
    setSelectedPlatforms(new Set())
    setPage(0) // 카테고리 변경 시 페이지 초기화
  }

  const togglePlatform = (platformId: string) => {
    const newSelection = new Set(selectedPlatforms)
    if (newSelection.has(platformId)) {
      newSelection.delete(platformId)
    } else {
      newSelection.add(platformId)
    }
    setSelectedPlatforms(newSelection)
  }

  const handleItemClick = (id: number) => {
    navigate(`/work/${id}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}.${day}`
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
              onClick={() => handleCategoryChange(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className={styles.platformFilter}>
          <span className={styles.filterLabel}>플랫폼</span>
          <div className={styles.platformList}>
            {availablePlatforms.map((platform) => (
              <div
                key={platform.id}
                className={`${styles.platformItem} ${
                  selectedPlatforms.has(platform.id) ? styles.active : ''
                }`}
                onClick={() => togglePlatform(platform.id)}
              >
                <div className={styles.platformIcon}>{platform.icon}</div>
                <span className={styles.platformName}>{platform.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.releaseTabs}>
          <button
            className={`${styles.releaseTab} ${
              releaseType === 'released' ? styles.active : ''
            }`}
            onClick={() => setReleaseType('released')}
          >
            신작
          </button>
          <button
            className={`${styles.releaseTab} ${
              releaseType === 'upcoming' ? styles.active : ''
            }`}
            onClick={() => setReleaseType('upcoming')}
          >
            공개 예정
          </button>
        </div>
      </div>

      <div className={styles.contentArea}>
        {isLoading ? (
          <div className={styles.emptyState}>로딩 중...</div>
        ) : error ? (
          <div className={styles.emptyState}>
            데이터를 불러올 수 없습니다.
          </div>
        ) : works.length > 0 ? (
          <div className={styles.releaseList}>
            {works.map((work) => (
              <div
                key={work.id}
                className={styles.releaseItem}
                onClick={() => handleItemClick(work.id)}
              >
                <div
                  className={`${styles.date} ${
                    releaseType === 'upcoming' ? styles.upcoming : ''
                  }`}
                >
                  {/* releaseDate가 있으면 표시, 없으면 '-' */}
                  {work.releaseDate ? formatDate(work.releaseDate) : '-'}
                </div>
                <img
                  src={work.thumbnail || 'https://via.placeholder.com/60x80'}
                  alt={work.title}
                  className={styles.thumbnail}
                />
                <div className={styles.title}>{work.title}</div>
                {releaseType === 'upcoming' && (
                  <span className={styles.badge}>예정</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>데이터가 없습니다.</div>
        )}
      </div>
    </div>
  )
}

export default NewReleasesPage
