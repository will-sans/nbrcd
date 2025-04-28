"use client";

import { useEffect, useState, MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { FaComments } from "react-icons/fa";

interface Todo {
  id: number;
  text: string;
  done: boolean;
  date?: string;
}

export default function TodoPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [points, setPoints] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const storedPoints = parseInt(localStorage.getItem("points") || "0", 10);
    setTodos(storedTodos);
    setPoints(storedPoints);
    console.log("Stored todos:", storedTodos); // デバッグ用ログ
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

  const filteredTodos = todos.filter((todo) => {
    const todoDate = todo.date || "";
    const selected = selectedDate.toISOString().split("T")[0];
    const matches = todoDate === selected || !todoDate;
    console.log(`Filtering todo: ${todo.text}, todoDate: ${todoDate}, selected: ${selected}, matches: ${matches}`); // デバッグ用ログ
    return matches;
  });

  const handleDateChange = (
    value: Date | [Date | null, Date | null] | null,
    event: MouseEvent<HTMLButtonElement>
  ) => {
    if (value instanceof Date) {
      setSelectedDate(value);
    } else if (Array.isArray(value)) {
      if (value[0] instanceof Date) {
        setSelectedDate(value[0]);
      }
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col relative">
      <button
        onClick={() => router.push("/session")}
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        aria-label="Go to Session"
      >
        <FaComments size={24} />
      </button>

      <h1 className="text-2xl font-bold mb-2">ToDoリスト</h1>
      <p className="mb-6">
        現在のポイント：<span className="font-bold">{points}</span>pt
      </p>

      <div className="mb-6">
        <Calendar onChange={handleDateChange} value={selectedDate} />
      </div>

      <h2 className="text-xl font-bold mb-2">選択した日のToDo</h2>
      {filteredTodos.length === 0 ? (
        <p className="text-gray-500">選択した日にToDoがありません。</p>
      ) : (
        <ul className="space-y-4">
          {filteredTodos.map((todo) => (
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