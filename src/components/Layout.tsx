import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import styles from './Layout.module.css'

function Layout() {
  return (
    <div className={styles.layout}>
      <main className={styles.mainContent}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export default Layout
