import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { checkAnswer } from '../../domain/checkAnswer'
import { applyResultToState, pointsFor, recordSession } from '../../domain/progress'
import { challengeSeconds, type Exercise } from '../../domain/sessionEngine'
import type { SessionMode, VerbItem } from '../../domain/types'
import { useApp } from '../state/AppContext'

interface SessionLocationState {
  exercises: Exercise[]
  mode: SessionMode
  label: string
}

type Phase = 'ask' | 'revealed' | 'feedback'

export default function SessionPage() {
  const { state, update } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const session = (location.state ?? null) as SessionLocationState | null

  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<boolean[]>([])
  const [phase, setPhase] = useState<Phase>('ask')
  const [goodStreak, setGoodStreak] = useState(0)
  const [shake, setShake] = useState(false)
  const [typingInputs, setTypingInputs] = useState<string[]>([])
  const [lastVerdict, setLastVerdict] = useState<{ ok: boolean; expected: string[] } | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const finishedRef = useRef(false)

  const exercises = session?.exercises ?? []
  const mode = session?.mode ?? 'classic'
  const exercise = exercises[index]

  const resultsRef = useRef<boolean[]>([])
  resultsRef.current = results

  const totalSeconds = useMemo(() => challengeSeconds(exercises.length), [exercises.length])

  const finish = (finalResults: boolean[]) => {
    if (finishedRef.current || exercises.length === 0) return
    finishedRef.current = true
    const score = finalResults.filter(Boolean).length
    const pointsEarned = finalResults.reduce((acc, ok) => acc + pointsFor(ok, mode), 0)
    update((s) => ({
      ...s,
      profile: recordSession(s.profile, {
        date: new Date().toISOString(),
        mode,
        score,
        total: finalResults.length,
        pointsEarned,
      }),
    }))
    navigate('/resultats', {
      state: { score, total: finalResults.length, pointsEarned, mode, label: session?.label ?? '' },
      replace: true,
    })
  }

  useEffect(() => {
    if (!session) navigate('/', { replace: true })
  }, [session, navigate])

  useEffect(() => {
    if (mode !== 'challenge' || finishedRef.current) return
    setTimeLeft(totalSeconds)
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null) return t
        if (t <= 1) {
          clearInterval(timer)
          finish(resultsRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, totalSeconds])

  useEffect(() => {
    setPhase('ask')
    setLastVerdict(null)
    setTypingInputs(exercise ? exercise.expected.map(() => '') : [])
  }, [index, exercise])

  if (!session || !exercise) return null

  const record = (ok: boolean) => {
    const nextResults = [...results, ok]
    setResults(nextResults)
    setGoodStreak((s) => (ok ? s + 1 : 0))
    if (!ok) {
      setShake(true)
      setTimeout(() => setShake(false), 450)
    }
    update((s) => applyResultToState(s, exercise.itemId, ok, new Date().toISOString()))
    if (index + 1 >= exercises.length) {
      finish(nextResults)
    }
  }

  const next = () => {
    if (index + 1 >= exercises.length) return
    setIndex(index + 1)
  }

  const submitTyping = () => {
    const ok = exercise.expected.every((exp, i) => checkAnswer(typingInputs[i] ?? '', exp))
    setLastVerdict({ ok, expected: exercise.expected })
    setPhase('feedback')
    record(ok)
  }

  const submitQcm = (choice: string) => {
    const ok = checkAnswer(choice, exercise.expected[0])
    setLastVerdict({ ok, expected: exercise.expected })
    setPhase('feedback')
    record(ok)
  }

  const verbItem = exercise.listType === 'verbs-en'
    ? (state.lists.find((l) => l.id === exercise.listId)?.items[exercise.itemId] as VerbItem | undefined)
    : undefined

  return (
    <section className={`card exercise-card ${shake ? 'shake' : ''}`} data-testid="exercise-card">
      <div className="btn-row" style={{ justifyContent: 'space-between' }}>
        <span className="muted" data-testid="session-progress">Exercice {index + 1} / {exercises.length}</span>
        {mode === 'challenge' && timeLeft !== null && (
          <span className={`session-timer ${timeLeft <= 10 ? 'low' : ''}`} data-testid="session-timer">⏱ {timeLeft}s</span>
        )}
        {goodStreak >= 3 && <span className="confetti" data-testid="confetti">🎉</span>}
      </div>
      <div className="progress"><div style={{ width: `${(index / exercises.length) * 100}%` }} /></div>

      <div className="muted">
        {exercise.kind === 'flashcard' && 'Flashcard — teste ta mémoire'}
        {exercise.kind === 'qcm' && 'QCM — choisis la bonne réponse'}
        {exercise.kind === 'typing' && 'Saisie — écris la réponse'}
        {exercise.direction === 'fr-to-target' && ' · FR → langue'}
        {exercise.direction === 'target-to-fr' && ' · langue → FR'}
      </div>

      <div className="exercise-prompt" data-testid="exercise-prompt">{exercise.prompt}</div>

      {exercise.kind === 'flashcard' && phase === 'ask' && (
        <button className="btn" data-testid="btn-reveal" onClick={() => setPhase('revealed')}>Voir la réponse</button>
      )}

      {exercise.kind === 'flashcard' && phase === 'revealed' && (
        <div>
          <div className="exercise-answer" data-testid="flash-answer">{exercise.expected[0]}</div>
          <div className="btn-row" style={{ justifyContent: 'center', marginTop: '0.8rem' }}>
            <button className="btn ok" data-testid="btn-correct" onClick={() => { record(true); next() }}>✔ J'avais bon</button>
            <button className="btn danger" data-testid="btn-wrong" onClick={() => { record(false); next() }}>✘ J'avais faux</button>
          </div>
        </div>
      )}

      {exercise.kind === 'qcm' && phase === 'ask' && exercise.choices && (
        <div className="qcm-choices">
          {exercise.choices.map((choice, i) => (
            <button key={i} className="btn qcm-choice" data-testid={`qcm-choice-${i}`} onClick={() => submitQcm(choice)}>
              {choice}
            </button>
          ))}
        </div>
      )}

      {exercise.kind === 'qcm' && phase === 'feedback' && lastVerdict && (
        <div>
          <p className={`feedback ${lastVerdict.ok ? 'ok' : 'ko'}`} data-testid={lastVerdict.ok ? 'feedback-ok' : 'feedback-ko'}>
            {lastVerdict.ok ? '✔ Bravo, bonne réponse !' : `✘ Mauvaise réponse. C'était : ${lastVerdict.expected[0]}`}
          </p>
          <button className="btn" data-testid="btn-next" onClick={next}>Suivant →</button>
        </div>
      )}

      {exercise.kind === 'typing' && phase === 'ask' && (
        <div className="typing-fields">
          {exercise.expected.map((_, i) => (
            <label className="field" key={i} style={{ margin: 0 }}>
              {exercise.labels[i]}
              <input
                type="text"
                data-testid={`typing-input-${i}`}
                value={typingInputs[i] ?? ''}
                autoFocus={i === 0}
                onChange={(e) => setTypingInputs((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))}
                onKeyDown={(e) => { if (e.key === 'Enter') submitTyping() }}
              />
            </label>
          ))}
          {verbItem && exercise.given && (
            <p className="muted">Donné : {Object.entries(exercise.given).map(([k, v]) => `${k} = ${v}`).join(', ')}</p>
          )}
          <div className="btn-row">
            <button className="btn" data-testid="btn-submit" onClick={submitTyping}>Valider</button>
          </div>
        </div>
      )}

      {exercise.kind === 'typing' && phase === 'feedback' && lastVerdict && (
        <div>
          <p className={`feedback ${lastVerdict.ok ? 'ok' : 'ko'}`} data-testid={lastVerdict.ok ? 'feedback-ok' : 'feedback-ko'}>
            {lastVerdict.ok ? '✔ Bravo, bonne réponse !' : '✘ Mauvaise réponse.'}
          </p>
          {!lastVerdict.ok && (
            <p className="exercise-expected" data-testid="expected-answers">
              Réponses attendues : {exercise.labels.map((l, i) => `${l} = ${lastVerdict.expected[i]}`).join(' · ')}
            </p>
          )}
          <button className="btn" data-testid="btn-next" onClick={next}>Suivant →</button>
        </div>
      )}
    </section>
  )
}
