"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaCheck, FaBook } from "react-icons/fa";
import { getSupabaseClient } from '@/utils/supabase/client';


interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  completed_date?: string | null;
}

interface GroupedTodos {
  [date: string]: Todo[];
}

export default function CompletedTodoPage() {
  const router = useRouter();
  const [completedTodos, setCompletedTodos] = useState<Todo[]>([]);
  const [groupedTodos, setGroupedTodos] = useState<GroupedTodos>({});
  const [loggedTodoIds, setLoggedTodoIds] = useState<Set<string>>(new Set());
  const [swipeStates, setSwipeStates] = useState<{ [key: string]: number }>({});
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [exitingTodos, setExitingTodos] = useState<Map<string, "restore" | "delete">>(new Map());
  const supabase = getSupabaseClient();

  useEffect(() => {
    const fetchCompletedTodos = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Failed to get user:", userError?.message);
        router.push("/login");
        return;
      }

      try {
        const { data: todos, error: todosError } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', true)
          .order('completed_date', { ascending: false });

        if (todosError) {
          throw new Error(todosError.message || '完了済みタスクの取得に失敗しました');
        }

        setCompletedTodos(todos || []);

        const { data: workLogs, error: logsError } = await supabase
          .from('work_logs')
          .select('todo_id')
          .eq('user_id', user.id)
          .not('todo_id', 'is', null);

        if (logsError) {
          console.error("Failed to fetch work logs:", logsError);
        } else {
          const loggedIds = new Set(workLogs?.map(log => log.todo_id) || []);
          setLoggedTodoIds(loggedIds);
        }

        const grouped = (todos || []).reduce((acc: GroupedTodos, todo: Todo) => {
          let completedDateStr = "不明な日付";
          if (todo.completed_date) {
            try {
              const completedDate = new Date(todo.completed_date);
              if (!isNaN(completedDate.getTime())) {
                completedDateStr = completedDate.toLocaleDateString("ja-JP", {
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                });
              }
            } catch {
              console.warn(`Invalid date format for todo ${todo.id}: ${todo.completed_date}`);
            }
          }
          if (!acc[completedDateStr]) {
            acc[completedDateStr] = [];
          }
          acc[completedDateStr].push(todo);
          return acc;
        }, {});
        setGroupedTodos(grouped);
      } catch (err) {
        console.error("Failed to fetch completed todos:", err);
        router.push("/login");
      }
    };

    fetchCompletedTodos();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      if (event === 'SIGNED_OUT' || !session) {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleRestoreTodo = async (id: string) => {
    if (loggedTodoIds.has(id)) {
      alert("作業日誌が登録されているタスクは復元できません");
      return;
    }

    setExitingTodos((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, "restore");
      return newMap;
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('No user found in Supabase Auth');
      router.push("/login");
      return;
    }

    try {
      const { error } = await supabase
        .from('todos')
        .update({
          completed: false,
          completed_date: null,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message || 'タスクの復元に失敗しました');
      }
    } catch (err) {
      console.error("Failed to restore task:", err);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    if (loggedTodoIds.has(id)) {
      alert("作業日誌が登録されているタスクは削除できません");
      return;
    }

    setExitingTodos((prev) => {
      const newMap = new Map(prev);
      newMap.set(id, "delete");
      return newMap;
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('No user found in Supabase Auth');
      router.push("/login");
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
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleRowClick = (todo: Todo) => {
    router.push(`/diary?todo_id=${todo.id}&task_content=${encodeURIComponent(todo.text)}&completed_date=${encodeURIComponent(todo.completed_date || '')}`);
  };

  const onTransitionEnd = (id: string) => {
    const action = exitingTodos.get(id);
    if (!action) return;

    if (action === "restore" || action === "delete") {
      setCompletedTodos(completedTodos.filter((todo) => todo.id !== id));
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

  const handleTouchStart = (e: React.TouchEvent, todoId: string) => {
    if (loggedTodoIds.has(todoId)) return;
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (id: string, e: React.TouchEvent) => {
    if (loggedTodoIds.has(id)) return;
    if (touchStartX === null) return;
    const touchX = e.touches[0].clientX;
    const deltaX = touchX - touchStartX;
    setSwipeStates((prev) => ({
      ...prev,
      [id]: Math.max(-80, Math.min(0, deltaX)),
    }));
  };

  const handleTouchEnd = (id: string) => {
    if (loggedTodoIds.has(id)) return;
    const offset = swipeStates[id] || 0;
    if (offset < -50) {
      setSwipeStates((prev) => ({ ...prev, [id]: -80 }));
    } else {
      setSwipeStates((prev) => ({ ...prev, [id]: 0 }));
    }
    setTouchStartX(null);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/todo/list")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="ToDoリストに戻る"
        >
          <FaCheck size={24} />
        </button>
        <h1 className="text-2xl font-bold">完了済み</h1>
        <button
          onClick={() => router.push("/diary/list")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="作業日誌一覧を見る"
        >
          <FaBook size={24} />
        </button>
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
                  className={`relative transition-all duration-300 ease-in-out ${loggedTodoIds.has(todo.id) ? 'cursor-default' : 'cursor-pointer'}`}
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
                  onClick={() => !loggedTodoIds.has(todo.id) && handleRowClick(todo)}
                >
                  <div className={`flex items-center ${loggedTodoIds.has(todo.id) ? 'bg-gray-300' : 'bg-gray-100'} p-2 rounded overflow-hidden`}>
                    <div
                      className="flex items-center w-full"
                      style={{
                        transform: `translateX(${swipeStates[todo.id] || 0}px)`,
                        transition: "transform 0.3s ease",
                      }}
                      onTouchStart={(e) => handleTouchStart(e, todo.id)}
                      onTouchMove={(e) => handleTouchMove(todo.id, e)}
                      onTouchEnd={() => handleTouchEnd(todo.id)}
                    >
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => handleRestoreTodo(todo.id)}
                        className="mr-2"
                        disabled={loggedTodoIds.has(todo.id)}
                      />
                      <div className="flex-1">
                        <span className="line-through">{todo.text}</span>
                        <p className="text-xs text-gray-500">
                          {todo.completed_date
                            ? new Date(todo.completed_date).toLocaleTimeString("ja-JP", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                    </div>
                    {!loggedTodoIds.has(todo.id) && (
                      <div className="absolute right-0 h-full flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTodo(todo.id);
                          }}
                          className="bg-red-500 text-white h-full px-4 py-2"
                          style={{
                            display: (swipeStates[todo.id] || 0) < -50 ? "block" : "none",
                          }}
                        >
                          削除
                        </button>
                      </div>
                    )}
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