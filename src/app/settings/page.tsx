"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionLog } from "@/types/actionLog";
import { FaCheck } from "react-icons/fa";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ActivitySummary {
  summary: string;
}

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  date: string;
  completedDate?: string;
}

const UsageStats = () => {
  const [stats, setStats] = useState<{ sessionCount: number; averageDuration: number }>({
    sessionCount: 0,
    averageDuration: 0,
  });
  const [sessionData, setSessionData] = useState<
    { sessionId: string; duration: number; startTime: string }[]
  >([]);
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

      // ログを時間順にソート
      logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const sessions: { [key: string]: ActionLog[] } = {};
      logs.forEach((log) => {
        if (!sessions[log.sessionId]) {
          sessions[log.sessionId] = [];
        }
        sessions[log.sessionId].push(log);
      });

      const sessionDurations: number[] = [];
      const sessionDetails: { sessionId: string; duration: number; startTime: string }[] = [];
      Object.keys(sessions).forEach((sessionId) => {
        const sessionLogs = sessions[sessionId];
        const startLog = sessionLogs.find((log) => log.action === "start_session");
        const endLog =
          sessionLogs.find((log) => log.action === "end_session") ||
          sessionLogs
            .slice()
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .find((log) => log.action !== "start_session");

        if (!startLog || !endLog) {
          console.warn(`Missing start or end log for session ${sessionId}: startLog=${!!startLog}, endLog=${!!endLog}`);
          return;
        }

        const startTime = new Date(startLog.timestamp).getTime();
        const endTime = new Date(endLog.timestamp).getTime();
        const duration = (endTime - startTime) / 1000;

        console.log("Duration calculation:", { sessionId, startTime: startLog.timestamp, endTime: endLog.timestamp, duration });

        // 1秒未満のセッションは除外
        if (duration < 1) {
          console.warn(`Session ${sessionId} skipped: duration (${duration} seconds) is too short.`);
          return;
        }

        if (duration >= 0) {
          sessionDurations.push(duration);
          sessionDetails.push({
            sessionId: startLog.sessionId,
            duration,
            startTime: new Date(startLog.timestamp).toLocaleString(),
          });
        } else {
          console.warn(`セッション無効: ${sessionId}, start=${startLog.timestamp}, end=${endLog.timestamp}, duration=${duration}`);
        }
      });

      sessionDetails.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

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

  const chartData = {
    labels: sessionData.map((session) => session.startTime),
    datasets: [
      {
        label: "使用時間（秒）",
        data: sessionData.map((session) => session.duration),
        fill: false,
        borderColor: "rgba(75, 192, 192, 1)",
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "セッションごとの使用時間推移",
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "セッション開始時間",
        },
      },
      y: {
        title: {
          display: true,
          text: "使用時間（秒）",
        },
        beginAtZero: true,
      },
    },
  };

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
              <div>
                <Line data={chartData} options={chartOptions} />
                <div className="mt-4">
                  {sessionData.map((session) => (
                    <div key={session.sessionId} className="mb-2">
                      <p>セッションID: {session.sessionId}</p>
                      <p>開始時間: {session.startTime}</p>
                      <p>使用時間: {session.duration.toFixed(2)} 秒</p>
                    </div>
                  ))}
                </div>
              </div>
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
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActionLog[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<ActivitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true); // ローディング状態を追加

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      Promise.all([
        fetch(`/api/users/me?userId=${userId}`)
          .then((res) => res.json())
          .then((data) => {
            setCurrentUser(data.username);
          })
          .catch((err) => {
            console.error("Failed to fetch user:", err);
            setCurrentUser("ゲスト");
          }),
        fetch(`/api/logs?userId=${userId}`)
          .then((res) => res.json())
          .then((logs) => {
            setActivityLogs(logs);
          })
          .catch((err) => {
            console.error("Failed to fetch activity logs:", err);
            setError("アクティビティログの取得に失敗しました");
          }),
      ]).finally(() => {
        setIsLoading(false); // ローディング完了
      });
    } else {
      setCurrentUser("ゲスト");
      setIsLoading(false);
    }
  }, []);

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

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weeklyLogs = activityLogs.filter(
      (log) => new Date(log.timestamp) >= oneWeekAgo
    );

    const todos: Todo[] = JSON.parse(localStorage.getItem("todos") || "[]");
    const weeklyTodos = todos.filter(
      (todo) => new Date(todo.date) >= oneWeekAgo
    );
    const activeTodos = weeklyTodos
      .filter((todo) => !todo.completed)
      .map((todo) => todo.text);
    const completedTodos = weeklyTodos
      .filter((todo) => todo.completed)
      .map((todo) => todo.text);

    const prompt = `
あなたはプロフェッショナルなコーチングアシスタントです。ユーザーの行動ログ、未完了のToDoリスト、完了済みリストを基に、週次サマリーレポートを生成してください。レポートは「今週のまとめ」の1セクションのみで構成し、自然な日本語で、プロフェッショナルなトーンで記述してください。内容は簡潔に、2～3文程度でまとめ、ユーザーの行動や傾向を簡潔に分析してください。「今後の提案」セクションは含めないでください。

**入力データ：**

- **行動ログ（ユーザーの活動履歴）：**
${JSON.stringify(weeklyLogs, null, 2)}

- **未完了のToDoリスト：**
${JSON.stringify(activeTodos, null, 2)}

- **完了済みリスト：**
${JSON.stringify(completedTodos, null, 2)}

**指示：**

1. **今週のまとめ**：
   - 行動ログを基に、ユーザーがどのような活動を行ったかを簡潔に分析してください。
   - 完了済みリストを基に、ユーザーが達成した成果を簡潔に強調してください。
   - 未完了のToDoリストを基に、ユーザーが直面している課題や傾向を簡潔に分析してください。
   - 全体を2～3文でまとめ、簡潔で読みやすい内容にしてください。

**出力形式：**

- 今週のまとめ：
  [行動ログ、ToDoリスト、完了済みリストに基づく簡潔な分析]

**例：**

- 今週のまとめ：
  今週は「時間管理」に焦点を当てた対話を行い、「毎朝10分間優先事項を確認する」を達成しました。一方で、「週末に振り返りを行う」が未完了のまま残り、振り返りの習慣化が課題です。全体として、計画性が向上する一週間でした。

**レポートを生成してください。**
`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "あなたはプロフェッショナルなコーチングアシスタントです。ユーザーの行動ログとToDoリストを基に、週次サマリーレポートを生成してください。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "APIからの取得に失敗しました");
      }

      const data = await response.json();
      const generatedSummary = data.choices[0]?.message?.content || "レポートの生成に失敗しました。";
      setWeeklySummary({ summary: generatedSummary });
    } catch (error) {
      console.error("Error generating weekly summary:", error);
      setWeeklySummary({ summary: "レポートの生成中にエラーが発生しました。" });
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

      <button
        onClick={() => router.push("/todo/list")}
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        aria-label="Go to Todo List"
      >
        <FaCheck size={24} />
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

      <UsageStats />

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