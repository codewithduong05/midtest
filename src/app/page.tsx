'use client'

import { Suspense } from 'react'
import NoteCodeHome from '@/components/note-code-home'
import { Loader2 } from 'lucide-react'

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-8 animate-spin text-emerald-500" />
            <p className="text-sm text-gray-500">Đang tải NoteCode...</p>
          </div>
        </div>
      }
    >
      <NoteCodeHome />
    </Suspense>
  )
}