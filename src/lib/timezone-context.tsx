
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getSupabaseClient } from "@/utils/supabase/client";

interface TimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTimezone] = useState<string>("Asia/Tokyo"); // Default to JST
  const supabase = getSupabaseClient();

  useEffect(() => {
    const fetchUserTimezone = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("profiles") // Assumes a profiles table
          .select("timezone")
          .eq("user_id", user.id)
          .single();

        if (!error && data?.timezone) {
          setTimezone(data.timezone);
        } else {
          // Fallback to browser timezone
          const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setTimezone(browserTimezone);
        }
      }
    };

    fetchUserTimezone();
  }, [supabase]);

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error("useTimezone must be used within a TimezoneProvider");
  }
  return context;
}
