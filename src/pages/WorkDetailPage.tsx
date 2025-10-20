import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWorkDetail } from '../hooks/useWorks'
import {
  useReviews,
  useCreateReview,
  useDeleteReview,
  useLikeStats,
  useToggleLike,
  useToggleDislike,
  useBookmarkStatus,
  useToggleBookmark,
} from '../hooks/useInteractions'
import styles from './WorkDetailPage.module.css'

type TabType = 'info' | 'reviews'

function WorkDetailPage() {
  const { id } = useParams()
  const contentId = id ? Number(id) : 0
  const { isAuthenticated } = useAuth()
  
  const [activeTab, setActiveTab] = useState<TabType>('info')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', content: '' })

  // 작품 정보
  const { data: work, isLoading: workLoading } = useWorkDetail(contentId)
  
  // 리뷰
  const { data: reviewsData } = useReviews(contentId)
  const createReviewMutation = useCreateReview(contentId)
  const deleteReviewMutation = useDeleteReview(contentId)
  
  // 좋아요/싫어요
  const { data: likeStats } = useLikeStats(contentId)
  const toggleLikeMutation = useToggleLike(contentId)
  const toggleDislikeMutation = useToggleDislike(contentId)
  
  // 북마크
  const { data: bookmarkStatus } = useBookmarkStatus(contentId)
  const toggleBookmarkMutation = useToggleBookmark(contentId)

  const handleLike = () => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.')
      return
    }
    toggleLikeMutation.mutate()
  }

  const handleDislike = () => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.')
      return
    }
    toggleDislikeMutation.mutate()
  }

  const handleBookmark = () => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.')
      return
    }
    toggleBookmarkMutation.mutate()
  }

  const handleSubmitReview = () => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.')
      return
    }
    
    if (!reviewForm.content.trim()) {
      alert('리뷰 내용을 입력해주세요.')
      return
    }

    createReviewMutation.mutate(reviewForm, {
      onSuccess: () => {
        setReviewForm({ rating: 5, title: '', content: '' })
        setShowReviewForm(false)
        alert('리뷰가 작성되었습니다.')
      },
      onError: (error: any) => {
        alert(error.response?.data?.error || '리뷰 작성에 실패했습니다.')
      },
    })
  }

  const handleDeleteReview = (reviewId: number) => {
    if (confirm('리뷰를 삭제하시겠습니까?')) {
      deleteReviewMutation.mutate(reviewId, {
        onSuccess: () => {
          alert('리뷰가 삭제되었습니다.')
        },
      })
    }
  }

  if (workLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>로딩 중...</div>
      </div>
    )
  }

  if (!work) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>작품을 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <img
          src={work.thumbnail || 'https://via.placeholder.com/160x220'}
          alt={work.title}
          className={styles.thumbnail}
        />
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{work.title}</h1>
          {work.originalTitle && (
            <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
              {work.originalTitle}
            </div>
          )}
          <div className={styles.score}>⭐ {work.score.toFixed(1)}</div>
          <div className={styles.actionButtons}>
            <button
              className={`${styles.actionButton} ${styles.likeButton} ${
                likeStats?.isLiked ? styles.active : ''
              }`}
              onClick={handleLike}
            >
              👍 좋아요 {likeStats?.likeCount || 0}
            </button>
            <button
              className={`${styles.actionButton} ${styles.dislikeButton} ${
                likeStats?.isDisliked ? styles.active : ''
              }`}
              onClick={handleDislike}
            >
              👎 별로예요 {likeStats?.dislikeCount || 0}
            </button>
            <button
              className={`${styles.actionButton} ${styles.bookmarkButton} ${
                bookmarkStatus?.isBookmarked ? styles.active : ''
              }`}
              onClick={handleBookmark}
            >
              🔖 {bookmarkStatus?.isBookmarked ? '북마크됨' : '북마크'}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'info' ? styles.active : ''}`}
          onClick={() => setActiveTab('info')}
        >
          작품정보
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'reviews' ? styles.active : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          리뷰
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'info' ? (
          <>
            {work.synopsis && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>시놉시스</h2>
                <p className={styles.synopsis}>{work.synopsis}</p>
              </div>
            )}

            {work.domainInfo && Object.keys(work.domainInfo).length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>작품 정보</h2>
                <div className={styles.infoGrid}>
                  {Object.entries(work.domainInfo).map(([key, value]) => (
                    <div key={key} className={styles.infoRow}>
                      <span className={styles.infoLabel}>{key}</span>
                      <span className={styles.infoValue}>
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {work.platformInfo && Object.keys(work.platformInfo).length > 0 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>플랫폼 정보</h2>
                {Object.entries(work.platformInfo).map(([platform, info]) => (
                  <div key={platform} style={{ marginBottom: '24px' }}>
                    <h3
                      className={styles.sectionTitle}
                      style={{ fontSize: '16px', marginBottom: '12px' }}
                    >
                      {platform}
                    </h3>
                    <div className={styles.infoGrid}>
                      {Object.entries(info).map(([key, value]) => (
                        <div key={key} className={styles.infoRow}>
                          <span className={styles.infoLabel}>{key}</span>
                          <span className={styles.infoValue}>
                            {typeof value === 'string' && value.startsWith('http') ? (
                              <a href={value} target="_blank" rel="noopener noreferrer">
                                {value}
                              </a>
                            ) : typeof value === 'object' ? (
                              JSON.stringify(value)
                            ) : (
                              String(value)
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className={styles.reviewsSection}>
            {isAuthenticated && (
              <div className={styles.reviewFormSection}>
                {!showReviewForm ? (
                  <button
                    className={styles.writeReviewButton}
                    onClick={() => setShowReviewForm(true)}
                  >
                    리뷰 작성하기
                  </button>
                ) : (
                  <div className={styles.reviewForm}>
                    <h3>리뷰 작성</h3>
                    <div className={styles.formGroup}>
                      <label>평점</label>
                      <select
                        value={reviewForm.rating}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, rating: Number(e.target.value) })
                        }
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ (5점)</option>
                        <option value={4}>⭐⭐⭐⭐ (4점)</option>
                        <option value={3}>⭐⭐⭐ (3점)</option>
                        <option value={2}>⭐⭐ (2점)</option>
                        <option value={1}>⭐ (1점)</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>제목 (선택)</label>
                      <input
                        type="text"
                        placeholder="리뷰 제목을 입력하세요"
                        value={reviewForm.title}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, title: e.target.value })
                        }
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>내용</label>
                      <textarea
                        placeholder="리뷰 내용을 작성해주세요"
                        value={reviewForm.content}
                        onChange={(e) =>
                          setReviewForm({ ...reviewForm, content: e.target.value })
                        }
                        rows={5}
                      />
                    </div>
                    <div className={styles.formActions}>
                      <button onClick={handleSubmitReview} className={styles.submitButton}>
                        작성하기
                      </button>
                      <button
                        onClick={() => {
                          setShowReviewForm(false)
                          setReviewForm({ rating: 5, title: '', content: '' })
                        }}
                        className={styles.cancelButton}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className={styles.reviewList}>
              {reviewsData && reviewsData.content.length > 0 ? (
                reviewsData.content.map((review) => (
                  <div key={review.reviewId} className={styles.reviewItem}>
                    <div className={styles.reviewHeader}>
                      <span className={styles.reviewAuthor}>{review.username}</span>
                      <span className={styles.reviewScore}>
                        ⭐ {review.rating.toFixed(1)}
                      </span>
                    </div>
                    {review.title && <h4 className={styles.reviewTitle}>{review.title}</h4>}
                    <p className={styles.reviewContent}>{review.content}</p>
                    <div className={styles.reviewMeta}>
                      <div className={styles.reviewDate}>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </div>
                      {review.isMyReview && (
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteReview(review.reviewId)}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>아직 리뷰가 없습니다.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkDetailPage
