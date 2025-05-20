import { Suspense } from "react";

export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 max-w-md mx-auto text-black bg-white min-h-screen">読み込み中...</div>}>
      {children}
    </Suspense>
  );
}