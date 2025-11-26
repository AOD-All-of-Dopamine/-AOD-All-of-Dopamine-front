import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorks, useGenres, usePlatforms } from '../hooks/useWorks'
import styles from './ExplorePage.module.css'

type Category = 'movie' | 'tv' | 'game' | 'webtoon' | 'webnovel'

const categories: { id: Category; label: string }[] = [
  { id: 'movie', label: '영화' },
  { id: 'tv', label: 'TV' },
  { id: 'game', label: '게임' },
  { id: 'webtoon', label: '웹툰' },
  { id: 'webnovel', label: '웹소설' },
]

// 플랫폼 아이콘 매핑
const platformIcons: Record<string, string> = {
  tmdb: '🎬',
  netflix: '🎥',
  steam: '🎮',
  naver: '📱',
  kakao: '📚',
  naverseries: '📖',
}

function ExplorePage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<Category>('game')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
    new Set(['steam'])
  )
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)

  // API에서 장르 목록 가져오기
  const { data: genresData } = useGenres(selectedCategory.toUpperCase())
  const availableGenres = genresData || []

  // API에서 플랫폼 목록 가져오기
  const { data: platformsData } = usePlatforms(selectedCategory.toUpperCase())
  const availablePlatforms = (platformsData || []).map(platformName => ({
    id: platformName.toLowerCase(),
    name: platformName,
    icon: platformIcons[platformName.toLowerCase()] || '📦',
  }))

  // 선택된 플랫폼과 장르를 배열로 변환
  const selectedPlatformsArray = selectedPlatforms.size > 0 ? Array.from(selectedPlatforms) : undefined
  const selectedGenresArray = selectedGenres.size > 0 ? Array.from(selectedGenres) : undefined

  // API 호출
  const { data, isLoading } = useWorks({
    domain: selectedCategory.toUpperCase(),
    platforms: selectedPlatformsArray,
    genres: selectedGenresArray,
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
    setPage(0) // 필터 변경 시 페이지 초기화
  }

  const toggleGenre = (genre: string) => {
    const newSelection = new Set(selectedGenres)
    if (newSelection.has(genre)) {
      newSelection.delete(genre)
    } else {
      newSelection.add(genre)
    }
    setSelectedGenres(newSelection)
    setPage(0) // 필터 변경 시 페이지 초기화
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
          <>
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
            
            {/* 페이지네이션 */}
            <div className={styles.pagination}>
              <button
                className={styles.pageButton}
                onClick={() => setPage(page - 1)}
                disabled={page === 0}
              >
                이전
              </button>
              
              <div className={styles.pageNumbers}>
                {(() => {
                  const totalPages = data.totalPages || 1
                  const currentPage = page
                  const pages: (number | string)[] = []
                  
                  if (totalPages <= 7) {
                    // 페이지가 7개 이하면 모두 표시
                    for (let i = 0; i < totalPages; i++) {
                      pages.push(i)
                    }
                  } else {
                    // 페이지가 많으면 생략 표시
                    pages.push(0) // 첫 페이지
                    
                    if (currentPage > 3) {
                      pages.push('...') // 왼쪽 생략
                    }
                    
                    // 현재 페이지 주변
                    const start = Math.max(1, currentPage - 1)
                    const end = Math.min(totalPages - 2, currentPage + 1)
                    
                    for (let i = start; i <= end; i++) {
                      pages.push(i)
                    }
                    
                    if (currentPage < totalPages - 4) {
                      pages.push('...') // 오른쪽 생략
                    }
                    
                    pages.push(totalPages - 1) // 마지막 페이지
                  }
                  
                  return pages.map((pageNum, index) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`ellipsis-${index}`} className={styles.ellipsis}>
                          ...
                        </span>
                      )
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        className={`${styles.pageNumber} ${pageNum === currentPage ? styles.active : ''}`}
                        onClick={() => setPage(pageNum as number)}
                      >
                        {(pageNum as number) + 1}
                      </button>
                    )
                  })
                })()}
              </div>
              
              <button
                className={styles.pageButton}
                onClick={() => setPage(page + 1)}
                disabled={page >= (data.totalPages || 1) - 1}
              >
                다음
              </button>
            </div>
          </>
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
