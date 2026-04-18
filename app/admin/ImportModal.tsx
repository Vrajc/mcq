'use client'

import { useState, useRef } from 'react'

interface ParsedQuestion {
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  answer: string
}

interface Props {
  testId: string
  onClose: () => void
  onImported: (questions: ParsedQuestion[]) => void
}

export default function ImportModal({ testId, onClose, onImported }: Props) {
  const [tab, setTab] = useState<'paste' | 'file'>('paste')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedQuestion[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const parse = async () => {
    setLoading(true)
    setError('')
    setParsed(null)
    try {
      let body: FormData | string
      let headers: Record<string, string> = {}

      if (tab === 'file' && file) {
        const fd = new FormData()
        fd.append('file', file)
        body = fd
      } else {
        body = JSON.stringify({ text })
        headers['Content-Type'] = 'application/json'
      }

      const r = await fetch('/api/import', { method: 'POST', headers, body: body as BodyInit })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Parse failed')
      setParsed(data.questions)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    }
    setLoading(false)
  }

  const confirmImport = () => {
    if (!parsed) return
    onImported(parsed)
    onClose()
  }

  const removeQ = (i: number) => {
    if (!parsed) return
    setParsed(parsed.filter((_, idx) => idx !== i))
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-display text-xl font-bold">Bulk Import</h2>
            <p className="text-muted text-xs mt-0.5">Built-in MCQ extraction (no API key)</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-cream text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!parsed ? (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                {(['paste', 'file'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tab === t ? 'bg-accent text-cream' : 'bg-ink border border-border text-muted hover:text-cream'
                    }`}
                  >
                    {t === 'paste' ? '📋 Paste Text' : '📁 Upload File'}
                  </button>
                ))}
              </div>

              {tab === 'paste' && (
                <div>
                  <p className="text-muted text-sm mb-3">
                    Paste MCQs with numbered questions and A/B/C/D options. The built-in parser will extract them.
                  </p>
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder={`Example format:

1. What does INNER JOIN return?
A. All rows from both tables
B. Only matching rows
C. Only left table rows
D. Only right table rows

2. What happens when state changes in React?
A. The app closes
B. The UI re-renders
...

Answers: 1-B, 2-B, 3-C`}
                    rows={14}
                    className="w-full bg-ink border border-border rounded-xl px-4 py-3 text-cream placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors text-sm resize-none font-mono"
                  />
                </div>
              )}

              {tab === 'file' && (
                <div>
                  <p className="text-muted text-sm mb-3">
                    Upload a <strong className="text-cream">PDF</strong> or <strong className="text-cream">Word (.docx)</strong> file containing MCQs. The built-in parser will extract and structure them.
                  </p>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                      file ? 'border-accent/50 bg-accent/5' : 'border-border hover:border-accent/50'
                    }`}
                  >
                    <div className="text-3xl mb-3">{file ? '✅' : '📄'}</div>
                    {file ? (
                      <div>
                        <p className="text-cream font-medium">{file.name}</p>
                        <p className="text-muted text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                        <button
                          onClick={e => { e.stopPropagation(); setFile(null) }}
                          className="text-xs text-red-400 mt-2 hover:underline"
                        >Remove</button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-muted">Click to select a PDF or DOCX file</p>
                        <p className="text-muted/50 text-xs mt-1">Max 10MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                  />
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={parse}
                  disabled={loading || (tab === 'paste' ? !text.trim() : !file)}
                  className="flex-1 bg-accent text-cream py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/>
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75"/>
                      </svg>
                      Parsing questions…
                    </>
                  ) : 'Extract MCQs'}
                </button>
                <button onClick={onClose} className="px-5 py-3 border border-border rounded-xl text-muted hover:text-cream transition-colors">
                  Cancel
                </button>
              </div>

              <div className="mt-4 p-4 bg-ink border border-border rounded-xl">
                <p className="text-xs text-muted leading-relaxed">
                  <strong className="text-cream">How it works:</strong> Your text/file is parsed on the server to identify numbered questions, options A-D, and answers (including separate answer keys). Review the results before saving.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Preview parsed questions */}
              <div className="flex items-center justify-between mb-4">
                <p className="text-green-400 font-medium">
                  ✓ {parsed.length} questions extracted
                </p>
                <button onClick={() => setParsed(null)} className="text-sm text-muted hover:text-cream">← Re-parse</button>
              </div>

              <div className="space-y-3 mb-6">
                {parsed.map((q, i) => (
                  <div key={i} className="bg-ink border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-sm font-medium">
                        <span className="text-accent font-mono mr-2">Q{i + 1}.</span>
                        {q.questionText}
                      </p>
                      <button onClick={() => removeQ(i)} className="text-red-400 hover:text-red-300 text-sm shrink-0">✕</button>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {(['A', 'B', 'C', 'D'] as const).map(opt => (
                        <p key={opt} className={`text-xs px-2 py-1 rounded ${
                          opt === q.answer ? 'text-green-400 bg-green-500/10' : 'text-muted'
                        }`}>
                          <span className="font-mono font-bold mr-1">{opt}.</span>
                          {q[`option${opt}` as keyof ParsedQuestion]}
                          {opt === q.answer && ' ✓'}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {parsed.length === 0 && (
                <div className="text-center py-8 text-muted">
                  <p>All questions removed.</p>
                  <button onClick={() => setParsed(null)} className="text-accent text-sm mt-2">← Go back</button>
                </div>
              )}

              {parsed.length > 0 && (
                <div className="flex gap-3">
                  <button
                    onClick={confirmImport}
                    className="flex-1 bg-accent text-cream py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors"
                  >
                    Import {parsed.length} Questions →
                  </button>
                  <button onClick={onClose} className="px-5 py-3 border border-border rounded-xl text-muted hover:text-cream transition-colors">
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
