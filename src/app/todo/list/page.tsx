"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { FaArrowLeft, FaArrowUp, FaArrowDown } from "react-icons/fa";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { ja } from "date-fns/locale";
import { useTimezone } from "@/lib/timezone-context";
import { PostgrestError } from "@supabase/supabase-js";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  dueDate?: string;
  completedDate?: string;
  priority: number;
}

interface SupabaseTodo {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  due_date?: string;
  completed_date?: string;
  user_id: string;
  priority: number;
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
  const supabase = getSupabaseClient();
  const { timezone } = useTimezone();

  const fetchTodos = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError?.message);
      router.push("/login");
      return;
    }

    try {
      const { data, error }: { data: SupabaseTodo[] | null; error: PostgrestError | null } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("priority", { ascending: false })
        .order("date", { ascending: true });

      if (error) {
        throw new Error(error.message || "タスクの取得に失敗しました");
      }

      const mappedData = data?.map((todo) => ({
        id: todo.id,
        text: todo.text,
        completed: todo.completed,
        date: todo.date,
        dueDate: todo.due_date,
        completedDate: todo.completed_date,
        priority: todo.priority,
      })) || [];

      setTodos(mappedData);
    } catch (err) {
      console.error("Error:", err);
      router.push("/login");
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchTodos();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      if (event === "SIGNED_OUT" || !session) {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase, fetchTodos]);

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("No user found in Supabase Auth");
      return;
    }

    try {
      const { error } = await supabase
        .from("point_logs")
        .insert({
          user_id: user.id,
          action,
          points,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        throw new Error(error.message || "ポイントの保存に失敗しました");
      }
    } catch (err) {
      console.error("Failed to save points:", err);
    }
  };

  const handleAddTask = async () => {
    if (newTask.trim() === "") return;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("No user found in Supabase Auth");
      router.push("/login");
      return;
    }

    const nowUTC = new Date();
    const nowInTimezone = toZonedTime(nowUTC, timezone);
    const dueDateInTimezone = new Date(nowInTimezone.getFullYear(), nowInTimezone.getMonth(), nowInTimezone.getDate());
    const dueDateUTC = new Date(
      Date.UTC(
        dueDateInTimezone.getFullYear(),
        dueDateInTimezone.getMonth(),
        dueDateInTimezone.getDate()
      )
    );

    const newTodo: Todo = {
      id: uuidv4(),
      text: newTask,
      completed: false,
      date: nowUTC.toISOString(),
      dueDate: dueDateUTC.toISOString(),
      priority: 0,
    };

    try {
      const { error } = await supabase
        .from("todos")
        .insert({
          id: newTodo.id,
          user_id: user.id,
          text: newTodo.text,
          completed: newTodo.completed,
          date: newTodo.date,
          due_date: newTodo.dueDate,
          priority: newTodo.priority,
        });

      if (error) {
        throw new Error(error.message || "タスクの追加に失敗しました");
      }

      setNewTask("");
      await fetchTodos();
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  const handleToggle = async (id: string) => {
    setCompletedTodos((prev) => [...prev, id]);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("No user found in Supabase Auth");
      router.push("/login");
      return;
    }

    const completedDateUTC = new Date();

    try {
      const { error } = await supabase
        .from("todos")
        .update({
          completed: true,
          completed_date: completedDateUTC.toISOString(),
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(error.message || "タスクの更新に失敗しました");
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("No user found in Supabase Auth");
      router.push("/login");
      return;
    }

    try {
      const { error } = await supabase
        .from("todos")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(error.message || "タスクの削除に失敗しました");
      }

      setTimeout(() => {
        setTodos(todos.filter((todo) => todo.id !== id));
        setDeletedTodos((prev) => prev.filter((todoId) => todoId !== id));
      }, 300);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handlePriorityChange = async (id: string, direction: "up" | "down") => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("No user found in Supabase Auth");
      router.push("/login");
      return;
    }

    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const newPriority = direction === "up" ? todo.priority + 1 : Math.max(0, todo.priority - 1);

    try {
      const { error } = await supabase
        .from("todos")
        .update({
          priority: newPriority,
        })
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(error.message || "優先度の更新に失敗しました");
      }

      setTodos(todos.map((t) => (t.id === id ? { ...t, priority: newPriority } : t)));
    } catch (err) {
      console.error("Failed to update priority:", err);
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
      const date = toZonedTime(new Date(todo.dueDate), timezone);
      const formattedDate = formatInTimeZone(date, timezone, "yyyy-MM-dd");
      setDueDate(formattedDate);
    } else {
      const today = toZonedTime(new Date(), timezone);
      setDueDate(formatInTimeZone(today, timezone, "yyyy-MM-dd"));
    }
  };

  const saveDueDate = async () => {
    if (selectedTodoId === null) return;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("No user found in Supabase Auth");
      router.push("/login");
      return;
    }

    const dueDateInTimezone = new Date(dueDate);
    const dueDateUTC = new Date(
      Date.UTC(
        dueDateInTimezone.getFullYear(),
        dueDateInTimezone.getMonth(),
        dueDateInTimezone.getDate()
      )
    );

    try {
      const { error } = await supabase
        .from("todos")
        .update({
          due_date: dueDateUTC.toISOString(),
        })
        .eq("id", selectedTodoId)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(error.message || "期限の保存に失敗しました");
      }

      const updatedTodos = todos.map((todo) =>
        todo.id === selectedTodoId ? { ...todo, dueDate: dueDateUTC.toISOString() } : todo
      );
      setTodos(updatedTodos);
      setSelectedTodoId(null);
      setDueDate("");
    } catch (err) {
      console.error("Failed to save due date:", err);
    }
  };

  const groupedTodos = todos.reduce((acc: { [key: string]: Todo[] }, todo) => {
    const dateObj = todo.dueDate ? new Date(todo.dueDate) : new Date(todo.date);
    const zonedDate = toZonedTime(dateObj, timezone);
    const dateKey = formatInTimeZone(zonedDate, timezone, "MMMM d, yyyy (EEE)", { locale: ja });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(todo);
    return acc;
  }, {});

  const sortedGroupedTodos = Object.keys(groupedTodos)
    .sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    })
    .reduce((acc: { [key: string]: Todo[] }, dateKey) => {
      acc[dateKey] = groupedTodos[dateKey].sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      return acc;
    }, {});

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen dark:bg-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="ホームに戻る"
        >
          <FaArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold dark:text-gray-100">タスクリスト</h1>
        <div className="w-12">
          <button
            onClick={() => router.push("/todo/completed")}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            aria-label="完了済みタスクへ移動"
          >
            ☑️
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          id="new-task"
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
          placeholder="タスクを追加..."
          className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
        />
      </div>

      {Object.keys(sortedGroupedTodos).length > 0 ? (
        Object.keys(sortedGroupedTodos).map((date) => (
          <div key={date} className="mb-4">
            <h2 className="text-base font-medium mb-2 dark:text-gray-100">{date}</h2>
            <ul className="space-y-3">
              {sortedGroupedTodos[date].map((todo) => (
                <li key={todo.id} className="relative">
                  <div
                    className="p-3 bg-gray-100 rounded-lg dark:bg-gray-800 overflow-hidden"
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
                      className="flex items-center justify-between w-full"
                      onTouchStart={(e) => handleTouchStart(todo.id, e)}
                      onTouchMove={(e) => handleTouchMove(todo.id, e)}
                      onTouchEnd={() => handleTouchEnd(todo.id)}
                    >
                      <div className="flex items-center flex-grow min-w-0">
                        <input
                          type="radio"
                          onChange={() => handleToggle(todo.id)}
                          className="mr-2 dark:accent-gray-600"
                        />
                        <span
                          onClick={() => (swipeStates[todo.id] || 0) >= -50 && openDueDateModal(todo.id)}
                          className={(swipeStates[todo.id] || 0) >= -50 ? "cursor-pointer text-sm dark:text-gray-300 truncate" : "text-sm dark:text-gray-300 truncate"}
                        >
                          {todo.text}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handlePriorityChange(todo.id, "up")}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          aria-label="優先度を上げる"
                        >
                          <FaArrowUp />
                        </button>
                        <span className="text-sm dark:text-gray-300">{todo.priority}</span>
                        <button
                          onClick={() => handlePriorityChange(todo.id, "down")}
                          className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          aria-label="優先度を下げる"
                        >
                          <FaArrowDown />
                        </button>
                      </div>
                    </div>
                    <div className="absolute right-0 h-full flex items-center">
                      <button
                        onClick={() => handleDelete(todo.id)}
                        className="bg-red-500 text-white h-full px-4 py-2 dark:bg-red-600 dark:hover:bg-red-700"
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
        <p className="text-gray-500 text-center text-sm dark:text-gray-400">タスクがありません。新しいタスクを追加してください。</p>
      )}

      {selectedTodoId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg dark:bg-gray-800">
            <h3 className="text-base font-medium mb-2 dark:text-gray-100">期限を設定</h3>
            <input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border p-2 mb-2 w-full rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setSelectedTodoId(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                aria-label="期限設定モーダルを閉じる"
              >
                キャンセル
              </button>
              <button
                onClick={saveDueDate}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg dark:bg-blue-600 dark:hover:bg-blue-700 text-sm"
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