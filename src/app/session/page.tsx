"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { philosophers } from "@/data/philosophers";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export default function SessionPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedPhilosopherId, setSelectedPhilosopherId] = useState("drucker");
  const [sessionStarted, setSessionStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState<Message | null>(null);

  const handleStartSession = async () => {
    if (!input.trim()) return;

    const selectedPhilosopher = philosophers.find((p) => p.id === selectedPhilosopherId);
    if (!selectedPhilosopher) {
      setError("Philosopher not found");
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
        throw new Error(errorData.error || "Failed to fetch from API");
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
    } catch (error: any) {
      console.error(error);
      setError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSendDuringSession = async () => {
    if (!input.trim()) return;

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
        throw new Error(errorData.error || "Failed to fetch from API");
      }

      const data = await response.json();
      const reply = data.choices[0]?.message?.content || "";
      console.log("Response:", reply);

      const newAssistantMessage: Message = {
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
    } catch (error: any) {
      console.error(error);
      setError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      sessionStarted ? handleSendDuringSession() : handleStartSession();
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-4">哲学チャットセッション</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {loading && <div className="text-gray-500 mb-4">処理中...</div>}

      {/* 哲学セレクター */}
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

      {/* チャットログ */}
      <div className="flex-1 overflow-y-auto mb-4 border p-4 rounded bg-gray-50">
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

      {/* 入力フォーム */}
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