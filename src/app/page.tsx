"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { philosophers } from "@/data/philosophers";
import { parseGptSessionResult, ParsedSessionResult } from "@/lib/parseGptSessionResult";
import { v4 as uuidv4 } from "uuid";
import { ActionLog } from "@/types/actionLog";
import { FaCalendarAlt, FaBars } from "react-icons/fa"; // FaBars を追加

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface Todo {
  id: number;
  text: string;
  done: boolean;
  date?: string;
}

export default function Page() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedPhilosopherId, setSelectedPhilosopherId] = useState("drucker");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState<Message | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedSessionResult | null>(null);
  const [sessionId] = useState<string>(uuidv4());
  const chatContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatContainer.current?.scrollTo({
      top: chatContainer.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const saveLog = async (action: string, details?: Record<string, string>) => {
    const log: ActionLog = {
      action,
      timestamp: new Date().toISOString(),
      sessionId,
      philosopherId: selectedPhilosopherId,
      details,
    };

    try {
      const response = await fetch("/api/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(log),
      });
      if (!response.ok) {
        throw new Error("Failed to save log");
      }
      console.log("Successfully saved log to server:", log);
    } catch (error) {
      console.error("Failed to save log:", error);
    }
  };

  const handleStartSession = async () => {
    if (!input.trim()) {
      setError("入力してください");
      return;
    }
    if (input.trim().length < 3) {
      setError("もう少し詳しく入力してください");
      return;
    }

    const selectedPhilosopher = philosophers.find((p) => p.id === selectedPhilosopherId);
    if (!selectedPhilosopher) {
      setError("哲学者が見つかりません");
      return;
    }

    const newSystemMessage: Message = {
      role: "system",
      content: selectedPhilosopher.systemPrompt,
    };
    setSystemMessage(newSystemMessage);

    const newUserMessage: Message = {
      role: "user",
      content: input.trim(),
    };

    const updatedMessages: Message[] = [newSystemMessage, newUserMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError(null);
    setParsedResult(null);

    await saveLog("start_session", { input: input.trim() });

    try {
      console.log("Sending messages:", updatedMessages);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: updatedMessages,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "APIからの取得に失敗しました");
      }

      const data = await response.json();
      const reply = data.choices[0]?.message?.content || "";
      console.log("Response:", reply);

      const newAssistantMessage: Message = {
        role: "assistant",
        content: reply.match(/アクションプラン: .*$/m)
          ? reply.replace(/アクションプラン: .*$/m, "").trim()
          : reply,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
      setSessionStarted(true);
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSendDuringSession = async () => {
    if (!input.trim()) {
      setError("入力してください");
      return;
    }
    if (input.trim().length < 3) {
      setError("もう少し詳しく入力してください");
      return;
    }

    const newUserMessage: Message = {
      role: "user",
      content: input.trim(),
    };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError(null);

    await saveLog("send_message", { input: input.trim() });

    try {
      console.log("Sending messages:", systemMessage ? [systemMessage, ...updatedMessages] : updatedMessages);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: systemMessage ? [systemMessage, ...updatedMessages] : updatedMessages,
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "APIからの取得に失敗しました");
      }

      const data = await response.json();
      const reply = data.choices[0]?.message?.content || "";
      console.log("Response:", reply);

      const newAssistantMessage: Message = {
        role: "assistant",
        content: reply.match(/アクションプラン: .*$/m)
          ? reply.replace(/アクションプラン: .*$/m, "").trim()
          : reply,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);

      if (messages.filter((m) => m.role === "user").length >= 2 || input.toLowerCase().includes("まとめ")) {
        const parsed = parseGptSessionResult(reply);
        console.log("Parsed actions:", parsed.actions);
        setParsedResult(parsed);
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      if (sessionStarted) {
        handleSendDuringSession();
      } else {
        handleStartSession();
      }
    }
  };

  const handleActionSelect = async (action: string) => {
    const storedTodos: Todo[] = JSON.parse(localStorage.getItem("todos") || "[]");
    const currentDate = new Date().toISOString().split("T")[0];
    const newTodo = {
      id: storedTodos.length + 1,
      text: action,
      done: false,
      date: currentDate,
    };

    const updatedTodos = [...storedTodos, newTodo];
    console.log("Adding todo:", newTodo);
    localStorage.setItem("todos", JSON.stringify(updatedTodos));

    await saveLog("select_action", { action });

    router.push("/todo");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col relative">
      {/* 左上に「二」マーク（設定画面への遷移ボタン）を追加 */}
      <button
        onClick={() => router.push("/settings")}
        className="absolute top-4 left-4 text-gray-600 hover:text-gray-800"
        aria-label="Go to Settings"
      >
        <FaBars size={24} />
      </button>

      <button
        onClick={() => router.push("/todo")}
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        aria-label="Go to Todo"
      >
        <FaCalendarAlt size={24} />
      </button>

      <div className="flex items-center justify-center mb-4">
        <Image
          src="/nbrcd_logo.png"
          alt="nbrcd Logo"
          width={48}
          height={48}
          className="mr-2"
        />
        <h1 className="text-2xl font-bold">nbrcd</h1>
      </div>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading && <div className="text-gray-500 mb-4">処理中...</div>}

      <div className="mb-6">
        <label className="block mb-1">哲学を選択：</label>
        <select
          value={selectedPhilosopherId}
          onChange={(e) => setSelectedPhilosopherId(e.target.value)}
          className="border p-2 w-full"
          disabled={sessionStarted}
        >
          {philosophers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={chatContainer}
        className="flex-1 overflow-y-auto mb-4 border p-4 rounded bg-gray-50"
      >
        {messages
          .filter((m) => m.role !== "system")
          .map((msg, idx) => (
            <div key={idx} className={`mb-2 ${msg.role === "user" ? "text-right" : "text-left"}`}>
              <span className="inline-block px-3 py-2 rounded bg-blue-100">
                {msg.content}
              </span>
            </div>
          ))}
      </div>

      {parsedResult && (
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">アクションプラン</h2>
          <h3 className="font-semibold mb-1">アクションを選択:</h3>
          <ul className="space-y-2 mb-4">
            {parsedResult.actions.map((action, idx) => (
              <li key={idx}>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    onChange={() => {
                      handleActionSelect(action);
                    }}
                    className="mr-2 h-5 w-5"
                  />
                  <span>{action}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* UsageStats コンポーネントを削除 */}

      <div className="flex space-x-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="ここに答えや考えを書いてください..."
          className="border p-2 flex-1 rounded"
          disabled={loading}
        />
        <button
          onClick={sessionStarted ? handleSendDuringSession : handleStartSession}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {sessionStarted ? "送信" : "セッション開始"}
        </button>
      </div>
    </div>
  );
}