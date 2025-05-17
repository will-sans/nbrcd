"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          router.push("/");
        }
      } catch (err) {
        console.error("Error checking user:", err);
        setError("ユーザー情報の確認に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router, supabase]);

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`, // Redirect to home page after login
        },
      });
      if (error) {
        throw error;
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("ログインに失敗しました。もう一度お試しください。");
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-semibold mb-4">ログイン</h1>
      {error && (
        <div className="text-red-500 mb-4">
          <span>{error}</span>
        </div>
      )}
      <button
        onClick={handleLogin}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
      >
        Googleでログイン
      </button>
    </div>
  );
}