"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  date: string;
  dueDate?: string;
  completedDate?: string;
}

export default function TodoListPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState<string>("");
  const [swipeStates, setSwipeStates] = useState<{ [key: number]: number }>({});
  const [touchStart, setTouchStart] = useState<{ [key: number]: number }>({});
  const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<string>("");
  const [completedTodos, setCompletedTodos] = useState<number[]>([]);
  const [deletedTodos, setDeletedTodos] = useState<number[]>([]); // 削除アニメーション用

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    setTodos(storedTodos.filter((todo: Todo) => !todo.completed));
  }, []);

  // todos が変更されたときに swipeStates をクリーンアップ
  useEffect(() => {
    setSwipeStates((prev) => {
      const newState = { ...prev };
      // 存在しない todo の swipeStates を削除
      Object.keys(newState).forEach((id) => {
        if (!todos.some((todo) => todo.id === Number(id))) {
          delete newState[Number(id)];
        }
      });
      return newState;
    });
  }, [todos]);

  const handleAddTask = () => {
    if (newTask.trim() === "") return;
    const newTodo: Todo = {
      id: Date.now(),
      text: newTask,
      completed: false,
      date: new Date().toISOString(),
    };
    const updatedTodos = [...todos, newTodo];
    const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    localStorage.setItem("todos", JSON.stringify([...allTodos, newTodo]));
    setTodos(updatedTodos);
    setNewTask("");
  };

  const handleToggle = (id: number) => {
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
  };

  const handleDelete = (id: number) => {
    // 削除アニメーション用にマーク
    setDeletedTodos((prev) => [...prev, id]);

    // ローカルストレージと状態を更新
    const updatedTodos = todos.filter((todo) => todo.id !== id);
    const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const newAllTodos = allTodos.filter((todo: Todo) => todo.id !== id);
    localStorage.setItem("todos", JSON.stringify(newAllTodos));

    // アニメーション後に状態をクリア
    setTimeout(() => {
      setTodos(updatedTodos);
      setDeletedTodos((prev) => prev.filter((todoId) => todoId !== id));
    }, 300); // アニメーション時間（0.3秒）と一致させる
  };

  const handleTouchStart = (id: number, e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    setTouchStart((prev) => ({ ...prev, [id]: touch.clientX }));
  };

  const handleTouchMove = (id: number, e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const startX = touchStart[id] || 0;
    const offset = touch.clientX - startX;
    if (offset >= -80 && offset <= 0) {
      setSwipeStates((prev) => ({ ...prev, [id]: offset }));
    }
  };

  const handleTouchEnd = (id: number) => {
    const offset = swipeStates[id] || 0;
    if (offset < -50) {
      setSwipeStates((prev) => ({ ...prev, [id]: -80 }));
    } else if (offset > -30) {
      setSwipeStates((prev) => ({ ...prev, [id]: 0 }));
    } else {
      setSwipeStates((prev) => ({ ...prev, [id]: 0 }));
    }
  };

  const openDueDateModal = (id: number) => {
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

        <button
          onClick={() => router.push("/todo/completed")}
          className="text-gray-600 hover:text-gray-800 text-2xl"
          aria-label="完了済みタスクへ移動"
        >
          ☑️
        </button>
      </div>

      <div className="mb-4 flex items-center justify-center">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
          placeholder="タスクの追加..."
          className="w-full p-2 border rounded bg-gray-100 text-center"
        />
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
                          ? "translateX(-100%)" // 削除時に左にスライド
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
                          type="radio"
                          onChange={() => handleToggle(todo.id)}
                          className="mr-2"
                        />
                        <span
                          onClick={() => (swipeStates[todo.id] || 0) >= -50 && openDueDateModal(todo.id)}
                          className={(swipeStates[todo.id] || 0) >= -50 ? "cursor-pointer" : ""}
                        >
                          {todo.text}
                        </span>
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
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border p-2 mb-2 w-full"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setSelectedTodoId(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                キャンセル
              </button>
              <button
                onClick={saveDueDate}
                className="bg-blue-500 text-white px-4 py-2 rounded"
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