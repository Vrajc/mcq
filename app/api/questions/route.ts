import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const testId = req.nextUrl.searchParams.get('testId')
  if (!testId) return NextResponse.json({ error: 'testId required' }, { status: 400 })

  const questions = await prisma.question.findMany({
    where: { testSetId: testId },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(questions)
}

export async function POST(req: NextRequest) {
  const { testSetId, questionText, optionA, optionB, optionC, optionD, answer, order } = await req.json()

  if (!testSetId || !questionText) {
    return NextResponse.json({ error: 'testSetId and questionText required' }, { status: 400 })
  }

  const question = await prisma.question.create({
    data: { testSetId, questionText, optionA, optionB, optionC, optionD, answer, order: order ?? 0 },
  })
  return NextResponse.json(question)
}

export async function PUT(req: NextRequest) {
  const { id, ...data } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const question = await prisma.question.update({ where: { id }, data })
  return NextResponse.json(question)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  await prisma.question.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
