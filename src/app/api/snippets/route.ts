import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

function generateShareId(): string {
  const bytes = crypto.randomBytes(4)
  return bytes.toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, language, theme } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      )
    }

    let shareId = generateShareId()
    // Ensure uniqueness
    let existing = await db.codeSnippet.findUnique({ where: { shareId } })
    while (existing) {
      shareId = generateShareId()
      existing = await db.codeSnippet.findUnique({ where: { shareId } })
    }

    const snippet = await db.codeSnippet.create({
      data: {
        shareId,
        code,
        language: language || 'html',
        theme: theme || 'light',
      },
    })

    return NextResponse.json({ shareId: snippet.shareId }, { status: 201 })
  } catch (error) {
    console.error('Error saving snippet:', error)
    return NextResponse.json(
      { error: 'Failed to save snippet' },
      { status: 500 }
    )
  }
}
