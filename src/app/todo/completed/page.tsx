"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaComments, FaCheck } from "react-icons/fa";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  date: string;
  completedDate?: string;
}

export default function CompletedTodosPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    setTodos(storedTodos);
  }, []);

  const groupedTodos = todos
    .filter((todo) => todo.completed)
    .reduce((acc: { [key: string]: Todo[] }, todo) => {
      const date = new Date(todo.completedDate!).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(todo);
      return acc;
    }, {});

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col relative">
      <button
        onClick={() => router.push("/")}
        className="absolute top-4 left-4 text-gray-600 hover:text-gray-800"
        aria-label="Go to Home"
      >
        <FaComments size={24} />
      </button>

      <button
        onClick={() => router.push("/todo/list")}
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        aria-label="Go to Todo List"
      >
        <FaCheck size={24} /> {/* ✔︎マークに変更 */}
      </button>

      <h1 className="text-2xl font-bold mb-4 text-center">完了済み Todo</h1>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedTodos).map(([date, dateTodos]) => (
          <div key={date} className="mb-4">
            <h2 className="text-lg font-semibold">{date}</h2>
            {dateTodos.map((todo) => (
              <div key={todo.id} className="mt-2">
                <span>{todo.text}</span>
              </div>
            ))}
          </div>
        ))}
        {Object.keys(groupedTodos).length === 0 && (
          <p className="text-gray-500">完了済みのTodoがありません。</p>
        )}
      </div>
    </div>
  );
}