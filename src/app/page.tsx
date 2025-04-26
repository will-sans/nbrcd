'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Message {
  role: 'gpt' | 'user'
  content: string
}

function SessionContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get('mode')

  const [messages, setMessages] = useState<Message[]>([
    { role: 'gpt', content: '今日の問い：あなたにしかできない仕事は何ですか？' }
  ])
  const [input, setInput] = useState('')

  const summary = {
    text: "今日のあなたの行動テーマは、“強みに集中すること”です。",
    quote: "なすべきことをなせ。— P.F.ドラッカー",
    book: "経営者の条件（ダイヤモンド社）"
  }

  const actions = [
    "午前中を強みを活かす時間にブロックする",
    "15分短縮できる会議をひとつ減らす",
    "“やらないことリスト”を10分更新する"
  ]

  const handleSend = () => {
    if (!input.trim()) return

    setMessages(prev => [...prev, { role: 'user', content: input }])

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'gpt', content: '素晴らしい！それをさらに広げるには？' }])
    }, 1000)

    setInput('')
  }

  return (
    <main className="max-w-xl mx-auto p-4 flex flex-col min-h-screen">
      <h1 className="text-xl font-bold mb-4">哲学モード: {mode}</h1>

      <div className="flex-1 space-y-4 overflow-y-auto mb-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`p-3 rounded-xl ${msg.role === 'gpt' ? 'bg-gray-100 text-left' : 'bg-blue-100 text-right'}`}>
            {msg.content}
          </div>
        ))}

        {messages.length >= 5 && (
          <>
            {/* まとめ */}
            <div className="border-t pt-6 mt-6 space-y-4">
              <div className="bg-yellow-50 p-4 rounded-xl">
                <h2 className="font-bold text-lg mb-2">🔍 今日のまとめ</h2>
                <p className="mb-2">{summary.text}</p>
                <p className="italic text-gray-600 mb-2">📜 {summary.quote}</p>
                <p className="text-blue-600">📚 {summary.book}</p>
              </div>
            </div>

            {/* アクション選択 */}
            <div className="border-t pt-6 mt-6 space-y-2">
              <h2 className="font-bold text-lg mb-2">✅ 今日のアクションを選んでください</h2>
              {actions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => router.push(`/dashboard?task=${encodeURIComponent(action)}`)}
                  className="block w-full border rounded-xl p-3 text-left hover:bg-blue-100 transition"
                >
                  {action}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded-xl p-2"
          placeholder="考えたことを書く..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
        />
        <button className="bg-blue-500 text-white px-4 rounded-xl" onClick={handleSend}>
          送信
        </button>
      </div>
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
