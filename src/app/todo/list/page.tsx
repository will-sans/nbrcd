"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaBars } from "react-icons/fa";

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
  const [selectedTodos, setSelectedTodos] = useState<number[]>([]);

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    setTodos(storedTodos.filter((todo: Todo) => !todo.completed));
  }, []);

  const handleToggle = (id: number) => {
    const updatedTodos = todos.map((todo) =>
      todo.id === id
        ? { ...todo, completed: true, completedDate: new Date().toISOString() }
        : todo
    );
    const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const newAllTodos = allTodos.map((todo: Todo) =>
      todo.id === id
        ? { ...todo, completed: true, completedDate: new Date().toISOString() }
        : todo
    );
    localStorage.setItem("todos", JSON.stringify(newAllTodos));
    setTodos(updatedTodos.filter((todo) => !todo.completed));
  };

  const handleSelectTodo = (id: number) => {
    setSelectedTodos((prev) =>
      prev.includes(id) ? prev.filter((todoId) => todoId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    const updatedTodos = todos.filter((todo) => !selectedTodos.includes(todo.id));
    const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const newAllTodos = allTodos.filter((todo: Todo) => !selectedTodos.includes(todo.id));
    localStorage.setItem("todos", JSON.stringify(newAllTodos));
    setTodos(updatedTodos);
    setSelectedTodos([]);
  };

  const handleDeleteAll = () => {
    const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const newAllTodos = allTodos.filter((todo: Todo) => todo.completed);
    localStorage.setItem("todos", JSON.stringify(newAllTodos));
    setTodos([]);
    setSelectedTodos([]);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/settings")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="Go to Settings"
        >
          <FaBars size={24} />
        </button>

        <h1 className="text-2xl font-bold">ToDoリスト</h1>

        <button
          onClick={() => router.push("/todo/completed")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="Go to Completed Todos"
        >
          完了済み
        </button>
      </div>

      {todos.length > 0 && (
        <div className="mb-4 flex space-x-2">
          <button
            onClick={handleDeleteSelected}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            disabled={selectedTodos.length === 0}
          >
            選択したToDoを削除
          </button>
          <button
            onClick={handleDeleteAll}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            すべて削除
          </button>
        </div>
      )}

      {todos.length > 0 ? (
        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center justify-between p-2 border rounded bg-gray-100"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTodos.includes(todo.id)}
                  onChange={() => handleSelectTodo(todo.id)}
                  className="mr-2"
                />
                <span>{todo.text}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {new Date(todo.date).toLocaleString()}
                </span>
                <button
                  onClick={() => handleToggle(todo.id)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  完了
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center">ToDoがありません。新しいアクションを追加してください。</p>
      )}
    </div>
  );
}