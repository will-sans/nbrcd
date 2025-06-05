
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from '@/utils/supabase/client';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error checking user on mount:", error.message);
      }
      if (user) {
        console.log("User already logged in on mount:", user);
        router.push("/");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log("Auth state changed:", event, session);
      if (event === 'SIGNED_IN' && session) {
        router.push("/");
      }
    });

    checkUser();

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("メールアドレスを入力してください");
      return;
    }
    if (!password || password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message || 'ログインに失敗しました');
      }

      if (!data.user) {
        throw new Error('ログインに失敗しました');
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('セッションの取得に失敗しました');
      }

      console.log("Login successful, session:", session);

      setSuccess("ログインしました！");
      setError(null);
      setEmail("");
      setPassword("");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
      console.error("Login error:", err);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
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
    if (!password || password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          setError('このメールアドレスはすでに登録されています');
          return;
        }
        throw new Error(authError.message || 'ユーザー登録に失敗しました');
      }

      if (!data.user) {
        throw new Error('ユーザー登録に失敗しました');
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('セッションの取得に失敗しました');
      }

      console.log("Registration successful, session:", session);

      const { error: settingsError } = await supabase
        .from('user_settings')
        .insert({
          user_id: data.user.id,
          last_question_ids: {},
          last_login_date: new Date().toDateString(),
          login_streak: 1,
          last_point_added_date: new Date().toDateString(),
        });

      if (settingsError) {
        console.error("Failed to initialize user settings:", settingsError);
      }

      setSuccess("ユーザー登録が完了しました！");
      setError(null);
      setUsername("");
      setEmail("");
      setPassword("");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSuccess(null);
      console.error("Registration error:", err);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen dark:bg-gray-900 dark:text-gray-100 flex flex-col justify-center">
      <h1 className="text-xl font-semibold mb-4 text-center dark:text-gray-100">{mode === 'login' ? 'ログイン' : '新規登録'}</h1>

      <div className="mb-6 p-4 border rounded-lg bg-gray-100 dark:bg-gray-800">
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setMode('login')}
            className={`px-4 py-2 mr-2 text-sm rounded-lg ${
              mode === 'login' ? 'bg-blue-500 text-white dark:bg-blue-600' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            ログイン
          </button>
          <button
            onClick={() => setMode('register')}
            className={`px-4 py-2 text-sm rounded-lg ${
              mode === 'register' ? 'bg-blue-500 text-white dark:bg-blue-600' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            新規登録
          </button>
        </div>
        {error && <div className="text-red-500 mb-4 text-sm dark:text-red-400">{error}</div>}
        {success && <div className="text-green-500 mb-4 text-sm dark:text-green-400">{success}</div>}
        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          {mode === 'register' && (
            <div className="mb-2">
              <label htmlFor="username" className="block text-sm font-medium mb-1 dark:text-gray-300">ユーザー名</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ユーザー名を入力してください"
                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
                required
                minLength={3}
                autoComplete="username"
              />
            </div>
          )}
          <div className="mb-2">
            <label htmlFor="email" className="block text-sm font-medium mb-1 dark:text-gray-300">メールアドレス</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="メールアドレスを入力してください"
              className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
              required
              autoComplete="email"
            />
          </div>
          <div className="mb-2">
            <label htmlFor="password" className="block text-sm font-medium mb-1 dark:text-gray-300">パスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力してください"
              className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm"
            aria-label={mode === 'login' ? 'ログイン' : '新規登録'}
          >
            {mode === 'login' ? 'ログイン' : '登録'}
          </button>
        </form>
      </div>
    </div>
  );
}