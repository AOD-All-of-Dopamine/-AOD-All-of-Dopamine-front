import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorks } from '../hooks/useWorks'
import styles from './ExplorePage.module.css'

type Category = 'av' | 'game' | 'webtoon' | 'webnovel'

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

const genresByCategory: Record<Category, string[]> = {
  av: ['액션', '드라마', '코미디', 'SF', '스릴러', '로맨스', '판타지'],
  game: ['액션', 'RPG', '어드벤처', '전략', '시뮬레이션', '스포츠', '인디'],
  webtoon: ['액션', '로맨스', '판타지', '일상', '스릴러', '개그', '드라마'],
  webnovel: ['판타지', '로맨스', '무협', '현대', 'BL', '미스터리', '역사'],
}

function ExplorePage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<Category>('game')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(['steam'])
  )
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)

  const availablePlatforms = platformsByCategory[selectedCategory]
  const availableGenres = genresByCategory[selectedCategory]

  // API 호출
  const { data, isLoading } = useWorks({
    domain: selectedCategory.toUpperCase(),
    page,
    size: 20,
  })

  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category)
    setSelectedPlatforms(new Set())
    setSelectedGenres(new Set())
    setPage(0)
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

  const toggleGenre = (genre: string) => {
    const newSelection = new Set(selectedGenres)
    if (newSelection.has(genre)) {
      newSelection.delete(genre)
    } else {
      newSelection.add(genre)
    }
    setSelectedGenres(newSelection)
  }

  const handleCardClick = (id: string) => {
    navigate(`/work/${id}`)
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

        <div className={styles.genreFilter}>
          <span className={styles.filterLabel}>장르</span>
          <div className={styles.genreList}>
            {availableGenres.map((genre) => (
              <button
                key={genre}
                className={`${styles.genreChip} ${
                  selectedGenres.has(genre) ? styles.active : ''
                }`}
                onClick={() => toggleGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.contentArea}>
        {isLoading ? (
          <div className={styles.emptyState}>로딩 중...</div>
        ) : data && data.content.length > 0 ? (
          <div className={styles.grid}>
            {data.content.map((work) => (
              <div
                key={work.id}
                className={styles.card}
                onClick={() => handleCardClick(String(work.id))}
              >
                <img
                  src={work.thumbnail || 'https://via.placeholder.com/160x220'}
                  alt={work.title}
                  className={styles.thumbnail}
                />
                <div className={styles.cardTitle}>{work.title}</div>
                <div className={styles.cardScore}>⭐ {(work.score || 0).toFixed(1)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            선택한 필터에 맞는 작품이 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}

export default ExplorePage
