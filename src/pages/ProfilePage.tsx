import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMyReviews, useMyBookmarks, useMyLikes } from '../hooks/useInteractions'
import styles from './ProfilePage.module.css'

function ProfilePage() {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()

  // 내 데이터 조회 (첫 페이지만, 카운트를 위해)
  const { data: reviewsData } = useMyReviews(0, 1)
  const { data: bookmarksData } = useMyBookmarks(0, 1)
  const { data: likesData } = useMyLikes(0, 1)

  // 로그인하지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.loginPrompt}>
          <h2>로그인이 필요합니다</h2>
          <p>프로필을 보려면 로그인해주세요.</p>
          <button
            onClick={() => navigate('/login')}
            className={styles.loginButton}
          >
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    if (confirm('로그아웃하시겠습니까?')) {
      logout()
      navigate('/login')
    }
  }

  const menuItems = [
    { id: 'reviews', icon: '📝', label: '작성한 리뷰', count: reviewsData?.totalElements || 0 },
    { id: 'bookmarks', icon: '🔖', label: '북마크한 작품', count: bookmarksData?.totalElements || 0 },
    { id: 'likes', icon: '👍', label: '좋아요 표시한 작품', count: likesData?.totalElements || 0 },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.profileSection}>
        <div className={styles.avatar}>👤</div>
        <div className={styles.profileInfo}>
          <div className={styles.nickname}>{user?.username || '사용자'}</div>
          <div className={styles.userId}>@{user?.username || 'user'}</div>
        </div>
        <button onClick={handleLogout} className={styles.logoutButton}>
          로그아웃
        </button>
      </div>

      <div className={styles.menuList}>
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={styles.menuItem}
            onClick={() => navigate(`/profile/${item.id}`)}
          >
            <div className={styles.menuLeft}>
              <span className={styles.menuIcon}>{item.icon}</span>
              <span className={styles.menuLabel}>{item.label}</span>
            </div>
            <span className={styles.menuArrow}>
              {item.count > 0 ? `${item.count} →` : '→'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProfilePage
