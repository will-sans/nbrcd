
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { FaArrowLeft } from "react-icons/fa";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { ja } from "date-fns/locale";
import { useTimezone } from "@/lib/timezone-context";
import { PostgrestError } from "@supabase/supabase-js";

ChartJS.register(ArcElement, Tooltip, Legend);

interface TimeSession {
  id: string;
  user_id: string;
  task: string;
  category: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  todo_id?: string;
}

export default function SchedulePage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { timezone } = useTimezone();
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push("/login");
        setIsLoading(false);
        return;
      }

      try {
        const selectedDateObj = new Date(selectedDate);
        const startOfDay = new Date(
          Date.UTC(
            selectedDateObj.getFullYear(),
            selectedDateObj.getMonth(),
            selectedDateObj.getDate(),
            0, 0, 0
          )
        );
        const endOfDay = new Date(
          Date.UTC(
            selectedDateObj.getFullYear(),
            selectedDateObj.getMonth(),
            selectedDateObj.getDate() + 1,
            0, 0, 0
          )
        );

        const { data, error }: { data: TimeSession[] | null; error: PostgrestError | null } = await supabase
          .from("time_sessions")
          .select("*")
          .eq("user_id", user.id)
          .gte("start_time", startOfDay.toISOString())
          .lt("start_time", endOfDay.toISOString())
          .order("start_time", { ascending: true });

        if (error) throw error;
        setSessions(data || []);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
        setError("スケジュールの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [supabase, router, selectedDate, timezone]);

  const getPieChartData = () => {
    const categoryDurations = sessions.reduce((acc, session) => {
      if (session.duration) {
        acc[session.category] = (acc[session.category] || 0) + session.duration;
      }
      return acc;
    }, {} as { [key: string]: number });

    return {
      labels: Object.keys(categoryDurations),
      datasets: [
        {
          data: Object.values(categoryDurations),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#C9CBCF",
            "#7BC043",
          ],
        },
      ],
    };
  };

  const formatTime = (isoString: string) => {
    return formatInTimeZone(toZonedTime(new Date(isoString), timezone), timezone, "HH:mm", { locale: ja });
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/time-tracker")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="時間計測に戻る"
        >
          <FaArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">スケジュール</h1>
        <div />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">日付を選択</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="p-2 border rounded bg-gray-100"
        />
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {isLoading ? (
        <p className="text-gray-500 text-center">読み込み中...</p>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">タイムライン</h2>
            {sessions.length > 0 ? (
              <ul className="space-y-2">
                {sessions.map((session) => (
                  <li key={session.id} className="p-2 bg-gray-100 rounded">
                    <p>
                      <strong>{session.task}</strong> ({session.category})
                    </p>
                    <p>
                      {formatTime(session.start_time)} -{" "}
                      {session.end_time ? formatTime(session.end_time) : "進行中"}
                    </p>
                    {session.duration && (
                      <p>所要時間: {formatDuration(session.duration)}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">この日の記録はありません</p>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">カテゴリ別時間</h2>
            {sessions.some((s) => s.duration) ? (
              <Pie
                data={getPieChartData()}
                options={{
                  plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                      callbacks: {
                        label: (context) =>
                          `${context.label}: ${formatDuration(context.raw as number)}`,
                      },
                    },
                  },
                }}
              />
            ) : (
              <p className="text-gray-500">データがありません</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}