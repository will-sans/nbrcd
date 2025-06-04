
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { useTimezone } from "@/lib/timezone-context";
import { FaArrowLeft } from "react-icons/fa";

// Sample IANA timezones (expand as needed)
const availableTimezones = [
  "Asia/Tokyo",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Australia/Sydney",
];

// Force dynamic rendering to avoid prerendering issues
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { timezone, setTimezone } = useTimezone();
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);

  const handleSave = async () => {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      router.push("/login");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ timezone: selectedTimezone })
        .eq("user_id", user.id);

      if (error) throw error;

      setTimezone(selectedTimezone);
      router.push("/");
    } catch (err) {
      console.error("Failed to save timezone:", err);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="ホームに戻る"
        >
          <FaArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">設定</h1>
        <div />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">タイムゾーン</label>
        <select
          value={selectedTimezone}
          onChange={(e) => setSelectedTimezone(e.target.value)}
          className="p-2 border rounded bg-gray-100 w-full"
        >
          {availableTimezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSave}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        保存
      </button>
    </div>
  );
}
