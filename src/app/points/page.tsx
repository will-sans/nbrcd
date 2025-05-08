"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// アクションの型を制限
type ActionType = "login" | "session_start" | "action_select" | "task_restore" | "send_message";

// ポイントデータの型を定義
interface PointLog {
  id: string; // 一意の識別子を追加
  action: ActionType;
  points: number;
  timestamp: string;
}

export default function PointsPage() {
  const router = useRouter();
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);
  const [totalPoints, setTotalPoints] = useState<number>(0);

  useEffect(() => {
    // localStorage からポイントデータを取得
    try {
      const storedPoints = localStorage.getItem("pointLogs");
      if (!storedPoints) {
        setPointLogs([]);
        setTotalPoints(0);
        return;
      }

      const parsedPoints = JSON.parse(storedPoints);
      if (Array.isArray(parsedPoints)) {
        // id が存在しない場合、index から生成
        const pointsWithId = parsedPoints.map((log: PointLog, index: number) => ({
          ...log,
          id: log.id || `log-${index}`,
        }));
        setPointLogs(pointsWithId);

        const total = pointsWithId.reduce((sum: number, log: PointLog) => sum + log.points, 0);
        setTotalPoints(total);
      } else {
        console.error("pointLogs is not an array:", parsedPoints);
        setPointLogs([]);
        setTotalPoints(0);
      }
    } catch (error) {
      console.error("Failed to parse pointLogs from localStorage:", error);
      setPointLogs([]);
      setTotalPoints(0);
    }
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
          {pointLogs.map((log) => (
            <li key={log.id} className="p-2 border rounded bg-gray-100">
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