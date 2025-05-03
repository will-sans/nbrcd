"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaComments, FaCheckSquare } from "react-icons/fa";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  date: string;
  completedDate?: string;
}

export default function TodoListPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    setTodos(storedTodos);
  }, []);

  const handleAddTodo = () => {
    if (!newTodo.trim()) return;

    const newTodoItem: Todo = {
      id: Date.now() + Math.random(),
      text: newTodo.trim(),
      completed: false,
      date: new Date().toISOString(),
    };

    const updatedTodos = [...todos, newTodoItem];
    setTodos(updatedTodos);
    localStorage.setItem("todos", JSON.stringify(updatedTodos));
    setNewTodo("");
  };

  const handleCompleteTodo = (id: number) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id
        ? { ...todo, completed: true, completedDate: new Date().toISOString() }
        : todo
    );
    setTodos(updatedTodos);
    localStorage.setItem("todos", JSON.stringify(updatedTodos));
  };

  const groupedTodos = todos
    .filter((todo) => !todo.completed)
    .reduce((acc: { [key: string]: Todo[] }, todo) => {
      const date = new Date(todo.date).toLocaleDateString();
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
        onClick={() => router.push("/todo/completed")}
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        aria-label="Go to Completed Todos"
      >
        <FaCheckSquare size={24} /> {/* ☑︎マークに変更 */}
      </button>

      <h1 className="text-2xl font-bold mb-4 text-center">Todo 一覧</h1>

      <div className="mb-4 flex items-center">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="＋ToDoの追加"
          className="flex-1 border p-2 rounded-l-md"
        />
        <button
          onClick={handleAddTodo}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md"
        >
          追加
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedTodos).map(([date, dateTodos]) => (
          <div key={date} className="mb-4">
            <h2 className="text-lg font-semibold">{date}</h2>
            {dateTodos.map((todo) => (
              <div key={todo.id} className="flex items-center mt-2">
                <input
                  type="radio"
                  name={`todo-${date}`}
                  onChange={() => handleCompleteTodo(todo.id)}
                  className="mr-2"
                />
                <span>{todo.text}</span>
              </div>
            ))}
          </div>
        ))}
        {Object.keys(groupedTodos).length === 0 && (
          <p className="text-gray-500">未完了のTodoがありません。</p>
        )}
      </div>
    </div>
  );
}