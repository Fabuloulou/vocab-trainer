import { masteryPercent } from '../../domain/progress'
import { useApp } from '../state/AppContext'

export default function StatsPage() {
  const { activeProfile } = useApp()

  if (!activeProfile) return null

  return (
    <div>
      <section className="card">
        <h2>Maîtrise par liste</h2>
        {activeProfile.lists.length === 0 && <p className="muted">Aucune liste.</p>}
        {activeProfile.lists.map((list) => {
          const pct = masteryPercent(list, activeProfile.leitner)
          return (
            <div key={list.id} data-testid={`mastery-${list.id}`} style={{ marginBottom: '0.8rem' }}>
              <div className="btn-row" style={{ justifyContent: 'space-between' }}>
                <strong>{list.name}</strong>
                <span data-testid={`mastery-pct-${list.id}`}>{pct} %</span>
              </div>
              <div className="mastery-bar"><div style={{ width: `${pct}%` }} /></div>
            </div>
          )
        })}
      </section>

      <section className="card">
        <h2>Historique (10 dernières sessions)</h2>
        {activeProfile.progress.history.length === 0 ? (
          <p className="muted" data-testid="history-empty">Aucune session pour le moment. Lance un entraînement !</p>
        ) : (
          <table className="preview" data-testid="history-list">
            <thead>
              <tr><th>Date</th><th>Mode</th><th>Score</th><th>Points</th></tr>
            </thead>
            <tbody>
              {activeProfile.progress.history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.date).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}</td>
                  <td>{h.mode === 'challenge' ? '⏱ Défi' : 'Classique'}</td>
                  <td>{h.score} / {h.total}</td>
                  <td>+{h.pointsEarned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
