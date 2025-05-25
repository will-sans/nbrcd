"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from '@/utils/supabase/client';

export default function SettingsPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [currentGoal, setCurrentGoal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showEmailPasswordModal, setShowEmailPasswordModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [activeTab, setActiveTab] = useState<"userInfo" | "userGuide">("userInfo");

  const supabase = getSupabaseClient();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Failed to get user:", userError?.message);
        router.push("/login");
        return;
      }
      console.log("User already logged in on mount:", user);

      try {
        const { data: { session }, error: fetchSessionError } = await supabase.auth.getSession();
        if (fetchSessionError || !session) {
          console.error("Failed to get session:", fetchSessionError?.message);
          throw new Error("セッションの取得に失敗しました");
        }

        const headers: HeadersInit = {
          Authorization: `Bearer ${session.access_token}`,
          'X-Refresh-Token': session.refresh_token,
        };

        const response = await fetch(`/api/users/me`, {
          headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch user: ${response.status} ${errorText}`);
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }

        const data = await response.json();
        setCurrentUser(data.username);
        setCurrentEmail(data.email);

        // Fetch the user's latest session metadata to get the goal
        const { data: sessionData, error: sessionDataError } = await supabase
          .from('user_session_metadata')
          .select('goal')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (sessionDataError) {
          if (sessionDataError.code === 'PGRST116') {
            // No record exists, which is fine; goal will be null
            setCurrentGoal(null);
          } else {
            console.error("Failed to fetch user session metadata:", sessionDataError);
            throw new Error("セッション情報の取得に失敗しました");
          }
        } else {
          setCurrentGoal(sessionData?.goal || null);
        }
      } catch (err: unknown) {
        console.error("ユーザー情報の取得に失敗しました:", err);
        localStorage.removeItem("userId");
        localStorage.removeItem("currentUser");
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();

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

  const handleUpdateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newGoal || newGoal.length < 3) {
      setError("目標は3文字以上で入力してください");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ユーザーIDが見つかりません');
      }

      const { data: { session }, error: updateSessionError } = await supabase.auth.getSession();
      if (updateSessionError || !session) {
        console.error("Failed to get session:", updateSessionError?.message);
        throw new Error("セッションの取得に失敗しました");
      }

      // Fetch the current metadata to preserve existing values
      const { data: currentMetadata, error: fetchError } = await supabase
        .from('user_session_metadata')
        .select('summary, user_inputs, selected_action')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error("Failed to fetch current metadata:", fetchError);
        throw new Error("現在のメタデータの取得に失敗しました");
      }

      // Update or insert the goal in user_session_metadata, preserving existing values
      const { error: upsertError } = await supabase
        .from('user_session_metadata')
        .upsert({
          user_id: user.id,
          session_id: `settings-update-${Date.now()}`,
          summary: currentMetadata?.summary || "", // Preserve existing summary
          user_inputs: currentMetadata?.user_inputs || [], // Preserve existing user_inputs
          selected_action: currentMetadata?.selected_action || null, // Preserve existing selected_action
          updated_at: new Date().toISOString(),
          goal: newGoal,
        }, { onConflict: 'user_id' });

      if (upsertError) {
        throw new Error(upsertError.message || '目標の更新に失敗しました');
      }

      setCurrentGoal(newGoal);
      setSuccess("目標が更新されました！");
      setShowGoalModal(false);
      setNewGoal("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col relative">
      <div className="absolute top-4 left-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="設定画面を閉じる"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="absolute top-4 right-4">
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
      </div>

      <h1 className="text-2xl font-bold mb-4 text-center">設定</h1>

      {/* Tab Navigation */}
      <div className="flex justify-center mb-4">
        <button
          onClick={() => setActiveTab("userInfo")}
          className={`px-4 py-2 font-medium ${activeTab === "userInfo" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-600 hover:text-gray-800"}`}
        >
          ユーザー情報
        </button>
        <button
          onClick={() => setActiveTab("userGuide")}
          className={`px-4 py-2 font-medium ${activeTab === "userGuide" ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-600 hover:text-gray-800"}`}
        >
          ユーザーガイド
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "userInfo" && (
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
                <p>
                  <strong>目標: </strong>
                  <span
                    onClick={() => {
                      setNewGoal(currentGoal || "");
                      setShowGoalModal(true);
                    }}
                    className="text-blue-500 hover:underline cursor-pointer"
                  >
                    {currentGoal || "目標を設定してください"}
                  </span>
                </p>
              </div>
            )
          )}
          {error && <div className="text-red-500 mb-4">{error}</div>}
          {success && <div className="text-green-500 mb-4">{success}</div>}
        </div>
      )}

      {activeTab === "userGuide" && (
        <div className="mb-6 p-4 border rounded bg-gray-100">
          <h2 className="text-xl font-bold mb-2">ユーザーガイド</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Q: アプリがフリーズしたり、認証に時間がかかる場合はどうすればいいですか？</h3>
              <p className="text-gray-700">
                A: ネットワークの問題やサーバーの遅延により、認証が遅れることがあります。5秒以上「読み込み中...」が表示される場合、アプリのウィンドウ（タブ）を閉じて、再度NBRCDアプリを開いてください。オフラインの場合は、ネットワークに接続してからお試しください。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Q: Safariで複数のタブが開いてしまうのはなぜですか？</h3>
              <p className="text-gray-700">
                A: NBRCDはPWA（プログレッシブウェブアプリ）として動作します。Safariでご利用後、必ずタブを閉じてアプリを終了してください。これにより、不要なタブが溜まるのを防ぎ、快適にご利用いただけます。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Q: 学びセッションやコンサルティングセッションの違いは何ですか？</h3>
              <p className="text-gray-700">
                A: 学びセッションでは、経営哲学に基づいた対話を通じて自己反省や行動計画を立てます。コンサルティングセッションでは、より具体的な課題に対するアドバイスを得られます。ホーム画面からどちらかを選んで開始してください。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Q: ポイントは何に使えますか？</h3>
              <p className="text-gray-700">
                A: ポイントはログインやアクション選択、タスク完了などで獲得できます。現在は進捗の指標として機能しますが、将来的に特典や機能の拡張を予定しています。ポイント履歴は「ポイント」ページで確認できます。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Q: オフラインでもアプリを使えますか？</h3>
              <p className="text-gray-700">
                A: NBRCDのご利用はインターネット接続が必要です。ネットワーク状態を確認してください。
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Q: 『おすすめ質問を表示』を押したら、エラーが出ます。</h3>
              <p className="text-gray-700">
                A: Safariの履歴が残っているとエラーになる場合がございます。iPhoneの設定→アプリ→Safari→履歴とWebサイトデータを消去→今日と昨日にチェック→履歴を消去してください。
              </p>
            </div>
          </div>
        </div>
      )}

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
              onChange={(e) => setNewEmail(e.target.value)}
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

      {showGoalModal && (
        <div className="fixed inset-x-0 bottom-0 bg-white shadow-lg p-4 animate-slide-up">
          <h2 className="text-xl font-bold mb-2">目標を設定</h2>
          <form onSubmit={handleUpdateGoal}>
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              placeholder="目標を入力してください（例：生産性を向上させる）"
              className="border p-2 w-full mb-2"
              minLength={3}
              autoComplete="off"
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
                onClick={() => setShowGoalModal(false)}
                className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}