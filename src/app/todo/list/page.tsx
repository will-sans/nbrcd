"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaTrophy } from "react-icons/fa";
import { createClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from "uuid";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  dueDate?: string;
  completedDate?: string;
}

// Interface for the raw data structure from Supabase (snake_case)
interface SupabaseTodo {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  due_date?: string;
  completed_date?: string;
  user_id: string;
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
  const supabase = createClient();

  useEffect(() => {
    const fetchTodos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', false)
          .order('due_date', { ascending: true, nullsFirst: false }) // Sort by due_date first (nulls at the end)
          .order('date', { ascending: true }); // Then by date

        if (error) {
          throw new Error(error.message || 'タスクの取得に失敗しました');
        }

        // Map Supabase data (snake_case) to Todo interface (camelCase)
        const mappedData = data?.map((todo: SupabaseTodo) => ({
          id: todo.id,
          text: todo.text,
          completed: todo.completed,
          date: todo.date,
          dueDate: todo.due_date,
          completedDate: todo.completed_date,
        })) || [];

        setTodos(mappedData);
      } catch (err) {
        console.error("Failed to fetch todos:", err);
      }
    };

    fetchTodos();
  }, [router, supabase]);

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

  const savePoints = async (action: string, points: number) => {
    const allowedActions = ["login", "action_select", "task_complete"];
    if (!allowedActions.includes(action)) {
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user found in Supabase Auth');
      return;
    }

    try {
      const { error } = await supabase
        .from('point_logs')
        .insert({
          user_id: user.id,
          action,
          points,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        throw new Error(error.message || 'ポイントの保存に失敗しました');
      }
    } catch (err) {
      console.error("Failed to save points:", err);
    }
  };

  const handleAddTask = async () => {
    if (newTask.trim() === "") return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user found in Supabase Auth');
      return;
    }

    const newTodo: Todo = {
      id: uuidv4(),
      text: newTask,
      completed: false,
      date: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('todos')
        .insert({
          id: newTodo.id,
          user_id: user.id,
          text: newTodo.text,
          completed: newTodo.completed,
          date: newTodo.date,
        });

      if (error) {
        throw new Error(error.message || 'タスクの追加に失敗しました');
      }

      setTodos([...todos, newTodo]);
      setNewTask("");
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  const handleToggle = async (id: string) => {
    setCompletedTodos((prev) => [...prev, id]);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user found in Supabase Auth');
      return;
    }

    try {
      const { error } = await supabase
        .from('todos')
        .update({
          completed: true,
          completed_date: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message || 'タスクの更新に失敗しました');
      }

      setTimeout(() => {
        setTodos(todos.filter((todo) => todo.id !== id));
        setCompletedTodos((prev) => prev.filter((todoId) => todoId !== id));
      }, 300);

      await savePoints("task_complete", 10);
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletedTodos((prev) => [...prev, id]);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user found in Supabase Auth');
      return;
    }

    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message || 'タスクの削除に失敗しました');
      }

      setTimeout(() => {
        setTodos(todos.filter((todo) => todo.id !== id));
        setDeletedTodos((prev) => prev.filter((todoId) => todoId !== id));
      }, 300);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
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
    if (todo?.dueDate) {
      // Convert ISO 8601 date (e.g., "2025-05-14T00:00:00.000Z") to YYYY-MM-DD format
      const date = new Date(todo.dueDate);
      const formattedDate = date.toISOString().split('T')[0]; // Extracts "2025-05-14"
      setDueDate(formattedDate);
    } else {
      setDueDate("");
    }
  };

  const saveDueDate = async () => {
    if (selectedTodoId === null) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user found in Supabase Auth');
      return;
    }

    try {
      const { error } = await supabase
        .from('todos')
        .update({
          due_date: dueDate,
        })
        .eq('id', selectedTodoId)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message || '期限の保存に失敗しました');
      }

      const updatedTodos = todos.map((todo) =>
        todo.id === selectedTodoId ? { ...todo, dueDate: dueDate } : todo
      );
      setTodos(updatedTodos);
      setSelectedTodoId(null);
      setDueDate("");
    } catch (err) {
      console.error("Failed to save due date:", err);
    }
  };

  // Group todos by dueDate (if set) or date, and sort them properly
  const groupedTodos = todos.reduce((acc: { [key: string]: Todo[] }, todo) => {
    const dateKey = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString() : new Date(todo.date).toLocaleDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(todo);
    return acc;
  }, {});

  // Sort todos within each group by dueDate (if set) or date
  const sortedGroupedTodos = Object.keys(groupedTodos)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    .reduce((acc: { [key: string]: Todo[] }, dateKey) => {
      acc[dateKey] = groupedTodos[dateKey].sort((a, b) => {
        // If both have dueDate, sort by dueDate
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        // If only one has dueDate, the one with dueDate comes first
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        // If neither has dueDate, sort by date
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
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
        <input
          id="new-task"
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
          placeholder="タスクの追加..."
          className="w-full p-2 border rounded bg-gray-100 text-center"
        />
      </div>

      {Object.keys(sortedGroupedTodos).length > 0 ? (
        Object.keys(sortedGroupedTodos).map((date) => (
          <div key={date}>
            <h2 className="text-lg font-semibold mb-2">{date}</h2>
            <ul className="space-y-2">
              {sortedGroupedTodos[date].map((todo) => (
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