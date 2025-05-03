"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TodoRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/todo/list"); // /todo/list にリダイレクト
  }, [router]);

  return null; // 何もレンダリングしない
}