"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaBars, FaCheck, FaTrophy, FaQuestionCircle, FaBook, FaBrain, FaEdit, FaClock } from "react-icons/fa";
import { getSupabaseClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userGoal, setUserGoal] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  const checkUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push("/login");
        return;
      }
      setCurrentUser(user.user_metadata?.username || user.email || "ゲスト");

      const { data: sessionData, error: sessionError } = await supabase
        .from('user_session_metadata')
        .select('goal')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (sessionError && sessionError.code !== 'PGRST116') {
        console.error("Failed to fetch user session metadata:", sessionError);
        setError("セッション情報の取得に失敗しました。");
        return;
      }

      setUserGoal(sessionData?.goal || null);
    } catch {
      setError("ユーザー情報の取得に失敗しました。");
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const navigationItems = [
    { name: "学びセッション", path: "/learning-session", icon: <FaBrain size={24} /> },
    { name: "コンサルティング", path: "/consulting-session", icon: <FaQuestionCircle size={24} /> },
    { name: "タスクリスト", path: "/todo/list", icon: <FaCheck size={24} /> },
    { name: "日誌", path: "/diary/list", icon: <FaBook size={24} /> },
    { name: "ポイント", path: "/points", icon: <FaTrophy size={24} /> },
    { name: "時間計測", path: "/time-tracker", icon: <FaClock size={24} /> },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push("/settings")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="設定へ移動"
        >
          <FaBars size={24} />
        </button>
        <div className="flex items-center space-x-2">
          <Image
            src="/nbrcd_logo.png"
            alt="NBRCD Logo"
            width={40}
            height={40}
            priority
            className="cursor-pointer"
          />
          <h1 className="text-xl font-semibold text-gray-800">NBRCD</h1>
        </div>
        <h1 className="text-sm font-semibold text-gray-800">{currentUser}</h1>
      </div>

      {isLoading ? (
        <div className="text-center">
          <p className="text-lg font-semibold">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="text-red-500 mb-4 text-center">
          <p>{error}</p>
          <button
            onClick={checkUser}
            className="mt-2 text-blue-500 hover:underline"
          >
            再試行する
          </button>
        </div>
      ) : (
        <div className="mb-6 text-center">
          {userGoal ? (
            <div className="mt-4 p-3 bg-blue-100 rounded-lg flex items-center justify-center space-x-2">
              <p className="text-gray-700">目標：{userGoal}</p>
              <button
                onClick={() => router.push("/settings")}
                className="text-blue-500 hover:text-blue-700"
                aria-label="目標を編集"
              >
                <FaEdit size={16} />
              </button>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
              <p className="text-gray-700 mb-2">目標を設定して、</p>
              <p className="text-gray-700 mb-2">習慣形成を始めましょう！</p>
              <button
                onClick={() => router.push("/settings")}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                目標を設定する
              </button>
            </div>
          )}
          <p className="text-gray-500 mt-4">やりたいことを選んでください。</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {navigationItems.map((item) => (
          <motion.button
            key={item.name}
            onClick={() => router.push(item.path)}
            className="flex items-center p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="mr-4 text-gray-600">{item.icon}</span>
            <span className="text-lg font-medium">{item.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}