import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildSession, type SelectedSubList } from '../../domain/sessionEngine'
import { UNCLASSIFIED_ID, type SessionMode } from '../../domain/types'
import { globalMastery } from '../../domain/progress'
import { useApp } from '../state/AppContext'

export default function HomePage() {
  const { state } = useApp()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [challenge, setChallenge] = useState(false)

  const selectable = useMemo(() => {
    const rows: { key: string; listId: string; subListId: string; label: string; count: number }[] = []
    for (const list of state.lists) {
      for (const sub of list.subLists) {
        if (sub.itemIds.length > 0) {
          rows.push({ key: `${list.id}/${sub.id}`, listId: list.id, subListId: sub.id, label: `${list.name} · ${sub.name}`, count: sub.itemIds.length })
        }
      }
      if (list.unclassifiedItemIds.length > 0) {
        rows.push({ key: `${list.id}/${UNCLASSIFIED_ID}`, listId: list.id, subListId: UNCLASSIFIED_ID, label: `${list.name} · Non classés`, count: list.unclassifiedItemIds.length })
      }
    }
    return rows
  }, [state.lists])

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const start = (mode: SessionMode, selection: SelectedSubList[], weak: boolean) => {
    const exercises = buildSession({
      lists: state.lists,
      selection,
      leitner: state.leitner,
      weakOnly: weak,
      rng: Math.random,
    })
    if (exercises.length === 0) return
    const label = weak
      ? 'Mes mots faibles'
      : selection.map((s) => s.subListId).join(',')
    navigate('/session', { state: { exercises, mode, label } })
  }

  const startSelected = () => {
    const selection = [...selected].map((key) => {
      const [listId, subListId] = key.split('/')
      return { listId, subListId }
    })
    start(challenge ? 'challenge' : 'classic', selection, false)
  }

  const startWeak = () => {
    start(challenge ? 'challenge' : 'classic', [], true)
  }

  const hasWeak = useMemo(() => {
    return Object.values(state.leitner).some((l) => l.box <= 2)
  }, [state.leitner])

  return (
    <div>
      <div className="stat-grid">
        <div className="stat" data-testid="stat-streak">
          <div className="value">🔥 {state.profile.streak.count}</div>
          <div className="label">jours de suite</div>
        </div>
        <div className="stat" data-testid="stat-points">
          <div className="value">⭐ {state.profile.points}</div>
          <div className="label">points</div>
        </div>
        <div className="stat" data-testid="stat-mastery">
          <div className="value">{globalMastery(state)} %</div>
          <div className="label">maîtrise globale</div>
        </div>
      </div>

      <section className="card">
        <h2>Lancer un entraînement</h2>
        {selectable.length === 0 ? (
          <p className="muted">Aucune liste pour le moment. Va dans « Mes listes » pour importer du vocabulaire.</p>
        ) : (
          <>
            {selectable.map((row) => (
              <label className="check-row" key={row.key}>
                <input
                  type="checkbox"
                  data-testid={`select-sublist-${row.subListId}`}
                  checked={selected.has(row.key)}
                  onChange={() => toggle(row.key)}
                />
                <span>{row.label} <span className="muted">({row.count} mots)</span></span>
              </label>
            ))}
            <div className="btn-row" style={{ marginTop: '0.8rem' }}>
              <button className="btn" data-testid="start-session" onClick={startSelected} disabled={selected.size === 0}>
                ▶ Lancer la session
              </button>
              <button className="btn accent" data-testid="start-weak" onClick={startWeak} disabled={!hasWeak}>
                🎯 Mes mots faibles
              </button>
            </div>
            <label className="check-row" style={{ marginTop: '0.6rem' }}>
              <input
                type="checkbox"
                data-testid="challenge-mode"
                checked={challenge}
                onChange={(e) => setChallenge(e.target.checked)}
              />
              <span>⏱ Mode défi chronométré (points bonus)</span>
            </label>
          </>
        )}
      </section>
    </div>
  )
}
