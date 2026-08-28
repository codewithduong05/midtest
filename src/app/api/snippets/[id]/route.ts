import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const snippet = await db.codeSnippet.findUnique({
      where: { shareId: id },
    })

    if (!snippet) {
      return NextResponse.json(
        { error: 'Snippet not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      code: snippet.code,
      language: snippet.language,
      theme: snippet.theme,
      createdAt: snippet.createdAt,
    })
  } catch (error) {
    console.error('Error fetching snippet:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snippet' },
      { status: 500 }
    )
  }
}
