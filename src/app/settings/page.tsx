"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionLog } from "@/types/actionLog";
import { FaHome } from "react-icons/fa";
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

const UsageStats = ({ messages, parsedResult }: UsageStatsProps) => {
  const [stats, setStats] = useState<{ sessionCount: number; averageDuration: number }>({
    sessionCount: 0,
    averageDuration: 0,
  });
  const [sessionData, setSessionData] = useState<{ sessionId: string; duration: number; startTime: string }[]>([]);
  const [showStats, setShowStats] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/logs");
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }
      const logs: ActionLog[] = await response.json();
      console.log("Fetched logs:", logs);

      const sessions: { [key: string]: ActionLog[] } = {};
      logs.forEach((log) => {
        if (!sessions[log.sessionId]) {
          sessions[log.sessionId] = [];
        }
        sessions[log.sessionId].push(log);
      });

      const sessionDurations: number[] = [];
      const sessionDetails: { sessionId: string; duration: number; startTime: string }[] = [];
      Object.values(sessions).forEach((sessionLogs) => {
        const startLog = sessionLogs.find((log) => log.action === "start_session");
        const endLog = sessionLogs[sessionLogs.length - 1];

        if (startLog && endLog) {
          const startTime = new Date(startLog.timestamp).getTime();
          const endTime = new Date(endLog.timestamp).getTime() - 1500;
          const duration = (endTime - startTime) / 1000;
          sessionDurations.push(duration);
          sessionDetails.push({
            sessionId: startLog.sessionId,
            duration,
            startTime: new Date(startLog.timestamp).toLocaleString(),
          });
        }
      });

      const averageDuration =
        sessionDurations.length > 0
          ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
          : 0;

      setStats({ sessionCount: sessionDurations.length, averageDuration });
      setSessionData(sessionDetails);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      setStats({ sessionCount: 0, averageDuration: 0 });
      setSessionData([]);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [messages, parsedResult]);

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
          <h2 className="text-xl font-bold mb-2">使用統計</h2>
          <p>セッション数: {stats.sessionCount}</p>
          <p>平均使用時間: {stats.averageDuration.toFixed(2)} 秒</p>

          {sessionData.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">セッションごとの使用時間推移</h3>
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
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function SettingsPage() {
  const router = useRouter();
  const [messages] = useState<Message[]>([]); // ダミーデータ（必要に応じて調整）
  const [parsedResult] = useState<ParsedSessionResult | null>(null); // ダミーデータ（必要に応じて調整）

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col relative">
      <button
        onClick={() => router.push("/")}
        className="absolute top-4 left-4 text-gray-600 hover:text-gray-800"
        aria-label="Go to Home"
      >
        <FaHome size={24} />
      </button>

      <h1 className="text-2xl font-bold mb-4 text-center">設定</h1>

      <UsageStats messages={messages} parsedResult={parsedResult} />
    </div>
  );
}