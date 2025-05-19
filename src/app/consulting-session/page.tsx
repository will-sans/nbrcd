"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { FaArrowLeft } from "react-icons/fa";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface SimilaritySearchResult {
  id: number;
  question: string;
  learning: string;
  quote: string;
  category: string;
  book: string;
  chapter: string;
  similarity: number;
}

export default function ConsultingSession() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Failed to get user:", userError?.message);
        router.push("/login");
        return;
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session);
      if (event === 'SIGNED_OUT' || !session) {
        router.push("/login");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setError("ネットワークに接続されていません。接続を確認してください。");
      return;
    }
    if (!input.trim()) {
      setError("入力してください");
      return;
    }
    if (input.trim().length < 3) {
      setError("もう少し詳しく入力してください");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get user:", userError?.message);
      router.push("/login");
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

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("Failed to get session:", sessionError?.message);
        throw new Error("セッションの取得に失敗しました");
      }

      let relevantContext = '';
      try {
        const response = await fetch('/api/similarity-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            'X-Refresh-Token': session.refresh_token,
          },
          body: JSON.stringify({ query: input.trim() }),
        });

        if (!response.ok) {
          throw new Error('Similarity search failed');
        }

        const { results } = await response.json();
        relevantContext = results
          .map((match: SimilaritySearchResult) =>
            `Relevant Quote: "${match.quote}"\nLearning: ${match.learning}\nSource: ${match.book}, ${match.chapter}`
          )
          .join('\n\n');
      } catch (error) {
        console.error('Error during similarity search:', error);
        relevantContext = 'No relevant context found.';
      }

      const systemPrompt = `
あなたは経営哲学に基づき、ユーザーの悩みや課題に対して深い洞察を提供するプロフェッショナルなコンサルタントです。
ユーザーの入力に基づき、関連する経営哲学的知識を引用し、実践的なアドバイスを提供してください。
以下のガイドラインに従ってください：

**関連する知識**：
${relevantContext}

1. **応答の構造**：
   - 応答は3文で構成してください。
   - 1文目はユーザーの感情や課題に共感する内容、
   - 2文目は関連する哲学的知識や引用を基にした洞察を提供する内容、
   - 3文目はユーザーに次のステップを考えさせる質問とする。
   - 例：
     その悩み、とてもよくわかります。ピーター・ドラッカーは「時間を制する者だけが、自らの成果を制することができる」と言っています。この考えをどのように活かせそうですか？

2. **自然な会話**：
   - 定型的な応答を避け、自然な会話の流れを維持してください。
   - ユーザーの入力に応じて柔軟に対応し、対話を深める方向に進めてください。

**ユーザー入力**：
${input.trim()}
`;

      const systemMessage: Message = {
        role: "system",
        content: systemPrompt,
      };

      const messagesWithSystem = [systemMessage, ...updatedMessages];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          'X-Refresh-Token': session.refresh_token,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: messagesWithSystem,
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
      const reply = data.choices[0]?.message?.content || "";
      console.log("Response:", reply);

      const newAssistantMessage: Message = {
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setLoading(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="ホームに戻る"
        >
          <FaArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold">コンサルティングセッション</h1>
        <div className="w-6"></div>
      </div>

      {error && (
        <div className="text-red-500 mb-4 flex items-center justify-between">
          <span>{error}</span>
          {isOnline && (
            <button
              onClick={() => setError(null)}
              className="text-blue-500 hover:underline"
            >
              閉じる
            </button>
          )}
        </div>
      )}

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
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-center">
          <input
            id="consult-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="悩みや課題を入力してください..."
            className="flex-1 border p-2 rounded-l-md"
            ref={inputRef}
            disabled={loading || !isOnline}
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r-md"
            disabled={loading || !isOnline}
            aria-label="送信"
          >
            {loading ? "送信中..." : "送信"}
          </button>
        </form>
      </div>
    </div>
  );
}