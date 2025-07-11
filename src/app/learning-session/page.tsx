"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Question } from "@/types/question";
import { ActionLog } from "@/types/actionLog";
import { FaCheck, FaTimes, FaArrowLeft, FaLightbulb } from "react-icons/fa";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseClient } from '@/utils/supabase/client';
import { getPromptById } from '@/utils/supabase/prompts';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ParsedSessionResult {
  actions: string[];
}

interface SessionMetadata {
  summary: string;
  user_inputs: string[];
  selected_action: string | null;
  goal: string | null;
}

interface RecommendedQuestion {
  id: number;
  question: string;
  philosophy: string;
  learning: string;
  quote: string;
  category: string;
  book: string;
  chapter: string;
  similarity: number;
}

interface QuestionFromSupabase {
  id: number;
  philosophy: string;
  question: string;
  learning: string;
  quote: string;
  category: string;
  book: string;
  chapter: string;
}

export default function LearningSession() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [systemMessage, setSystemMessage] = useState<Message | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedSessionResult | null>(null);
  const [selectedPhilosopherId, setSelectedPhilosopherId] = useState<string>("");
  const [dailyQuestion, setDailyQuestion] = useState<Question | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionMetadata, setSessionMetadata] = useState<SessionMetadata | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [recommendedQuestions, setRecommendedQuestions] = useState<RecommendedQuestion[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [philosophersList, setPhilosophersList] = useState<{ id: string; name: string }[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const checkUser = useCallback(async (retries = 3, delay = 1000) => {
    setIsLoading(true);
    setError(null);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error(`Attempt ${attempt} - Session error:`, sessionError.message);
          throw new Error(`セッションの取得に失敗しました: ${sessionError.message}`);
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error(`Attempt ${attempt} - User error:`, userError.message);
          throw new Error(`ユーザー情報の取得に失敗しました: ${userError.message}`);
        }
        if (!user) {
          throw new Error('認証されていません');
        }

        const headers: HeadersInit = {};
        if (session) {
          headers.Authorization = `Bearer ${session.access_token}`;
          headers['X-Refresh-Token'] = session.refresh_token;
          console.log(`Attempt ${attempt} - Using session token:`, session.access_token);
          console.log(`Attempt ${attempt} - Using refresh token:`, session.refresh_token);
        } else {
          console.warn(`Attempt ${attempt} - No session found, but user exists:`, user);
        }

        const response = await fetch("/api/users/me", {
          signal: controller.signal,
          headers,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Attempt ${attempt} - Fetch error: ${response.status} ${errorText}`);
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Attempt ${attempt} - User data fetched:`, data);
        setCurrentUser(data.username || data.email || 'ゲスト');
        setIsLoading(false);
        return;
      } catch (err) {
        console.error(`Attempt ${attempt} failed:`, err);
        if (attempt === retries) {
          console.error("Max retries reached, signing out:", err);
          setError("ユーザー情報の取得に失敗しました。再度お試しください。");
          setIsLoading(false);
          await supabase.auth.signOut();
          router.push("/login");
        } else {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }, [router, supabase]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkUser();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkUser]);

  // Fetch philosophers from Supabase using view
  const fetchPhilosophers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("unique_philosophers")  // 新ビュー使用
        .select("*");  // philosophy, authorを直接取得

      if (error) throw error;

      // ビューでuniqueなので、Map不要だが念のため
      const uniquePhilosophers = Array.from(
        new Map(data.map((item) => [item.philosophy, item])).values()
      ).map((item) => ({
        id: item.philosophy,
        name: item.author,
      }));

      setPhilosophersList(uniquePhilosophers);
    } catch (err) {
      console.error("Failed to fetch philosophers:", err);
      setError("哲学者の取得に失敗しました。");
    }
  }, [supabase]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log("Auth state changed in LearningSession:", event, session);
      if (event === 'SIGNED_IN' && session) {
        checkUser();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log("Token refreshed, updating session");
        checkUser();        
      } else if (event === 'SIGNED_OUT' || !session) {
        router.push("/login");
      }
    });

    checkUser();
    fetchPhilosophers();

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth, checkUser, fetchPhilosophers]);

  const savePoints = useCallback(async (action: string, points: number) => {
    const allowedActions = ["login", "action_select", "task_complete"];
    if (!allowedActions.includes(action)) {
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user found in Supabase Auth');
      return;
    }

    try {
      const { error } = await supabase
        .from('point_logs')
        .insert({
          user_id: user.id,
          action,
          points,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        throw new Error(error.message || 'ポイントの保存に失敗しました');
      }
    } catch (err) {
      console.error("Failed to save points:", err);
    }
  }, [supabase]);

  const handleLoginPoints = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentDate = new Date().toDateString();

    const { data, error } = await supabase
      .from('user_settings')
      .select('last_point_added_date, last_login_date, login_streak')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Failed to fetch user settings:", error);
      return;
    }

    const lastPointAddedDate = data?.last_point_added_date;
    if (lastPointAddedDate === currentDate) {
      return;
    }

    const lastLogin = data?.last_login_date;
    const streakCount = data?.login_streak || 0;

    let newStreak = 1;
    if (lastLogin) {
      const lastDate = new Date(lastLogin);
      const yesterday = new Date();
      yesterday.setDate(new Date().getDate() - 1);

      if (lastDate.toDateString() === yesterday.toDateString()) {
        newStreak = streakCount + 1;
      }
    }

    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        last_login_date: currentDate,
        login_streak: newStreak,
        last_point_added_date: currentDate,
      }, { onConflict: 'user_id' });

    if (upsertError) {
      console.error("Failed to update user settings:", upsertError);
      return;
    }

    const basePoints = 30;
    const bonusPoints = newStreak * 6;
    await savePoints("login", basePoints + bonusPoints);
  }, [supabase, savePoints]);

  const extractActions = (reply: string, assistantReplyCount: number): { updatedReply: string; actions: string[] } => {
    console.log('Extracting actions from reply:', reply);
    const actionPlanMatch = reply.match(/1\. \[.*?\], 2\. \[.*?\], 3\. \[.*?\]/);
    let updatedReply = reply;
    let actions: string[] = [];

    const shouldRemoveQuestions = assistantReplyCount >= 3 && actionPlanMatch;

    if (actionPlanMatch) {
      updatedReply = reply.replace(/1\. \[.*?\], 2\. \[.*?\], 3\. \[.*?\]/, "").trim();
      updatedReply = updatedReply.replace(/\\n\\n/g, '\n\n').trim();
      const parts = updatedReply.split("\n\nまとめ：");
      let beforeSummary = parts[0]?.trim() || "";
      let summaryPart = parts[1]?.trim() || "";

      if (shouldRemoveQuestions) {
        if (beforeSummary) {
          const beforeSentences = beforeSummary.split("。").filter((s: string) => s.trim() !== "");
          if (beforeSentences.length > 0 && beforeSentences[beforeSentences.length - 1].trim().endsWith("？")) {
            beforeSentences.pop();
          }
          beforeSummary = beforeSentences.join("。");
          if (beforeSummary) {
            beforeSummary += "。";
          }
        }

        if (summaryPart) {
          const summarySentences = summaryPart.split("。").filter((s: string) => s.trim() !== "");
          if (summarySentences.length > 0 && summarySentences[summarySentences.length - 1].trim().endsWith("？")) {
            summarySentences.pop();
          }
          summaryPart = summarySentences.join("。");
          if (summaryPart) {
            summaryPart = summaryPart.replace(/\\n$/, '').trim();
          }
        }
      }

      updatedReply = beforeSummary;
      if (summaryPart) {
        updatedReply += `\n\nまとめ：${summaryPart}`;
      }

      const actionsText = actionPlanMatch[0];
      actions = actionsText.split(", ").map((action) =>
        action.replace(/^\d+\.\s*/, "").replace(/^\[|\]$/g, "").trim()
      );
    } else if (shouldRemoveQuestions) {
      console.log('No action plan matched, removing questions');
      const sentences = updatedReply.split("。").filter((s) => s.trim() !== "");
      if (sentences.length > 0 && sentences[sentences.length - 1].trim().endsWith("？")) {
        sentences.pop();
      }
      updatedReply = sentences.join("。");
      if (updatedReply) {
        updatedReply += "。";
      }
    }

    console.log('Extracted actions:', actions);
    return { updatedReply, actions };
  };

  useEffect(() => {
    handleLoginPoints();
  }, [handleLoginPoints]);

  const loadSessionMetadata = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_session_metadata')
      .select('summary, user_inputs, selected_action, goal')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        setSessionMetadata({
          summary: "",
          user_inputs: [],
          selected_action: null,
          goal: null,
        });
      } else {
        console.error("Failed to load session metadata:", error, "Message:", error.message, "Details:", error.details);
        setSessionMetadata({
          summary: "",
          user_inputs: [],
          selected_action: null,
          goal: null,
        });
      }
      return;
    }

    setSessionMetadata({
      summary: data.summary || "",
      user_inputs: data.user_inputs || [],
      selected_action: data.selected_action || null,
      goal: data.goal || null,
    });
  }, [supabase]);

  const generateUserMetadata = async (previousSummary: string, userInputs: string[], selectedAction: string | null, retries = 3) => {
    const prompt = `
あなたはユーザーの行動や傾向を簡潔に要約する役割を担います。以下の情報をもとに、ユーザーのメタデータを400字以内で生成してください。メタデータは「${currentUser}さんのメタデータ：」で始まり、過去のメタデータがある場合は１００字に要約し、次にユーザーの関心や行動傾向、最近の取り組みを自然な文でまとめてください。

**過去のメタデータ（前回の要約）**：
${previousSummary || "なし"}

**今回のセッションのユーザー回答**：
${JSON.stringify(userInputs)}

**今回の選択したアクションプラン**：
${selectedAction || "なし"}

**生成例**：
WILLさんのメタデータ：WILLさんは、経営者の実践的フィードバックを製品開発に活かし、製品の価値を明確化して、マーケティングの強化を目指しています。最近は、プロとしての自覚を持ち、真剣に仕事に取り組む姿勢を強く持っています。自身が納得できる製品を目指し、自分のフィードバックを重視して改善を続けています。特に、ユーザーインターフェース（UI）の改善と書籍データベースの充実に注力しています。また、習慣化アルゴリズムの洗練を現在の主要な課題と捉え、これを通じて製品の価値を高めようとしています。WILLさんは、実用性とユーザー体験を向上させるための細部にまでこだわり、製品の完成度を高めることに情熱を注いでいます。
`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        console.log(`Attempt ${attempt}: Sending metadata generation request...`);
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "system", content: prompt }],
            temperature: 0.3,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "メタデータの生成に失敗しました");
        }

        const data = await response.json();
        console.log('Full Metadata API Response:', JSON.stringify(data, null, 2));
        if (!data.choices || !data.choices[0]?.message?.content) {
          throw new Error('Empty or invalid response from metadata API');
        }
        const generatedSummary = data.choices[0].message.content;
        console.log(`Attempt ${attempt}: Successfully generated metadata:`, generatedSummary);
        return generatedSummary;
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(`Attempt ${attempt} failed:`, error.message);
        } else {
          console.error(`Attempt ${attempt} failed:`, String(error));
        }
        if (attempt === retries) {
          console.error("Max retries reached, falling back to previous summary");
          return previousSummary || "";
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }

    return previousSummary || "";
  };

  const saveSessionMetadata = async (action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("No user found, skipping metadata save");
      return;
    }

    const userInputs = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content.replace(/\nまとめ$/, '').trim());

    const previousSummary = sessionMetadata?.summary || "";
    const currentGoal = sessionMetadata?.goal || null;
    let newSummary = previousSummary;

    try {
      newSummary = await generateUserMetadata(previousSummary, userInputs, action);
    } catch (err) {
      console.error("Failed to generate new metadata:", err);
    }

    const { error } = await supabase
      .from('user_session_metadata')
      .upsert({
        user_id: user.id,
        session_id: sessionId,
        summary: newSummary,
        user_inputs: userInputs,
        selected_action: action,
        updated_at: new Date().toISOString(),
        goal: currentGoal,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error("Failed to save session metadata to Supabase:", error, "Message:", error.message, "Details:", error.details);
    } else {
      console.log("Successfully saved session metadata to Supabase:", {
        user_id: user.id,
        session_id: sessionId,
        summary: newSummary,
        user_inputs: userInputs,
        selected_action: action,
        goal: currentGoal,
      });
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setSessionId(newSessionId);
      await loadSessionMetadata();
    };

    checkSession();
  }, [supabase.auth, loadSessionMetadata]);

  const fetchQuestions = useCallback(async (philosophy: string): Promise<Question[]> => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('id, philosophy, question, learning, quote, title, intro, call_to_action, book, chapter, category')
        .eq('philosophy', philosophy)
        .order('id', { ascending: true });

      if (error) {
        console.error("Failed to fetch questions from Supabase:", error);
        setError("質問の取得に失敗しました。");
        return [];
      }

      return data || [];
    } catch (err) {
      console.error("Error fetching questions:", err);
      setError("質問の取得中にエラーが発生しました。");
      return [];
    }
  }, [supabase, setError]);

  const fetchRecommendedQuestions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("ユーザーが見つかりません。ログインしてください。");
      return;
    }

    let query = `${sessionMetadata?.goal || ""}を目標としており、 ${sessionMetadata?.summary || ""}`.trim();
    query = query.replace(/^.*さんのメタデータ：/, '').trim();
    console.log("Similarity search query:", query);

    if (!query) {
      setError("目標またはサマリーがありません。設定してください。");
      return;
    }

    try {
      const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshedSession?.session) {
        console.error("Failed to refresh session:", refreshError?.message);
        setError("セッションのリフレッシュに失敗しました。ログインし直してください。");
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/similarity-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshedSession.session.access_token}`,
          'X-Refresh-Token': refreshedSession.session.refresh_token,
        },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch recommended questions.');
      }

      const { results } = await response.json();
      console.log("Similarity search results:", results);

      if (!results || results.length === 0) {
        const { data: fallbackQuestions, error: fallbackError } = await supabase
          .from('questions')
          .select('id, philosophy, question, learning, quote, category, book, chapter')
          .limit(5);

        if (fallbackError) {
          console.error("Error fetching fallback questions:", fallbackError);
          setError("おすすめの質問が見つかりませんでした。");
          return;
        }

        const fallbackResults = fallbackQuestions.map((q: QuestionFromSupabase) => ({
          ...q,
          similarity: 0,
        }));
        setRecommendedQuestions(fallbackResults);
        setShowRecommendations(true);
        setError("類似する質問が見つかりませんでした。ランダムな質問を表示します。");
        return;
      }

      setRecommendedQuestions(results);
      setShowRecommendations(true);
    } catch (err) {
      console.error("Error fetching recommended questions:", err);
      setError(err instanceof Error ? err.message : "おすすめ質問の取得中にエラーが発生しました。");
    }
  };

  const handleSelectRecommendedQuestion = (question: RecommendedQuestion) => {
    const fetchQuestionDetails = async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('id, philosophy, question, learning, quote, title, intro, call_to_action, book, chapter, category')
        .eq('id', question.id)
        .single();

      if (error) {
        console.error("Failed to fetch question details:", error);
        setError("質問の詳細取得に失敗しました。");
        return;
      }

      setSelectedPhilosopherId(data.philosophy);
      setDailyQuestion(data);
      setMessages([]);
      setSessionStarted(false);
      setParsedResult(null);
      setSystemMessage(null);
      setSelectedAction(null);
      setShowRecommendations(false);
      setInput("");
    };

    fetchQuestionDetails();
  };

  useEffect(() => {
    if (selectedPhilosopherId && !dailyQuestion) {
      const fetchRandomQuestion = async () => {
        const philosopherQuestions = await fetchQuestions(selectedPhilosopherId);
        if (philosopherQuestions.length === 0) {
          setError("選択した哲学者の質問が見つかりません。");
          setDailyQuestion(null);
          return;
        }

        const randomIndex = Math.floor(Math.random() * philosopherQuestions.length);
        const randomQuestion = philosopherQuestions[randomIndex];
        setDailyQuestion(randomQuestion);
        setMessages([]);
        setSessionStarted(false);
        setParsedResult(null);
        setSystemMessage(null);
        setSelectedAction(null);
      };

      fetchRandomQuestion();
    }
  }, [selectedPhilosopherId, dailyQuestion, fetchQuestions]);

  const saveLog = async (action: string, details?: Record<string, string>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('No user found in Supabase Auth');
      return;
    }

    const log: ActionLog = {
      action,
      timestamp: new Date().toISOString(),
      sessionId: sessionId || '',
      philosopherId: selectedPhilosopherId || '',
      category: dailyQuestion?.category || '',
      details,
      userId: user.id,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      console.log('Sending log:', log);

      const response = await fetch("/api/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(log),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save log");
      }
      console.log("Successfully saved log to server:", log);
    } catch (error) {
      console.error("Failed to save log:", error);
    }
  };

  const saveActionToLocalStorageAndRedirect = async (action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user found for todo insertion');
      setError('ユーザーが見つかりません。ログインしてください。');
      return;
    }

    try {
      console.log('Saving todo:', { action, userId: user.id });
      const { error } = await supabase
        .from('todos')
        .insert({
          id: uuidv4(),
          user_id: user.id,
          text: action,
          completed: false,
          date: new Date().toISOString(),
        });

      if (error) {
        console.error("Failed to save todo:", error);
        setError('タスクの保存に失敗しました。');
        return;
      }

      console.log('Todo saved successfully:', action);
      await saveLog("end_session", { action: "Session ended after action plan selection" });

      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          conversation: messages,
          analysis: { sessionCount: messages.length },
          score: messages.length * 10,
        });

      if (sessionError) {
        console.error("Failed to save session:", sessionError);
      }

      saveSessionMetadata(action).catch((err) => {
        console.error("Failed to save session metadata in background:", err);
      });

      setSelectedPhilosopherId("");
      setDailyQuestion(null);
      setMessages([]);
      setSessionStarted(false);
      setParsedResult(null);
      setSystemMessage(null);
      setSelectedAction(null);
      setShowRecommendations(false);
      setInput("");

      router.push("/todo/list");
    } catch (err) {
      console.error("Error saving todo:", err);
      setError('タスクの保存中にエラーが発生しました。');
    }
  };

  const handleActionSelect = (action: string) => {
    console.log('Action selected:', action);
    setSelectedAction(action);
    savePoints("action_select", 10);
    saveActionToLocalStorageAndRedirect(action);
  };

  const handleStartSession = async () => {
    if (!input.trim()) {
      setError("入力してください");
      return;
    }
    if (input.trim().length < 3) {
      setError("もう少し詳しく入力してください");
      return;
    }

    const selectedPhilosopher = philosophersList.find((p) => p.id === selectedPhilosopherId);
    if (!selectedPhilosopher) {
      setError("哲学者が見つかりません");
      return;
    }

    if (!dailyQuestion) {
      setError("質問が見つかりません。別の哲学を選択してください。");
      return;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      console.error("Failed to get session:", sessionError?.message);
      throw new Error("セッションの取得に失敗しました");
    }

    const prompt = await getPromptById(supabase, 4);
    if (!prompt) {
      setError('プロンプトの読み込みに失敗しました');
      return;
    }

    const systemPromptWithQuestion = prompt.prompt_text
      .replace(/{{philosopherName}}/g, selectedPhilosopher.name)
      .replace('{{learning}}', dailyQuestion.learning)
      .replace('{{quote}}', dailyQuestion.quote)
      .replace('{{question}}', dailyQuestion.question)
      .replace('{{userInput}}', input.trim());

    const newSystemMessage: Message = {
      role: "system",
      content: systemPromptWithQuestion,
    };
    setSystemMessage(newSystemMessage);

    const newUserMessage: Message = {
      role: "user",
      content: input.trim(),
    };

    const updatedMessages: Message[] = [newSystemMessage, newUserMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError(null);
    setParsedResult(null);

    await saveLog("start_session", { input: input.trim() });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: updatedMessages,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "APIからの取得に失敗しました");
      }

      const data = await response.json();
      console.log('Full API Response:', JSON.stringify(data, null, 2));
      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Empty or invalid response from chat API');
      }
      let reply = data.choices[0].message.content;
      console.log("Response:", reply);

      const assistantReplyCount = messages.filter((m) => m.role === "assistant").length + 1;

      const { updatedReply, actions } = extractActions(reply, assistantReplyCount);
      reply = updatedReply;

      console.log("Processed reply:", reply);

      const newAssistantMessage: Message = {
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
      setSessionStarted(true);

      if (actions.length > 0) {
        setParsedResult({ actions });
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setLoading(false);
      inputRef.current?.blur();
    }
  };

  const handleSendDuringSession = async () => {
    if (!input.trim()) {
      setError("入力してください");
      return;
    }
    if (input.trim().length < 3) {
      setError("もう少し詳しく入力してください");
      return;
    }

    const userInputCount = messages.filter((m) => m.role === "user").length + 1;
    const inputToSend = userInputCount === 3 ? `${input.trim()}\nまとめ` : input.trim();

    const newUserMessage: Message = {
      role: "user",
      content: input.trim(),
    };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setError(null);

    await saveLog("send_message", { input: inputToSend });

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("Failed to get session:", sessionError?.message);
        throw new Error("セッションの取得に失敗しました");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const messagesForModel = [
        ...messages,
        { role: "user", content: inputToSend }
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: systemMessage ? [systemMessage, ...messagesForModel] : messagesForModel,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "APIからの取得に失敗しました");
      }

      const data = await response.json();
      console.log('Full API Response:', JSON.stringify(data, null, 2));
      if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Empty or invalid response from chat API');
      }
      let reply = data.choices[0].message.content;
      console.log("Response:", reply);

      const assistantReplyCount = messages.filter((m) => m.role === "assistant").length + 1;

      const { updatedReply, actions } = extractActions(reply, assistantReplyCount);
      reply = updatedReply;

      console.log("Processed reply:", reply);

      const newAssistantMessage: Message = {
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, newAssistantMessage]);

      if (actions.length > 0) {
        setParsedResult({ actions });
      }
    } catch (error) {
      console.error("Error:", error);
      setError(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setLoading(false);
      inputRef.current?.blur();
    }
  };

  const handlePhilosopherChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!sessionStarted && dailyQuestion === null) {
      setSelectedPhilosopherId(e.target.value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) {
      setError("ネットワークに接続されていません。接続を確認してください。");
      return;
    }
    if (!sessionStarted) {
      handleStartSession();
    } else {
      handleSendDuringSession();
    }
  };

  const handleLogoClick = () => {
    if (sessionMetadata?.summary) {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleQuestionClick = () => {
    if (dailyQuestion) {
      saveLog("open_question_modal", { questionId: dailyQuestion.id.toString() });
      setIsQuestionModalOpen(true);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen dark:bg-gray-900 dark:text-gray-100 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="ホームに戻る"
        >
          <FaArrowLeft size={24} />
        </button>
        <div className="flex items-center space-x-2">
          <Image
            src="/nbrcd_logo.png"
            alt="NBRCD Logo"
            width={40}
            height={40}
            priority
            onClick={handleLogoClick}
            className="cursor-pointer"
          />
          <div className="w-36">
            <select
              id="philosopher"
              value={selectedPhilosopherId}
              onChange={handlePhilosopherChange}
              disabled={sessionStarted || dailyQuestion !== null}
              className="block w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm disabled:bg-gray-200 dark:disabled:bg-gray-700"
            >
              <option value="">哲学者を選択してください</option>
              {philosophersList.map((philosopher) => (
                <option key={philosopher.id} value={philosopher.id}>
                  {philosopher.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => router.push("/todo/list")}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="タスクリストへ移動"
        >
          <FaCheck size={24} />
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black z-50"
              onClick={handleCloseModal}
            />
            <motion.div
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed top-0 left-6 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-b-lg shadow-lg z-50 p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold dark:text-gray-100">あなたのメタデータ</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label="モーダルを閉じる"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">{sessionMetadata?.summary}</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isQuestionModalOpen && dailyQuestion && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black z-50"
              onClick={() => setIsQuestionModalOpen(false)}
            />
            <motion.div
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="fixed top-0 left-6 w-full max-w-2xl bg-white dark:bg-gray-900 rounded-b-lg shadow-lg z-50 p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold dark:text-gray-100">質問の詳細</h2>
                <button
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  aria-label="モーダルを閉じる"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="text-gray-700 dark:text-gray-300 text-sm">
                <p className="mb-2"><strong>学び:</strong> {dailyQuestion.learning}</p>
                <p className="mb-2"><strong>カテゴリ:</strong> {dailyQuestion.category}</p>
                <p className="mb-2"><strong>書籍:</strong> {dailyQuestion.book}</p>
                <p className="mb-2"><strong>章:</strong> {dailyQuestion.chapter}</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {!selectedPhilosopherId && (
        <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
          <h2 className="text-base font-semibold dark:text-gray-100">
            {isLoading ? "読み込み中..." : `こんにちは、${currentUser}さん`}
          </h2>
          {isLoading && (
            <button
              onClick={() => checkUser()}
              className="mt-2 text-blue-500 hover:underline dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            >
              再試行する
            </button>
          )}
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
            哲学者を選択してセッションを開始してください。
          </p>
        </div>
      )}

      {!isLoading && !sessionStarted && (
        <div className="mb-4">
          <button
            onClick={fetchRecommendedQuestions}
            className="flex items-center p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm"
            aria-label="おすすめ質問を表示"
          >
            <FaLightbulb size={20} className="mr-2" />
            おすすめ質問を表示
          </button>
          {showRecommendations && recommendedQuestions.length > 0 && (
            <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <h3 className="text-sm font-semibold mb-2 dark:text-gray-100">おすすめの質問</h3>
              <ul className="space-y-2">
                {recommendedQuestions.map((question) => (
                  <li
                    key={question.id}
                    className="p-2 border rounded-lg bg-white dark:bg-gray-900 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 text-sm dark:text-gray-300"
                    onClick={() => handleSelectRecommendedQuestion(question)}
                  >
                    {question.question}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {selectedPhilosopherId && dailyQuestion && (
        <div
          className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={handleQuestionClick}
        >
          <h2 className="text-base font-semibold dark:text-gray-100">{dailyQuestion.question}</h2>
        </div>
      )}

      {error && (
        <div className="text-red-500 mb-4 flex items-center justify-between text-sm dark:text-red-400">
          <span>{error}</span>
          {isOnline && (
            <button
              onClick={() => setError(null)}
              className="text-blue-500 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              閉じる
            </button>
          )}
        </div>
      )}

      {selectedPhilosopherId && dailyQuestion && (
        <>
          <div className="flex-1 overflow-y-auto mb-16">
            {messages
              .filter((m) => m.role !== "system")
              .map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${message.role === "user" ? "text-right" : "text-left"}`}
                >
                  <div
                    className={`inline-block p-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-blue-500 text-white dark:bg-blue-600"
                        : "bg-gray-100 text-black dark:bg-gray-800 dark:text-gray-100"
                    } text-sm`}
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            {parsedResult && parsedResult.actions.length > 0 && dailyQuestion && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-semibold dark:text-gray-100">アクションを一つ選んでください</p>
                <div className="mt-2 space-y-2">
                  {parsedResult.actions.map((action, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        id={`action-${index}`}
                        type="radio"
                        name="action"
                        value={action}
                        checked={selectedAction === action}
                        onChange={() => handleActionSelect(action)}
                        className="mr-2 dark:accent-gray-600"
                      />
                      <label htmlFor={`action-${index}`} className="text-sm dark:text-gray-300">{action}</label>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-sm font-semibold dark:text-gray-100">教訓： {dailyQuestion.quote}</p>
                <p className="mt-2 text-sm font-semibold dark:text-gray-100">関連書籍紹介</p>
                <p className="text-sm dark:text-gray-300">{dailyQuestion.book} - {dailyQuestion.chapter}</p>
              </div>
            )}
          </div>

          {!parsedResult && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-700 max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="flex items-center">
                <input
                  id="chat-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={sessionStarted ? "メッセージを入力..." : "セッションを開始するには入力してください"}
                  className="flex-1 p-2 border rounded-l-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 text-sm"
                  ref={inputRef}
                  disabled={loading || !isOnline}
                />
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-sm"
                  disabled={loading || !isOnline}
                  aria-label={sessionStarted ? "メッセージを送信" : "セッションを開始"}
                >
                  {loading ? "送信中..." : sessionStarted ? "送信" : "開始"}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}