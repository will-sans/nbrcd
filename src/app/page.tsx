"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { philosophers } from "@/data/philosophers";
import { questions } from "@/data/questions";
import { Question } from "@/types/question";
import { ActionLog } from "@/types/actionLog";
import { FaBars, FaCheck } from "react-icons/fa";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ParsedSessionResult {
  actions: string[];
}

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [systemMessage, setSystemMessage] = useState<Message | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedSessionResult | null>(null);
  const [selectedPhilosopherId, setSelectedPhilosopherId] = useState<string>("");
  const [dailyQuestion, setDailyQuestion] = useState<Question | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    } else {
      setCurrentUser("ゲスト");
    }
  }, []);

  useEffect(() => {
    if (selectedPhilosopherId) {
      const philosopherQuestions = questions.filter(
        (q) => q.philosophy === selectedPhilosopherId
      );
      setDailyQuestion(
        philosopherQuestions[Math.floor(Math.random() * philosopherQuestions.length)]
      );
      setMessages([]);
      setSessionStarted(false);
      setParsedResult(null);
      setSystemMessage(null);
      setSelectedAction(null);
    }
  }, [selectedPhilosopherId]);

  const saveLog = async (action: string, details?: Record<string, string>) => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const log: ActionLog = {
      action,
      timestamp: new Date().toISOString(),
      sessionId,
      philosopherId: selectedPhilosopherId,
      category: dailyQuestion?.category,
      details,
      userId: parseInt(userId),
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
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save log");
      }
      console.log("Successfully saved log to server:", log);

      await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: parseInt(userId),
          conversation: messages,
          analysis: { sessionCount: messages.length },
          score: messages.length * 10,
        }),
      });
    } catch (error) {
      console.error("Failed to save log:", error);
    }
  };

  const parseGptSessionResult = (reply: string): ParsedSessionResult => {
    const actionsMatch = reply.match(/1\. (.*), 2\. (.*), 3\. (.*)/);
    if (actionsMatch) {
      return {
        actions: [actionsMatch[1], actionsMatch[2], actionsMatch[3]],
      };
    }
    return { actions: [] };
  };

  const saveActionToLocalStorageAndRedirect = (action: string) => {
    const existingTodos = JSON.parse(localStorage.getItem("todos") || "[]");
    const newTodo = {
      id: Date.now() + Math.random(),
      text: action,
      completed: false,
      date: new Date().toISOString(),
    };
    localStorage.setItem("todos", JSON.stringify([...existingTodos, newTodo]));
    router.push("/todo/list");
  };

  const handleActionSelect = (action: string) => {
    setSelectedAction(action);
    saveActionToLocalStorageAndRedirect(action);
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

    if (!dailyQuestion) {
      setError("質問が見つかりません。別の哲学を選択してください。");
      return;
    }

    const systemPromptWithQuestion = selectedPhilosopher.systemPrompt
      .replace("{質問}", dailyQuestion.question)
      .replace("{学習ポイント}", dailyQuestion.learning)
      .replace("{ユーザー入力}", input.trim());

    const newSystemMessage: Message = {
      role: "system",
      content: systemPromptWithQuestion,
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
    setSessionId(Date.now().toString());
    setSelectedAction(null);

    await saveLog("start_session", { input: input.trim() });

    try {
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
        content: reply,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
      setSessionStarted(true);
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setLoading(false);
      inputRef.current?.blur();
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
      let reply = data.choices[0]?.message?.content || "";
      console.log("Response:", reply);

      reply = reply.replace(/1\. .*, 2\. .*, 3\. .*/, "").trim();

      const newAssistantMessage: Message = {
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);

      if (messages.filter((m) => m.role === "user").length >= 2 || input.toLowerCase().includes("まとめ")) {
        const parsed = parseGptSessionResult(data.choices[0]?.message?.content || "");
        console.log("Parsed actions:", parsed.actions);
        setParsedResult(parsed);
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setLoading(false);
      inputRef.current?.blur();
    }
  };

  const handlePhilosopherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPhilosopherId(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionStarted) {
      handleStartSession();
    } else {
      handleSendDuringSession();
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/settings")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="Go to Settings"
        >
          <FaBars size={24} />
        </button>

        <div className="flex items-center space-x-2">
          <div className="flex-shrink-0">
            <Image
              src="/nbrcd_logo.png"
              alt="NBRCD Logo"
              width={40}
              height={40}
              priority
            />
          </div>
          <div className="w-48">
            <select
              id="philosopher"
              value={selectedPhilosopherId}
              onChange={handlePhilosopherChange}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">哲学者を選択してください</option>
              {philosophers.map((philosopher) => (
                <option key={philosopher.id} value={philosopher.id}>
                  {philosopher.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => router.push("/todo/list")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="Go to Todo List"
        >
          <FaCheck size={24} />
        </button>
      </div>

      {!selectedPhilosopherId && (
        <div className="mb-4 p-4 bg-gray-100 rounded text-center">
          <h2 className="text-lg font-semibold">
            こんにちは、{currentUser || "ゲスト"}さん
          </h2>
        </div>
      )}

      {selectedPhilosopherId && dailyQuestion && (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold">{dailyQuestion.question}</h2>
          <p className="mt-2 text-sm text-gray-600">{dailyQuestion.learning}</p>
        </div>
      )}

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {selectedPhilosopherId && dailyQuestion && (
        <>
          <div className="flex-1 overflow-y-auto mb-16"> {/* mb-16 で入力エリア分のスペースを確保 */}
            {messages
              .filter((m) => m.role !== "system")
              .map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${message.role === "user" ? "text-right" : "text-left"}`}
                >
                  <div
                    className={`inline-block p-2 rounded-lg ${
                      message.role === "user" ? "bg-blue-500 text-white" : "bg-gray-200 text-black"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            {parsedResult && parsedResult.actions.length > 0 && dailyQuestion && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <p className="font-semibold">アクションを一つ選んでください</p>
                <div className="mt-2">
                  {parsedResult.actions.map((action, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="radio"
                        name="action"
                        value={action}
                        checked={selectedAction === action}
                        onChange={() => handleActionSelect(action)}
                        className="mr-2"
                      />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 font-semibold">教訓： {dailyQuestion.quote}</p>
                <p className="mt-2 font-semibold">関連書籍紹介</p>
                <p>{dailyQuestion.book} - {dailyQuestion.chapter}</p>
              </div>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={sessionStarted ? "メッセージを入力..." : "セッションを開始するには入力してください"}
                className="flex-1 border p-2 rounded-l-md"
                ref={inputRef}
                disabled={loading}
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md"
                disabled={loading}
              >
                {loading ? "送信中..." : sessionStarted ? "送信" : "開始"}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}