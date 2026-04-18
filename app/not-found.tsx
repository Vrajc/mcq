import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center animate-fade-up">
        <p className="font-mono text-accent text-xs uppercase tracking-widest mb-4">404</p>
        <h1 className="font-display text-5xl font-black mb-4">Not Found</h1>
        <p className="text-muted mb-8">This test doesn't exist or has been unpublished.</p>
        <Link href="/" className="inline-flex items-center gap-2 bg-accent text-cream px-6 py-3 rounded-xl font-semibold hover:bg-accent/90 transition-colors">
          ← All Tests
        </Link>
      </div>
    </main>
  )
}
