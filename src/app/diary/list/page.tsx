"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { FaArrowLeft } from "react-icons/fa";

interface WorkLog {
  id: number;
  date: string;
  task_content: string;
  issues: string | null;
  learnings: string | null;
  emotion: string | null;
  todo_id: string | null;
}

export default function DiaryListPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [emotionFilter, setEmotionFilter] = useState("");
  const [keyword, setKeyword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchWorkLogs = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("User not authenticated:", userError?.message);
        router.push("/login");
        return;
      }

      try {
        let query = supabase
          .from("work_logs")
          .select("id, date, task_content, issues, learnings, emotion, todo_id")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .order("time_allocation", { ascending: false });

        // Apply filters
        if (startDate) {
          query = query.gte("date", startDate);
        }
        if (endDate) {
          query = query.lte("date", endDate);
        }
        if (emotionFilter) {
          query = query.eq("emotion", emotionFilter);
        }
        if (keyword) {
          query = query.or(`task_content.ilike.%${keyword}%,issues.ilike.%${keyword}%`);
        }

        const { data, error } = await query;

        if (error) {
          throw new Error(error.message || "作業日誌の取得に失敗しました");
        }

        setWorkLogs(data || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "作業日誌の取得に失敗しました";
        console.error("Failed to fetch work logs:", err);
        setErrorMessage(errorMessage);
      }
    };

    fetchWorkLogs();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase, startDate, endDate, emotionFilter, keyword]);

  const handleRowClick = (logId: number) => {
    router.push(`/diary?page=edit&id=${logId}`);
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
        <h1 className="text-2xl font-bold">日誌一覧</h1>
        <div className="w-6" />
        <button
          onClick={() => router.push("/todo/completed")}
          className="text-gray-600 hover:text-gray-800 text-2xl"
          aria-label="完了済みタスクへ移動"
        >
          ☑️
        </button>
      </div>

      {errorMessage && (
        <div className="text-red-500 mb-4">{errorMessage}</div>
      )}

      {/* Filters */}
      <div className="mb-4 space-y-2">
        <div>
          <label className="block text-sm font-medium">開始日</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">終了日</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">感情/体調</label>
          <select
            value={emotionFilter}
            onChange={(e) => setEmotionFilter(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">すべて</option>
            <option value="集中できた">集中できた</option>
            <option value="疲れ気味">疲れ気味</option>
            <option value="ストレス">ストレス</option>
            <option value="順調">順調</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">キーワード検索</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="作業内容または課題で検索"
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 text-sm font-medium">日付</th>
              <th className="p-2 text-sm font-medium">作業内容</th>
              <th className="p-2 text-sm font-medium">課題</th>
              <th className="p-2 text-sm font-medium">学び</th>
              <th className="p-2 text-sm font-medium">感情</th>
            </tr>
          </thead>
          <tbody>
            {workLogs.length > 0 ? (
              workLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleRowClick(log.id)}
                >
                  <td className="p-2 text-sm">
                    {new Date(log.date).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="p-2 text-sm">{log.task_content}</td>
                  <td className="p-2 text-sm">{log.issues || "-"}</td>
                  <td className="p-2 text-sm">{log.learnings || "-"}</td>
                  <td className="p-2 text-sm">{log.emotion || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-2 text-center text-gray-500">
                  作業日誌がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}