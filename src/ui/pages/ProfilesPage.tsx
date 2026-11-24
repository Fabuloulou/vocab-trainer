import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PROFILE_EMOJIS } from '../../domain/types'
import { useApp } from '../state/AppContext'

export default function ProfilesPage() {
  const { state, activeProfile, selectProfile, createProfile, renameProfile, deleteProfile } = useApp()
  const navigate = useNavigate()
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState(PROFILE_EMOJIS[0])
  const [error, setError] = useState('')

  const onCreate = () => {
    if (!newName.trim()) {
      setError('Donne un nom au profil.')
      return
    }
    createProfile(newName, newEmoji)
    setNewName('')
    setError('')
  }

  const onPick = (id: string) => {
    selectProfile(id)
    navigate('/accueil')
  }

  const onDelete = (id: string, name: string) => {
    if (window.confirm(`Supprimer le profil « ${name} » et toutes ses données (listes, boîtes, points, streak, historique) ?`)) {
      deleteProfile(id)
    }
  }

  return (
    <section className="card" data-testid="profiles-page">
      <h2>Qui es-tu ?</h2>
      <p className="muted">
        Chaque profil a ses propres listes et sa progression, isolées des autres profils de l'appareil.
      </p>

      <div className="profile-grid">
        {state.profiles.map((p) => (
          <div
            key={p.id}
            className={`profile-card${activeProfile?.id === p.id ? ' active' : ''}`}
            data-testid={`profile-card-${p.id}`}
          >
            <button type="button" className="profile-pick" data-testid={`pick-profile-${p.id}`} onClick={() => onPick(p.id)}>
              <span className="profile-emoji">{p.emoji}</span>
              <strong>{p.name}</strong>
              {activeProfile?.id === p.id && <span className="muted">profil actif</span>}
            </button>
            <div className="muted profile-stats" data-testid={`profile-stats-${p.id}`}>
              ⭐ {p.progress.points} pts · 🔥 {p.progress.streak.count} j · {p.lists.length} liste(s)
            </div>
            <div className="btn-row">
              <input
                type="text"
                defaultValue={p.name}
                aria-label={`Renommer le profil ${p.name}`}
                data-testid={`rename-profile-${p.id}`}
                style={{ maxWidth: '130px' }}
                onBlur={(e) => {
                  const value = e.target.value.trim()
                  if (value && value !== p.name) renameProfile(p.id, value)
                  else e.target.value = p.name
                }}
              />
              <button
                type="button"
                className="btn danger small"
                data-testid={`delete-profile-${p.id}`}
                onClick={() => onDelete(p.id, p.name)}
              >
                🗑 Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
      {state.profiles.length === 0 && <p className="muted">Aucun profil pour le moment.</p>}

      <h3 style={{ marginTop: '1.2rem' }}>+ Nouveau profil</h3>
      <label className="field">
        Nom du profil
        <input
          type="text"
          data-testid="new-profile-name"
          value={newName}
          maxLength={30}
          placeholder="ex. Lucas"
          onChange={(e) => setNewName(e.target.value)}
        />
      </label>
      <div className="emoji-row" data-testid="emoji-picker">
        {PROFILE_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            className={`emoji-btn${newEmoji === e ? ' selected' : ''}`}
            data-testid={`emoji-${e}`}
            aria-label={`avatar ${e}`}
            onClick={() => setNewEmoji(e)}
          >
            {e}
          </button>
        ))}
      </div>
      {error && <p className="error-text" data-testid="profile-error">{error}</p>}
      <div className="btn-row" style={{ marginTop: '0.6rem' }}>
        <button type="button" className="btn" data-testid="create-profile" onClick={onCreate} disabled={!newName.trim()}>
          ➕ Créer le profil
        </button>
      </div>
      <p className="muted">Un nouveau profil démarre avec les 3 listes d'exemple (supprimables depuis « Mes listes »).</p>
    </section>
  )
}
