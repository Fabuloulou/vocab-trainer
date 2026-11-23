import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { hasWeakItems } from '../../domain/leitner'
import { buildSession, type SelectedSubList } from '../../domain/sessionEngine'
import { UNCLASSIFIED_ID, type SessionMode } from '../../domain/types'
import { globalMastery } from '../../domain/progress'
import { useApp } from '../state/AppContext'
import { TYPE_BADGES } from '../listTypeLabels'

interface SelectableRow {
  key: string
  listId: string
  subListId: string
  label: string
  count: number
}

export default function HomePage() {
  const { activeProfile } = useApp()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [challenge, setChallenge] = useState(false)

  const groups = useMemo(() => {
    if (!activeProfile) return []
    return activeProfile.lists
      .map((list) => {
        const rows: SelectableRow[] = list.subLists
          .filter((sub) => sub.itemIds.length > 0)
          .map((sub) => ({
            key: `${list.id}/${sub.id}`,
            listId: list.id,
            subListId: sub.id,
            label: sub.name,
            count: sub.itemIds.length,
          }))
        if (list.unclassifiedItemIds.length > 0) {
          rows.push({
            key: `${list.id}/${UNCLASSIFIED_ID}`,
            listId: list.id,
            subListId: UNCLASSIFIED_ID,
            label: 'Non classés',
            count: list.unclassifiedItemIds.length,
          })
        }
        const total = rows.reduce((acc, r) => acc + r.count, 0)
        return { list, rows, total }
      })
      .filter((g) => g.rows.length > 0)
  }, [activeProfile])

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAll = (listId: string, check: boolean) => {
    const group = groups.find((g) => g.list.id === listId)
    if (!group) return
    setSelected((prev) => {
      const next = new Set(prev)
      for (const row of group.rows) {
        if (check) next.add(row.key)
        else next.delete(row.key)
      }
      return next
    })
  }

  const start = (mode: SessionMode, selection: SelectedSubList[], weak: boolean) => {
    if (!activeProfile) return
    const exercises = buildSession({
      lists: activeProfile.lists,
      selection,
      leitner: activeProfile.leitner,
      weakOnly: weak,
      rng: Math.random,
    })
    if (exercises.length === 0) return
    const label = weak ? 'Mes mots faibles' : selection.map((s) => s.subListId).join(',')
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

  const hasWeak = useMemo(
    () => (activeProfile ? hasWeakItems(activeProfile.lists, activeProfile.leitner) : false),
    [activeProfile],
  )

  if (!activeProfile) return null

  return (
    <div>
      <div className="stat-grid">
        <div className="stat" data-testid="stat-streak">
          <div className="value">🔥 {activeProfile.progress.streak.count}</div>
          <div className="label">jours de suite</div>
        </div>
        <div className="stat" data-testid="stat-points">
          <div className="value">⭐ {activeProfile.progress.points}</div>
          <div className="label">points</div>
        </div>
        <div className="stat" data-testid="stat-mastery">
          <div className="value">{globalMastery(activeProfile)} %</div>
          <div className="label">maîtrise globale</div>
        </div>
      </div>

      <section className="card">
        <h2>Lancer un entraînement</h2>
        <p className="muted">Coche une ou plusieurs sous-listes ; l'entraînement piochera uniquement leurs mots.</p>
        {groups.length === 0 ? (
          <p className="muted">Aucune liste pour le moment. Va dans « Mes listes » pour importer du vocabulaire.</p>
        ) : (
          <>
            {groups.map((group) => {
              const allSelected = group.rows.every((r) => selected.has(r.key))
              return (
                <fieldset className="list-group" key={group.list.id} data-testid={`list-group-${group.list.id}`}>
                  <legend>
                    <label className="check-row">
                      <input
                        type="checkbox"
                        data-testid={`toggle-all-${group.list.id}`}
                        checked={allSelected}
                        onChange={(e) => toggleAll(group.list.id, e.target.checked)}
                      />
                      <strong>{group.list.name}</strong>
                      <span className="muted">· {TYPE_BADGES[group.list.type]} · {group.total} mot(s)</span>
                    </label>
                  </legend>
                  {group.rows.map((row) => (
                    <label className="check-row sublist-row" key={row.key}>
                      <input
                        type="checkbox"
                        data-testid={`select-sublist-${row.subListId}`}
                        checked={selected.has(row.key)}
                        onChange={() => toggle(row.key)}
                      />
                      <span>{row.label} <span className="muted">({row.count} mots)</span></span>
                    </label>
                  ))}
                </fieldset>
              )
            })}
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
