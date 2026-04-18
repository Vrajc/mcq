import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import TestClient from './TestClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

export default async function TestPage({ params }: Props) {
  const test = await prisma.testSet.findUnique({
    where: { slug: params.slug, published: true },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  })

  if (!test || test.questions.length === 0) return notFound()

  return <TestClient test={test} />
}
