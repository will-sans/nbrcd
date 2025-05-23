"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";

export default function DiaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
    const todoId = searchParams ? searchParams.get("todo_id") || "" : "";
    const taskContent = searchParams ? searchParams.get("task_content") || "" : "";
    const completedDate = searchParams ? searchParams.get("completed_date") || "" : "";

    const checkExistingLog = async () => {
      if (!todoId) {
        setFormData((prev) => ({
          ...prev,
          todo_id: todoId,
          task_content: taskContent,
          date: completedDate
            ? new Date(completedDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
        }));
        return;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("User not authenticated:", userError?.message);
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("work_logs")
        .select("id")
        .eq("todo_id", todoId)
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking existing log:", error);
        setErrorMessage("既存の日報確認に失敗しました");
        return;
      }

      if (data) {
        alert("このタスクの日報はすでに登録されています");
        router.push("/todo/completed");
        return;
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
      }));
    };

    checkExistingLog();
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

      router.push("/todo/completed");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "日報の保存に失敗しました";
      console.error("Failed to save log:", err);
      setErrorMessage(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">作業日誌入力</h1>
      {errorMessage && (
        <div className="text-red-500 mb-4">{errorMessage}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">日付</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">作業内容</label>
          <textarea
            name="task_content"
            value={formData.task_content}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows={4}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">目標</label>
          <textarea
            name="goal"
            value={formData.goal}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">時間配分</label>
          <input
            type="text"
            name="time_allocation"
            value={formData.time_allocation}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="例: 13:30–14:35"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">課題</label>
          <textarea
            name="issues"
            value={formData.issues}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">解決策</label>
          <textarea
            name="solutions"
            value={formData.solutions}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">次のステップ</label>
          <textarea
            name="next_steps"
            value={formData.next_steps}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">学び</label>
          <textarea
            name="learnings"
            value={formData.learnings}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows={2}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">KPI/進捗指標</label>
          <input
            type="text"
            name="kpi"
            value={formData.kpi}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            placeholder="例: 移行完了率: 50%"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">感情/体調</label>
          <select
            name="emotion"
            value={formData.emotion}
            onChange={handleChange}
            className="w-full p-2 border rounded"
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
            disabled={isSubmitting}
            className={`bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/todo/completed")}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}