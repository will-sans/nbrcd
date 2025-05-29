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
  time_allocation: string | null;
}

export default function DiaryListPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [errorMessage, setErrorMessage] = useState("");

  // Parse start time from time_allocation (e.g., "10:30" from "10:30–11:00")
  const parseStartTime = (timeAllocation: string | null): number => {
    if (!timeAllocation) {
      console.log("No time_allocation provided, sorting last");
      return Infinity; // Nulls sort last
    }
    // Match HH:MM or H:MM at the start, followed by a separator (e.g., "–")
    const match = timeAllocation.match(/^(\d{1,2}):(\d{2})/);
    if (!match) {
      console.log(`Invalid time_allocation format: ${timeAllocation}, sorting last`);
      return Infinity; // Invalid format, sort last
    }
    const [, hours, minutes] = match; // Skip full match, take hours and minutes
    const parsedHours = parseInt(hours);
    const parsedMinutes = parseInt(minutes);
    if (parsedHours < 0 || parsedHours > 23 || parsedMinutes < 0 || parsedMinutes > 59) {
      console.log(`Invalid time values: ${hours}:${minutes}, sorting last`);
      return Infinity; // Invalid time, sort last
    }
    return parsedHours * 60 + parsedMinutes; // Convert to minutes since midnight
  };

  useEffect(() => {
    const fetchWorkLogs = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("User not authenticated:", userError?.message);
        router.push("/login");
        return;
      }

      try {
        // Use date-only filter for the selected date
        const dateFilter = selectedDate; // YYYY-MM-DD format
        console.log("Fetching work logs for date:", dateFilter);

        // Fetch work logs for the selected date, casting date to DATE type
        const { data: logs, error: logError } = await supabase
          .from("work_logs")
          .select("id, date, task_content, issues, learnings, emotion, todo_id, time_allocation")
          .eq("user_id", user.id)
          .eq("date::date", dateFilter);

        if (logError) {
          throw new Error(logError.message || "作業日誌の取得に失敗しました");
        }

        // Sort logs by start time of time_allocation
        const sortedLogs = logs.sort((a, b) => {
          const timeA = parseStartTime(a.time_allocation);
          const timeB = parseStartTime(b.time_allocation);
          if (timeA !== timeB) return timeA - timeB;
          // If times are equal or both invalid, sort by date
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        console.log("Fetched and sorted work logs:", sortedLogs);
        setWorkLogs(sortedLogs);
      } catch (err) {
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
  }, [router, supabase, selectedDate]);

  const handleRowClick = (logId: number) => {
    router.push(`/diary?page=edit&id=${logId}`);
  };

  const formatTimeRange = (allocation?: string | null) => {
    return allocation || "-";
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
        <h1 className="text-2xl font-bold">日誌</h1>
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

      {/* Date Picker */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">日付を選択</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full p-2 border rounded bg-gray-100"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 text-sm font-medium">時間</th>
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
                  <td className="p-2 text-sm">{formatTimeRange(log.time_allocation)}</td>
                  <td className="p-2 text-sm">{log.task_content}</td>
                  <td className="p-2 text-sm">{log.issues || "-"}</td>
                  <td className="p-2 text-sm">{log.learnings || "-"}</td>
                  <td className="p-2 text-sm">{log.emotion || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-2 text-center text-gray-500">
                  この日の作業日誌がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}