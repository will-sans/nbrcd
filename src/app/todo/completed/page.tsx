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

export default function CompletedTodoPage() {
  const router = useRouter();
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);
  const [selectedTodos, setSelectedTodos] = useState<number[]>([]);

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    setCompletedTodos(storedTodos.filter((todo: Todo) => todo.completed));
  }, []);

  const handleSelectTodo = (id: number) => {
    setSelectedTodos((prev) =>
      prev.includes(id) ? prev.filter((todoId) => todoId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    const updatedCompletedTodos = completedTodos.filter(
      (todo) => !selectedTodos.includes(todo.id)
    );
    const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const newAllTodos = allTodos.filter((todo: Todo) => !selectedTodos.includes(todo.id));
    localStorage.setItem("todos", JSON.stringify(newAllTodos));
    setCompletedTodos(updatedCompletedTodos);
    setSelectedTodos([]);
  };

  const handleDeleteAll = () => {
    const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const newAllTodos = allTodos.filter((todo: Todo) => !todo.completed);
    localStorage.setItem("todos", JSON.stringify(newAllTodos));
    setCompletedTodos([]);
    setSelectedTodos([]);
  };

  const handleRestoreSelected = () => {
    const updatedCompletedTodos = completedTodos.filter(
      (todo) => !selectedTodos.includes(todo.id)
    );
    const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const newAllTodos = allTodos.map((todo: Todo) =>
      selectedTodos.includes(todo.id)
        ? { ...todo, completed: false, completedDate: undefined }
        : todo
    );
    localStorage.setItem("todos", JSON.stringify(newAllTodos));
    setCompletedTodos(updatedCompletedTodos);
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

        <h1 className="text-2xl font-bold">完了済みToDoリスト</h1>

        <button
          onClick={() => router.push("/todo/list")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="Go to Todo List"
        >
          ToDoリスト
        </button>
      </div>

      {completedTodos.length > 0 && (
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
          <button
            onClick={handleRestoreSelected}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            disabled={selectedTodos.length === 0}
          >
            選択したToDoを戻す
          </button>
        </div>
      )}

      {completedTodos.length > 0 ? (
        <ul className="space-y-2">
          {completedTodos.map((todo) => (
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
                <span className="line-through">{todo.text}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  完了: {todo.completedDate ? new Date(todo.completedDate).toLocaleString() : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center">完了済みのToDoがありません。</p>
      )}
    </div>
  );
}