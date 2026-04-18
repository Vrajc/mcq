import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'

export async function GET() {
  const tests = await prisma.testSet.findMany({
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(tests)
}

export async function POST(req: NextRequest) {
  const { title, description, timeLimit } = await req.json()
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const test = await prisma.testSet.create({
    data: {
      title,
      description: description || '',
      slug: slugify(title),
      timeLimit: timeLimit || 15,
    },
  })
  return NextResponse.json(test)
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const test = await prisma.testSet.update({
    where: { id },
    data,
  })
  return NextResponse.json(test)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.testSet.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
