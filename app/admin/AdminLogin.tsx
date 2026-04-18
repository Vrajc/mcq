'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AdminLogin({ onLogin }: { onLogin: (pw: string) => void }) {
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onLogin(pw)
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-border px-6 py-4">
        <Link href="/" className="flex items-center gap-3 w-fit">
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
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm animate-fade-up">
          <p className="text-accent font-mono text-xs tracking-widest uppercase mb-4 text-center">Admin Access</p>
          <h1 className="font-display text-4xl font-black text-center mb-8">Sign In</h1>
          <form onSubmit={submit} className="space-y-4">
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="Admin password"
              className="w-full bg-card border border-border rounded-xl px-5 py-4 text-cream placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !pw}
              className="w-full bg-accent text-cream py-4 rounded-xl font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Checking…' : 'Enter →'}
            </button>
          </form>
          <p className="text-muted text-xs text-center mt-4">
            Default password: <code className="font-mono bg-card px-2 py-0.5 rounded">admin123</code>
            <br />Change via ADMIN_PASSWORD in .env
          </p>
        </div>
      </div>
    </main>
  )
}
