"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PointLog {
  id: string;
  action: string;
  points: number;
  timestamp: string;
}

export default function PointsPage() {
  const router = useRouter();
  const [pointLogs, setPointLogs] = useState<PointLog[]>([]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      router.push("/login"); // 未ログイン状態でログイン画面にリダイレクト
      return;
    }

    const storedPointLogs = JSON.parse(localStorage.getItem("pointLogs") || "[]");
    console.log("Loaded pointLogs:", storedPointLogs); // ログ出力で確認
    setPointLogs(storedPointLogs);
  }, [router]);

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

        <div className="w-6" /> {/* レイアウト調整用 */}
      </div>

      {pointLogs.length > 0 ? (
        <ul className="space-y-2">
          {pointLogs.map((log) => (
            <li key={log.id} className="p-2 border rounded bg-gray-100">
              <p>
                <strong>アクション:</strong> {log.action}
              </p>
              <p>
                <strong>ポイント:</strong> {log.points}
              </p>
              <p>
                <strong>時間:</strong> {new Date(log.timestamp).toLocaleString()}
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