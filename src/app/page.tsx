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

  // セッション記録用のユーティリティ
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const newSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSessionId(newSessionId);
    localStorage.setItem("sessionId", newSessionId);

    // philosopherId が設定されている場合のみセッション開始ログを記録
    if (selectedPhilosopherId) {
      console.log("Recording start_session with philosopherId:", selectedPhilosopherId);
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          sessionId: newSessionId,
          action: "start_session",
          timestamp: new Date().toISOString(),
          philosopherId: selectedPhilosopherId,
          category: dailyQuestion?.category,
        }),
      });
    } else {
      console.warn("Skipping start_session log: philosopherId is not set.");
    }

    // コンポーネントのアンマウント時にセッション終了ログを記録
    return () => {
      if (selectedPhilosopherId) {
        console.log("Recording end_session with philosopherId:", selectedPhilosopherId);
        fetch("/api/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            sessionId: newSessionId,
            action: "end_session",
            timestamp: new Date().toISOString(),
            philosopherId: selectedPhilosopherId,
            category: dailyQuestion?.category,
          }),
        });
      } else {
        console.warn("Skipping end_session log: philosopherId is not set.");
      }
    };
  }, [selectedPhilosopherId, dailyQuestion]); // selectedPhilosopherId と dailyQuestion を依存配列に追加

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
    const actionsMatch = reply.match(/1\. \[.*\], 2\. \[.*\], 3\. \[.*\]/);
    if (actionsMatch) {
      const actionsText = actionsMatch[0];
      const actions = actionsText.split(", ").map((action) => {
        return action.replace(/^\d+\.\s/, "").trim();
      });
      return { actions };
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

    saveLog("end_session", { action: "Session ended after action plan selection" });

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

    const systemPromptWithQuestion = `
あなたは${selectedPhilosopher.name}として、ユーザーの学びと成長を促す対話を提供するプロフェッショナルなコーチです。ユーザーの課題や考えを深掘りし、${selectedPhilosopher.name}の哲学的視点や教えを基に、自然な会話を通じて洞察や新たな視点を提示してください。以下のガイドラインに従ってください：

1. **応答の構造**：
   - 応答は3文で構成してください。1文目はユーザーの感情や課題に共感する内容、2文目は${selectedPhilosopher.name}の哲学的視点や教えを引用して洞察を提供する内容、3文目は自己反省を促す質問とする。
   - 応答に「共感：」「展開：」「問いかけ：」などのラベルを含めないでください。自然な会話として3文をつなげて記述してください。
   - 例：
     その悩み、とても共感できます。${selectedPhilosopher.name}は「{教え}」と言っています。この考えをどのように活かせそうですか？

2. **学びと成長を促す**：
   - ユーザーの入力に対して、${selectedPhilosopher.name}の哲学的視点や教えを引用し、関連する洞察を提供してください。
   - 自己反省を促す質問を投げかけ、次の対話を誘導してください。

3. **自然な会話**：
   - 定型的な応答を避け、自然な会話の流れを維持してください。
   - ユーザーの入力に応じて柔軟に対応し、対話を深める方向に進めてください。

4. **アクションプランの提示**：
   - ユーザーの入力が3回目（このメッセージが3回目の応答）の場合、最後に「まとめ」と「アクションプラン」を提示してください。
   - まとめ：これまでの対話を簡潔に振り返り、学びや気づきを強調してください（1～2文）。
   - アクションプラン：ユーザーの成長に直結する3つの具体的な行動を提案してください。形式は厳密に以下の通りでなければなりません：
     - 1. [行動1], 2. [行動2], 3. [行動3]
   - 例：
     まとめ：これまでの対話を通じて、時間管理の重要性について深く考えることができました。
     1. [毎朝5分間の瞑想を行う], 2. [週末に1時間読書する], 3. [1日1回感謝の気持ちを伝える]

**質問：**
${dailyQuestion.question}

**ユーザー入力：**
${input.trim()}
`;

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

      // アクションプラン部分をパースする前に、アクションプラン部分を除いた応答を表示
      const actionPlanMatch = reply.match(/1\. \[.*\], 2\. \[.*\], 3\. \[.*\]/);
      if (actionPlanMatch) {
        reply = reply.replace(/1\. \[.*\], 2\. \[.*\], 3\. \[.*\]/, "").trim();
      }

      const newAssistantMessage: Message = {
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);

      // アクションプランが含まれている場合、パースして表示
      if (actionPlanMatch) {
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
    if (!sessionStarted) {
      setSelectedPhilosopherId(e.target.value);
    }
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
              disabled={sessionStarted}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-200"
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
        </div>
      )}

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {selectedPhilosopherId && dailyQuestion && (
        <>
          <div className="flex-1 overflow-y-auto mb-16">
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

          {!parsedResult && (
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
          )}
        </>
      )}
    </div>
  );
}