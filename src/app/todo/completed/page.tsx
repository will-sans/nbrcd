"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  completedDate?: string;
}

export default function CompletedTodoListPage() {
  const router = useRouter();
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      router.push("/login"); // 未ログイン状態でログイン画面にリダイレクト
      return;
    }

    const storedTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    setCompletedTodos(storedTodos.filter((todo: Todo) => todo.completed));
  }, [router]);

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/todo/list")}
          className="text-gray-600 hover:text-gray-800 text-2xl"
          aria-label="タスクリストへ移動"
        >
          ＜
        </button>

        <h1 className="text-2xl font-bold">完了済みタスク</h1>

        <div className="w-6" /> {/* レイアウト調整用 */}
      </div>

      {completedTodos.length > 0 ? (
        <ul className="space-y-2">
          {completedTodos.map((todo) => (
            <li key={todo.id} className="p-2 border rounded bg-gray-100">
              {todo.text} - 完了: {new Date(todo.completedDate || todo.date).toLocaleDateString()}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center">完了済みのタスクがありません。</p>
      )}
    </div>
  );
}