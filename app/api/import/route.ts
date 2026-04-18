import { NextRequest, NextResponse } from 'next/server'

interface ParsedQuestion {
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  answer: string
}

interface ExtractOptions {
  debugAnswers?: boolean
}

function normalizeLine(line: string) {
  return line.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseAnswerMap(text: string) {
  const answerMap = new Map<number, string>()
  const lower = text.toLowerCase()
  const markerIndex = lower.search(/answer\s*key|answers?\s*[:\-]/)

  // Parse only the answer section when available to avoid false matches.
  const section = markerIndex >= 0 ? text.slice(markerIndex) : text

  const pairPatterns = [
    // 1-B, 1) B, Q1: B, 01. B
    /(?:q\s*)?(\d+)\s*[-:.)]\s*\(?\s*([A-D])\s*\)?\b/gi,
    // 1 = (B), 2:(c)
    /(?:q\s*)?(\d+)\s*[=:]\s*\(?\s*([A-D])\s*\)?\b/gi,
    // 1 Option B
    /(?:q\s*)?(\d+)\s*[-:.)]?\s*option\s*([A-D])\b/gi,
  ]

  for (const pattern of pairPatterns) {
    let match: RegExpExecArray | null = pattern.exec(section)
    while (match) {
      answerMap.set(Number(match[1]), match[2].toUpperCase())
      match = pattern.exec(section)
    }
  }

  // Fallback: Answers listed as plain letters on separate lines (A, C, B, ...)
  if (answerMap.size === 0 && markerIndex >= 0) {
    const letters = section
      .split(/\r?\n/)
      .map(normalizeLine)
      .filter(line => /^[A-D]$/i.test(line))
      .map(line => line.toUpperCase())

    letters.forEach((letter, idx) => {
      answerMap.set(idx + 1, letter)
    })
  }

  return answerMap
}

function extractQuestionsLocally(rawText: string, options: ExtractOptions = {}): ParsedQuestion[] {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean)

  const answerMap = parseAnswerMap(rawText)
  const out: ParsedQuestion[] = []
  const diagnostics: Array<{ questionNo: number; source: 'inline' | 'answer-map' | 'fallback-A'; answer: string }> = []

  let currentNumber: number | null = null
  let questionText = ''
  let optionA = ''
  let optionB = ''
  let optionC = ''
  let optionD = ''
  let inlineAnswer = ''
  let activeOption: 'A' | 'B' | 'C' | 'D' | null = null

  const flush = () => {
    if (!questionText || !optionA || !optionB || !optionC || !optionD) return
    const questionNo = currentNumber ?? out.length + 1
    const mapAnswer = answerMap.get(questionNo)
    const source = inlineAnswer ? 'inline' : mapAnswer ? 'answer-map' : 'fallback-A'
    const resolved = (inlineAnswer || mapAnswer || 'A').toUpperCase()
    diagnostics.push({ questionNo, source, answer: resolved })
    out.push({
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      answer: ['A', 'B', 'C', 'D'].includes(resolved) ? resolved : 'A',
    })
  }

  for (const line of lines) {
    const qMatch = line.match(/^(?:q(?:uestion)?\s*)?(\d+)\s*[).:-]?\s*(.+)$/i)
    if (qMatch) {
      flush()
      currentNumber = Number(qMatch[1])
      questionText = qMatch[2].trim()
      optionA = ''
      optionB = ''
      optionC = ''
      optionD = ''
      inlineAnswer = ''
      activeOption = null
      continue
    }

    if (questionText) {
      const optionMatch = line.match(/^([A-D])\s*[).:-]\s*(.+)$/i)
      if (optionMatch) {
        const letter = optionMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D'
        const value = optionMatch[2].trim()
        activeOption = letter
        if (letter === 'A') optionA = value
        if (letter === 'B') optionB = value
        if (letter === 'C') optionC = value
        if (letter === 'D') optionD = value
        continue
      }

      const inlineAnswerMatch = line.match(/^(?:answer|ans)\s*[:\-]?\s*([A-D])\b/i)
      if (inlineAnswerMatch) {
        inlineAnswer = inlineAnswerMatch[1].toUpperCase()
        continue
      }

      if (activeOption) {
        if (activeOption === 'A') optionA = `${optionA} ${line}`.trim()
        if (activeOption === 'B') optionB = `${optionB} ${line}`.trim()
        if (activeOption === 'C') optionC = `${optionC} ${line}`.trim()
        if (activeOption === 'D') optionD = `${optionD} ${line}`.trim()
      } else {
        questionText = `${questionText} ${line}`.trim()
      }
    }
  }

  flush()

  if (options.debugAnswers) {
    const mapEntries = Array.from(answerMap.entries()).sort((a, b) => a[0] - b[0])
    console.log('[import][debug] parsed answer map:', mapEntries)
    console.log('[import][debug] resolved answers:', diagnostics)
  }

  return out
}

async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
    // Dynamic import to avoid SSR issues
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text
  }

  if (
    file.name.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error('Unsupported file type. Please upload a PDF or DOCX file.')
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''

    let rawText = ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
      }
      rawText = await extractTextFromFile(file)
    } else {
      const body = await req.json()
      rawText = body.text || ''
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: 'No text content found' }, { status: 400 })
    }

    const debugAnswers =
      process.env.NODE_ENV !== 'production' && process.env.IMPORT_DEBUG_ANSWERS === 'true'

    const questions = extractQuestionsLocally(rawText, { debugAnswers })

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        {
          error:
            'No MCQs could be extracted. Use numbered questions with A/B/C/D options, then try again.',
        },
        { status: 422 },
      )
    }

    return NextResponse.json({ questions, count: questions.length })
  } catch (err: unknown) {
    console.error('Import error:', err)
    const message = err instanceof Error ? err.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
