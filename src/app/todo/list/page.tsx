"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaTrophy } from "react-icons/fa";
import { v4 as uuidv4 } from "uuid";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  dueDate?: string;
  completedDate?: string;
}

interface PointLog {
  id: string; // idを必須に変更
  action: string;
  points: number;
  timestamp: string;
}

export default function TodoListPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState<string>("");
  const [swipeStates, setSwipeStates] = useState<{ [key: string]: number }>({});
  const [touchStart, setTouchStart] = useState<{ [key: string]: number }>({});
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string>("");
  const [completedTodos, setCompletedTodos] = useState<string[]>([]);
  const [deletedTodos, setDeletedTodos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      router.push("/login"); // 未ログイン状態でログイン画面にリダイレクト
      return;
    }

    const storedTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    setTodos(storedTodos.filter((todo: Todo) => !todo.completed));
  }, [router]);

  useEffect(() => {
    setSwipeStates((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((id) => {
        if (!todos.some((todo) => todo.id === id)) {
          delete newState[id];
        }
      });
      return newState;
    });
  }, [todos]);

  const savePoints = (action: string, points: number) => {
    const pointLog: PointLog = {
      id: uuidv4(), // UUIDを使用して一意なIDを生成
      action,
      points,
      timestamp: new Date().toISOString(),
    };
    const existingPoints = JSON.parse(localStorage.getItem("pointLogs") || "[]");
    localStorage.setItem("pointLogs", JSON.stringify([...existingPoints, pointLog]));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTask.trim() === "") return;
    const newTodo: Todo = {
      id: uuidv4(),
      text: newTask,
      completed: false,
      date: new Date().toISOString(),
    };
    const updatedTodos = [...todos, newTodo];
    const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    localStorage.setItem("todos", JSON.stringify([...allTodos, newTodo]));
    setTodos(updatedTodos);
    setNewTask("");
    setError(null);
    savePoints("task_add", 10);
  };

  const handleToggle = (id: string) => {
    setCompletedTodos((prev) => [...prev, id]);

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

    setTimeout(() => {
      setTodos(updatedTodos.filter((todo) => !todo.completed));
      setCompletedTodos((prev) => prev.filter((todoId) => todoId !== id));
    }, 300);

    savePoints("task_complete", 10);
  };

  const handleDelete = (id: string) => {
    setDeletedTodos((prev) => [...prev, id]);

    const updatedTodos = todos.filter((todo) => todo.id !== id);
    const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const newAllTodos = allTodos.filter((todo: Todo) => todo.id !== id);
    localStorage.setItem("todos", JSON.stringify(newAllTodos));

    setTimeout(() => {
      setTodos(updatedTodos);
      setDeletedTodos((prev) => prev.filter((todoId) => todoId !== id));
    }, 300);
  };

  const handleTouchStart = (id: string, e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    setTouchStart((prev) => ({ ...prev, [id]: touch.clientX }));
  };

  const handleTouchMove = (id: string, e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const startX = touchStart[id] || 0;
    const offset = touch.clientX - startX;
    if (offset >= -80 && offset <= 0) {
      setSwipeStates((prev) => ({ ...prev, [id]: offset }));
    }
  };

  const handleTouchEnd = (id: string) => {
    const offset = swipeStates[id] || 0;
    if (offset < -50) {
      setSwipeStates((prev) => ({ ...prev, [id]: -80 }));
    } else if (offset > -30) {
      setSwipeStates((prev) => ({ ...prev, [id]: 0 }));
    } else {
      setSwipeStates((prev) => ({ ...prev, [id]: 0 }));
    }
  };

  const openDueDateModal = (id: string) => {
    setSelectedTodoId(id);
    const todo = todos.find((t) => t.id === id);
    setDueDate(todo?.dueDate || "");
  };

  const saveDueDate = () => {
    if (selectedTodoId === null) return;
    const updatedTodos = todos.map((todo) =>
      todo.id === selectedTodoId ? { ...todo, dueDate: dueDate } : todo
    );
    const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const newAllTodos = allTodos.map((todo: Todo) =>
      todo.id === selectedTodoId ? { ...todo, dueDate: dueDate } : todo
    );
    localStorage.setItem("todos", JSON.stringify(newAllTodos));
    setTodos(updatedTodos);
    setSelectedTodoId(null);
    setDueDate("");
    setError(null);
  };

  const groupedTodos = todos.reduce((acc: { [key: string]: Todo[] }, todo) => {
    const date = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : new Date(todo.date).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(todo);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-800 text-2xl"
          aria-label="ホームへ移動"
        >
          ＜
        </button>

        <h1 className="text-2xl font-bold">計画</h1>

        <div className="flex space-x-2">
          <button
            onClick={() => router.push("/points")}
            className="text-gray-600 hover:text-gray-800 text-2xl"
            aria-label="ポイント履歴を見る"
          >
            <FaTrophy size={24} />
          </button>
          <button
            onClick={() => router.push("/todo/completed")}
            className="text-gray-600 hover:text-gray-800 text-2xl"
            aria-label="完了済みタスクへ移動"
          >
            ☑️
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-center">
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <form onSubmit={handleAddTask} className="w-full">
          <input
            id="new-task"
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddTask(e)}
            placeholder="タスクの追加..."
            className="w-full p-2 border rounded bg-gray-100 text-center"
          />
        </form>
      </div>

      {Object.keys(groupedTodos).length > 0 ? (
        Object.keys(groupedTodos)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
          .map((date) => (
            <div key={date}>
              <h2 className="text-lg font-semibold mb-2">{date}</h2>
              <ul className="space-y-2">
                {groupedTodos[date].map((todo) => (
                  <li key={todo.id} className="relative">
                    <div
                      className="flex items-center justify-between p-2 border rounded bg-gray-100 overflow-hidden"
                      style={{
                        transform: completedTodos.includes(todo.id)
                          ? "translateX(100%)"
                          : deletedTodos.includes(todo.id)
                          ? "translateX(-100%)"
                          : `translateX(${swipeStates[todo.id] || 0}px)`,
                        transition: "transform 0.3s ease",
                      }}
                    >
                      <div
                        className="flex items-center w-full"
                        onTouchStart={(e) => handleTouchStart(todo.id, e)}
                        onTouchMove={(e) => handleTouchMove(todo.id, e)}
                        onTouchEnd={() => handleTouchEnd(todo.id)}
                      >
                        <input
                          id={`todo-${todo.id}`}
                          type="radio"
                          onChange={() => handleToggle(todo.id)}
                          className="mr-2"
                        />
                        <label htmlFor={`todo-${todo.id}`} className="flex-1">
                          <span
                            onClick={() => (swipeStates[todo.id] || 0) >= -50 && openDueDateModal(todo.id)}
                            className={(swipeStates[todo.id] || 0) >= -50 ? "cursor-pointer" : ""}
                          >
                            {todo.text}
                          </span>
                        </label>
                      </div>
                      <div className="absolute right-0 h-full flex items-center">
                        <button
                          onClick={() => handleDelete(todo.id)}
                          className="bg-red-500 text-white h-full px-4 py-2"
                          style={{ display: (swipeStates[todo.id] || 0) < -50 ? "block" : "none" }}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
      ) : (
        <p className="text-gray-500 text-center">タスクがありません。新しいタスクを追加してください。</p>
      )}

      {selectedTodoId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded">
            <h3 className="text-lg font-semibold mb-2">期限を設定</h3>
            <input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border p-2 mb-2 w-full"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setSelectedTodoId(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
                aria-label="期限設定モーダルを閉じる"
              >
                キャンセル
              </button>
              <button
                onClick={saveDueDate}
                className="bg-blue-500 text-white px-4 py-2 rounded"
                aria-label="期限を保存する"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}