"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      router.push("/"); // ログイン済みの場合はホーム画面にリダイレクト
    }
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || username.length < 3) {
      setError("ユーザー名は3文字以上で入力してください");
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "ユーザー登録に失敗しました");
      }

      const user = await response.json();
      localStorage.setItem("userId", user.id.toString());
      localStorage.setItem("currentUser", user.username);
      setSuccess("ユーザー登録が完了しました！");
      setError(null);
      setUsername("");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col justify-center">
      <h1 className="text-2xl font-bold mb-4 text-center">ログイン</h1>

      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-bold mb-2">ユーザー登録</h2>
        <p className="mb-2">ユーザー登録して、セッションを開始してください。</p>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {success && <div className="text-green-500 mb-4">{success}</div>}
        <form onSubmit={handleRegister}>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ユーザー名を入力してください"
            className="border p-2 w-full mb-2"
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            aria-label="ユーザー登録"
          >
            登録
          </button>
        </form>
      </div>
    </div>
  );
}