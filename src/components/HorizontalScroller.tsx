import { useNavigate } from 'react-router-dom'
import styles from './HorizontalScroller.module.css'

export interface WorkItem {
  id: string
  title: string
  thumbnail: string
  score: number
}

interface HorizontalScrollerProps {
  title: string
  items: WorkItem[]
  onTitleClick?: () => void
  showViewAll?: boolean
}

function HorizontalScroller({
  title,
  items,
  onTitleClick,
  showViewAll = false,
}: HorizontalScrollerProps) {
  const navigate = useNavigate()

  const handleCardClick = (id: string) => {
    navigate(`/work/${id}`)
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title} onClick={onTitleClick}>
          {title}
        </h2>
        {showViewAll && (
          <span className={styles.viewAll} onClick={onTitleClick}>
            전체보기 →
          </span>
        )}
      </div>
      <div className={styles.scrollContainer}>
        {items.map((item) => (
          <div
            key={item.id}
            className={styles.card}
            onClick={() => handleCardClick(item.id)}
          >
            <img
              src={item.thumbnail}
              alt={item.title}
              className={styles.thumbnail}
            />
            <div className={styles.cardTitle}>{item.title}</div>
            <div className={styles.cardScore}>⭐ {item.score.toFixed(1)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default HorizontalScroller
