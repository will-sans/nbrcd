"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from '@/utils/supabase/client';

interface PointLog {
  id: string;
  action: string;
  points: number;
  timestamp: string;
}

export default function PointsPage() {
  const router = useRouter();
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const supabase = createClient();

  useEffect(() => {
    const fetchPointLogs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('point_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false });

        if (error) {
          throw new Error(error.message || 'ポイント履歴の取得に失敗しました');
        }

        setPointLogs(data || []);
        const total = data.reduce((sum: number, log) => sum + log.points, 0);
        setTotalPoints(total);
      } catch (err) {
        console.error("Failed to fetch point logs:", err);
        router.push("/login");
      }
    };

    fetchPointLogs();
  }, [router, supabase]);

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-800 text-2xl"
          aria-label="ホームへ移動"
        >
          ＜
        </button>

        <h1 className="text-2xl font-bold">ポイント履歴</h1>

        <div className="w-6" />
      </div>

      <div className="mb-4 p-4 bg-gray-100 rounded text-center">
        <h2 className="text-lg font-semibold">合計ポイント: {totalPoints}</h2>
      </div>

      {pointLogs.length > 0 ? (
        <ul className="space-y-2">
          {pointLogs.map((log) => (
            <li key={log.id} className="p-2 border rounded bg-gray-100">
              <p><strong>アクション:</strong> {log.action}</p>
              <p><strong>ポイント:</strong> {log.points}</p>
              <p><strong>時間:</strong> {new Date(log.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center">ポイント履歴がありません。</p>
      )}
    </div>
  );
}