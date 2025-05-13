"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { philosophers } from "@/data/philosophers";
import { questions } from "@/data/questions";
import { Question } from "@/types/question";
import { ActionLog } from "@/types/actionLog";
import { FaBars, FaCheck, FaTrophy } from "react-icons/fa";
import { v4 as uuidv4 } from "uuid";
import { createClient } from '@/utils/supabase/client';

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
  const [isLoading, setIsLoading] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async (retries = 3, delay = 1000) => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error || !user) {
            throw new Error('認証されていません');
          }

          const response = await fetch("/api/users/me");
          if (!response.ok) {
            throw new Error(`Failed to fetch user: ${response.statusText}`);
          }
          const data = await response.json();
          setCurrentUser(data.username || user.user_metadata.username || user.email);
          setIsLoading(false);
          return;
        } catch (err) {
          console.error(`Attempt ${attempt} failed:`, err);
          if (attempt === retries) {
            console.error("Max retries reached, signing out:", err);
            await supabase.auth.signOut();
            router.push("/login");
          } else {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        checkUser();
      } else if (event === 'SIGNED_OUT' || !session) {
        router.push("/login");
      }
    });

    checkUser();

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  const loadLastQuestionId = useCallback(async (philosophy: string): Promise<number> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return -1;

    const { data, error } = await supabase
      .from('user_settings')
      .select('last_question_ids')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return -1;

    const lastQuestionIds = data.last_question_ids || {};
    return lastQuestionIds[philosophy] || -1;
  }, [supabase]);

  const saveLastQuestionId = async (philosophy: string, lastId: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_settings')
      .select('last_question_ids')
      .eq('user_id', user.id)
      .single();

    const lastQuestionIds = data?.last_question_ids || {};
    lastQuestionIds[philosophy] = lastId;

    if (error && error.code !== 'PGRST116') {
      console.error("Failed to fetch user settings:", error);
      return;
    }

    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, last_question_ids: lastQuestionIds }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error("Failed to save last question ID:", upsertError);
    }
  };

  const savePoints = useCallback(async (action: string, points: number) => {
    const allowedActions = ["login", "action_select", "task_complete"];
    if (!allowedActions.includes(action)) {
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user found in Supabase Auth');
      return;
    }

    try {
      const { error } = await supabase
        .from('point_logs')
        .insert({
          user_id: user.id,
          action,
          points,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        throw new Error(error.message || 'ポイントの保存に失敗しました');
      }
    } catch (err) {
      console.error("Failed to save points:", err);
    }
  }, [supabase]);

  const handleLoginPoints = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentDate = new Date().toDateString();

    const { data, error } = await supabase
      .from('user_settings')
      .select('last_point_added_date, last_login_date, login_streak')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Failed to fetch user settings:", error);
      return;
    }

    const lastPointAddedDate = data?.last_point_added_date;
    if (lastPointAddedDate === currentDate) {
      return;
    }

    const lastLogin = data?.last_login_date;
    const streakCount = data?.login_streak || 0;

    let newStreak = 1;
    if (lastLogin) {
      const lastDate = new Date(lastLogin);
      const yesterday = new Date();
      yesterday.setDate(new Date().getDate() - 1);

      if (lastDate.toDateString() === yesterday.toDateString()) {
        newStreak = streakCount + 1;
      }
    }

    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        last_login_date: currentDate,
        login_streak: newStreak,
        last_point_added_date: currentDate,
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error("Failed to update user settings:", upsertError);
      return;
    }

    const basePoints = 30;
    const bonusPoints = newStreak * 6;
    await savePoints("login", basePoints + bonusPoints);
  }, [supabase, savePoints]);

  const extractActions = (reply: string): { updatedReply: string; actions: string[] } => {
    const actionPlanMatch = reply.match(/1\. \[.*\], 2\. \[.*\], 3\. \[.*\]/);
    let updatedReply = reply;
    let actions: string[] = [];

    if (actionPlanMatch) {
      updatedReply = reply.replace(/1\. \[.*\], 2\. \[.*\], 3\. \[.*\]/, "").trim();
      if (updatedReply.includes("まとめ：")) {
        const parts = updatedReply.split("まとめ：");
        updatedReply = `${parts[0].trim()}\n\nまとめ：${parts[1]?.trim() || ""}`;
      }

      const actionsText = actionPlanMatch[0];
      actions = actionsText.split(", ").map((action) =>
        action.replace(/^\d+\.\s/, "").trim()
      );
    }

    return { updatedReply, actions };
  };

  useEffect(() => {
    handleLoginPoints();
  }, [handleLoginPoints]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedPhilosopherId) return;

      const newSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setSessionId(newSessionId);
    };

    checkSession();
  }, [selectedPhilosopherId, dailyQuestion?.category, supabase.auth]);

  useEffect(() => {
    if (selectedPhilosopherId) {
      const philosopherQuestions = questions
        .filter((q) => q.philosophy === selectedPhilosopherId)
        .sort((a, b) => a.id - b.id);

      loadLastQuestionId(selectedPhilosopherId).then((lastId) => {
        let nextQuestion = philosopherQuestions.find((q) => q.id > lastId);
        if (!nextQuestion) {
          nextQuestion = philosopherQuestions[0];
        }
        setDailyQuestion(nextQuestion);
        setMessages([]);
        setSessionStarted(false);
        setParsedResult(null);
        setSystemMessage(null);
        setSelectedAction(null);
      });
    }
  }, [selectedPhilosopherId, loadLastQuestionId]);

  const saveLog = async (action: string, details?: Record<string, string>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user found in Supabase Auth');
      return;
    }

    const log: ActionLog = {
      action,
      timestamp: new Date().toISOString(),
      sessionId: sessionId || '',
      philosopherId: selectedPhilosopherId || '',
      category: dailyQuestion?.category || '',
      details,
      userId: user.id,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      console.log('Sending log:', log);

      const response = await fetch("/api/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(log),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save log");
      }
      console.log("Successfully saved log to server:", log);

      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          conversation: messages,
          analysis: { sessionCount: messages.length },
          score: messages.length * 10,
        });

      if (sessionError) {
        console.error("Failed to save session:", sessionError);
      }
    } catch (error) {
      console.error("Failed to save log:", error);
    }
  };

  const saveActionToLocalStorageAndRedirect = async (action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('todos')
      .insert({
        id: uuidv4(),
        user_id: user.id,
        text: action,
        completed: false,
        date: new Date().toISOString(),
      });

    if (error) {
      console.error("Failed to save todo:", error);
      return;
    }

    await saveLog("end_session", { action: "Session ended after action plan selection" });

    if (selectedPhilosopherId && dailyQuestion) {
      await saveLastQuestionId(selectedPhilosopherId, dailyQuestion.id);
    }

    router.push("/todo/list");
  };

  const handleActionSelect = (action: string) => {
    setSelectedAction(action);
    savePoints("action_select", 10);
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
   - まとめ：これまでの対話を簡潔に振り返り、学びや気づきを強調してください（1～2文）。「まとめ：」の前に改行を2回（\n\n）入れてください。
   - アクションプラン：ユーザーの成長に直結する3つの具体的な行動を提案してください。形式は厳密に以下の通りでなければなりません：
     - 1. [行動1], 2. [行動2], 3. [行動3]
   - 例：
     ここまでの対話で、時間管理の課題が見えてきましたね。\n\n
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "APIからの取得に失敗しました");
      }

      const data = await response.json();
      let reply = data.choices[0]?.message?.content || "";
      console.log("Response:", reply);

      const { updatedReply, actions } = extractActions(reply);
      reply = updatedReply;

      console.log("Processed reply:", reply);

      const newAssistantMessage: Message = {
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
      setSessionStarted(true);

      if (actions.length > 0) {
        setParsedResult({ actions });
      }
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "APIからの取得に失敗しました");
      }

      const data = await response.json();
      let reply = data.choices[0]?.message?.content || "";
      console.log("Response:", reply);

      const { updatedReply, actions } = extractActions(reply);
      reply = updatedReply;

      console.log("Processed reply:", reply);

      const newAssistantMessage: Message = {
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);

      if (actions.length > 0) {
        setParsedResult({ actions });
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
          aria-label="設定へ移動"
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
          <div className="w-36">
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
          <button
            onClick={() => router.push("/points")}
            className="text-gray-600 hover:text-gray-800"
            aria-label="ポイント履歴を見る"
          >
            <FaTrophy size={24} />
          </button>
        </div>

        <button
          onClick={() => router.push("/todo/list")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="タスクリストへ移動"
        >
          <FaCheck size={24} />
        </button>
      </div>

      {!selectedPhilosopherId && (
        <div className="mb-4 p-4 bg-gray-100 rounded text-center">
          <h2 className="text-lg font-semibold">
            {isLoading ? "読み込み中..." : `こんにちは、${currentUser}さん`}
          </h2>
          <p className="text-gray-500 mt-2">
            哲学者を選択してセッションを開始してください。
          </p>
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
                    style={{ whiteSpace: "pre-line" }}
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
                        id={`action-${index}`}
                        type="radio"
                        name="action"
                        value={action}
                        checked={selectedAction === action}
                        onChange={() => handleActionSelect(action)}
                        className="mr-2"
                      />
                      <label htmlFor={`action-${index}`}>{action}</label>
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
                  id="chat-input"
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
                  aria-label={sessionStarted ? "メッセージを送信" : "セッションを開始"}
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