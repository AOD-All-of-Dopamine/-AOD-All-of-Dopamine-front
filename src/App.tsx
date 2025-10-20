import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ExplorePage from './pages/ExplorePage'
import RankingPage from './pages/RankingPage'
import NewReleasesPage from './pages/NewReleasesPage'
import ProfilePage from './pages/ProfilePage'
import WorkDetailPage from './pages/WorkDetailPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import MyReviewsPage from './pages/MyReviewsPage'
import MyBookmarksPage from './pages/MyBookmarksPage'
import MyLikesPage from './pages/MyLikesPage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="ranking" element={<RankingPage />} />
            <Route path="new" element={<NewReleasesPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/reviews" element={<MyReviewsPage />} />
            <Route path="profile/bookmarks" element={<MyBookmarksPage />} />
            <Route path="profile/likes" element={<MyLikesPage />} />
            <Route path="work/:id" element={<WorkDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
