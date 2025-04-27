"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar"; // カレンダー追加！
import 'react-calendar/dist/Calendar.css'; // カレンダー用CSSも忘れずに！

interface Todo {
  id: number;
  text: string;
  done: boolean;
  date?: string; // ToDoにも日付を追加（オプション）
}

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [points, setPoints] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // 選択日

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const storedPoints = parseInt(localStorage.getItem("points") || "0", 10);
    setTodos(storedTodos);
    setPoints(storedPoints);
  }, []);

  const toggleDone = (id: number) => {
    const updated = todos.map((todo) =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    );
    setTodos(updated);
    localStorage.setItem("todos", JSON.stringify(updated));

    const toggledTodo = updated.find((todo) => todo.id === id);
    if (toggledTodo?.done) {
      const newPoints = points + 1;
      setPoints(newPoints);
      localStorage.setItem("points", newPoints.toString());
    }
  };

  const clearTodos = () => {
    if (confirm("本当に全てのToDoを削除しますか？")) {
      localStorage.removeItem("todos");
      setTodos([]);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-2">ToDoリスト</h1>
      <p className="mb-6">現在のポイント：<span className="font-bold">{points}</span>pt</p>

      {/* カレンダー表示 */}
      <div className="mb-6">
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
        />
      </div>

      {/* ToDoリスト */}
      {todos.length === 0 ? (
        <p className="text-gray-500">まだToDoがありません。</p>
        ) : (
        <ul className="space-y-4">
            {todos
            .filter((todo) => {
                const todoDate = todo.date || ""; // 空なら無視
                const selected = selectedDate.toISOString().split("T")[0];
                return todoDate === selected;
            })
            .map((todo) => (
                <li key={todo.id} className="flex items-center space-x-3">
                <input
                    type="checkbox"
                    checked={todo.done}
                    onChange={() => toggleDone(todo.id)}
                    className="h-5 w-5"
                />
                <span className={todo.done ? "line-through text-gray-400" : ""}>
                    {todo.text}
                </span>
                </li>
            ))}
        </ul>
        )}

      <button
        onClick={clearTodos}
        className="mt-8 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
      >
        全て削除する
      </button>
    </div>
  );
}
