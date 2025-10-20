import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMyBookmarks } from '../hooks/useInteractions'
import styles from './MyListPage.module.css'

function MyBookmarksPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const { data, isLoading } = useMyBookmarks(page, 20)

  if (isLoading) {
    return <div className={styles.page}>로딩 중...</div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          ← 뒤로
        </button>
        <h1 className={styles.title}>북마크한 작품</h1>
      </div>

      {data && data.content.length > 0 ? (
        <>
          <div className={styles.gridContainer}>
            {data.content.map((work: any) => (
              <div
                key={work.id}
                className={styles.workCard}
                onClick={() => navigate(`/work/${work.id}`)}
              >
                <div className={styles.thumbnail}>
                  {work.thumbnail ? (
                    <img src={work.thumbnail} alt={work.title} />
                  ) : (
                    <div className={styles.noImage}>🎬</div>
                  )}
                </div>
                <div className={styles.workInfo}>
                  <h3 className={styles.workTitle}>{work.title}</h3>
                  {work.domain && <div className={styles.domain}>{work.domain}</div>}
                  {work.score && <div className={styles.score}>⭐ {work.score.toFixed(1)}</div>}
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
          <p>아직 북마크한 작품이 없습니다.</p>
          <button onClick={() => navigate('/explore')} className={styles.exploreButton}>
            작품 둘러보기
          </button>
        </div>
      )}
    </div>
  )
}

export default MyBookmarksPage
