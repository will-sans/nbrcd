"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionLog } from "@/types/actionLog";
import { FaComments, FaCalendarAlt } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface UsageStatsProps {
  messages: Message[];
  parsedResult: ParsedSessionResult | null;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ParsedSessionResult {
  actions: string[];
}

interface ActivitySummary {
  summary: string;
}

const UsageStats = ({ messages, parsedResult }: UsageStatsProps) => {
  const [stats, setStats] = useState<{ sessionCount: number; averageDuration: number }>({
    sessionCount: 0,
    averageDuration: 0,
  });
  const [sessionData, setSessionData] = useState<{ sessionId: string; duration: number; startTime: string }[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    const userId = localStorage.getItem("userId");
    console.log("Fetching logs for userId:", userId);
    if (!userId) {
      setError("ユーザー登録が必要です。セッションを開始してください。");
      setStats({ sessionCount: 0, averageDuration: 0 });
      setSessionData([]);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/api/logs?userId=${userId}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch logs: ${response.status}`);
      }
      const logs: ActionLog[] = await response.json();
      console.log("Fetched logs:", logs);

      if (!logs || logs.length === 0) {
        setStats({ sessionCount: 0, averageDuration: 0 });
        setSessionData([]);
        return;
      }

      const sessions: { [key: string]: ActionLog[] } = {};
      logs.forEach((log) => {
        log.timestamp = new Date(log.timestamp);
        if (!sessions[log.sessionId]) {
          sessions[log.sessionId] = [];
        }
        sessions[log.sessionId].push(log);
      });

      const sessionDurations: number[] = [];
      const sessionDetails: { sessionId: string; duration: number; startTime: string }[] = [];
      Object.values(sessions).forEach((sessionLogs) => {
        const startLog = sessionLogs.find((log) => log.action === "start_session");
        // セッション内の最後のログを endLog として使用
        const endLog = sessionLogs
          .filter((log) => log.action !== "start_session")
          .reduce((latest: ActionLog | null, log: ActionLog) => {
            if (!latest || new Date(log.timestamp) > new Date(latest.timestamp)) {
              return log;
            }
            return latest;
          }, null);

        if (startLog && endLog) {
          const startTime = new Date(startLog.timestamp).getTime();
          const endTime = new Date(endLog.timestamp).getTime();
          const duration = endTime >= startTime ? (endTime - startTime) / 1000 : 0;
          if (duration > 0) {
            sessionDurations.push(duration);
            sessionDetails.push({
              sessionId: startLog.sessionId,
              duration,
              startTime: new Date(startLog.timestamp).toLocaleString(),
            });
          }
        }
      });

      const averageDuration =
        sessionDurations.length > 0
          ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
          : 0;

      setStats({ sessionCount: sessionDetails.length, averageDuration });
      setSessionData(sessionDetails);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      setStats({ sessionCount: 0, averageDuration: 0 });
      setSessionData([]);
      setError(error instanceof Error ? error.message : "ログの取得に失敗しました。しばらくしてから再度お試しください。");
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="mt-4">
      <button
        onClick={() => setShowStats(!showStats)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        {showStats ? "計測時間を非表示" : "計測時間を表示"}
      </button>

      {showStats && (
        <div className="p-4 border rounded bg-gray-100">
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <h2 className="text-xl font-bold mb-2">使用統計</h2>
          <p>セッション数: {stats.sessionCount}</p>
          <p>平均使用時間: {stats.averageDuration.toFixed(2)} 秒</p>

          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">セッションごとの使用時間推移</h3>
            {sessionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sessionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="startTime" label={{ value: "開始時間", position: "insideBottomRight", offset: -10 }} />
                  <YAxis label={{ value: "使用時間（秒）", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="duration" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500">セッションがありません。セッションを開始してください。</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function SettingsPage() {
  const router = useRouter();
  const [messages] = useState<Message[]>([]);
  const [parsedResult] = useState<ParsedSessionResult | null>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActionLog[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<ActivitySummary | null>(null);

  // 登録済みユーザー名とアクティビティログを取得
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      fetch(`/api/users/me?userId=${userId}`)
        .then((res) => res.json())
        .then((data) => {
          setCurrentUser(data.username);
        })
        .catch((err) => {
          console.error("Failed to fetch user:", err);
          setCurrentUser("ゲスト");
        });

      // ユーザーアクティビティログを取得
      fetch(`/api/logs?userId=${userId}`)
        .then((res) => res.json())
        .then((logs) => {
          setActivityLogs(logs);
        })
        .catch((err) => {
          console.error("Failed to fetch activity logs:", err);
          setError("アクティビティログの取得に失敗しました");
        });
    } else {
      setCurrentUser("ゲスト");
    }
  }, []);

  // 週次サマリーレポートを生成
  const generateWeeklySummary = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setWeeklySummary({ summary: "ユーザー登録が必要です。セッションを開始してください。" });
      return;
    }

    if (activityLogs.length === 0) {
      setWeeklySummary({ summary: "アクティビティログがありません。セッションを開始してください。" });
      return;
    }

    const userInputs = activityLogs
      .filter((log) => log.details?.input)
      .map((log) => log.details!.input);

    if (userInputs.length === 0) {
      setWeeklySummary({ summary: "ユーザーの入力がありません。セッションで対話を進めてください。" });
      return;
    }

    const summaryPrompt = `
以下のユーザーの入力を基に、週次サマリーレポートを自然言語で生成してください。ユーザーの入力を要約し、今後の学びや成長につながるアドバイスを提供してください。

**ユーザーの入力**:
${userInputs.map((input, index) => `${index + 1}. ${input}`).join("\n")}

レポートは日本語で、簡潔に（3-5文程度）、ユーザーに気づきを与える内容にしてください。アドバイスは具体的で実行可能なものにしてください。
`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "あなたはユーザーのアクティビティログを分析し、学びや成長につながるアドバイスを提供するアシスタントです。" },
            { role: "user", content: summaryPrompt },
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "サマリーレポートの生成に失敗しました");
      }

      const data = await response.json();
      const summary = data.choices[0]?.message?.content || "レポートを生成できませんでした。";
      setWeeklySummary({ summary });
    } catch (err) {
      console.error("Failed to generate summary:", err);
      setWeeklySummary({ summary: err instanceof Error ? err.message : "レポートの生成に失敗しました。" });
    }
  };

  const handleRegister = async () => {
    if (!username || username.length < 3) {
      setError("ユーザー名は3文字以上で入力してください");
      return;
    }

    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ユーザー登録に失敗しました");
      }

      const user = await response.json();
      localStorage.setItem("userId", user.id.toString());
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
        className="absolute top-4 left-4 text-gray-600 hover:text-gray-800"
        aria-label="Go to Home"
      >
        <FaComments size={24} />
      </button>

      <button
        onClick={() => router.push("/todo")}
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        aria-label="Go to Todo"
      >
        <FaCalendarAlt size={24} />
      </button>

      <h1 className="text-2xl font-bold mb-4 text-center">設定</h1>

      {/* ユーザー登録フォーム */}
      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-bold mb-2">ユーザー登録</h2>
        {currentUser && (
          <p className="mb-2">現在のユーザー: <span className="font-semibold">{currentUser}</span></p>
        )}
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {success && <div className="text-green-500 mb-4">{success}</div>}
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ユーザー名を入力してください"
          className="border p-2 w-full mb-2"
        />
        <button
          onClick={handleRegister}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          登録
        </button>
      </div>

      {/* 計測時間（使用統計） */}
      <UsageStats messages={messages} parsedResult={parsedResult} />

      {/* 週次サマリーレポート */}
      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-bold mb-2">週次サマリーレポート</h2>
        <button
          onClick={generateWeeklySummary}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4"
        >
          サマリーレポートを生成
        </button>
        {weeklySummary && (
          <div>
            <p className="whitespace-pre-line">{weeklySummary.summary}</p>
          </div>
        )}
      </div>

      {/* アクティビティログ */}
      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-bold mb-2">アクティビティログ</h2>
        {activityLogs.length > 0 ? (
          <ul className="space-y-2">
            {activityLogs.map((log, index) => (
              <li key={index} className="border-b pb-2">
                <p><strong>アクション:</strong> {log.action}</p>
                <p><strong>哲学者:</strong> {log.philosopherId}</p>
                {log.category && <p><strong>カテゴリ:</strong> {log.category}</p>}
                <p><strong>時間:</strong> {new Date(log.timestamp).toLocaleString()}</p>
                {log.details && <p><strong>詳細:</strong> {JSON.stringify(log.details)}</p>}
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