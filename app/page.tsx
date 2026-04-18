import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const tests = await prisma.testSet.findMany({
    where: { published: true },
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="white"/>
              <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
              <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6"/>
              <rect x="9" y="9" width="5" height="5" rx="1" fill="white"/>
            </svg>
          </div>
          <span className="font-display font-bold text-lg">VRAJ Education</span>
        </div>
        <Link
          href="/admin"
          className="text-sm text-muted hover:text-cream transition-colors px-4 py-2 border border-border rounded-lg hover:border-accent"
        >
          Admin →
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="mb-16 animate-fade-up">
          <p className="text-accent font-mono text-sm tracking-widest uppercase mb-4">Test Your Knowledge</p>
          <h1 className="font-display text-5xl md:text-6xl font-black leading-tight mb-6">
            Pick a test.<br />
            <span className="text-accent">Prove yourself.</span>
          </h1>
          <p className="text-muted text-lg max-w-xl">
            Timed MCQ tests with instant scoring. One question at a time. No distractions. speacially build for &quot;<span className="text-accent font-semibold">Neeja Suva</span>&quot;.
          </p>
        </div>

        {/* Tests grid */}
        {tests.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-muted text-lg mb-2">No tests yet</p>
            <p className="text-muted/60 text-sm mb-6">Go to the admin panel to create your first test</p>
            <Link href="/admin" className="inline-flex items-center gap-2 bg-accent text-cream px-6 py-3 rounded-xl font-medium hover:bg-accent/90 transition-colors">
              Create a test →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {tests.map((test, i) => (
              <Link
                key={test.id}
                href={`/test/${test.slug}`}
                className="group block p-6 bg-card border border-border rounded-2xl hover:border-accent transition-all duration-300 hover:-translate-y-1 animate-fade-up"
                style={{ '--delay': `${i * 0.08}s` } as React.CSSProperties}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-accent/15 border border-accent/30 rounded-xl flex items-center justify-center text-accent font-mono font-bold">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <span className="text-xs font-mono text-muted bg-ink px-3 py-1 rounded-full border border-border">
                    {test.timeLimit} min
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold mb-2 group-hover:text-accent transition-colors">
                  {test.title}
                </h2>
                {test.description && (
                  <p className="text-muted text-sm mb-4 line-clamp-2">{test.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted text-sm">
                    {test._count.questions} question{test._count.questions !== 1 ? 's' : ''}
                  </span>
                  <span className="text-accent text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Start →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
