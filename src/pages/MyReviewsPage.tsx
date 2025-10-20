import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyReviews, useDeleteReview } from '../hooks/useInteractions'
import styles from './MyListPage.module.css'

function MyReviewsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const { data, isLoading } = useMyReviews(page, 20)
  const deleteReviewMutation = useDeleteReview(0) // contentId는 mutation에서 사용하지 않음

  const handleDelete = (reviewId: number) => {
    if (confirm('리뷰를 삭제하시겠습니까?')) {
      deleteReviewMutation.mutate(reviewId, {
        onSuccess: () => {
          alert('리뷰가 삭제되었습니다.')
        },
      })
    }
  }

  if (isLoading) {
    return <div className={styles.page}>로딩 중...</div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← 뒤로
        </button>
        <h1 className={styles.title}>작성한 리뷰</h1>
      </div>

      {data && data.content.length > 0 ? (
        <>
          <div className={styles.listContainer}>
            {data.content.map((review) => (
              <div key={review.reviewId} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <h3
                    className={styles.contentTitle}
                    onClick={() => navigate(`/work/${review.contentId}`)}
                  >
                    {review.contentTitle}
                  </h3>
                  <button
                    className={styles.deleteButton}
                    onClick={() => handleDelete(review.reviewId)}
                  >
                    삭제
                  </button>
                </div>
                <div className={styles.rating}>{'⭐'.repeat(review.rating)}</div>
                {review.title && <h4 className={styles.reviewTitle}>{review.title}</h4>}
                <p className={styles.reviewContent}>{review.content}</p>
                <div className={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className={styles.pageButton}
              >
                이전
              </button>
              <span className={styles.pageInfo}>
                {page + 1} / {data.totalPages}
              </span>
              <button
                disabled={page >= data.totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className={styles.pageButton}
              >
                다음
              </button>
            </div>
          )}
        </>
      ) : (
        <div className={styles.emptyState}>
          <p>아직 작성한 리뷰가 없습니다.</p>
          <button onClick={() => navigate('/explore')} className={styles.exploreButton}>
            작품 둘러보기
          </button>
        </div>
      )}
    </div>
  )
}

export default MyReviewsPage
