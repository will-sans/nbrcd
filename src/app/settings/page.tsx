"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from '@/utils/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showEmailPasswordModal, setShowEmailPasswordModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showAddToHomeScreen, setShowAddToHomeScreen] = useState(false); // iOSホーム画面追加プロンプト用

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
      } catch (err) {
        console.error("ユーザー情報の取得に失敗しました:", err);
        localStorage.removeItem("userId");
        localStorage.removeItem("currentUser");
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    // iOSデバイスでスタンドアロンモードでない場合にプロンプトを表示
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
      setShowAddToHomeScreen(true);
    }

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
      setSuccess("ユーザーデータが削除されました");
      setError(null);
      router.push("/login");
      clearTimeout(timeoutId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newUsername || newUsername.length < 3) {
      setError("ユーザー名は3文字以上で入力してください");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーIDが見つかりません');
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: { username: newUsername },
      });

      if (authError) {
        throw new Error(authError.message || 'ユーザー名の更新に失敗しました');
      }

      setCurrentUser(newUsername);
      setSuccess("ユーザー名が更新されました！");
      setShowUsernameModal(false);
      setNewUsername("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
    }
  };

  const handleUpdateEmailPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newEmail) {
      setError("メールアドレスを入力してください");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーIDが見つかりません');
      }

      const updates: { email?: string; password?: string } = { email: newEmail };
      if (newPassword) {
        updates.password = newPassword;
      }

      const { error: authError } = await supabase.auth.updateUser(updates);

      if (authError) {
        throw new Error(authError.message || 'ユーザー情報の更新に失敗しました');
      }

      setCurrentEmail(newEmail);
      setSuccess("ユーザー情報が更新されました！");
      setShowEmailPasswordModal(false);
      setNewEmail("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newPassword || newPassword.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーIDが見つかりません');
      }

      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) {
        throw new Error(authError.message || 'パスワードの更新に失敗しました');
      }

      setSuccess("パスワードが更新されました！");
      setShowPasswordModal(false);
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col relative">
      {/* 右上のメニューアイコン */}
      <div className="absolute top-4 right-4 flex space-x-2">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="text-gray-600 hover:text-gray-800"
          aria-label="メニューを開く"
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
              d="M6 12h12m-12 6h12m-12-6h12"
            />
          </svg>
        </button>
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-800"
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
      </div>

      <h1 className="text-2xl font-bold mb-4 text-center">設定</h1>

      {/* ユーザー情報セクション */}
      <div className="mb-6 p-4 border rounded bg-gray-100">
        <h2 className="text-xl font-bold mb-2">ユーザー情報</h2>
        {isLoading ? (
          <p className="mb-2">読み込み中...</p>
        ) : (
          currentUser && (
            <div className="mb-2 space-y-2">
              <p>
                <strong>ユーザー名: </strong>
                <span
                  onClick={() => setShowUsernameModal(true)}
                  className="text-blue-500 hover:underline cursor-pointer"
                >
                  {currentUser}
                </span>
              </p>
              <p>
                <strong>メールアドレス: </strong>
                <span
                  onClick={() => setShowEmailPasswordModal(true)}
                  className="text-blue-500 hover:underline cursor-pointer"
                >
                  {currentEmail}
                </span>
              </p>
              <p>
                <span
                  onClick={() => setShowPasswordModal(true)}
                  className="text-blue-500 hover:underline cursor-pointer"
                >
                  パスワードを変更
                </span>
              </p>
            </div>
          )
        )}
        {error && <div className="text-red-500 mb-4">{error}</div>}
        {success && <div className="text-green-500 mb-4">{success}</div>}
      </div>

      {/* メニュー（ログアウトとデータ削除） */}
      {showMenu && (
        <div className="fixed inset-x-0 bottom-0 bg-white shadow-lg p-4 flex flex-col space-y-4 animate-slide-up">
          <button
            onClick={handleLogout}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
            aria-label="ログアウト"
          >
            ログアウト
          </button>
          <button
            onClick={handleDeleteUser}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            aria-label="ユーザーデータを削除"
          >
            データ削除
          </button>
          <button
            onClick={() => setShowMenu(false)}
            className="text-gray-600 hover:underline"
          >
            キャンセル
          </button>
        </div>
      )}

      {/* ユーザー名変更モーダル */}
      {showUsernameModal && (
        <div className="fixed inset-x-0 bottom-0 bg-white shadow-lg p-4 animate-slide-up">
          <h2 className="text-xl font-bold mb-2">ユーザー名を変更</h2>
          <form onSubmit={handleUpdateUsername}>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="新しいユーザー名を入力してください"
              className="border p-2 w-full mb-2"
              minLength={3}
              autoComplete="username"
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                更新
              </button>
              <button
                type="button"
                onClick={() => setShowUsernameModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* メールアドレスとパスワード変更モーダル */}
      {showEmailPasswordModal && (
        <div className="fixed inset-x-0 bottom-0 bg-white shadow-lg p-4 animate-slide-up">
          <h2 className="text-xl font-bold mb-2">メールアドレスとパスワードを変更</h2>
          <form onSubmit={handleUpdateEmailPassword}>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="新しいメールアドレスを入力してください"
              className="border p-2 w-full mb-2"
              autoComplete="email"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新しいパスワード（任意）"
              className="border p-2 w-full mb-2"
              minLength={6}
              autoComplete="new-password"
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                更新
              </button>
              <button
                type="button"
                onClick={() => setShowEmailPasswordModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* パスワード変更モーダル */}
      {showPasswordModal && (
        <div className="fixed inset-x-0 bottom-0 bg-white shadow-lg p-4 animate-slide-up">
          <h2 className="text-xl font-bold mb-2">パスワードを変更</h2>
          <form onSubmit={handleUpdatePassword}>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新しいパスワードを入力してください"
              className="border p-2 w-full mb-2"
              minLength={6}
              autoComplete="new-password"
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                更新
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* iOS向けホーム画面追加プロンプト */}
      {showAddToHomeScreen && (
        <div className="fixed bottom-4 left-4 right-4 p-4 bg-blue-100 border border-blue-300 rounded-lg shadow-lg">
          <p className="text-sm">
            iPhoneのホーム画面にアプリを追加するには、Safariの「共有」ボタンをタップし、「ホーム画面に追加」を選択してください。
          </p>
          <button
            onClick={() => setShowAddToHomeScreen(false)}
            className="mt-2 text-blue-600 hover:underline"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}