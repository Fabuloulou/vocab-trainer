import { NavLink, Route, Routes } from 'react-router-dom'
import HomePage from './ui/pages/HomePage'
import ListsPage from './ui/pages/ListsPage'
import SessionPage from './ui/pages/SessionPage'
import ResultsPage from './ui/pages/ResultsPage'
import StatsPage from './ui/pages/StatsPage'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🎓 Vocab Trainer</h1>
        <nav className="app-nav">
          <NavLink to="/" end data-testid="nav-home">Accueil</NavLink>
          <NavLink to="/listes" data-testid="nav-listes">Mes listes</NavLink>
          <NavLink to="/stats" data-testid="nav-stats">Stats</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/listes" element={<ListsPage />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/resultats" element={<ResultsPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
    </div>
  )
}
