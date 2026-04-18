'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ImportModal from './ImportModal'

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
  published: boolean
  _count: { questions: number }
}

interface Attempt {
  id: string
  testSetId: string
  userName: string
  score: number
  total: number
  percentage: number
  attemptNumber: number
  createdAt: string
  testSet?: {
    title: string
    slug: string
  }
}

const emptyQ = (): Omit<Question, 'id' | 'order'> => ({
  questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', answer: 'A',
})

export default function TestManager({ onLogout }: { onLogout: () => void }) {
  const [tests, setTests] = useState<TestSet[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [attemptTestId, setAttemptTestId] = useState('')
  const [attemptUserName, setAttemptUserName] = useState('')
  const [attemptFrom, setAttemptFrom] = useState('')
  const [attemptTo, setAttemptTo] = useState('')
  const [attemptsLoading, setAttemptsLoading] = useState(false)
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list')
  const [editId, setEditId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [showImport, setShowImport] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [timeLimit, setTimeLimit] = useState(15)
  const [newQ, setNewQ] = useState(emptyQ())
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const loadAttempts = async () => {
    const params = new URLSearchParams()
    if (attemptTestId) params.set('testSetId', attemptTestId)
    if (attemptUserName.trim()) params.set('userName', attemptUserName.trim())
    if (attemptFrom) params.set('from', attemptFrom)
    if (attemptTo) params.set('to', attemptTo)

    setAttemptsLoading(true)
    const url = params.toString() ? `/api/attempts?${params.toString()}` : '/api/attempts'
    const attemptsRes = await fetch(url)

    if (attemptsRes.ok) {
      const attemptsData = await attemptsRes.json()
      setAttempts(attemptsData)
    }
    setAttemptsLoading(false)
  }

  const load = async () => {
    const testsRes = await fetch('/api/tests')
    const testsData = await testsRes.json()
    setTests(testsData)
    await loadAttempts()
  }

  useEffect(() => { load() }, [])

  const resetAttemptFilters = async () => {
    setAttemptTestId('')
    setAttemptUserName('')
    setAttemptFrom('')
    setAttemptTo('')

    setAttemptsLoading(true)
    const attemptsRes = await fetch('/api/attempts')
    if (attemptsRes.ok) {
      const attemptsData = await attemptsRes.json()
      setAttempts(attemptsData)
    }
    setAttemptsLoading(false)
  }

  const loadQuestions = async (testId: string) => {
    const r = await fetch(`/api/questions?testId=${testId}`)
    const data = await r.json()
    setQuestions(data)
  }

  const openEdit = async (test: TestSet) => {
    setEditId(test.id)
    setTitle(test.title)
    setDesc(test.description)
    setTimeLimit(test.timeLimit)
    await loadQuestions(test.id)
    setView('edit')
  }

  const openCreate = () => {
    setEditId(null)
    setTitle('')
    setDesc('')
    setTimeLimit(15)
    setQuestions([])
    setView('create')
    setMsg('')
  }

  const saveTest = async () => {
    if (!title.trim()) return
    setSaving(true)
    const method = editId ? 'PUT' : 'POST'
    const body = editId
      ? { id: editId, title, description: desc, timeLimit }
      : { title, description: desc, timeLimit }
    const r = await fetch('/api/tests', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const data = await r.json()
    if (!editId) {
      setEditId(data.id)
      setView('edit')
    }
    setSaving(false)
    setMsg('Saved!')
    setTimeout(() => setMsg(''), 2000)
    load()
  }

  const deleteTest = async (id: string) => {
    if (!confirm('Delete this test and all its questions?')) return
    await fetch('/api/tests', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    load()
    setView('list')
  }

  const togglePublish = async (test: TestSet) => {
    await fetch('/api/tests', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: test.id, published: !test.published }),
    })
    load()
  }

  const addQuestion = async () => {
    if (!editId || !newQ.questionText.trim()) return
    setSaving(true)
    await fetch('/api/questions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newQ, testSetId: editId, order: questions.length }),
    })
    await loadQuestions(editId)
    setNewQ(emptyQ())
    setSaving(false)
    setMsg('Question added!')
    setTimeout(() => setMsg(''), 2000)
  }

  const deleteQuestion = async (id: string) => {
    await fetch('/api/questions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    if (editId) loadQuestions(editId)
  }

  const onImported = async (imported: typeof newQ[]) => {
    if (!editId) return
    setSaving(true)
    for (let i = 0; i < imported.length; i++) {
      await fetch('/api/questions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...imported[i], testSetId: editId, order: questions.length + i }),
      })
    }
    await loadQuestions(editId)
    setSaving(false)
    setMsg(`${imported.length} questions imported!`)
    setTimeout(() => setMsg(''), 3000)
  }

  // LIST VIEW
  if (view === 'list') {
    return (
      <main className="min-h-[100dvh]">
        <header className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" rx="1" fill="white"/>
                <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
                <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
                <rect x="9" y="9" width="5" height="5" rx="1" fill="white"/>
              </svg>
            </div>
            <span className="font-display font-bold text-lg hidden sm:inline">VRAJ Education</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="text-xs sm:text-sm text-muted hover:text-cream transition-colors">View Site</Link>
            <button onClick={onLogout} className="text-xs sm:text-sm text-muted hover:text-cream transition-colors px-2.5 sm:px-3 py-1.5 border border-border rounded-lg">Logout</button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 sm:mb-10">
            <div>
              <p className="text-accent font-mono text-xs uppercase tracking-widest mb-2">Admin Panel</p>
              <h1 className="font-display text-3xl sm:text-4xl font-black">Your Tests</h1>
            </div>
            <button
              onClick={openCreate}
              className="bg-accent text-cream px-5 py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors w-full sm:w-auto"
            >
              + New Test
            </button>
          </div>

          {tests.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              <p className="text-muted mb-4">No tests yet</p>
              <button onClick={openCreate} className="bg-accent text-cream px-5 py-3 rounded-xl font-semibold">
                Create your first test
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tests.map(test => (
                <div key={test.id} className="bg-card border border-border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="min-w-0 w-full sm:w-auto">
                    <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-1">
                      <h3 className="font-semibold break-words">{test.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${test.published ? 'bg-green-500/20 text-green-400' : 'bg-border text-muted'}`}>
                        {test.published ? 'Live' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-muted text-sm leading-relaxed">{test._count.questions} questions · {test.timeLimit} min</p>
                  </div>
                  <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                    <Link href={`/test/${test.slug}`} target="_blank" className="text-xs text-muted hover:text-cream px-3 py-2 border border-border rounded-lg text-center">Preview</Link>
                    <button onClick={() => togglePublish(test)} className="text-xs text-muted hover:text-cream px-3 py-2 border border-border rounded-lg">
                      {test.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => openEdit(test)} className="text-xs bg-accent/15 text-accent hover:bg-accent/25 px-3 py-2 rounded-lg border border-accent/30">
                      Edit
                    </button>
                    <button onClick={() => deleteTest(test.id)} className="text-xs text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/30">
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              <div className="bg-card border border-border rounded-xl p-4 sm:p-5 mt-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <h3 className="font-display text-xl sm:text-2xl font-bold">Attempt Monitoring</h3>
                  <span className="text-xs font-mono text-muted uppercase tracking-widest">
                    {attempts.length} total attempts
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <select
                    value={attemptTestId}
                    onChange={e => setAttemptTestId(e.target.value)}
                    className="w-full bg-ink border border-border rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent"
                  >
                    <option value="">All Tests</option>
                    {tests.map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>

                  <input
                    value={attemptUserName}
                    onChange={e => setAttemptUserName(e.target.value)}
                    placeholder="Filter by user"
                    className="w-full bg-ink border border-border rounded-lg px-3 py-2 text-sm text-cream placeholder:text-muted focus:outline-none focus:border-accent"
                  />

                  <input
                    type="date"
                    value={attemptFrom}
                    onChange={e => setAttemptFrom(e.target.value)}
                    className="w-full bg-ink border border-border rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent"
                  />

                  <input
                    type="date"
                    value={attemptTo}
                    onChange={e => setAttemptTo(e.target.value)}
                    className="w-full bg-ink border border-border rounded-lg px-3 py-2 text-sm text-cream focus:outline-none focus:border-accent"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <button
                    onClick={loadAttempts}
                    className="px-4 py-2 rounded-lg bg-accent text-cream text-sm font-semibold hover:bg-accent/90 transition-colors"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={resetAttemptFilters}
                    className="px-4 py-2 rounded-lg border border-border text-sm text-muted hover:text-cream hover:border-accent transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {attempts.length === 0 ? (
                  <p className="text-sm text-muted">{attemptsLoading ? 'Loading attempts...' : 'No attempts recorded yet.'}</p>
                ) : (
                  <div className="space-y-3">
                    {attempts.map(attempt => (
                      <div key={attempt.id} className="border border-border rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 mb-2">
                          <p className="font-semibold break-words">{attempt.userName}</p>
                          <span className="text-xs text-muted font-mono">
                            {new Date(attempt.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted mb-1 break-words">
                          Test: {attempt.testSet?.title || 'Unknown Test'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                          <span className="px-2 py-1 rounded-md bg-ink border border-border">
                            Attempt #{attempt.attemptNumber}
                          </span>
                          <span className="px-2 py-1 rounded-md bg-ink border border-border text-green-300">
                            Score: {attempt.score}/{attempt.total}
                          </span>
                          <span className="px-2 py-1 rounded-md bg-ink border border-border text-accent">
                            {attempt.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    )
  }

  // CREATE / EDIT VIEW
  return (
    <main className="min-h-[100dvh]">
      <header className="border-b border-border px-4 sm:px-6 py-4 flex items-center justify-between gap-3 sticky top-0 bg-ink/90 backdrop-blur-sm z-10">
        <button onClick={() => { setView('list'); load() }} className="flex items-center gap-2 text-muted hover:text-cream transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          {msg && <span className="text-green-400 text-xs sm:text-sm font-mono hidden sm:inline">{msg}</span>}
          <button onClick={saveTest} disabled={saving} className="bg-accent text-cream px-4 sm:px-5 py-2 rounded-lg font-semibold hover:bg-accent/90 transition-colors text-sm disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <p className="text-accent font-mono text-xs uppercase tracking-widest mb-6">{view === 'create' ? 'Create Test' : 'Edit Test'}</p>

        {/* Test metadata */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8 space-y-4">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Test title (e.g. SQL Basics)"
            className="w-full bg-ink border border-border rounded-xl px-5 py-3 text-cream placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-lg font-display"
          />
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Short description (optional)"
            className="w-full bg-ink border border-border rounded-xl px-5 py-3 text-cream placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-sm"
          />
          <div className="flex items-center gap-3">
            <label className="text-muted text-sm shrink-0">Time limit:</label>
            <input
              type="number"
              value={timeLimit}
              onChange={e => setTimeLimit(Number(e.target.value))}
              min={1} max={180}
              className="w-24 bg-ink border border-border rounded-xl px-3 py-2 text-cream focus:outline-none focus:border-accent transition-colors text-sm font-mono"
            />
            <span className="text-muted text-sm">minutes</span>
          </div>
          {view === 'create' && (
            <p className="text-muted text-xs">Save the test first, then you can add questions.</p>
          )}
        </div>

        {/* Questions section - only shown after test is saved */}
        {editId && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h2 className="font-display text-xl font-bold">Questions ({questions.length})</h2>
              <button
                onClick={() => setShowImport(true)}
                className="text-sm border border-border px-4 py-2 rounded-lg text-muted hover:text-cream hover:border-accent transition-colors w-full sm:w-auto"
              >
                ↑ Bulk Import
              </button>
            </div>

            {/* Existing questions */}
            {questions.length > 0 && (
              <div className="space-y-3 mb-8">
                {questions.map((q, i) => (
                  <div key={q.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm mb-2">
                          <span className="text-accent font-mono mr-2">Q{i + 1}.</span>
                          {q.questionText}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted">
                          {(['A', 'B', 'C', 'D'] as const).map(opt => (
                            <span key={opt} className={opt === q.answer ? 'text-green-400 font-semibold' : ''}>
                              {opt}: {q[`option${opt}` as keyof Question]}
                              {opt === q.answer && ' ✓'}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="text-red-400 hover:text-red-300 text-sm shrink-0 mt-0.5"
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add question form */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted">Add Question</h3>
              <textarea
                value={newQ.questionText}
                onChange={e => setNewQ({ ...newQ, questionText: e.target.value })}
                placeholder="Question text…"
                rows={2}
                className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-cream placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-sm mb-4 resize-none"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {(['A', 'B', 'C', 'D'] as const).map(opt => (
                  <div key={opt} className="flex items-center gap-2">
                    <span className="font-mono text-muted text-sm w-5 shrink-0">{opt}.</span>
                    <input
                      value={newQ[`option${opt}` as keyof typeof newQ] as string}
                      onChange={e => setNewQ({ ...newQ, [`option${opt}`]: e.target.value })}
                      placeholder={`Option ${opt}`}
                      className="flex-1 bg-ink border border-border rounded-lg px-3 py-2 text-cream placeholder:text-muted focus:outline-none focus:border-accent transition-colors text-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-muted text-sm">Correct answer:</label>
                  <select
                    value={newQ.answer}
                    onChange={e => setNewQ({ ...newQ, answer: e.target.value })}
                    className="bg-ink border border-border rounded-lg px-3 py-2 text-cream focus:outline-none focus:border-accent text-sm font-mono"
                  >
                    {['A', 'B', 'C', 'D'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <button
                  onClick={addQuestion}
                  disabled={saving || !newQ.questionText.trim()}
                  className="bg-accent text-cream px-5 py-2 rounded-lg font-semibold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50 w-full sm:w-auto"
                >
                  Add Question
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showImport && editId && (
        <ImportModal
          testId={editId}
          onClose={() => setShowImport(false)}
          onImported={onImported}
        />
      )}
    </main>
  )
}
