"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionLog } from "@/types/actionLog";

export default function SettingsPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      Promise.all([
        fetch(`/api/users/me?userId=${userId}`, { signal: controller.signal })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to fetch user: ${res.statusText}`);
            }
            return res.json();
          })
          .then((data) => {
            setCurrentUser(data.username);
          })
          .catch((err) => {
            console.error("Failed to fetch user:", err);
            setCurrentUser("ゲスト");
          }),
        fetch(`/api/logs?userId=${userId}`, { signal: controller.signal })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to fetch logs: ${res.statusText}`);
            }
            return res.json();
          })
          .then((logs) => {
            setActivityLogs(logs);
          })
          .catch((err) => {
            console.error("Failed to fetch activity logs:", err);
            setError("アクティビティログの取得に失敗しました");
          }),
      ])
        .finally(() => {
          clearTimeout(timeoutId);
          setIsLoading(false);
        });
    } else {
      setCurrentUser("ゲスト");
      setIsLoading(false);
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || username.length < 3) {
      setError("ユーザー名は3文字以上で入力してください");
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ユーザー登録に失敗しました");
      }

      const user = await response.json();
      localStorage.setItem("userId", user.id.toString());
      localStorage.setItem("currentUser", user.username);
      setCurrentUser(user.username);
      setSuccess("ユーザー登録が完了しました！");
      setError(null);
      setUsername("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col relative">
      <button
        onClick={() => router.push("/")}
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        aria-label="ホームへ移動"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      </button>

      <h1 className="text-2xl font-bold mb-4 text-center">設定</h1>

      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-bold mb-2">ユーザー登録</h2>
        {isLoading ? (
          <p className="mb-2">読み込み中...</p>
        ) : (
          currentUser && (
            <p className="mb-2">
              現在のユーザー: <span className="font-semibold">{currentUser}</span>
            </p>
          )
        )}
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {success && <div className="text-green-500 mb-4">{success}</div>}
        <form onSubmit={handleRegister}>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ユーザー名を入力してください"
            className="border p-2 w-full mb-2"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            aria-label="ユーザー登録"
          >
            登録
          </button>
        </form>
      </div>

      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-bold mb-2">アクティビティログ</h2>
        {activityLogs.length > 0 ? (
          <ul className="space-y-2">
            {activityLogs.map((log, index) => (
              <li key={index} className="border-b pb-2">
                <p>
                  <strong>アクション:</strong> {log.action}
                </p>
                <p>
                  <strong>哲学者:</strong> {log.philosopherId}
                </p>
                {log.category && (
                  <p>
                    <strong>カテゴリ:</strong> {log.category}
                  </p>
                )}
                <p>
                  <strong>時間:</strong> {new Date(log.timestamp).toLocaleString()}
                </p>
                {log.details && (
                  <p>
                    <strong>詳細:</strong> {JSON.stringify(log.details)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">アクティビティログがありません。セッションを開始してください。</p>
        )}
      </div>
    </div>
  );
}