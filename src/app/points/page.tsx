"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PointLog {
  action: string;
  points: number;
  timestamp: string;
}

export default function PointsPage() {
  const router = useRouter();
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);

  useEffect(() => {
    const storedPoints = JSON.parse(localStorage.getItem("pointLogs") || "[]");
    setPointLogs(storedPoints);

    const total = storedPoints.reduce((sum: number, log: PointLog) => sum + log.points, 0);
    setTotalPoints(total);
  }, []);

  return (
    <div className="p-6 max-w-md mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/todo/completed")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="完了済みタスクに戻る"
        >
          <span className="text-2xl">&lt;</span>
        </button>
        <h1 className="text-2xl font-bold">ポイント履歴</h1>
        <div className="w-6"></div> {/* 右側のスペースホルダー */}
      </div>

      <div className="mb-4">
        <p className="text-lg font-semibold">合計ポイント: {totalPoints} ポイント</p>
      </div>

      {pointLogs.length > 0 ? (
        <ul className="space-y-2">
          {pointLogs.map((log, index) => (
            <li key={index} className="p-2 border rounded bg-gray-100">
              <div className="flex justify-between">
                <span>
                  {log.action === "task_restore" ? "タスク復元" : log.action}
                </span>
                <span>+{log.points} ポイント</span>
              </div>
              <p className="text-xs text-gray-500">
                {new Date(log.timestamp).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center">ポイント履歴がありません。</p>
      )}
    </div>
  );
}