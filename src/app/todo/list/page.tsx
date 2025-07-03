"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { FaArrowLeft } from "react-icons/fa";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { ja } from "date-fns/locale";
import { useTimezone } from "@/lib/timezone-context";
import { PostgrestError, User, AuthError } from "@supabase/supabase-js";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  dueDate?: string;
  completedDate?: string;
  priority: number;
  goal_id?: string;
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
  goal_id?: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  metric: { target?: number; unit?: string; current?: number } | null;
  start_date: string;
  end_date: string;
  smart: { specific: string; measurable: string; achievable: string; relevant: string; time_bound: string };
  fast: { frequently_discussed: string; ambitious: string; specific: string; transparent: string };
  status: "active" | "completed" | "archived";
  parent_goal_id?: string;
  sub_goals?: Goal[];
  created_at: string;
}

export default function TodoListPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [modalTaskText, setModalTaskText] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [modalPriority, setModalPriority] = useState<number>(1);
  const [completedTodos, setCompletedTodos] = useState<string[]>([]);
  const [deletedTodos, setDeletedTodos] = useState<string[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const supabase = getSupabaseClient();
  const { timezone } = useTimezone();

  const resetViewportZoom = () => {
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta) {
      const originalContent = viewportMeta.getAttribute("content");
      viewportMeta.setAttribute(
        "content",
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
      );
      setTimeout(() => {
        if (viewportMeta && originalContent) {
          viewportMeta.setAttribute("content", originalContent);
        }
      }, 100);
    }
  };

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
        goal_id: todo.goal_id,
      })) || [];

      setTodos(mappedData);
    } catch (err) {
      console.error("Error:", err);
      router.push("/login");
    }
  }, [supabase, router]);

  const fetchGoals = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!error) {
        const goalMap = new Map<string, Goal>();
        const topLevelGoals: Goal[] = [];

        (data || []).forEach((goal) => {
          goalMap.set(goal.id, { ...goal, sub_goals: [] });
        });

        goalMap.forEach((goal) => {
          if (goal.parent_goal_id) {
            const parent = goalMap.get(goal.parent_goal_id);
            if (parent) {
              parent.sub_goals = parent.sub_goals || [];
              parent.sub_goals.push(goal);
            }
          } else {
            topLevelGoals.push(goal);
          }
        });

        setGoals(topLevelGoals);
      }
    }
  }, [supabase]);

  useEffect(() => {
    fetchTodos();
    fetchGoals();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      if (event === "SIGNED_OUT" || !session) {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase, fetchTodos, fetchGoals]);

  const savePoints = async (action: string, points: number) => {
    const allowedActions = ["login", "action_select", "task_complete"];
    if (!allowedActions.includes(action)) {
      return;
    }

    const { data: { user }, error: userError }: { data: { user: User | null }, error: AuthError | null } = await supabase.auth.getUser();
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
      priority: 1,
      goal_id: undefined,
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
          goal_id: newTodo.goal_id,
        });

      if (error) {
        throw new Error(error.message || "タスクの追加に失敗しました");
      }

      setNewTask("");
      if (inputRef.current) {
        inputRef.current.readOnly = true;
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.blur();
            inputRef.current.readOnly = false;
            resetViewportZoom();
            inputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 0);
      }
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
    const todo = todos.find((t) => t.id === id);

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

      if (todo?.goal_id) {
        const updateGoalProgress = async (goalId: string) => {
          const { data: goal } = await supabase
            .from("goals")
            .select("*")
            .eq("id", goalId)
            .eq("user_id", user.id)
            .single();

          if (goal?.metric) {
            await supabase
              .from("goals")
              .update({
                metric: {
                  ...goal.metric,
                  current: (goal.metric.current || 0) + 1,
                },
              })
              .eq("id", goal.id)
              .eq("user_id", user.id);
          } else {
            // Mark the goal as completed if it's a milestone
            await supabase
              .from("goals")
              .update({ status: "completed" })
              .eq("id", goal.id)
              .eq("user_id", user.id);
          }

          if (goal?.parent_goal_id) {
            await updateGoalProgress(goal.parent_goal_id);
          }
        };

        await updateGoalProgress(todo.goal_id);
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

  const startTimeTracking = async (taskId: string) => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("No user found in Supabase Auth");
      router.push("/login");
      return;
    }

    const todo = todos.find((t) => t.id === taskId);
    if (!todo) {
      console.error("Todo not found for taskId:", taskId);
      return;
    }

    const session = {
      id: uuidv4(),
      user_id: user.id,
      task: todo.text,
      category: "タスク",
      start_time: new Date().toISOString(),
      todo_id: taskId,
    };

    try {
      const { error } = await supabase
        .from("time_sessions")
        .insert(session);

      if (error) {
        throw new Error(error.message || "時間計測の開始に失敗しました");
      }

      console.log(`Time tracking started for task ${taskId}`);
      router.push("/time-tracker");
    } catch (err) {
      console.error("Failed to start time tracking:", err);
    }
  };

  const openDueDateModal = (id: string) => {
    setSelectedTodoId(id);
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      setModalTaskText(todo.text);
      setModalPriority(Math.min(5, Math.max(1, todo.priority)));
      if (todo.dueDate) {
        const date = toZonedTime(new Date(todo.dueDate), timezone);
        const formattedDate = formatInTimeZone(date, timezone, "yyyy-MM-dd");
        setDueDate(formattedDate);
      } else {
        const today = toZonedTime(new Date(), timezone);
        setDueDate(formatInTimeZone(today, timezone, "yyyy-MM-dd"));
      }
    }
  };

  const saveTaskDetails = async () => {
    if (selectedTodoId === null || modalTaskText.trim() === "") return;

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

    const todo = todos.find((t) => t.id === selectedTodoId);

    try {
      const { error } = await supabase
        .from("todos")
        .update({
          text: modalTaskText,
          due_date: dueDateUTC.toISOString(),
          priority: Math.min(5, Math.max(1, modalPriority)),
          goal_id: todo?.goal_id || null,
        })
        .eq("id", selectedTodoId)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(error.message || "タスクの保存に失敗しました");
      }

      await fetchTodos();
      setSelectedTodoId(null);
      setModalTaskText("");
      setDueDate("");
      setModalPriority(1);
    } catch (err) {
      console.error("Failed to save task details:", err);
    }
  };

  const groupedTodos = todos.reduce((acc: { [key: string]: Todo[] }, todo: Todo) => {
    const dateObj = todo.dueDate ? new Date(todo.dueDate) : new Date(todo.date);
    const zonedDate = toZonedTime(dateObj, timezone);
    const dateKey = formatInTimeZone(zonedDate, timezone, "yyyy年M月d日 (EEE)", { locale: ja });
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
      acc[dateKey] = groupedTodos[dateKey].sort((a: Todo, b: Todo) => {
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

  const flattenGoals = (goals: Goal[], depth: number = 0, parentTitles: string[] = []): { id: string; title: string }[] => {
    let result: { id: string; title: string }[] = [];
    goals.forEach((goal) => {
      const title = [...parentTitles, goal.title].join(" > ");
      result.push({ id: goal.id, title });
      if (goal.sub_goals?.length) {
        result = result.concat(flattenGoals(goal.sub_goals, depth + 1, [...parentTitles, goal.title]));
      }
    });
    return result;
  };

  const getGoalHierarchyTitle = (goalId: string): string => {
    const findGoal = (goals: Goal[], id: string): Goal | undefined => {
      for (const goal of goals) {
        if (goal.id === id) return goal;
        if (goal.sub_goals) {
          const found = findGoal(goal.sub_goals, id);
          if (found) return found;
        }
      }
      return undefined;
    };

    const goal = findGoal(goals, goalId);
    if (!goal) return "不明";

    const titles: string[] = [goal.title];
    let current = goal;
    while (current.parent_goal_id) {
      const parent = findGoal(goals, current.parent_goal_id);
      if (!parent) break;
      titles.unshift(parent.title);
      current = parent;
    }
    return titles.join(" > ");
  };

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
          ref={inputRef}
          onBlur={() => console.log("Input blurred")}
          className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
        />
      </div>

      {Object.keys(sortedGroupedTodos).length > 0 ? (
        Object.keys(sortedGroupedTodos).map((date) => (
          <div key={date} className="mb-4">
            <h2 className="text-base font-medium mb-2 dark:text-gray-100">{date}</h2>
            <ul className="space-y-3">
              {sortedGroupedTodos[date].map((todo: Todo) => (
                <li key={todo.id} className="relative">
                  <div
                    className="p-3 bg-gray-100 rounded-lg dark:bg-gray-800 overflow-hidden"
                    style={{
                      transform: completedTodos.includes(todo.id)
                        ? "translateX(100%)"
                        : deletedTodos.includes(todo.id)
                        ? "translateX(-100%)"
                        : "translateX(0)",
                      transition: "transform 0.3s ease",
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center flex-grow min-w-0">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => handleToggle(todo.id)}
                          className="mr-2 dark:accent-gray-600"
                        />
                        <div>
                          <span
                            onClick={() => openDueDateModal(todo.id)}
                            className="cursor-pointer text-sm dark:text-gray-300 truncate"
                          >
                            {todo.text}
                          </span>
                          {todo.goal_id && (
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              目標: {getGoalHierarchyTitle(todo.goal_id)}
                            </p>
                          )}
                        </div>
                      </div>
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
          <div className="bg-white p-4 rounded-lg dark:bg-gray-800 w-full max-w-md">
            <h3 className="text-base font-medium mb-4 dark:text-gray-100">タスク詳細</h3>
            <div className="mb-4">
              <label htmlFor="task-text" className="block text-sm dark:text-gray-300 mb-1">
                タスク名
              </label>
              <input
                id="task-text"
                type="text"
                value={modalTaskText}
                onChange={(e) => setModalTaskText(e.target.value)}
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
                placeholder="タスク名を入力..."
              />
            </div>
            <div className="mb-4">
              <label htmlFor="due-date" className="block text-sm dark:text-gray-300 mb-1">
                期限
              </label>
              <input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="priority" className="block text-sm dark:text-gray-300 mb-1">
                優先度: {modalPriority}
              </label>
              <input
                id="priority"
                type="range"
                min="1"
                max="5"
                value={modalPriority}
                onChange={(e) => setModalPriority(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="goal" className="block text-sm dark:text-gray-300 mb-1">
                関連目標
              </label>
              <select
                id="goal"
                value={todos.find((t) => t.id === selectedTodoId)?.goal_id || ""}
                onChange={(e) => {
                  const todo = todos.find((t) => t.id === selectedTodoId);
                  if (todo) {
                    setTodos(
                      todos.map((t) =>
                        t.id === selectedTodoId ? { ...t, goal_id: e.target.value || undefined } : t
                      )
                    );
                  }
                }}
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
              >
                <option value="">なし</option>
                {flattenGoals(goals).map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => startTimeTracking(selectedTodoId)}
              className="w-full p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-sm mb-4"
              aria-label="時間計測を開始"
            >
              時間計測を開始
            </button>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  if (selectedTodoId) handleDelete(selectedTodoId);
                  setSelectedTodoId(null);
                  setModalTaskText("");
                  setDueDate("");
                  setModalPriority(1);
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-lg dark:bg-red-600 dark:hover:bg-red-700 text-sm"
                aria-label="タスクを削除"
              >
                削除
              </button>
              <button
                onClick={() => {
                  setSelectedTodoId(null);
                  setModalTaskText("");
                  setDueDate("");
                  setModalPriority(1);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                aria-label="キャンセル"
              >
                キャンセル
              </button>
              <button
                onClick={saveTaskDetails}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg dark:bg-blue-600 dark:hover:bg-blue-700 text-sm"
                aria-label="保存"
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