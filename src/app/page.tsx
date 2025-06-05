"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaBars, FaCheck, FaQuestionCircle, FaBook, FaBrain, FaClock, FaSearch } from "react-icons/fa";
import { getSupabaseClient } from "@/utils/supabase/client";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    { name: "学び検索", path: "/learning-search", icon: <FaSearch size={24} /> },
    { name: "学びセッション", path: "/learning-session", icon: <FaBrain size={24} /> },
    { name: "コンサルティング", path: "/consulting-session", icon: <FaQuestionCircle size={24} /> },
    { name: "タスクリスト", path: "/todo/list", icon: <FaCheck size={24} /> },
    { name: "日誌", path: "/diary/list", icon: <FaBook size={24} /> },
    { name: "時間計測", path: "/time-tracker", icon: <FaClock size={24} /> },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen dark:bg-gray-900 dark:text-gray-100 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push("/settings")}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
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
          <h1 className="text-xl font-semibold dark:text-gray-100">NBRCD</h1>
        </div>
        <h1 className="text-sm font-semibold dark:text-gray-300">{currentUser}</h1>
      </div>

      {isLoading ? (
        <div className="text-center">
          <p className="text-base font-semibold dark:text-gray-100">読み込み中...</p>
        </div>
      ) : error ? (
        <div className="text-red-500 mb-4 text-center text-sm dark:text-red-400">
          <p>{error}</p>
          <button
            onClick={checkUser}
            className="mt-2 text-blue-500 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          >
            再試行する
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {navigationItems.map((item) => (
            <motion.button
              key={item.name}
              onClick={() => router.push(item.path)}
              className="flex items-center p-4 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="mr-4 text-gray-600 dark:text-gray-400">{item.icon}</span>
              <span className="text-base font-medium dark:text-gray-100">{item.name}</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}