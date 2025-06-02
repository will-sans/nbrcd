"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from "uuid";
import { FaArrowLeft, FaArrowUp, FaArrowDown } from "react-icons/fa";

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

  useEffect(() => {
    const fetchTodos = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Failed to get user:", userError?.message);
        router.push("/login");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', false)
          .order('due_date', { ascending: true, nullsFirst: false })
          .order('priority', { ascending: false })
          .order('date', { ascending: true });

        if (error) {
          throw new Error(error.message || 'タスクの取得に失敗しました');
        }

        const mappedData = data?.map((todo: SupabaseTodo) => ({
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
        console.error("Failed to fetch todos:", err);
        router.push("/login");
      }
    };

    fetchTodos();

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('No user found in Supabase Auth');
      router.push("/login");
      return;
    }

    // Get current time in JST
    const nowJST = new Date();
    // Convert to UTC for 'date' (exact timestamp)
    const dateUTC = new Date(nowJST.getTime() - 9 * 60 * 60 * 1000);
    // Set 'due_date' to start of current JST day (00:00 JST), then convert to UTC
    const dueDateJST = new Date(Date.UTC(nowJST.getUTCFullYear(), nowJST.getUTCMonth(), nowJST.getUTCDate()));
    const dueDateUTC = new Date(dueDateJST.getTime() - 9 * 60 * 60 * 1000);

    const newTodo: Todo = {
      id: uuidv4(),
      text: newTask,
      completed: false,
      date: dateUTC.toISOString(),
      dueDate: dueDateUTC.toISOString(),
      priority: 0,
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
          due_date: newTodo.dueDate,
          priority: newTodo.priority,
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('No user found in Supabase Auth');
      router.push("/login");
      return;
    }

    // Get current time in JST and convert to UTC
    const completedDateJST = new Date();
    const completedDateUTC = new Date(completedDateJST.getTime() - 9 * 60 * 60 * 1000);

    try {
      const { error } = await supabase
        .from('todos')
        .update({
          completed: true,
          completed_date: completedDateUTC.toISOString(),
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

      setTimeout(() => {
        setTodos(todos.filter((todo) => todo.id !== id));
        setDeletedTodos((prev) => prev.filter((todoId) => todoId !== id));
      }, 300);
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handlePriorityChange = async (id: string, direction: 'up' | 'down') => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('No user found in Supabase Auth');
      router.push("/login");
      return;
    }

    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const newPriority = direction === 'up' ? todo.priority + 1 : Math.max(0, todo.priority - 1);

    try {
      const { error } = await supabase
        .from('todos')
        .update({
          priority: newPriority,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message || '優先度の更新に失敗しました');
      }

      setTodos(todos.map(t => t.id === id ? { ...t, priority: newPriority } : t));
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
      const date = new Date(todo.dueDate);
      date.setHours(date.getHours() + 9);
      const formattedDate = date.toISOString().split('T')[0];
      setDueDate(formattedDate);
    } else {
      const todayJST = new Date();
      setDueDate(todayJST.toISOString().split('T')[0]);
    }
  };

  const saveDueDate = async () => {
    if (selectedTodoId === null) return;

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn('No user found in Supabase Auth');
      router.push("/login");
      return;
    }

    const dueDateJST = new Date(dueDate);
    dueDateJST.setHours(dueDateJST.getHours() - 9);

    try {
      const { error } = await supabase
        .from('todos')
        .update({
          due_date: dueDateJST.toISOString(),
        })
        .eq('id', selectedTodoId)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message || '期限の保存に失敗しました');
      }

      const updatedTodos = todos.map((todo) =>
        todo.id === selectedTodoId ? { ...todo, dueDate: dueDateJST.toISOString() } : todo
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
    dateObj.setHours(dateObj.getHours() + 9);
    const dateKey = dateObj.toLocaleDateString("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(todo);
    return acc;
  }, {});

  const sortedGroupedTodos = Object.keys(groupedTodos)
    .sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      dateA.setHours(dateA.getHours() - 9);
      dateB.setHours(dateB.getHours() - 9);
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
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="ホームに戻る"
        >
          <FaArrowLeft size={24} />
        </button>

        <h1 className="text-2xl font-bold">タスクリスト</h1>

        <div className="flex space-x-2">
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
                        {todo.text}{" "}
                        {todo.dueDate && (
                          <span className="text-xs text-gray-500">
                            (期限: {(() => {
                              const date = new Date(todo.dueDate);
                              date.setHours(date.getHours() + 9);
                              return date.toLocaleDateString("ja-JP");
                            })()})
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mr-2">
                      <button
                        onClick={() => handlePriorityChange(todo.id, 'up')}
                        className="text-red-500 hover:text-red-700"
                        aria-label="優先度を上げる"
                      >
                        <FaArrowUp />
                      </button>
                      {todo.priority}
                      <button
                        onClick={() => handlePriorityChange(todo.id, 'down')}
                        className="text-green-500 hover:text-green-700"
                        aria-label="優先度を下げる"
                      >
                        <FaArrowDown />
                      </button>
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
