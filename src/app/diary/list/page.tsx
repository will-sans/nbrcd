
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { FaArrowLeft, FaCheck, FaPrint, FaCopy, FaDownload } from "react-icons/fa";
import { useTimezone } from "@/lib/timezone-context";
import { PostgrestError } from "@supabase/supabase-js";

interface WorkLog {
  id: string;
  date: string;
  task_content: string;
  issues: string | null;
  learnings: string | null;
  emotion: string | null;
  todo_id: string | null;
  time_allocation: string | null;
}

export default function DiaryListPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { timezone } = useTimezone();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const parseStartTime = (timeAllocation: string | null): number => {
    if (!timeAllocation) return Infinity;
    const match = timeAllocation.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return Infinity;
    const [, hours, minutes] = match;
    const parsedHours = parseInt(hours);
    const parsedMinutes = parseInt(minutes);
    if (parsedHours < 0 || parsedHours > 23 || parsedMinutes < 0 || parsedMinutes > 59) return Infinity;
    return parsedHours * 60 + parsedMinutes;
  };

  useEffect(() => {
    const fetchWorkLogs = async () => {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("User not authenticated:", userError?.message);
        router.push("/login");
        setIsLoading(false);
        return;
      }

      try {
        const dateFilter = selectedDate;
        console.log("Fetching work logs for date:", dateFilter);

        const { data: logs, error: logError }: { data: WorkLog[] | null; error: PostgrestError | null } = await supabase
          .from("work_logs")
          .select("id, date, task_content, issues, learnings, emotion, todo_id, time_allocation")
          .eq("user_id", user.id)
          .eq("date::date", dateFilter);

        if (logError) {
          throw new Error(logError.message || "作業日誌の取得に失敗しました");
        }

        const sortedLogs = (logs || []).sort((a, b) => {
          const timeA = parseStartTime(a.time_allocation);
          const timeB = parseStartTime(b.time_allocation);
          if (timeA !== timeB) return timeA - timeB;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        console.log("Fetched and sorted work logs:", sortedLogs);
        setWorkLogs(sortedLogs);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "作業日誌の取得に失敗しました";
        console.error("Failed to fetch work logs:", err);
        setErrorMessage(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkLogs();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase, selectedDate, timezone]);

  const handleRowClick = (logId: string) => {
    router.push(`/diary?page=edit&id=${logId}`);
  };

  const formatTimeRange = (allocation?: string | null) => {
    return allocation || "-";
  };

  const handleCopy = () => {
    const header = `日報 (${selectedDate})\n時間 | 作業内容 | 課題 | 学び | 感情\n--- | --- | --- | --- | ---\n`;
    const content = workLogs
      .map((log) => `${formatTimeRange(log.time_allocation)} | ${log.task_content} | ${log.issues || "-"} | ${log.learnings || "-"} | ${log.emotion || "-"}`)
      .join("\n");
    navigator.clipboard.writeText(header + content).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleExportCSV = () => {
    const headers = ["時間", "作業内容", "課題", "学び", "感情"];
    const rows = workLogs.map((log) => [
      formatTimeRange(log.time_allocation),
      `"${log.task_content.replace(/"/g, '""')}"`,
      `"${log.issues?.replace(/"/g, '""') || "-"}"`,
      `"${log.learnings?.replace(/"/g, '""') || "-"}"`,
      `"${log.emotion?.replace(/"/g, '""') || "-"}"`,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `diary_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen dark:bg-gray-900 dark:text-gray-100 flex flex-col">
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12pt;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
          }
          th {
            background-color: #f0f0f0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 no-print"
          aria-label="ホームに戻る"
        >
          <FaArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold dark:text-gray-100">日誌</h1>
        <button
          onClick={() => router.push("/todo/completed")}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 no-print"
          aria-label="完了済みタスクへ移動"
        >
          <FaCheck size={24} />
        </button>
      </div>

      {errorMessage && (
        <div className="text-red-500 mb-4 text-sm dark:text-red-400 no-print">{errorMessage}</div>
      )}

      <div className="mb-4 no-print">
        <label className="block text-sm font-medium mb-1 dark:text-gray-300">日付を選択</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
        />
      </div>

      <div className="flex space-x-2 mb-4 no-print">
        <button
          onClick={() => window.print()}
          className="flex items-center p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm"
        >
          <FaPrint className="mr-2" /> 印刷
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-sm"
        >
          <FaCopy className="mr-2" /> {copySuccess ? "コピーしました" : "コピー"}
        </button>
        <button
          onClick={handleExportCSV}
          className="flex items-center p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-sm"
        >
          <FaDownload className="mr-2" /> CSV
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-center text-sm dark:text-gray-500 no-print">読み込み中...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700">
                <th className="p-2 text-sm font-medium dark:text-gray-100">時間</th>
                <th className="p-2 text-sm font-medium dark:text-gray-100">作業内容</th>
                <th className="p-2 text-sm font-medium dark:text-gray-100">課題</th>
                <th className="p-2 text-sm font-medium dark:text-gray-100">学び</th>
                <th className="p-2 text-sm font-medium dark:text-gray-100">感情</th>
              </tr>
            </thead>
            <tbody>
              {workLogs.length > 0 ? (
                workLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="bg-gray-100 dark:bg-gray-800 border-b hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleRowClick(log.id)}
                  >
                    <td className="p-2 text-sm dark:text-gray-300">{formatTimeRange(log.time_allocation)}</td>
                    <td className="p-2 text-sm dark:text-gray-300">{log.task_content}</td>
                    <td className="p-2 text-sm dark:text-gray-300">{log.issues || "-"}</td>
                    <td className="p-2 text-sm dark:text-gray-300">{log.learnings || "-"}</td>
                    <td className="p-2 text-sm dark:text-gray-300">{log.emotion || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-2 text-center text-gray-500 dark:text-gray-500 text-sm">
                    この日の作業日誌がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}