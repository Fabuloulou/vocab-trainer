import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../state/AppContext'

interface ResultsState {
  score: number
  total: number
  pointsEarned: number
  mode: string
  label: string
}

export default function ResultsPage() {
  const location = useLocation()
  const { activeProfile } = useApp()
  const summary = (location.state ?? null) as ResultsState | null
  const last = activeProfile?.progress.history[0]
  if (!activeProfile) return null
  const score = summary?.score ?? last?.score ?? 0
  const total = summary?.total ?? last?.total ?? 0
  const pointsEarned = summary?.pointsEarned ?? last?.pointsEarned ?? 0
  const mode = summary?.mode ?? last?.mode ?? 'classic'
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  return (
    <section className="card" style={{ textAlign: 'center' }} data-testid="results-card">
      <h2>Session terminée ! 🎉</h2>
      <p className="exercise-prompt" data-testid="results-score">{score} / {total} bonnes réponses ({pct} %)</p>
      <p data-testid="results-points">⭐ +{pointsEarned} points {mode === 'challenge' ? '(mode défi ⏱)' : ''}</p>
      <p className="muted">Streak actuel : 🔥 {activeProfile.progress.streak.count} jour(s) · Total : ⭐ {activeProfile.progress.points} points</p>
      <div className="btn-row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
        <Link className="btn" data-testid="results-home" to="/">Retour à l'accueil</Link>
        <Link className="btn secondary" data-testid="results-stats" to="/stats">Voir mes stats</Link>
      </div>
    </section>
  )
}
