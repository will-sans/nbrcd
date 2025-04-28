"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaCalendarAlt } from "react-icons/fa";

interface Todo {
  id: number;
  text: string;
  done: boolean;
  date?: string;
}

export default function TodoPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const storedTodos = localStorage.getItem("todos");
    if (storedTodos) {
      setTodos(JSON.parse(storedTodos));
    }
  }, []);

  const toggleTodo = (id: number) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    );
    setTodos(updatedTodos);
    localStorage.setItem("todos", JSON.stringify(updatedTodos));
  };

  const clearTodos = () => {
    setTodos([]);
    localStorage.removeItem("todos");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col relative">
      <button
        onClick={() => router.push("/")} // 修正：/session から / に変更
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        aria-label="Go to Home" // 修正：aria-label を更新
      >
        <FaCalendarAlt size={24} />
      </button>

      <h1 className="text-2xl font-bold mb-4 text-center">Todoリスト</h1>

      {todos.length === 0 ? (
        <p className="text-gray-500 text-center">Todoがありません</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {todos.map((todo) => (
            <li key={todo.id} className="flex items-center">
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
                className="mr-2 h-5 w-5"
              />
              <span className={todo.done ? "line-through text-gray-500" : ""}>
                {todo.text} {todo.date && `(${todo.date})`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={clearTodos}
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded mx-auto"
      >
        全てクリア
      </button>
    </div>
  );
}