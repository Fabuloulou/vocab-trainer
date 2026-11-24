import { useEffect, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { checkAnswer, fieldVerdicts } from '../../domain/checkAnswer'
import { applyResultToState, pointsFor, recordSession } from '../../domain/progress'
import type { Exercise } from '../../domain/sessionEngine'
import { createRunner, runnerReducer, type RunnerPhase } from '../../domain/sessionRunner'
import type { DifficultyLevel, SessionMode } from '../../domain/types'
import { useApp } from '../state/AppContext'

interface SessionLocationState {
  exercises: Exercise[]
  mode: SessionMode
  label: string
  level?: DifficultyLevel
}

export default function SessionPage() {
  const { updateActive } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const session = (location.state ?? null) as SessionLocationState | null

  const exercises = session?.exercises ?? []
  const mode = session?.mode ?? 'classic'

  const [runner, dispatch] = useReducer(
    (s: ReturnType<typeof createRunner>, a: Parameters<typeof runnerReducer>[2]) => runnerReducer(exercises, s, a),
    undefined,
    () => createRunner(exercises, mode),
  )
  const [goodStreak, setGoodStreak] = useState(0)
  const [shake, setShake] = useState(false)
  const [typingInputs, setTypingInputs] = useState<string[]>([])
  const [typingIndex, setTypingIndex] = useState(runner.index)
  const finishCalledRef = useRef(false)
  const answerLockRef = useRef(false)

  useEffect(() => {
    answerLockRef.current = false
  }, [runner.index])

  const exercise = exercises[runner.index]

  useEffect(() => {
    if (!session) navigate('/accueil', { replace: true })
  }, [session, navigate])

  if (typingIndex !== runner.index) {
    setTypingIndex(runner.index)
    setTypingInputs(exercise ? exercise.expected.map(() => '') : [])
  }

  useEffect(() => {
    if (mode !== 'challenge' || runner.finished) return
    const timer = setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => clearInterval(timer)
  }, [mode, runner.finished])

  useEffect(() => {
    if (!runner.finished || finishCalledRef.current || exercises.length === 0) return
    finishCalledRef.current = true
    const score = runner.results.filter(Boolean).length
    const pointsEarned = runner.results.reduce((acc, ok) => acc + pointsFor(ok, mode), 0)
    updateActive((p) => ({
      ...p,
      progress: recordSession(p.progress, {
        date: new Date().toISOString(),
        mode,
        score,
        total: runner.results.length,
        pointsEarned,
      }),
    }))
    navigate('/resultats', {
      state: { score, total: runner.results.length, pointsEarned, mode, label: session?.label ?? '', mistakes: runner.mistakes },
      replace: true,
    })
  }, [runner.finished, runner.results, runner.mistakes, mode, exercises.length, updateActive, navigate, session?.label])

  if (!session || !exercise) return null

  const record = (ok: boolean) => {
    setGoodStreak((s) => (ok ? s + 1 : 0))
    if (!ok) {
      setShake(true)
      setTimeout(() => setShake(false), 450)
    }
    updateActive((p) => applyResultToState(p, exercise.itemId, ok, new Date().toISOString()))
  }

  const tryAnswer = (expectedPhase: RunnerPhase, fn: () => void) => {
    if (answerLockRef.current || runner.phase !== expectedPhase || runner.finished) return
    answerLockRef.current = true
    fn()
  }

  const onFlashAnswer = (ok: boolean) =>
    tryAnswer('revealed', () => {
      record(ok)
      dispatch({ type: 'answer', ok })
    })

  const onDontKnow = () =>
    tryAnswer('ask', () => {
      record(false)
      dispatch({ type: 'dont-know' })
    })

  const onQcm = (choice: string) =>
    tryAnswer('ask', () => {
      const ok = checkAnswer(choice, exercise.expected[0])
      record(ok)
      dispatch({ type: 'submit', ok, expected: exercise.expected, input: [choice] })
    })

  const onTyping = () =>
    tryAnswer('ask', () => {
      const ok = exercise.expected.every((exp, i) => checkAnswer(typingInputs[i] ?? '', exp))
      record(ok)
      dispatch({ type: 'submit', ok, expected: exercise.expected, input: [...typingInputs] })
    })

  return (
    <section className={`card exercise-card ${shake ? 'shake' : ''}`} data-testid="exercise-card">
      <div className="btn-row" style={{ justifyContent: 'space-between' }}>
        <span className="muted" data-testid="session-progress">Exercice {runner.index + 1} / {exercises.length}</span>
        {mode === 'challenge' && runner.timeLeft !== null && (
          <span className={`session-timer ${runner.timeLeft <= 10 ? 'low' : ''}`} data-testid="session-timer">⏱ {runner.timeLeft}s</span>
        )}
        {goodStreak >= 3 && <span className="confetti" data-testid="confetti">🎉</span>}
      </div>
      <div className="progress"><div style={{ width: `${(runner.index / exercises.length) * 100}%` }} /></div>

      <div className="muted">
        {exercise.kind === 'flashcard' && 'Flashcard — teste ta mémoire'}
        {exercise.kind === 'qcm' && 'QCM — choisis la bonne réponse'}
        {exercise.kind === 'typing' && 'Saisie — écris la réponse'}
        {exercise.direction === 'fr-to-target' && ' · FR → langue'}
        {exercise.direction === 'target-to-fr' && ' · langue → FR'}
      </div>

      <div className="exercise-prompt" data-testid="exercise-prompt">{exercise.prompt}</div>

      {exercise.kind === 'flashcard' && runner.phase === 'ask' && (
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <button className="btn" data-testid="btn-reveal" onClick={() => dispatch({ type: 'reveal' })}>Voir la réponse</button>
          <button className="btn danger" data-testid="btn-dont-know" onClick={onDontKnow}>✘ Je ne sais pas</button>
        </div>
      )}

      {exercise.kind === 'flashcard' && runner.phase === 'feedback' && !runner.finished && runner.verdict && (
        <div>
          <p className="feedback ko" data-testid="feedback-ko">✘ Je ne savais pas.</p>
          <p className="exercise-expected" data-testid="expected-answers">
            Réponse attendue : <strong data-testid="expected-value-0">{runner.verdict.expected[0]}</strong>
          </p>
          <button className="btn" data-testid="btn-next" onClick={() => dispatch({ type: 'next' })}>Suivant →</button>
        </div>
      )}

      {exercise.kind === 'flashcard' && runner.phase === 'revealed' && (
        <div>
          <div className="exercise-answer" data-testid="flash-answer">{exercise.expected[0]}</div>
          <div className="btn-row" style={{ justifyContent: 'center', marginTop: '0.8rem' }}>
            <button className="btn ok" data-testid="btn-correct" onClick={() => onFlashAnswer(true)}>✔ J'avais bon</button>
            <button className="btn danger" data-testid="btn-wrong" onClick={() => onFlashAnswer(false)}>✘ J'avais faux</button>
          </div>
        </div>
      )}

      {exercise.kind === 'qcm' && runner.phase === 'ask' && exercise.choices && (
        <div className="qcm-choices">
          {exercise.choices.map((choice, i) => (
            <button key={i} className="btn qcm-choice" data-testid={`qcm-choice-${i}`} onClick={() => onQcm(choice)}>
              {choice}
            </button>
          ))}
        </div>
      )}

      {exercise.kind === 'qcm' && runner.phase === 'feedback' && !runner.finished && runner.verdict && (
        <div>
          <p className={`feedback ${runner.verdict.ok ? 'ok' : 'ko'}`} data-testid={runner.verdict.ok ? 'feedback-ok' : 'feedback-ko'}>
            {runner.verdict.ok ? '✔ Bravo, bonne réponse !' : '✘ Mauvaise réponse.'}
          </p>
          {!runner.verdict.ok && (
            <p className="exercise-expected" data-testid="expected-answers">
              Tu as saisi : <s data-testid="wrong-input-0">{runner.verdict.input[0]}</s> → Réponse attendue : <strong>{runner.verdict.expected[0]}</strong>
            </p>
          )}
          <button className="btn" data-testid="btn-next" onClick={() => dispatch({ type: 'next' })}>Suivant →</button>
        </div>
      )}

      {exercise.kind === 'typing' && runner.phase === 'ask' && (
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
                onKeyDown={(e) => { if (e.key === 'Enter') onTyping() }}
              />
            </label>
          ))}
          <div className="btn-row">
            <button className="btn" data-testid="btn-submit" onClick={onTyping}>Valider</button>
          </div>
        </div>
      )}

      {exercise.kind === 'typing' && runner.phase === 'feedback' && !runner.finished && runner.verdict && (
        <div>
          <p className={`feedback ${runner.verdict.ok ? 'ok' : 'ko'}`} data-testid={runner.verdict.ok ? 'feedback-ok' : 'feedback-ko'}>
            {runner.verdict.ok
              ? '✔ Bravo, bonne réponse !'
              : `✘ Mauvaise réponse (${fieldVerdicts(runner.verdict.input, runner.verdict.expected).filter((v) => !v).length} champ(s) en erreur sur ${runner.verdict.expected.length}).`}
          </p>
          {!runner.verdict.ok && (
            <div className="exercise-expected" data-testid="expected-answers">
              {exercise.labels.map((label, i) => {
                const input = runner.verdict?.input[i] ?? ''
                const expected = runner.verdict?.expected[i] ?? ''
                const fieldOk = checkAnswer(input, expected)
                return fieldOk ? (
                  <p key={i} className="feedback ok" data-testid={`expected-row-${i}`}>✔ {label} : {input}</p>
                ) : (
                  <p key={i} data-testid={`expected-row-${i}`}>
                    {label} — Tu as saisi : <s data-testid={`wrong-input-${i}`}>{input}</s> → Réponse attendue : <strong data-testid={`expected-value-${i}`}>{expected}</strong>
                  </p>
                )
              })}
            </div>
          )}
          <button className="btn" data-testid="btn-next" onClick={() => dispatch({ type: 'next' })}>Suivant →</button>
        </div>
      )}
    </section>
  )
}
