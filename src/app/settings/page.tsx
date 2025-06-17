"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { useTimezone } from "@/lib/timezone-context";
import { FaArrowLeft, FaBars } from "react-icons/fa";
import ErrorBoundary from "@/components/ErrorBoundary";

const availableTimezones = [
  "Asia/Tokyo",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Australia/Sydney",
];

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { timezone, setTimezone } = useTimezone();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [currentGoal, setCurrentGoal] = useState<string | null>(null);
  const [currentTimezone, setCurrentTimezone] = useState<string>(timezone);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showUsernameModal, setShowUsernameModal] = useState<boolean>(false);
  const [showEmailPasswordModal, setShowEmailPasswordModal] = useState<boolean>(false);
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [showTimezoneModal, setShowTimezoneModal] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [newGoal, setNewGoal] = useState<string>("");
  const [newTimezone, setNewTimezone] = useState<string>(timezone);
  const [activeTab, setActiveTab] = useState<"userInfo" | "userGuide">("userInfo");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      if (!isMounted) return;

      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Failed to get user:", userError?.message);
        if (isMounted) {
          router.push("/login");
        }
        return;
      }

      try {
        const { data: { session }, error: fetchSessionError } = await supabase.auth.getSession();
        if (fetchSessionError || !session) {
          throw new Error("セッションの取得に失敗しました");
        }

        const headers: HeadersInit = {
          Authorization: `Bearer ${session.access_token}`,
          "X-Refresh-Token": session.refresh_token,
        };

        const response = await fetch(`/api/users/me`, { headers });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ユーザー情報の取得に失敗しました: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        if (isMounted) {
          setCurrentUser(data.username);
          setCurrentEmail(data.email);
        }

        // Query user_session_metadata, handling missing rows
        const { data: sessionData, error: sessionDataError } = await supabase
          .from("user_session_metadata")
          .select("goal")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sessionDataError) {
          if (sessionDataError.code !== "PGRST116" && sessionDataError.code !== "406") {
            console.error("Session metadata error:", sessionDataError);
            throw new Error(`セッション情報の取得に失敗しました: ${sessionDataError.message}`);
          }
          if (isMounted) {
            setCurrentGoal(null);
          }
        } else {
          if (isMounted) {
            setCurrentGoal(sessionData?.goal || null);
          }
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("timezone")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) {
          if (profileError.code !== "PGRST116" && profileError.code !== "406") {
            console.error("Profile error:", profileError);
            throw new Error(`タイムゾーン情報の取得に失敗しました: ${profileError.message}`);
          }
          if (isMounted) {
            setCurrentTimezone("Asia/Tokyo");
            setTimezone("Asia/Tokyo");
          }
        } else {
          const fetchedTimezone = profileData?.timezone || "Asia/Tokyo";
          if (isMounted) {
            setCurrentTimezone(fetchedTimezone);
            setTimezone(fetchedTimezone);
          }
        }
      } catch (err) {
        console.error("ユーザー情報の取得に失敗しました:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "エラーが発生しました");
          localStorage.removeItem("userId");
          localStorage.removeItem("currentUser");
          router.push("/login");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !session) {
        if (isMounted) {
          localStorage.removeItem("userId");
          localStorage.removeItem("currentUser");
          router.push("/login");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase, setTimezone]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(error.message || "ログアウトに失敗しました");
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

      setIsDeleting(true); // Start deletion UI state
      setError(null);
      setSuccess(null);

      // Call the server-side API to delete the user
      const response = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 405) {
          throw new Error("サーバーがこの操作をサポートしていません。管理者に連絡してください。");
        }
        throw new Error(`ユーザーの削除に失敗しました: ${response.status} ${errorText}`);
      }

      // Clear local storage
      localStorage.removeItem("userId");
      localStorage.removeItem("currentUser");

      setCurrentUser(null);
      setCurrentEmail(null);
      setSuccess("ユーザーデータが削除されました");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "エラーが発生しました";
      setError(errorMessage);
      setSuccess(null);
      console.error("Delete user error:", err);
    } finally {
      setIsDeleting(false);
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
        throw new Error("ユーザーIDが見つかりません");
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: { username: newUsername },
      });

      if (authError) {
        throw new Error(authError.message || "ユーザー名の更新に失敗しました");
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
        throw new Error("ユーザーIDが見つかりません");
      }

      const updates: { email?: string; password?: string } = { email: newEmail };
      if (newPassword) {
        updates.password = newPassword;
      }

      const { error: authError } = await supabase.auth.updateUser(updates);
      if (authError) {
        throw new Error(authError.message || "ユーザー情報の更新に失敗しました");
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
        throw new Error("ユーザーIDが見つかりません");
      }

      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) {
        throw new Error(authError.message || "パスワードの更新に失敗しました");
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
        throw new Error("ユーザーIDが見つかりません");
      }

      const { data: { session }, error: updateSessionError } = await supabase.auth.getSession();
      if (updateSessionError || !session) {
        throw new Error("セッションの取得に失敗しました");
      }

      const { data: currentMetadata, error: fetchError } = await supabase
        .from("user_session_metadata")
        .select("summary, user_inputs, selected_action")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw new Error(`現在のメタデータの取得に失敗しました: ${fetchError.message}`);
      }

      const { error: upsertError } = await supabase
        .from("user_session_metadata")
        .upsert(
          {
            user_id: user.id,
            session_id: `settings-update-${Date.now()}`,
            summary: currentMetadata?.summary || "",
            user_inputs: currentMetadata?.user_inputs || [],
            selected_action: currentMetadata?.selected_action || null,
            updated_at: new Date().toISOString(),
            goal: newGoal,
          },
          { onConflict: "user_id" }
        );

      if (upsertError) {
        throw new Error(upsertError.message || "目標の更新に失敗しました");
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

  const handleUpdateTimezone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("ユーザーIDが見つかりません");
      }

      const { error } = await supabase
        .from("profiles")
        .upsert(
          { user_id: user.id, timezone: newTimezone, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );

      if (error) {
        throw new Error(error.message || "タイムゾーンの更新に失敗しました");
      }

      setCurrentTimezone(newTimezone);
      setTimezone(newTimezone);
      setSuccess("タイムゾーンが更新されました！");
      setShowTimezoneModal(false);
      setNewTimezone(newTimezone);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
    }
  };

  return (
    <ErrorBoundary>
      <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen dark:bg-gray-900 dark:text-gray-100 flex flex-col relative">
        {success && !isDeleting && !error ? (
          <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="text-green-500 text-lg font-semibold mb-4 dark:text-green-400">{success}</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">まもなくログインページにリダイレクトします...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="ホームに戻る"
              >
                <FaArrowLeft size={24} />
              </button>
              <h1 className="text-xl font-semibold dark:text-gray-100">設定</h1>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="メニューを開く"
              >
                <FaBars size={24} />
              </button>
            </div>

            <div className="flex justify-center mb-4">
              <button
                onClick={() => setActiveTab("userInfo")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "userInfo"
                    ? "border-b-2 border-blue-500 text-blue-500 dark:border-blue-600 dark:text-blue-400"
                    : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                ユーザー情報
              </button>
              <button
                onClick={() => setActiveTab("userGuide")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "userGuide"
                    ? "border-b-2 border-blue-500 text-blue-500 dark:border-blue-600 dark:text-blue-400"
                    : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                ユーザーガイド
              </button>
            </div>

            {activeTab === "userInfo" && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-100 dark:bg-gray-800">
                <h2 className="text-base font-semibold mb-2 dark:text-gray-100">ユーザー情報</h2>
                {isLoading ? (
                  <p className="text-sm text-gray-500 dark:text-gray-500">読み込み中...</p>
                ) : isDeleting ? (
                  <p className="text-sm text-gray-500 dark:text-gray-500">削除中...</p>
                ) : (
                  currentUser && (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong className="dark:text-gray-300">ユーザー名: </strong>
                        <span
                          onClick={() => setShowUsernameModal(true)}
                          className="text-blue-500 hover:underline cursor-pointer dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {currentUser}
                        </span>
                      </p>
                      <p className="text-sm">
                        <strong className="dark:text-gray-300">メールアドレス: </strong>
                        <span
                          onClick={() => setShowEmailPasswordModal(true)}
                          className="text-blue-500 hover:underline cursor-pointer dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {currentEmail}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span
                          onClick={() => setShowPasswordModal(true)}
                          className="text-blue-500 hover:underline cursor-pointer dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          パスワードを変更
                        </span>
                      </p>
                      <p className="text-sm">
                        <strong className="dark:text-gray-300">目標: </strong>
                        <span
                          onClick={() => {
                            setNewGoal(currentGoal || "");
                            setShowGoalModal(true);
                          }}
                          className="text-blue-500 hover:underline cursor-pointer dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {currentGoal || "目標を設定してください"}
                        </span>
                      </p>
                      <p className="text-sm">
                        <strong className="dark:text-gray-300">タイムゾーン: </strong>
                        <span
                          onClick={() => {
                            setNewTimezone(currentTimezone);
                            setShowTimezoneModal(true);
                          }}
                          className="text-blue-500 hover:underline cursor-pointer dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {currentTimezone}
                        </span>
                      </p>
                    </div>
                  )
                )}
                {error && !success && (
                  <div className="text-red-500 mb-4 text-sm dark:text-red-400">{error}</div>
                )}
                {success && !isDeleting && !error && (
                  <div className="text-green-500 mb-4 text-sm dark:text-green-400">{success}</div>
                )}
              </div>
            )}

            {/* Rest of the render logic remains unchanged */}
            {activeTab === "userGuide" && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-100 dark:bg-gray-800">
                <h2 className="text-base font-semibold mb-2 dark:text-gray-100">ユーザーガイド</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold dark:text-gray-100">Q: アプリがフリーズしたり、認証に時間がかかる場合はどうすればいいですか？</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      A: ネットワークの問題やサーバーの遅延により、認証が遅れることがあります。5秒以上「読み込み中...」が表示される場合、アプリのウィンドウ（タブ）を閉じて、再度NBRCDアプリを開いてください。オフラインの場合は、ネットワークに接続してからお試しください。
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold dark:text-gray-100">Q: Safariで複数のタブが開いてしまうのはなぜですか？</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      A: NBRCDはPWA（プログレッシブウェブアプリ）として動作します。Safariで共有（画面下真ん中にある四角に上矢印のマーク）→ホーム画面に追加すると、アプリとしてご利用いただけますので、Safariで複数開く問題は起こらなくなります。
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold dark:text-gray-100">Q: 学びセッションやコンサルティングセッションの違いは何ですか？</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      A: 学びセッションでは、経営哲学に基づいた対話を通じて自己反省や行動計画を立てます。コンサルティングセッションでは、より具体的な課題に対するアドバイスを得られます。ホーム画面からどちらかを選んで開始してください。
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold dark:text-gray-100">Q: ポイントは何に使えますか？</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      A: ポイントはログインやアクション選択、タスク完了などで獲得できます。現在は進捗の指標として機能しますが、将来的に特典や機能の拡張を予定しています。ポイント履歴は「ポイント」ページで確認できます。
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold dark:text-gray-100">Q: オフラインでもアプリを使えますか？</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      A: NBRCDのご利用はインターネット接続が必要です。ネットワーク状態を確認してください。
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold dark:text-gray-100">Q: 『おすすめ質問を表示』を押したら、エラーが出ます。</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      A: Safariの履歴が残っているとエラーになる場合がございます。iPhoneの設定→アプリ→Safari→履歴とWebサイトデータを消去→今日と昨日にチェック→履歴を消去してください。
                    </p>
                  </div>
                </div>
              </div>
            )}

            {showMenu && (
              <div className="fixed inset-x-0 bottom-0 bg-white dark:bg-gray-900 shadow-lg p-4 flex flex-col space-y-2 z-50">
                <button
                  onClick={handleLogout}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-sm"
                  aria-label="ログアウト"
                >
                  ログアウト
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-sm"
                  aria-label="ユーザーデータを削除"
                  disabled={isDeleting}
                >
                  {isDeleting ? '削除中...' : 'データ削除'}
                </button>
                <a
                  href="/privacy-policy"
                  className="text-blue-500 hover:underline text-center text-sm dark:text-blue-400 dark:hover:text-blue-300"
                  aria-label="プライバシーポリシー"
                >
                  プライバシーポリシー
                </a>
                <a
                  href="/terms-of-service"
                  className="text-blue-500 hover:underline text-center text-sm dark:text-blue-400 dark:hover:text-blue-300"
                  aria-label="利用規約"
                >
                  利用規約
                </a>
                <button
                  onClick={() => setShowMenu(false)}
                  className="text-gray-600 hover:underline text-center text-sm dark:text-gray-400 dark:hover:text-gray-200"
                >
                  キャンセル
                </button>
              </div>
            )}

            {showUsernameModal && (
              <div className="fixed inset-x-0 bottom-0 bg-white dark:bg-gray-900 shadow-lg p-4 z-50">
                <h2 className="text-base font-semibold mb-2 dark:text-gray-100">ユーザー名を変更</h2>
                <form onSubmit={handleUpdateUsername}>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="新しいユーザー名を入力してください"
                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm mb-2"
                    minLength={3}
                    autoComplete="username"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm flex-1"
                    >
                      更新
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowUsernameModal(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-sm flex-1"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              </div>
            )}

            {showEmailPasswordModal && (
              <div className="fixed inset-x-0 bottom-0 bg-white dark:bg-gray-900 shadow-lg p-4 z-50">
                <h2 className="text-base font-semibold mb-2 dark:text-gray-100">メールアドレスとパスワードを変更</h2>
                <form onSubmit={handleUpdateEmailPassword}>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="新しいメールアドレスを入力してください"
                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm mb-2"
                    autoComplete="email"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="新しいパスワード（任意）"
                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm mb-2"
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm flex-1"
                    >
                      更新
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEmailPasswordModal(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-sm flex-1"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              </div>
            )}

            {showPasswordModal && (
              <div className="fixed inset-x-0 bottom-0 bg-white dark:bg-gray-900 shadow-lg p-4 z-50">
                <h2 className="text-base font-semibold mb-2 dark:text-gray-100">パスワードを変更</h2>
                <form onSubmit={handleUpdatePassword}>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="新しいパスワードを入力してください"
                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm mb-2"
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm flex-1"
                    >
                      更新
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-sm flex-1"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              </div>
            )}

            {showGoalModal && (
              <div className="fixed inset-x-0 bottom-0 bg-white dark:bg-gray-900 shadow-lg p-4 z-50">
                <h2 className="text-base font-semibold mb-2 dark:text-gray-100">目標を設定</h2>
                <form onSubmit={handleUpdateGoal}>
                  <input
                    type="text"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="目標を入力してください（例：生産性を向上させる）"
                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm mb-2"
                    minLength={3}
                    autoComplete="off"
                  />
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm flex-1"
                    >
                      更新
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGoalModal(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-sm flex-1"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              </div>
            )}

            {showTimezoneModal && (
              <div className="fixed inset-x-0 bottom-0 bg-white dark:bg-gray-900 shadow-lg p-4 z-50">
                <h2 className="text-base font-semibold mb-2 dark:text-gray-100">タイムゾーンを設定</h2>
                <form onSubmit={handleUpdateTimezone}>
                  <select
                    value={newTimezone}
                    onChange={(e) => setNewTimezone(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm mb-2"
                  >
                    {availableTimezones.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm flex-1"
                    >
                      更新
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTimezoneModal(false)}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-sm flex-1"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}