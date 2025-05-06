"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  date: string;
  completedDate?: string;
}

interface GroupedTodos {
  [date: string]: Todo[];
}

export default function CompletedTodoPage() {
  const router = useRouter();
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);
  const [groupedTodos, setGroupedTodos] = useState<GroupedTodos>({});
  const [swipeStates, setSwipeStates] = useState<{ [key: number]: number }>({});
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [exitingTodos, setExitingTodos] = useState<Map<number, "restore" | "delete">>(new Map()); // アニメーション中のToDo IDとアクションを管理

  useEffect(() => {
    const storedTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const completed = storedTodos.filter((todo: Todo) => todo.completed);
    setCompletedTodos(completed);

    // 日付ごとにToDoをグループ化
    const grouped = completed.reduce((acc: GroupedTodos, todo: Todo) => {
      const completedDate = todo.completedDate
        ? new Date(todo.completedDate).toLocaleDateString("ja-JP", {
            month: "long",
            day: "numeric",
            weekday: "short",
          })
        : "不明な日付";
      if (!acc[completedDate]) {
        acc[completedDate] = [];
      }
      acc[completedDate].push(todo);
      return acc;
    }, {});
    setGroupedTodos(grouped);
  }, []);

  const handleRestoreTodo = (id: number) => {
    setExitingTodos((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, "restore");
      return newMap;
    });
  };

  const handleDeleteTodo = (id: number) => {
    setExitingTodos((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, "delete");
      return newMap;
    });
  };

  const onTransitionEnd = (id: number) => {
    const action = exitingTodos.get(id);
    if (!action) return;

    if (action === "restore") {
      const updatedCompletedTodos = completedTodos.filter((todo) => todo.id !== id);
      const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
      const newAllTodos = allTodos.map((todo: Todo) =>
        todo.id === id ? { ...todo, completed: false, completedDate: undefined } : todo
      );
      localStorage.setItem("todos", JSON.stringify(newAllTodos));
      setCompletedTodos(updatedCompletedTodos);

      // グループ化されたToDoを更新
      const updatedGrouped = { ...groupedTodos };
      for (const date in updatedGrouped) {
        updatedGrouped[date] = updatedGrouped[date].filter((todo) => todo.id !== id);
        if (updatedGrouped[date].length === 0) {
          delete updatedGrouped[date];
        }
      }
      setGroupedTodos(updatedGrouped);
    } else if (action === "delete") {
      const updatedCompletedTodos = completedTodos.filter((todo) => todo.id !== id);
      const allTodos = JSON.parse(localStorage.getItem("todos") || "[]");
      const newAllTodos = allTodos.filter((todo: Todo) => todo.id !== id);
      localStorage.setItem("todos", JSON.stringify(newAllTodos));
      setCompletedTodos(updatedCompletedTodos);

      // グループ化されたToDoを更新
      const updatedGrouped = { ...groupedTodos };
      for (const date in updatedGrouped) {
        updatedGrouped[date] = updatedGrouped[date].filter((todo) => todo.id !== id);
        if (updatedGrouped[date].length === 0) {
          delete updatedGrouped[date];
        }
      }
      setGroupedTodos(updatedGrouped);
    }
    setSwipeStates((prev) => ({ ...prev, [id]: 0 }));
    setExitingTodos((prev) => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (id: number, e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchX = e.touches[0].clientX;
    const deltaX = touchX - touchStartX;
    setSwipeStates((prev) => ({
      ...prev,
      [id]: Math.max(-80, Math.min(0, deltaX)),
    }));
  };

  const handleTouchEnd = (id: number) => {
    const offset = swipeStates[id] || 0;
    if (offset < -50) {
      // 左スワイプが十分なら削除ボタンを表示
      setSwipeStates((prev) => ({ ...prev, [id]: -80 }));
    } else if (offset > -30) {
      // 右スワイプが十分ならリセット
      setSwipeStates((prev) => ({ ...prev, [id]: 0 }));
    } else {
      // 中途半端な位置ならリセット
      setSwipeStates((prev) => ({ ...prev, [id]: 0 }));
    }
    setTouchStartX(null);
  };

  return (
    <div className="p-6 max-w-md mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/todo/list")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="ToDoリストに戻る"
        >
          <span className="text-2xl">&lt;</span>
        </button>
        <h1 className="text-2xl font-bold">完了済み</h1>
        <div className="w-6"></div> {/* 右側のスペースホルダー */}
      </div>

      <div className="mb-4">
        <p>完了: {completedTodos.length} タスク</p>
      </div>

      {Object.keys(groupedTodos).length > 0 ? (
        Object.entries(groupedTodos).map(([date, todos]) => (
          <div key={date} className="mb-4">
            <h2 className="text-lg font-semibold mb-2">{date}</h2>
            <ul className="space-y-2">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="relative transition-all duration-300 ease-in-out"
                  style={{
                    opacity: exitingTodos.has(todo.id) ? 0 : 1,
                    transform: exitingTodos.has(todo.id)
                      ? `translateX(${
                          exitingTodos.get(todo.id) === "delete" ? "-100%" : "100%"
                        })`
                      : "translateX(0)",
                  }}
                  onTransitionEnd={() => {
                    if (exitingTodos.has(todo.id)) {
                      onTransitionEnd(todo.id);
                    }
                  }}
                >
                  <div className="flex items-center bg-gray-100 p-2 rounded overflow-hidden">
                    <div
                      className="flex items-center w-full"
                      style={{
                        transform: `translateX(${swipeStates[todo.id] || 0}px)`,
                        transition: "transform 0.3s ease",
                      }}
                      onTouchStart={handleTouchStart}
                      onTouchMove={(e) => handleTouchMove(todo.id, e)}
                      onTouchEnd={() => handleTouchEnd(todo.id)}
                    >
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => handleRestoreTodo(todo.id)}
                        className="mr-2"
                      />
                      <div className="flex-1">
                        <span className="line-through">{todo.text}</span>
                        <p className="text-xs text-gray-500">
                          {todo.completedDate
                            ? new Date(todo.completedDate).toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="absolute right-0 h-full flex items-center">
                      <button
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="bg-red-500 text-white h-full px-4 py-2"
                        style={{
                          display: (swipeStates[todo.id] || 0) < -50 ? "block" : "none",
                        }}
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
        <p className="text-gray-500 text-center">完了: 0 タスク</p>
      )}
    </div>
  );
}