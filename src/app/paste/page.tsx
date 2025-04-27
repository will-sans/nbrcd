"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PastePage() {
  const router = useRouter();
  const [pasteText, setPasteText] = useState("");
  const [parsedActions, setParsedActions] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState("");

  const handleParse = () => {
    if (!pasteText.trim()) return;

    const actions: string[] = [];

    // パースロジック：まとめテキストから「-」で始まる行をアクションリストとして抽出
    const lines = pasteText.split("\\n").map(line => line.trim());
    let isActionSection = false;

    for (const line of lines) {
      if (line.includes("アクションプラン") || line.includes("【アクションプラン】")) {
        isActionSection = true;
      } else if (isActionSection && (line.startsWith("-") || line.startsWith("・"))) {
        actions.push(line.replace(/^[-・]\\s*/, ""));
      }
    }

    setParsedActions(actions);
  };

  const handleSaveAction = () => {
    if (!selectedAction) return;

    const todos = JSON.parse(localStorage.getItem("todos") || "[]");
    const newTodo = {
      id: Date.now(),
      text: selectedAction,
      done: false,
      date: new Date().toISOString().split("T")[0], // 日付付き
    };
    localStorage.setItem("todos", JSON.stringify([...todos, newTodo]));

    alert("ToDoに追加しました！");
    router.push("/todo");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-6">まとめ貼り付け → アクション抽出</h1>

      {/* 貼り付けエリア */}
      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        placeholder="ここにChatGPTからコピペしたまとめを貼り付けてください"
        className="border p-3 w-full h-48 rounded mb-4"
      />

      {/* パースボタン */}
      <button
        onClick={handleParse}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-6"
      >
        アクションを抽出する
      </button>

      {/* 抽出されたアクションリスト */}
      {parsedActions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">抽出されたアクションプラン</h2>
          <div className="space-y-2">
            {parsedActions.map((action, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="action"
                  value={action}
                  onChange={(e) => setSelectedAction(e.target.value)}
                />
                <label>{action}</label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ToDo登録ボタン */}
      {selectedAction && (
        <button
          onClick={handleSaveAction}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          選んだアクションをToDoに登録
        </button>
      )}
    </div>
  );
}
