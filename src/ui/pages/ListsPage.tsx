import { useMemo, useRef, useState } from 'react'
import { listToCsv, parseCsv, type ParseResult } from '../../data/csv'
import { applyParsedItems } from '../../data/import'
import { newId } from '../../data/ids'
import { LIST_TYPES, UNCLASSIFIED_ID, isVerbList, type ListType, type WordList } from '../../domain/types'
import { useApp } from '../state/AppContext'
import { TYPE_LABELS } from '../listTypeLabels'

function downloadCsv(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function slugify(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'export'
}

export type SubNameCheck = 'ok' | 'empty' | 'same-as-list' | 'duplicate'

export function checkSubName(list: WordList, name: string, excludeSubListId: string | null = null): SubNameCheck {
  const normalized = name.trim().toLocaleLowerCase('fr')
  if (!normalized) return 'empty'
  if (normalized === list.name.trim().toLocaleLowerCase('fr')) return 'same-as-list'
  if (list.subLists.some((s) => s.id !== excludeSubListId && s.name.trim().toLocaleLowerCase('fr') === normalized)) {
    return 'duplicate'
  }
  return 'ok'
}

export default function ListsPage() {
  const { state, update } = useApp()
  const [type, setType] = useState<ListType>('vocab-en')
  const [listName, setListName] = useState('')
  const [existingListId, setExistingListId] = useState('')
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState<(ParseResult & { type: ListType }) | null>(null)
  const [importInfo, setImportInfo] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const existingOfType = useMemo(() => state.lists.filter((l) => l.type === type), [state.lists, type])

  const onPreview = () => {
    setPreview({ ...parseCsv(csvText, type), type })
    setImportInfo('')
  }

  const onCommit = () => {
    if (!preview) return
    const target = existingListId ? state.lists.find((l) => l.id === existingListId) : undefined
    const baseList: WordList = target ?? {
      id: newId('list'),
      name: listName.trim() || TYPE_LABELS[type],
      type,
      isExample: false,
      items: {},
      subLists: [],
      unclassifiedItemIds: [],
    }
    const outcome = applyParsedItems(baseList, preview.items)
    update((s) =>
      target
        ? { ...s, lists: s.lists.map((l) => (l.id === target.id ? outcome.list : l)) }
        : { ...s, lists: [...s.lists, outcome.list] },
    )
    setImportInfo(
      `Import terminé : ${outcome.added} mot(s) ajouté(s)` +
        (outcome.skipped > 0 ? `, ${outcome.skipped} doublon(s) ignoré(s)` : '') +
        '.',
    )
    setPreview(null)
    setCsvText('')
  }

  const onFile = async (file: File) => {
    setCsvText(await file.text())
  }

  const deleteExampleLists = () => {
    update((s) => ({ ...s, lists: s.lists.filter((l) => !l.isExample) }))
  }

  const createSubList = (listId: string, name: string): SubNameCheck => {
    const list = state.lists.find((l) => l.id === listId)
    if (!list) return 'empty'
    const check = checkSubName(list, name)
    if (check !== 'ok') return check
    const trimmed = name.trim()
    update((s) => ({
      ...s,
      lists: s.lists.map((l) =>
        l.id === listId ? { ...l, subLists: [...l.subLists, { id: newId('sub'), name: trimmed, itemIds: [] }] } : l,
      ),
    }))
    return 'ok'
  }

  const renameSubList = (listId: string, subListId: string, name: string): SubNameCheck => {
    const list = state.lists.find((l) => l.id === listId)
    if (!list) return 'empty'
    const check = checkSubName(list, name, subListId)
    if (check !== 'ok') return check
    const trimmed = name.trim()
    update((s) => ({
      ...s,
      lists: s.lists.map((l) =>
        l.id === listId
          ? { ...l, subLists: l.subLists.map((sub) => (sub.id === subListId ? { ...sub, name: trimmed } : sub)) }
          : l,
      ),
    }))
    return 'ok'
  }

  const deleteSubList = (listId: string, subListId: string) => {
    update((s) => ({
      ...s,
      lists: s.lists.map((l) => {
        if (l.id !== listId) return l
        const sub = l.subLists.find((x) => x.id === subListId)
        if (!sub) return l
        return {
          ...l,
          subLists: l.subLists.filter((x) => x.id !== subListId),
          unclassifiedItemIds: [...l.unclassifiedItemIds, ...sub.itemIds],
        }
      }),
    }))
  }

  const moveItem = (listId: string, itemId: string, targetSubListId: string) => {
    update((s) => ({
      ...s,
      lists: s.lists.map((l) => {
        if (l.id !== listId) return l
        const nextSubs = l.subLists.map((sub) => ({
          ...sub,
          itemIds: sub.itemIds.filter((id) => id !== itemId),
        }))
        let unclassified = l.unclassifiedItemIds.filter((id) => id !== itemId)
        if (targetSubListId !== UNCLASSIFIED_ID) {
          const target = nextSubs.find((sub) => sub.id === targetSubListId)
          target?.itemIds.push(itemId)
        } else {
          unclassified = [...unclassified, itemId]
        }
        return { ...l, subLists: nextSubs, unclassifiedItemIds: unclassified }
      }),
    }))
  }

  const deleteItem = (listId: string, itemId: string) => {
    update((s) => ({
      ...s,
      lists: s.lists.map((l) => {
        if (l.id !== listId) return l
        const items = { ...l.items }
        delete items[itemId]
        return {
          ...l,
          items,
          subLists: l.subLists.map((sub) => ({ ...sub, itemIds: sub.itemIds.filter((id) => id !== itemId) })),
          unclassifiedItemIds: l.unclassifiedItemIds.filter((id) => id !== itemId),
        }
      }),
      leitner: Object.fromEntries(Object.entries(s.leitner).filter(([id]) => id !== itemId)),
    }))
  }

  const deleteList = (listId: string) => {
    update((s) => {
      const list = s.lists.find((l) => l.id === listId)
      const itemIds = list ? Object.keys(list.items) : []
      return {
        ...s,
        lists: s.lists.filter((l) => l.id !== listId),
        leitner: Object.fromEntries(Object.entries(s.leitner).filter(([id]) => !itemIds.includes(id))),
      }
    })
  }

  const hasExamples = state.lists.some((l) => l.isExample)

  return (
    <div>
      <section className="card">
        <h2>Importer une liste (CSV)</h2>
        <p className="muted">
          Format : séparateur <span className="mono">;</span>, UTF-8, ligne d'en-tête obligatoire.
          Vocabulaire : <span className="mono">fr;trad;liste</span> — Verbes :
          <span className="mono">infinitive;preterite;past_participle;fr;liste</span>. La colonne « liste » est optionnelle (mots non classés sinon).
        </p>
        <label className="field">
          Type de liste
          <select data-testid="import-type" value={type} onChange={(e) => { setType(e.target.value as ListType); setExistingListId('') }}>
            {LIST_TYPES.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Nom de la nouvelle liste (laisser vide pour utiliser le type)
          <input type="text" data-testid="import-listname" value={listName} onChange={(e) => setListName(e.target.value)} placeholder="ex. Anglais 4e — chapitre 3" />
        </label>
        {existingOfType.length > 0 && (
          <label className="field">
            Ou ajouter à une liste existante
            <select data-testid="import-existing" value={existingListId} onChange={(e) => setExistingListId(e.target.value)}>
              <option value="">— nouvelle liste —</option>
              {existingOfType.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="field">
          Coller le contenu CSV
          <textarea data-testid="import-textarea" value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={'fr;trad;liste\nle chat;a cat;Leçon 1'} />
        </label>
        <div className="btn-row">
          <button className="btn secondary small" data-testid="import-file-btn" onClick={() => fileRef.current?.click()}>📎 Choisir un fichier…</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} data-testid="import-file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f) }} />
          <button className="btn secondary" data-testid="btn-preview" onClick={onPreview} disabled={!csvText.trim()}>Prévisualiser</button>
          {preview && preview.errors.length === 0 && (
            <button className="btn" data-testid="btn-commit-import" onClick={onCommit}>Valider l'import ({preview.items.length} mots)</button>
          )}
        </div>
        {preview && (
          <div data-testid="preview-block">
            {preview.errors.length > 0 && (
              <div data-testid="import-errors">
                <p className="error-text">{preview.errors.length} ligne(s) en erreur — corrige-les avant validation :</p>
                <ul>
                  {preview.errors.map((err) => (
                    <li key={err.line} className="error-text">Ligne {err.line} : {err.message}</li>
                  ))}
                </ul>
              </div>
            )}
            {preview.items.length > 0 && (
              <table className="preview" data-testid="preview-table">
                <thead>
                  <tr>{isVerbList(preview.type) ? <><th>Infinitif</th><th>Prétérit</th><th>Participe passé</th><th>FR</th><th>Liste</th></> : <><th>FR</th><th>Traduction</th><th>Liste</th></>}</tr>
                </thead>
                <tbody>
                  {preview.items.map((item, i) =>
                    item.kind === 'verb' ? (
                      <tr key={i}><td>{item.infinitive}</td><td>{item.preterite}</td><td>{item.pastParticiple}</td><td>{item.fr}</td><td>{item.subListName ?? ''}</td></tr>
                    ) : (
                      <tr key={i}><td>{item.fr}</td><td>{item.translation}</td><td>{item.subListName ?? ''}</td></tr>
                    ),
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
        {importInfo && <p className="feedback ok" data-testid="import-info">{importInfo}</p>}
      </section>

      {hasExamples && (
        <section className="card">
          <div className="btn-row">
            <button className="btn danger small" data-testid="delete-examples" onClick={deleteExampleLists}>
              🗑 Supprimer les 3 listes d'exemple
            </button>
          </div>
        </section>
      )}

      {state.lists.map((list) => (
        <ListCard
          key={list.id}
          list={list}
          onExportAll={() => downloadCsv(`${slugify(list.name)}.csv`, listToCsv(list))}
          onExportSub={(subId, subName) => downloadCsv(`${slugify(list.name)}-${slugify(subName)}.csv`, listToCsv(list, subId))}
          onDeleteList={() => deleteList(list.id)}
          onCreateSub={(name) => createSubList(list.id, name)}
          onRenameSub={(subId, name) => renameSubList(list.id, subId, name)}
          onDeleteSub={(subId) => deleteSubList(list.id, subId)}
          onMoveItem={(itemId, target) => moveItem(list.id, itemId, target)}
          onDeleteItem={(itemId) => deleteItem(list.id, itemId)}
        />
      ))}
    </div>
  )
}

function ListCard(props: {
  list: WordList
  onExportAll: () => void
  onExportSub: (subId: string, subName: string) => void
  onDeleteList: () => void
  onCreateSub: (name: string) => SubNameCheck
  onRenameSub: (subId: string, name: string) => SubNameCheck
  onDeleteSub: (subId: string) => void
  onMoveItem: (itemId: string, target: string) => void
  onDeleteItem: (itemId: string) => void
}) {
  const { list } = props
  const [newSubName, setNewSubName] = useState('')
  const [subError, setSubError] = useState('')
  const [renameError, setRenameError] = useState('')
  const total = Object.keys(list.items).length

  const SUB_ERROR_MESSAGES: Record<SubNameCheck, string> = {
    ok: '',
    empty: 'Donne un nom à la sous-liste.',
    'same-as-list': 'Le nom de la sous-liste doit être différent du nom de la liste (ex. « Leçon 1 »).',
    duplicate: 'Ce nom est déjà utilisé par une autre sous-liste de cette liste.',
  }

  const handleCreateSub = () => {
    const result = props.onCreateSub(newSubName)
    if (result === 'ok') {
      setNewSubName('')
      setSubError('')
    } else {
      setSubError(SUB_ERROR_MESSAGES[result])
    }
  }

  const handleRenameSub = (subId: string, currentName: string, value: string, input: HTMLInputElement) => {
    if (!value.trim() || value === currentName) return
    const result = props.onRenameSub(subId, value.trim())
    if (result !== 'ok') {
      input.value = currentName
      setRenameError(SUB_ERROR_MESSAGES[result])
    } else {
      setRenameError('')
    }
  }

  const itemLabel = (itemId: string): string => {
    const item = list.items[itemId]
    if (!item) return itemId
    return 'translation' in item ? `${item.fr} → ${item.translation}` : `${item.infinitive} (${item.fr})`
  }

  return (
    <section className="card" data-testid={`list-card-${list.id}`}>
      <div className="btn-row">
        <h2 style={{ margin: 0, flex: 1 }}>{list.name} <span className="muted">· {TYPE_LABELS[list.type]} · {total} mot(s){list.isExample ? ' · exemple' : ''}</span></h2>
        <button className="btn secondary small" data-testid={`export-list-${list.id}`} onClick={props.onExportAll}>⬇ Export CSV</button>
        <button className="btn danger small" data-testid={`delete-list-${list.id}`} onClick={props.onDeleteList}>Supprimer</button>
      </div>

      {list.subLists.map((sub) => (
        <div className="sublist-block" key={sub.id} data-testid={`sublist-${sub.id}`}>
          <div className="btn-row">
            <input
              type="text"
              defaultValue={sub.name}
              data-testid={`rename-sub-${sub.id}`}
              onBlur={(e) => handleRenameSub(sub.id, sub.name, e.target.value, e.target)}
              style={{ maxWidth: '220px' }}
            />
            <span className="muted">{sub.itemIds.length} mot(s)</span>
            <button className="btn secondary small" data-testid={`export-sub-${sub.id}`} onClick={() => props.onExportSub(sub.id, sub.name)}>⬇ CSV</button>
            <button className="btn danger small" data-testid={`delete-sub-${sub.id}`} onClick={() => props.onDeleteSub(sub.id)}>Supprimer</button>
          </div>
          {renameError && <p className="error-text" data-testid={`rename-error-${list.id}`}>{renameError}</p>}
          <div>
            {sub.itemIds.map((id) => (
              <span className="word-chip" key={id}>
                {itemLabel(id)}
                <select data-testid={`move-${id}`} value={sub.id} onChange={(e) => props.onMoveItem(id, e.target.value)} style={{ width: 'auto' }}>
                  <option value={sub.id}>— déplacer…</option>
                  {list.subLists.filter((s) => s.id !== sub.id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  <option value={UNCLASSIFIED_ID}>Non classés</option>
                </select>
                <button className="btn danger small" data-testid={`delete-item-${id}`} onClick={() => props.onDeleteItem(id)}>✕</button>
              </span>
            ))}
          </div>
        </div>
      ))}

      <div className="sublist-block">
        <div className="btn-row">
          <input type="text" placeholder="Nouvelle sous-liste (ex. Leçon 5)" value={newSubName} onChange={(e) => setNewSubName(e.target.value)} data-testid={`new-sub-${list.id}`} style={{ maxWidth: '260px' }} />
          <button className="btn secondary small" data-testid={`create-sub-${list.id}`} onClick={handleCreateSub} disabled={!newSubName.trim()}>+ Créer</button>
        </div>
        {subError && <p className="error-text" data-testid={`sub-error-${list.id}`}>{subError}</p>}
      </div>

      {list.unclassifiedItemIds.length > 0 && (
        <div className="sublist-block" data-testid={`unclassified-${list.id}`}>
          <h3>Non classés ({list.unclassifiedItemIds.length})</h3>
          <div>
            {list.unclassifiedItemIds.map((id) => (
              <span className="word-chip" key={id}>
                {itemLabel(id)}
                <select data-testid={`move-${id}`} value={UNCLASSIFIED_ID} onChange={(e) => props.onMoveItem(id, e.target.value)} style={{ width: 'auto' }}>
                  <option value={UNCLASSIFIED_ID}>— classer dans…</option>
                  {list.subLists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button className="btn danger small" data-testid={`delete-item-${id}`} onClick={() => props.onDeleteItem(id)}>✕</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
