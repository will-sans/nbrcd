"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { FaArrowLeft } from "react-icons/fa";

export default function DiaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: "",
    task_content: "",
    goal: "",
    time_allocation: "",
    issues: "",
    solutions: "",
    next_steps: "",
    learnings: "",
    kpi: "",
    emotion: "",
    todo_id: "",
  });

  useEffect(() => {
    const todoId = searchParams?.get("todo_id") || "";
    const taskContent = searchParams?.get("task_content") || "";
    const completedDate = searchParams?.get("completed_date") || "";
    const workLogId = searchParams?.get("id") || null;

    const initializeForm = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("User not authenticated:", userError?.message);
        router.push("/login");
        return;
      }

      if (workLogId) {
        setIsEditing(true);
        setLogId(workLogId);
        const { data, error } = await supabase
          .from("work_logs")
          .select("*")
          .eq("id", workLogId)
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching work log:", error.message, error.details);
          setErrorMessage("日報の取得に失敗しました");
          return;
        }

        if (data) {
          setFormData({
            date: new Date(data.date).toISOString().split("T")[0],
            task_content: data.task_content || "",
            goal: data.goal || "",
            time_allocation: data.time_allocation || "",
            issues: data.issues || "",
            solutions: data.solutions || "",
            next_steps: data.next_steps || "",
            learnings: data.learnings || "",
            kpi: data.kpi || "",
            emotion: data.emotion || "",
            todo_id: data.todo_id || "",
          });
        }
      } else {
        let timeAllocation = "";
        if (todoId) {
          const { data: existingLog, error: logError } = await supabase
            .from("work_logs")
            .select("id")
            .eq("todo_id", todoId)
            .eq("user_id", user.id)
            .limit(1);

          if (logError && logError.code !== "PGRST116") {
            console.error("Error checking existing log:", logError.message, logError.details);
            setErrorMessage("既存の日報確認に失敗しました");
            return;
          }

          if (existingLog && existingLog.length > 0) {
            alert("このタスクの日報はすでに登録されています");
            router.push("/todo/completed");
            return;
          }

          const { data: sessions, error: sessionError } = await supabase
            .from("time_sessions")
            .select("start_time, end_time")
            .eq("todo_id", todoId)
            .eq("user_id", user.id)
            .order("start_time", { ascending: false })
            .limit(1);

          if (sessionError && sessionError.code !== "PGRST116") {
            console.error("Error fetching time session:", sessionError.message, sessionError.details);
            setErrorMessage("時間データの取得に失敗しました");
            return;
          }

          if (sessions && sessions.length > 0 && sessions[0].start_time && sessions[0].end_time) {
            timeAllocation = `${new Date(sessions[0].start_time).toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Tokyo",
            })}–${new Date(sessions[0].end_time).toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Tokyo",
            })}`;
          }
        }

        let date = "";
        if (completedDate) {
          try {
            date = new Date(completedDate).toISOString().split("T")[0];
          } catch {
            console.warn("Invalid completed_date:", completedDate);
          }
        }

        setFormData((prev) => ({
          ...prev,
          todo_id: todoId,
          task_content: taskContent,
          date: date || new Date().toISOString().split("T")[0],
          time_allocation: timeAllocation,
        }));
      }
    };

    initializeForm();
  }, [searchParams, supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User not authenticated:", userError?.message);
      setErrorMessage("認証エラー：ログインしてください");
      setIsSubmitting(false);
      router.push("/login");
      return;
    }

    try {
      if (isEditing && logId) {
        const { error } = await supabase
          .from("work_logs")
          .update({
            date: formData.date,
            task_content: formData.task_content,
            goal: formData.goal,
            time_allocation: formData.time_allocation,
            issues: formData.issues,
            solutions: formData.solutions,
            next_steps: formData.next_steps,
            learnings: formData.learnings,
            kpi: formData.kpi,
            emotion: formData.emotion,
            todo_id: formData.todo_id || null,
          })
          .eq("id", logId)
          .eq("user_id", user.id);

        if (error) {
          throw new Error(error.message || "日報の更新に失敗しました");
        }
      } else {
        const { error } = await supabase.from("work_logs").insert({
          date: formData.date,
          task_content: formData.task_content,
          goal: formData.goal,
          time_allocation: formData.time_allocation,
          issues: formData.issues,
          solutions: formData.solutions,
          next_steps: formData.next_steps,
          learnings: formData.learnings,
          kpi: formData.kpi,
          emotion: formData.emotion,
          user_id: user.id,
          todo_id: formData.todo_id || null,
        });

        if (error) {
          throw new Error(error.message || "日報の保存に失敗しました");
        }
      }

      router.push("/diary/list");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "日報の処理に失敗しました";
      console.error("Failed to process log:", err);
      setErrorMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!logId || !isEditing) return;
    if (!confirm("この日報を削除しますか？")) return;

    setIsDeleting(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User not authenticated:", userError?.message);
      setErrorMessage("認証エラー：ログインしてください");
      setIsDeleting(false);
      router.push("/login");
      return;
    }

    try {
      const { error } = await supabase
        .from("work_logs")
        .delete()
        .eq("id", logId)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(error.message || "日報の削除に失敗しました");
      }

      router.push("/diary/list");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "日報の削除に失敗しました";
      console.error("Failed to delete log:", err);
      setErrorMessage(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen dark:bg-gray-900 dark:text-gray-100 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/diary/list")}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="日誌一覧に戻る"
        >
          <FaArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold dark:text-gray-100">
          {isEditing ? "作業日誌編集" : "作業日誌入力"}
        </h1>
        <div className="w-12" />
      </div>
      {errorMessage && (
        <div className="text-red-500 mb-4 text-sm dark:text-red-400">{errorMessage}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium dark:text-gray-300">日付</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium dark:text-gray-300">作業内容</label>
          <textarea
            name="task_content"
            value={formData.task_content}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            rows={4}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium dark:text-gray-300">目標</label>
          <textarea
            name="goal"
            value={formData.goal}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium dark:text-gray-300">時間配分</label>
          <input
            type="text"
            name="time_allocation"
            value={formData.time_allocation}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            placeholder="例: 13:30–14:35"
          />
        </div>
        <div>
          <label className="block text-sm font-medium dark:text-gray-300">課題</label>
          <textarea
            name="issues"
            value={formData.issues}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium dark:text-gray-300">解決策</label>
          <textarea
            name="solutions"
            value={formData.solutions}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium dark:text-gray-300">次のステップ</label>
          <textarea
            name="next_steps"
            value={formData.next_steps}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium dark:text-gray-300">学び</label>
          <textarea
            name="learnings"
            value={formData.learnings}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium dark:text-gray-300">KPI/進捗指標</label>
          <input
            type="text"
            name="kpi"
            value={formData.kpi}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
            placeholder="例: 移行完了率: 50%"
          />
        </div>
        <div>
          <label className="block text-sm font-medium dark:text-gray-300">感情/体調</label>
          <select
            name="emotion"
            value={formData.emotion}
            onChange={handleChange}
            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
          >
            <option value="">選択してください</option>
            <option value="集中できた">集中できた</option>
            <option value="疲れ気味">疲れ気味</option>
            <option value="ストレス">ストレス</option>
            <option value="順調">順調</option>
          </select>
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={isSubmitting || isDeleting}
            className={`bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm flex-1 ${
              isSubmitting || isDeleting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? "処理中..." : isEditing ? "更新" : "保存"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
              className={`bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-sm flex-1 ${
                isDeleting || isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isDeleting ? "削除中..." : "削除"}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push("/diary/list")}
            disabled={isSubmitting || isDeleting}
            className={`bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-sm flex-1 ${
              isSubmitting || isDeleting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}