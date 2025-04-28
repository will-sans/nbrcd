'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { eachDayOfInterval, startOfMonth, endOfMonth, format } from 'date-fns'

function DashboardContent() {
  const searchParams = useSearchParams()
  const initialTask = searchParams.get('task') || ''

  const [tasks, setTasks] = useState<string[]>(initialTask ? [initialTask] : [])
  const [completed, setCompleted] = useState<string[]>([])
  const [points, setPoints] = useState(0)
  const [newTask, setNewTask] = useState('') // ← New!

  // カレンダー用
  const today = new Date()
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(today),
    end: endOfMonth(today),
  })

  const handleComplete = (task: string) => {
    setCompleted(prev => [...prev, task])
    setPoints(prev => prev + 3)
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">🎯 今日のアクション管理</h1>

      {/* カレンダー部分 */}
      <div className="border rounded-xl p-4 grid grid-cols-7 gap-2 mb-6">
        {daysInMonth.map((day, idx) => (
          <div key={idx} className="text-center border rounded p-2 text-sm">
            {format(day, 'd')}
          </div>
        ))}
      </div>

      {/* ToDoリスト部分 */}
      <div className="space-y-4">
        <h2 className="font-bold text-lg">✅ 今日のToDo</h2>
        {tasks.map((task, idx) => (
          <div key={idx} className="flex justify-between items-center border p-3 rounded-xl">
            <span>{task}</span>
            {completed.includes(task) ? (
              <span className="text-green-500 font-bold">完了</span>
            ) : (
              <button
                className="bg-green-500 text-white px-3 py-1 rounded-xl"
                onClick={() => handleComplete(task)}
              >
                完了
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 新しいタスク入力エリア */}
      <div className="flex gap-2 mt-6">
        <input
          type="text"
          className="flex-1 border rounded-xl p-2"
          placeholder="新しいタスクを入力..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-xl"
          onClick={() => {
            if (newTask.trim()) {
              setTasks(prev => [...prev, newTask])
              setNewTask('') // 入力欄リセット
            }
          }}
        >
          追加
        </button>
      </div>

      {/* ポイント表示 */}
      <div className="text-center mt-8 text-lg">
        🏆 現在のポイント：<span className="font-bold">{points} pt</span>
      </div>
    </main>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
