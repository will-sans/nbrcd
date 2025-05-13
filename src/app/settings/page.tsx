"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ActionLog } from "@/types/actionLog";
import { createClient } from '@/utils/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const response = await fetch(`/api/users/me`);
        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }
        const data = await response.json();
        setCurrentUser(data.username);
        setCurrentEmail(data.email);

        const { data: logs, error: logsError } = await supabase
          .from('action_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false });

        if (logsError) {
          throw new Error(logsError.message || 'アクティビティログの取得に失敗しました');
        }

        setActivityLogs(logs || []);
      } catch (err) {
        console.error("Failed to fetch user or logs:", err);
        localStorage.removeItem("userId");
        localStorage.removeItem("currentUser");
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router, supabase]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message || 'ログアウトに失敗しました');
      }
      setCurrentUser(null);
      setCurrentEmail(null);
      setSuccess("ログアウトしました");
      setError(null);
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username || username.length < 3) {
      setError("ユーザー名は3文字以上で入力してください");
      return;
    }
    if (!email) {
      setError("メールアドレスを入力してください");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーIDが見つかりません');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const { error: authError } = await supabase.auth.updateUser({
        email,
        data: { username },
      });

      if (authError) {
        throw new Error(authError.message || 'ユーザー情報の更新に失敗しました');
      }

      setCurrentUser(username);
      setCurrentEmail(email);
      setSuccess("ユーザー情報が更新されました！");
      setError(null);
      setUsername("");
      setEmail("");
      setPassword("");
      clearTimeout(timeoutId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
    }
  };

  const handleDeleteUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("ユーザーIDが見つかりません");
        return;
      }

      if (!confirm("本当にデータを全て削除しますか？この操作は元に戻せません。")) {
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      if (authError) {
        throw new Error(authError.message || 'ユーザーの削除に失敗しました');
      }

      await supabase.from('point_logs').delete().eq('user_id', user.id);
      await supabase.from('todos').delete().eq('user_id', user.id);
      await supabase.from('sessions').delete().eq('user_id', user.id);
      await supabase.from('action_logs').delete().eq('user_id', user.id);
      await supabase.from('user_settings').delete().eq('user_id', user.id);

      setCurrentUser(null);
      setCurrentEmail(null);
      setActivityLogs([]);
      setSuccess("ユーザーデータが削除されました");
      setError(null);
      router.push("/login");
      clearTimeout(timeoutId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col relative">
      <button
        onClick={() => router.push("/")}
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
        aria-label="ホームへ移動"
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

      <h1 className="text-2xl font-bold mb-4 text-center">ユーザー情報</h1>

      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-bold mb-2">ユーザー情報</h2>
        {isLoading ? (
          <p className="mb-2">読み込み中...</p>
        ) : (
          currentUser && (
            <div className="mb-2">
              <p><strong>ユーザー名:</strong> {currentUser}</p>
              <p><strong>メールアドレス:</strong> {currentEmail}</p>
            </div>
          )
        )}
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {success && <div className="text-green-500 mb-4">{success}</div>}
        <form onSubmit={handleUpdateUser}>
          <div className="mb-2">
            <label htmlFor="username" className="block mb-1">新しいユーザー名</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="新しいユーザー名を入力してください"
              className="border p-2 w-full"
              minLength={3}
              autoComplete="username"
            />
          </div>
          <div className="mb-2">
            <label htmlFor="email" className="block mb-1">新しいメールアドレス</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="新しいメールアドレスを入力してください"
              className="border p-2 w-full"
              autoComplete="email"
            />
          </div>
          <div className="mb-2">
            <label htmlFor="password" className="block mb-1">新しいパスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="新しいパスワードを入力してください（任意）"
              className="border p-2 w-full"
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-2"
            aria-label="ユーザー情報を更新"
          >
            情報を更新
          </button>
          <button
            onClick={handleLogout}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded mr-2"
            aria-label="ログアウト"
          >
            ログアウト
          </button>
          <button
            onClick={handleDeleteUser}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            aria-label="ユーザーデータを削除"
          >
            アカウントを削除
          </button>
        </form>
      </div>

      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-bold mb-2">アクティビティログ</h2>
        {activityLogs.length > 0 ? (
          <ul className="space-y-2">
            {activityLogs.map((log, index) => (
              <li key={index} className="border-b pb-2">
                <p><strong>アクション:</strong> {log.action}</p>
                <p><strong>哲学者:</strong> {log.philosopherId || '未指定'}</p>
                {log.category && (
                  <p><strong>カテゴリ:</strong> {log.category}</p>
                )}
                <p><strong>時間:</strong> {new Date(log.timestamp).toLocaleString()}</p>
                {log.details && (
                  <p><strong>詳細:</strong> {JSON.stringify(log.details)}</p>
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