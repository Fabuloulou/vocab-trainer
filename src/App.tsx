import type { ReactNode } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import HomePage from './ui/pages/HomePage'
import ListsPage from './ui/pages/ListsPage'
import ProfilesPage from './ui/pages/ProfilesPage'
import SessionPage from './ui/pages/SessionPage'
import ResultsPage from './ui/pages/ResultsPage'
import StatsPage from './ui/pages/StatsPage'
import { useApp } from './ui/state/AppContext'

function RequireProfile({ children }: { children: ReactNode }) {
  const { activeProfile } = useApp()
  if (!activeProfile) return <Navigate to="/profils" replace />
  return <>{children}</>
}

export default function App() {
  const { activeProfile } = useApp()
  const location = useLocation()
  const onProfilesPage = location.pathname === '/profils'
  const inSession = location.pathname === '/session'

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🎓 Vocab Trainer</h1>
        <nav className="app-nav">
          <NavLink to="/accueil" end data-testid="nav-home">Accueil</NavLink>
          <NavLink to="/listes" data-testid="nav-listes">Mes listes</NavLink>
          <NavLink to="/stats" data-testid="nav-stats">Stats</NavLink>
          {!onProfilesPage && activeProfile && !inSession && (
            <NavLink to="/profils" data-testid="nav-profiles">
              {activeProfile.emoji} {activeProfile.name} · Changer de profil
            </NavLink>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/profils" replace />} />
          <Route path="/profils" element={<ProfilesPage />} />
          <Route path="/accueil" element={<RequireProfile><HomePage /></RequireProfile>} />
          <Route path="/listes" element={<RequireProfile><ListsPage /></RequireProfile>} />
          <Route path="/session" element={<RequireProfile><SessionPage /></RequireProfile>} />
          <Route path="/resultats" element={<RequireProfile><ResultsPage /></RequireProfile>} />
          <Route path="/stats" element={<RequireProfile><StatsPage /></RequireProfile>} />
          <Route path="*" element={<Navigate to="/profils" replace />} />
        </Routes>
      </main>
    </div>
  )
}
