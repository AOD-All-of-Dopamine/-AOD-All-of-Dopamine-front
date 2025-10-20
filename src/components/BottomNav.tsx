import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

function BottomNav() {
  const navItems = [
    { path: '/', label: '홈', icon: '🏠' },
    { path: '/explore', label: '탐색', icon: '🔍' },
    { path: '/ranking', label: '랭킹', icon: '📊' },
    { path: '/new', label: '신작', icon: '✨' },
    { path: '/profile', label: '마이페이지', icon: '👤' },
  ]

  return (
    <nav className={styles.bottomNav}>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            `${styles.navItem} ${isActive ? styles.active : ''}`
          }
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export default BottomNav
