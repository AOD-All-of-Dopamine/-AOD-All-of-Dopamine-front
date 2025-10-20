import { useNavigate } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import HorizontalScroller from '../components/HorizontalScroller'
import { useWorks } from '../hooks/useWorks'
import styles from './HomePage.module.css'

function HomePage() {
  const navigate = useNavigate()

  // AI 맞춤 추천 - 임시로 GAME 도메인 데이터 사용
  const { data: recommendations, isLoading: isLoadingRecommendations } = useWorks({
    domain: 'GAME',
    size: 10,
  })

  // 랭킹 - 평점 높은 순
  const { data: rankings, isLoading: isLoadingRankings } = useWorks({
    domain: 'GAME',
    size: 10,
    sortBy: 'masterTitle',
    sortDirection: 'asc',
  })

  // 최신 리뷰 작품 - 임시로 최근 작품 사용
  const { data: recentReviews, isLoading: isLoadingRecentReviews } = useWorks({
    size: 10,
  })

  const handleSearch = (query: string) => {
    console.log('Search:', query)
    navigate(`/explore?keyword=${encodeURIComponent(query)}`)
  }

  const handleAIRecommendationClick = () => {
    // TODO: Navigate to AI recommendation page
    console.log('Navigate to AI recommendations')
  }

  const handleRankingClick = () => {
    navigate('/ranking')
  }

  const mapToWorkItem = (item: any) => ({
    id: String(item.id),
    title: item.title,
    thumbnail: item.thumbnail || 'https://via.placeholder.com/160x220',
    score: item.score || 0,
  })

  return (
    <div className={styles.page}>
      <SearchBar onSearch={handleSearch} />

      {!isLoadingRecommendations && recommendations?.content && (
        <HorizontalScroller
          title="AI 맞춤 추천"
          items={recommendations.content.map(mapToWorkItem)}
          onTitleClick={handleAIRecommendationClick}
          showViewAll
        />
      )}

      {!isLoadingRankings && rankings?.content && (
        <HorizontalScroller
          title="랭킹"
          items={rankings.content.map(mapToWorkItem)}
          onTitleClick={handleRankingClick}
          showViewAll
        />
      )}

      {!isLoadingRecentReviews && recentReviews?.content && (
        <HorizontalScroller
          title="최신 리뷰 작품"
          items={recentReviews.content.map(mapToWorkItem)}
        />
      )}
    </div>
  )
}

export default HomePage
