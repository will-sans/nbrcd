"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { FaArrowLeft, FaPlay, FaStop, FaChartPie, FaTrash } from "react-icons/fa";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  date: string;
  due_date?: string;
  user_id: string;
  priority: number; // Added priority field
}

interface TimeSession {
  id: string;
  user_id: string;
  task: string;
  category: string;
  start_time: string;
  end_time?: string;
  duration?: number; // in seconds
  todo_id?: string;
}

export default function TimeTrackerPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [customCategory, setCustomCategory] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentSession, setCurrentSession] = useState<TimeSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = ["仕事", "会議", "日常", "学習", "家事", "移動", "健康", "休憩"];

  const startTracking = useCallback(
    async (task: string, category: string, todo_id?: string) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push("/login");
        return;
      }

      const session: TimeSession = {
        id: crypto.randomUUID(),
        user_id: user.id,
        task,
        category,
        start_time: new Date().toISOString(),
        todo_id,
      };

      try {
        const { error } = await supabase.from("time_sessions").insert(session);
        if (error) throw error;

        setCurrentSession(session);
        setStartTime(new Date());
        setIsTracking(true);
        setCustomCategory("");
      } catch (err) {
        console.error("Failed to start tracking:", err);
        setError("時間計測の開始に失敗しました");
      }
    },
    [supabase, router]
  );

  const stopTracking = useCallback(
    async (customEndTime?: Date) => {
      if (!currentSession || !startTime) return;

      const endTime = customEndTime || new Date();
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.warn("User not authenticated during stopTracking");
          setIsTracking(false);
          setStartTime(null);
          setElapsedTime(0);
          setCurrentSession(null);
          return;
        }

        const { error: sessionError } = await supabase
          .from("time_sessions")
          .update({
            end_time: endTime.toISOString(),
            duration: duration > 0 ? duration : 0, // Prevent negative duration
          })
          .eq("id", currentSession.id)
          .eq("user_id", user.id);

        if (sessionError) throw sessionError;

        if (currentSession.todo_id) {
          const { error: todoError } = await supabase
            .from("todos")
            .update({
              completed: true,
              completed_date: endTime.toISOString(),
            })
            .eq("id", currentSession.todo_id)
            .eq("user_id", user.id);

          if (todoError) throw todoError;

          setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== currentSession.todo_id));
        }

        setIsTracking(false);
        setStartTime(null);
        setElapsedTime(0);
        setCurrentSession(null);
      } catch (err) {
        console.error("Failed to stop tracking:", err);
        setError("時間計測の終了またはタスクの完了に失敗しました");
        setIsTracking(false);
        setStartTime(null);
        setElapsedTime(0);
        setCurrentSession(null);
      }
    },
    [currentSession, startTime, supabase]
  );

  const discardSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { error } = await supabase
        .from("time_sessions")
        .delete()
        .eq("id", currentSession.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setIsTracking(false);
      setStartTime(null);
      setElapsedTime(0);
      setCurrentSession(null);
    } catch (err) {
      console.error("Failed to discard session:", err);
      setError("セッションの破棄に失敗しました");
    }
  }, [currentSession, supabase, router]);

  const fetchTodos = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      router.push("/login");
      return;
    }

    try {
      const todayJST = new Date();
      todayJST.setHours(23, 59, 59, 999);
      const endOfTodayUTC = new Date(todayJST.getTime() - 9 * 60 * 60 * 1000).toISOString();
      console.log("Fetching todos up to:", endOfTodayUTC);

      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", false)
        .or(`due_date.lte.${endOfTodayUTC},and(due_date.is.null,date.lte.${endOfTodayUTC})`)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("priority", { ascending: false }) // Added priority ordering
        .order("date", { ascending: true });

      if (error) throw error;

      console.log("Fetched todos:", data);
      setTodos(data || []);
    } catch (err) {
      console.error("Failed to fetch todos:", err);
      setError("タスクの取得に失敗しました");
    }
  }, [supabase, router]);

  const fetchActiveSession = useCallback(async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      router.push("/login");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("time_sessions")
        .select("*")
        .eq("user_id", user.id)
        .is("end_time", null)
        .order("start_time", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const session = data[0];
        setCurrentSession(session);
        setStartTime(new Date(session.start_time));
        setIsTracking(true);
        setElapsedTime(Math.floor((Date.now() - new Date(session.start_time).getTime()) / 1000));
      }
    } catch (err) {
      console.error("Failed to fetch active session:", err);
      setError("進行中のセッションの取得に失敗しました");
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchTodos();
    fetchActiveSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          router.push("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchTodos, fetchActiveSession, supabase, router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, startTime]);

  // Cleanup on component unmount (in-app navigation)
  useEffect(() => {
    return () => {
      if (isTracking && currentSession && startTime) {
        stopTracking();
      }
    };
  }, [isTracking, currentSession, startTime, stopTracking]);

  const handleCategorySelect = (category: string) => {
    if (isTracking) return;
    startTracking(category, category);
  };

  const handleTodoSelect = (todo: Todo) => {
    if (isTracking) return;
    startTracking(todo.text, "タスク", todo.id);
  };

  const handleCustomCategorySubmit = () => {
    if (isTracking || !customCategory.trim()) return;
    startTracking(customCategory, customCategory);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

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
        <h1 className="text-2xl font-bold">時間計測</h1>
        <button
          onClick={() => router.push("/schedule")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="スケジュールを見る"
        >
          <FaChartPie size={24} />
        </button>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {isTracking && currentSession && (
        <div className="mb-6 text-center">
          <p className="text-lg font-semibold">計測中: {currentSession.task}</p>
          <p className="text-2xl font-bold mt-2">{formatTime(elapsedTime)}</p>
          <div className="mt-4 flex justify-center space-x-4">
            <button
              onClick={() => stopTracking()}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center"
            >
              <FaStop className="mr-2" /> 終了
            </button>
            <button
              onClick={discardSession}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center"
            >
              <FaTrash className="mr-2" /> 破棄
            </button>
          </div>
        </div>
      )}

      {!isTracking && (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">タスクを選択</h2>
            {todos.length > 0 ? (
              <ul className="space-y-2">
                {todos.map((todo) => (
                  <li key={todo.id}>
                    <button
                      onClick={() => handleTodoSelect(todo)}
                      className="w-full text-left p-2 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      <div className="flex items-center space-x-2 mr-2">
                        {todo.text}  
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">本日までの未完了タスクがありません</p>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">カテゴリを選択</h2>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">カスタムカテゴリ</h2>
            <input
              type="text"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleCustomCategorySubmit()}
              placeholder="カテゴリを入力..."
              className="w-full p-2 border rounded bg-gray-100"
            />
            <button
              onClick={handleCustomCategorySubmit}
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              disabled={!customCategory.trim()}
            >
              <FaPlay className="inline mr-2" /> 開始
            </button>
          </div>
        </>
      )}
    </div>
  );
}