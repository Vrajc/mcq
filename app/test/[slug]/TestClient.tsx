'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { formatTime } from '@/lib/utils'

interface Question {
  id: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  answer: string
  order: number
}

interface TestSet {
  id: string
  title: string
  description: string
  slug: string
  timeLimit: number
  questions: Question[]
}

interface Props {
  test: TestSet
}

type Phase = 'intro' | 'test' | 'results'

interface PersistedTestState {
  phase: Phase
  currentIdx: number
  answers: Record<string, string>
  visited: Record<string, boolean>
  timeLeft: number
  timerActive: boolean
  userName: string
}

interface AttemptScore {
  id: string
  userName: string
  score: number
  total: number
  percentage: number
  attemptNumber: number
  createdAt: string
}

const OPTIONS = ['A', 'B', 'C', 'D'] as const
const USER_OPTIONS = ['Neeja', 'Vraj'] as const

export default function TestClient({ test }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [isReady, setIsReady] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)
  const [showThanksModal, setShowThanksModal] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [visited, setVisited] = useState<Record<string, boolean>>({})
  const [attemptScores, setAttemptScores] = useState<AttemptScore[]>([])
  const [attemptsLoading, setAttemptsLoading] = useState(false)
  const [userName, setUserName] = useState('')
  const [timeLeft, setTimeLeft] = useState(test.timeLimit * 60)
  const [timerActive, setTimerActive] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const stateKey = `mcq-${test.slug}-state`
  const nameKey = 'mcq-user-name'
  const attemptSubmittedRef = useRef(false)

  const questions = test.questions
  const current = questions[currentIdx]
  const total = questions.length

  const loadAttemptScores = useCallback(async () => {
    setAttemptsLoading(true)
    try {
      const res = await fetch(`/api/attempts?testSetId=${test.id}`)
      if (!res.ok) return
      const data = await res.json()
      setAttemptScores(Array.isArray(data) ? data : [])
    } finally {
      setAttemptsLoading(false)
    }
  }, [test.id])

  // Restore in-progress test on refresh
  useEffect(() => {
    const savedName = localStorage.getItem(nameKey)
    if (savedName) setUserName(savedName)

    const raw = localStorage.getItem(stateKey)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PersistedTestState
        if (parsed.phase === 'test') {
          const safeIdx = Math.min(Math.max(parsed.currentIdx ?? 0, 0), Math.max(total - 1, 0))
          const safeTime = Math.max(parsed.timeLeft ?? test.timeLimit * 60, 0)

          setPhase('test')
          setCurrentIdx(safeIdx)
          setAnswers(parsed.answers || {})
          setVisited(parsed.visited || {})
          setTimeLeft(safeTime)
          setUserName(parsed.userName || savedName || '')
          setTimerActive((parsed.timerActive ?? true) && safeTime > 0)
        }
      } catch {
        localStorage.removeItem(stateKey)
      }
    }

    setIsReady(true)
  }, [nameKey, stateKey, test.timeLimit, total])

  // Timer
  useEffect(() => {
    if (!timerActive) return

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(intervalRef.current!)
          finishTest()
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(intervalRef.current!)
  }, [timerActive])

  // Persist test state while taking the test
  useEffect(() => {
    if (phase !== 'test') return

    const snapshot: PersistedTestState = {
      phase,
      currentIdx,
      answers,
      visited,
      timeLeft,
      timerActive,
      userName,
    }

    localStorage.setItem(stateKey, JSON.stringify(snapshot))
  }, [phase, currentIdx, answers, visited, timeLeft, timerActive, userName, stateKey])

  useEffect(() => {
    if (phase !== 'results' || attemptSubmittedRef.current || !userName.trim()) return

    const computedScore = questions.filter(q => answers[q.id] === q.answer).length

    attemptSubmittedRef.current = true
    const body = {
      testSetId: test.id,
      userName: userName.trim(),
      score: computedScore,
      total,
    }

    fetch('/api/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(() => loadAttemptScores())
      .catch(err => {
        console.error('Failed to save attempt:', err)
      })
  }, [answers, loadAttemptScores, phase, questions, test.id, total, userName])

  useEffect(() => {
    if (phase === 'results' && userName.trim()) {
      setShowThanksModal(true)
    }
  }, [phase, userName])

  useEffect(() => {
    if (!isReady) return
    loadAttemptScores()
  }, [isReady, loadAttemptScores])

  const finishTest = useCallback(() => {
    localStorage.removeItem(stateKey)
    setPhase('results')
    setTimerActive(false)
  }, [stateKey])

  const startTest = () => {
    const cleanName = userName.trim()
    if (!USER_OPTIONS.includes(cleanName as (typeof USER_OPTIONS)[number])) return

    localStorage.setItem(nameKey, cleanName)
    setUserName(cleanName)
    setTimeLeft(test.timeLimit * 60)
    setCurrentIdx(0)
    setAnswers({})
    setVisited({ [questions[0].id]: true })
    setPhase('test')
    setTimerActive(true)
    attemptSubmittedRef.current = false
    setShowNameModal(false)
  }

  const handleSelect = (option: string) => {
    setAnswers(prev => ({ ...prev, [current.id]: option }))
  }

  const markVisited = (idx: number) => {
    const q = questions[idx]
    if (!q) return
    setVisited(prev => ({ ...prev, [q.id]: true }))
  }

  const goToQuestion = (idx: number) => {
    setCurrentIdx(idx)
    markVisited(idx)
  }

  const handleNext = () => {
    if (currentIdx + 1 >= total) {
      finishTest()
    } else {
      const next = currentIdx + 1
      setCurrentIdx(next)
      markVisited(next)
    }
  }

  const handlePrev = () => {
    if (currentIdx <= 0) return
    const prev = currentIdx - 1
    setCurrentIdx(prev)
    markVisited(prev)
  }

  const selected = answers[current.id] || null

  const score = questions.filter(q => answers[q.id] === q.answer).length
  const pct = Math.round((score / total) * 100)
  const timerPct = timeLeft / (test.timeLimit * 60)
  const timerColor = timeLeft < 60 ? '#e84c2e' : timeLeft < 180 ? '#f59e0b' : '#22c55e'

  const getOptionClass = (opt: string) => {
    return `option-btn ${selected === opt ? 'selected' : ''}`
  }

  const getQuestionStatus = (q: Question) => {
    if (answers[q.id]) return 'answered'
    if (visited[q.id]) return 'skipped'
    return 'pending'
  }

  const getScoresForUser = (name: (typeof USER_OPTIONS)[number]) =>
    attemptScores
      .filter(a => a.userName === name)
      .sort((a, b) => b.attemptNumber - a.attemptNumber)
      .slice(0, 5)

  const isValidUser = USER_OPTIONS.includes(userName as (typeof USER_OPTIONS)[number])

  if (!isReady) {
    return <main className="min-h-[100dvh]" />
  }

  // INTRO
  if (phase === 'intro') {
    return (
      <main className="min-h-[100dvh] flex flex-col">
        <header className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="white"/>
                <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
                <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
                <rect x="9" y="9" width="5" height="5" rx="1" fill="white"/>
              </svg>
            </div>
            <span className="font-display font-bold text-lg">VRAJ Education</span>
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
          <div className="max-w-lg w-full text-center animate-fade-up">
            <p className="text-accent font-mono text-xs tracking-widest uppercase mb-6">Ready to begin?</p>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black mb-4">{test.title}</h1>
            {test.description && <p className="text-muted mb-8">{test.description}</p>}
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="text-3xl font-display font-bold text-accent mb-1">{total}</div>
                <div className="text-sm text-muted">Questions</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="text-3xl font-display font-bold text-accent mb-1">{test.timeLimit}</div>
                <div className="text-sm text-muted">Minutes</div>
              </div>
            </div>
            <div className="space-y-3 text-sm text-muted mb-10 text-left bg-card border border-border rounded-xl p-5">
              <p>• One question shown at a time</p>
              <p>• You can skip and come back anytime</p>
              <p>• Correct and wrong answers are shown in final results</p>
              <p>• Timer runs from the moment you start</p>
              <p>• Auto-submits when time runs out</p>
            </div>
            <button
              onClick={() => setShowNameModal(true)}
              className="w-full bg-accent text-cream py-4 rounded-xl font-semibold text-lg hover:bg-accent/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Test →
            </button>

            <div className="mt-5 text-left bg-card border border-border rounded-xl p-4">
              <p className="text-accent font-mono text-xs tracking-widest uppercase mb-3">Attempt Scores</p>
              {attemptsLoading ? (
                <p className="text-sm text-muted">Loading scores...</p>
              ) : (
                <div className="space-y-3">
                  {USER_OPTIONS.map(name => {
                    const scores = getScoresForUser(name)
                    return (
                      <div key={name}>
                        <p className="text-sm font-semibold mb-1">{name}</p>
                        {scores.length === 0 ? (
                          <p className="text-xs text-muted">No attempts yet</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {scores.map(s => (
                              <span key={s.id} className="text-xs px-2 py-1 rounded-md bg-ink border border-border text-muted">
                                Attempt {s.attemptNumber}: {s.score}/{s.total} ({s.percentage}%)
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {showNameModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-5 sm:p-6">
              <h3 className="font-display text-2xl font-bold mb-2">Your Name</h3>
              <p className="text-sm text-muted mb-4">Enter your name to start the test.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {USER_OPTIONS.map(name => {
                  const active = userName === name
                  return (
                    <button
                      key={name}
                      onClick={() => setUserName(name)}
                      className={`w-full rounded-xl border px-4 py-3 text-left font-semibold transition-colors ${
                        active
                          ? 'border-accent bg-accent/20 text-accent'
                          : 'border-border bg-ink text-cream hover:border-accent/60'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted mt-2">Selected: <span className="text-cream">{isValidUser ? userName : 'None'}</span></p>
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={startTest}
                  disabled={!isValidUser}
                  className="flex-1 bg-accent text-cream py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
                <button
                  onClick={() => setShowNameModal(false)}
                  className="flex-1 border border-border text-muted py-3 rounded-xl font-semibold hover:border-accent hover:text-cream transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    )
  }

  // RESULTS
  if (phase === 'results') {
    const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F'
    const gradeColor = pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400'
    const correctAnswers = questions
      .map((q, i) => ({ q, i, userAnswer: answers[q.id] }))
      .filter(({ userAnswer, q }) => userAnswer === q.answer)
    const wrongAnswers = questions
      .map((q, i) => ({ q, i, userAnswer: answers[q.id] }))
      .filter(({ userAnswer, q }) => userAnswer !== q.answer)
    const getOptionText = (q: Question, opt: string | undefined) => {
      if (!opt) return 'Not answered'
      const opts: Record<string, string> = {
        A: q.optionA,
        B: q.optionB,
        C: q.optionC,
        D: q.optionD,
      }
      return `${opt}. ${opts[opt] || ''}`
    }

    return (
      <main className="min-h-[100dvh]">
        <header className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="white"/>
                <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
                <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
                <rect x="9" y="9" width="5" height="5" rx="1" fill="white"/>
              </svg>
            </div>
            <span className="font-display font-bold text-lg">VRAJ Education</span>
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-cream transition-colors">← All Tests</Link>
        </header>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-[max(env(safe-area-inset-bottom),2rem)]">
          {/* Score card */}
          <div className="bg-card border border-border rounded-2xl p-8 text-center mb-10 animate-fade-up">
            <p className="text-muted font-mono text-xs uppercase tracking-widest mb-6">{test.title} — Results</p>
            <div className={`font-display text-6xl sm:text-7xl md:text-8xl font-black mb-2 ${gradeColor}`}>{grade}</div>
            <div className="text-muted text-lg mb-4">{score} / {total} correct</div>
            <div className="w-full bg-border rounded-full h-2 mb-4">
              <div
                className="h-2 rounded-full transition-all duration-1000"
                style={{ width: `${pct}%`, backgroundColor: pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#e84c2e' }}
              />
            </div>
            <div className="text-3xl font-bold">{pct}%</div>
          </div>

          {/* Wrong answers */}
          <h2 className="font-display text-xl sm:text-2xl font-bold mb-4 text-red-300">Wrong Answers ({wrongAnswers.length})</h2>
          <div className="space-y-4 mb-10">
            {wrongAnswers.length === 0 && (
              <div className="bg-card border border-green-500/30 rounded-xl p-5 text-green-300">
                Perfect score. No wrong answers.
              </div>
            )}
            {wrongAnswers.map(({ q, i, userAnswer }, idx) => (
              <div
                key={q.id}
                className="bg-card border border-red-500/35 rounded-xl p-5 animate-fade-up"
                style={{ '--delay': `${idx * 0.05}s` } as React.CSSProperties}
              >
                <p className="font-medium mb-3">
                  <span className="text-red-300 font-mono mr-2">Q{i + 1}.</span>
                  {q.questionText}
                </p>
                <p className="text-sm text-red-200 mb-1">Your answer: {getOptionText(q, userAnswer)}</p>
                <p className="text-sm text-green-300">Correct answer: {getOptionText(q, q.answer)}</p>
              </div>
            ))}
          </div>

          {/* Correct answers */}
          <h2 className="font-display text-xl sm:text-2xl font-bold mb-4 text-green-300">Correct Answers ({correctAnswers.length})</h2>
          <div className="space-y-4">
            {correctAnswers.map(({ q, i, userAnswer }, idx) => (
              <div
                key={q.id}
                className="bg-card border border-green-500/35 rounded-xl p-5 animate-fade-up"
                style={{ '--delay': `${idx * 0.05}s` } as React.CSSProperties}
              >
                <p className="font-medium mb-2">
                  <span className="text-green-300 font-mono mr-2">Q{i + 1}.</span>
                  {q.questionText}
                </p>
                <p className="text-sm text-green-300">Your answer: {getOptionText(q, userAnswer)}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-10">
            <button
              onClick={() => {
                startTest()
              }}
              className="flex-1 bg-accent text-cream py-4 rounded-xl font-semibold hover:bg-accent/90 transition-colors"
            >
              Retake Test
            </button>
            <Link
              href="/"
              className="flex-1 text-center border border-border py-4 rounded-xl font-semibold hover:border-accent text-muted hover:text-cream transition-colors"
            >
              All Tests
            </Link>
          </div>
        </div>

        {showThanksModal && userName.trim() && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 text-center">
              <p className="text-accent text-lg font-semibold mb-3">
                thanks for your precious time {userName.trim()} !!
              </p>
              <p className="text-muted mb-2">Keep learning, keep grinding....</p>
              <p className="font-display text-xl text-accent mb-5">VRAJ educations</p>
              <button
                onClick={() => setShowThanksModal(false)}
                className="w-full bg-accent text-cream py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    )
  }

  // TEST
  const optionLabels: Record<string, string> = {
    A: current.optionA, B: current.optionB, C: current.optionC, D: current.optionD,
  }
  const progress = ((currentIdx) / total) * 100

  return (
    <main className="min-h-[100dvh] flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 bg-ink/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-muted hover:text-cream text-sm transition-colors">← Exit</Link>
          <span className="text-muted text-sm hidden md:block truncate max-w-[34ch]">{test.title}</span>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <svg width="32" height="32" viewBox="0 0 36 36" className="-rotate-90 sm:w-9 sm:h-9">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#2a2730" strokeWidth="3"/>
            <circle
              cx="18" cy="18" r="15" fill="none"
              stroke={timerColor} strokeWidth="3"
              strokeDasharray="94.2"
              strokeDashoffset={94.2 * (1 - timerPct)}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
            />
          </svg>
          <span
            className="font-mono font-bold text-base sm:text-lg tabular-nums"
            style={{ color: timerColor }}
          >
            {formatTime(timeLeft)}
          </span>
        </div>

        <span className="text-muted text-xs sm:text-sm font-mono">
          {currentIdx + 1} / {total}
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-border">
        <div
          className="h-1 bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question */}
      <div className="flex-1 px-4 sm:px-6 py-6 sm:py-8 md:py-12 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 sm:gap-8 items-start">
          <aside className="lg:sticky lg:top-24 order-1 lg:order-2">
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted mb-3 text-right">Questions</p>
              <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-6 gap-2 justify-items-end">
                {questions.map((q, i) => {
                  const status = getQuestionStatus(q)
                  const isCurrent = i === currentIdx
                  const statusClass =
                    status === 'answered'
                      ? 'border-green-500/70 bg-green-500/20 text-green-300'
                      : status === 'skipped'
                      ? 'border-yellow-500/70 bg-yellow-500/20 text-yellow-300'
                      : 'border-border text-muted'

                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(i)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg border text-[11px] sm:text-xs font-mono transition-colors ${statusClass} ${
                        isCurrent ? 'ring-2 ring-accent/50' : 'hover:border-accent/50'
                      }`}
                      aria-label={`Go to question ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          <div className="max-w-2xl w-full order-2 lg:order-1">
            <div key={current.id} className="animate-fade-up">
              <p className="text-accent font-mono text-xs uppercase tracking-widest mb-4">
                Question {currentIdx + 1} of {total}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 leading-snug">
                {current.questionText}
              </h2>

              <div className="space-y-3 mb-8">
                {OPTIONS.map((opt, i) => (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className={getOptionClass(opt)}
                    style={{ '--delay': `${i * 0.06}s` } as React.CSSProperties}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-lg border flex items-center justify-center font-mono font-bold text-sm shrink-0 transition-colors ${
                        selected === opt
                          ? 'border-accent bg-accent/20 text-accent'
                          : 'border-border text-muted'
                      }`}>
                        {opt}
                      </span>
                      <span className="text-sm sm:text-base">{optionLabels[opt]}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="animate-fade-up flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handlePrev}
                  disabled={currentIdx === 0}
                  className="sm:w-1/4 border border-border text-muted py-4 rounded-xl font-semibold text-sm hover:border-accent hover:text-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={handleNext}
                  className="sm:w-2/4 bg-accent text-cream py-4 rounded-xl font-semibold text-lg hover:bg-accent/90 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {currentIdx + 1 >= total ? 'See Results →' : 'Next / Skip →'}
                </button>
                <button
                  onClick={finishTest}
                  className="sm:w-1/4 border border-border text-muted py-4 rounded-xl font-semibold text-sm hover:border-accent hover:text-cream transition-colors"
                >
                  Finish Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
