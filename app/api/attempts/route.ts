import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const testSetId = req.nextUrl.searchParams.get('testSetId')
  const userName = req.nextUrl.searchParams.get('userName')
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  const where: {
    testSetId?: string
    userName?: { contains: string }
    createdAt?: { gte?: Date; lte?: Date }
  } = {}

  if (testSetId) where.testSetId = testSetId
  if (userName?.trim()) where.userName = { contains: userName.trim() }

  if (from || to) {
    where.createdAt = {}

    if (from) {
      const fromDate = new Date(`${from}T00:00:00.000Z`)
      if (!Number.isNaN(fromDate.getTime())) {
        where.createdAt.gte = fromDate
      }
    }

    if (to) {
      const toDate = new Date(`${to}T23:59:59.999Z`)
      if (!Number.isNaN(toDate.getTime())) {
        where.createdAt.lte = toDate
      }
    }
  }

  const attempts = await prisma.attempt.findMany({
    where,
    include: { testSet: { select: { title: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json(attempts)
}

export async function POST(req: NextRequest) {
  const { testSetId, userName, score, total } = await req.json()

  if (!testSetId || !userName || score === undefined || total === undefined) {
    return NextResponse.json({ error: 'testSetId, userName, score, total are required' }, { status: 400 })
  }

  const cleanName = String(userName).trim().slice(0, 60)
  const parsedScore = Number(score)
  const parsedTotal = Number(total)

  if (!cleanName) {
    return NextResponse.json({ error: 'Valid user name is required' }, { status: 400 })
  }

  if (!Number.isFinite(parsedScore) || !Number.isFinite(parsedTotal) || parsedTotal <= 0) {
    return NextResponse.json({ error: 'Invalid score/total values' }, { status: 400 })
  }

  const existingCount = await prisma.attempt.count({
    where: { testSetId, userName: cleanName },
  })

  const percentage = Math.round((parsedScore / parsedTotal) * 100)

  const attempt = await prisma.attempt.create({
    data: {
      testSetId,
      userName: cleanName,
      score: parsedScore,
      total: parsedTotal,
      percentage,
      attemptNumber: existingCount + 1,
    },
  })

  return NextResponse.json(attempt)
}
