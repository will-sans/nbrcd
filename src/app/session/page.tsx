'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SessionContent() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode')

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-2">哲学モード: {mode}</h1>
      <p>ここにチャットUIが入ります（仮）</p>
    </main>
  )
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SessionContent />
    </Suspense>
  )
}
