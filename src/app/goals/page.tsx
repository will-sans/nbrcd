"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/utils/supabase/client";
import { FaArrowLeft, FaPlus, FaChevronDown, FaChevronRight, FaTrash, FaEdit } from "react-icons/fa";
import { formatInTimeZone } from "date-fns-tz";
import { ja } from "date-fns/locale";
import { useTimezone } from "@/lib/timezone-context";
import { v4 as uuidv4 } from "uuid";

interface Goal {
  id: string;
  title: string;
  description: string;
  metric: { target?: number; unit?: string; current?: number } | null;
  start_date: string;
  end_date: string;
  smart: { specific: string; measurable: string; achievable: string; relevant: string; time_bound: string };
  fast: { frequently_discussed: string; ambitious: string; specific: string; transparent: string };
  status: "active" | "completed" | "archived";
  parent_goal_id?: string;
  sub_goals?: Goal[];
  created_at: string;
}

export default function GoalsPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const { timezone } = useTimezone();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    title: "",
    description: "",
    metric: null,
    smart: { specific: "", measurable: "", achievable: "", relevant: "", time_bound: "" },
    fast: { frequently_discussed: "", ambitious: "", specific: "", transparent: "" },
    status: "active",
    parent_goal_id: undefined,
  });
  const [newSubGoalTitle, setNewSubGoalTitle] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "modify">("create");
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const fetchGoals = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch goals:", error);
      return;
    }

    // Build hierarchical structure
    const goalMap = new Map<string, Goal>();
    const topLevelGoals: Goal[] = [];

    (data || []).forEach((goal) => {
      goalMap.set(goal.id, { ...goal, sub_goals: [] });
    });

    goalMap.forEach((goal) => {
      if (goal.parent_goal_id) {
        const parent = goalMap.get(goal.parent_goal_id);
        if (parent) {
          parent.sub_goals = parent.sub_goals || [];
          parent.sub_goals.push(goal);
        }
      } else {
        topLevelGoals.push(goal);
      }
    });

    setGoals(topLevelGoals);
  }, [supabase, router]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleCreateGoal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const goalData = {
      ...newGoal,
      id: uuidv4(),
      user_id: user.id,
      start_date: new Date().toISOString(),
      end_date: newGoal.end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("goals").insert(goalData);
    if (error) {
      console.error("Failed to create goal:", error);
      return;
    }

    setNewGoal({
      title: "",
      description: "",
      metric: null,
      smart: { specific: "", measurable: "", achievable: "", relevant: "", time_bound: "" },
      fast: { frequently_discussed: "", ambitious: "", specific: "", transparent: "" },
      status: "active",
      parent_goal_id: undefined,
    });
    setIsModalOpen(false);
    setModalMode("create");
    fetchGoals();
  };

  const handleModifyGoal = async () => {
    if (!selectedGoal) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const goalData = {
      ...newGoal,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("goals")
      .update(goalData)
      .eq("id", selectedGoal.id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to modify goal:", error);
      return;
    }

    setNewGoal({
      title: "",
      description: "",
      metric: null,
      smart: { specific: "", measurable: "", achievable: "", relevant: "", time_bound: "" },
      fast: { frequently_discussed: "", ambitious: "", specific: "", transparent: "" },
      status: "active",
      parent_goal_id: undefined,
    });
    setIsModalOpen(false);
    setModalMode("create");
    setSelectedGoal(null);
    fetchGoals();
  };

  const handleAddSubGoal = async (parentGoalId: string) => {
    if (!newSubGoalTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const subGoalData = {
      id: uuidv4(),
      user_id: user.id,
      title: newSubGoalTitle,
      description: "",
      metric: null,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      smart: { specific: "", measurable: "", achievable: "", relevant: "", time_bound: "" },
      fast: { frequently_discussed: "", ambitious: "", specific: "", transparent: "" },
      status: "active",
      parent_goal_id: parentGoalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("goals").insert(subGoalData);
    if (error) {
      console.error("Failed to add sub-goal:", error);
      return;
    }

    setNewSubGoalTitle("");
    fetchGoals();
  };

  const handleDeleteGoal = async (goalId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    if (!confirm("この目標と関連するサブ目標、タスクを削除しますか？")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", goalId)
        .eq("user_id", user.id);

      if (error) {
        throw new Error(error.message || "目標の削除に失敗しました");
      }

      setSelectedGoal(null);
      fetchGoals();
    } catch (err) {
      console.error("Failed to delete goal:", err);
    }
  };

  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal);
  };

  const openModifyModal = (goal: Goal) => {
    setNewGoal({
      title: goal.title,
      description: goal.description,
      metric: goal.metric,
      end_date: goal.end_date,
      smart: goal.smart,
      fast: goal.fast,
      status: goal.status,
      parent_goal_id: goal.parent_goal_id,
    });
    setModalMode("modify");
    setIsModalOpen(true);
  };

  const toggleGoalExpansion = (goalId: string) => {
    setExpandedGoals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  const calculateAggregatedProgress = (goal: Goal): number => {
    if (goal.metric) {
      let totalCurrent = goal.metric.current || 0;
      let totalTarget = goal.metric.target || 1;
      (goal.sub_goals || []).forEach((subGoal) => {
        if (subGoal.metric) {
          totalCurrent += subGoal.metric.current || 0;
          totalTarget += subGoal.metric.target || 0;
        }
      });
      return (totalCurrent / totalTarget) * 100;
    } else {
      const subGoals = goal.sub_goals || [];
      const completedSubGoals = subGoals.filter((subGoal) => subGoal.status === "completed").length;
      return subGoals.length > 0 ? (completedSubGoals / subGoals.length) * 100 : 0;
    }
  };

  const flattenGoals = (goals: Goal[], depth: number = 0, parentTitles: string[] = []): { id: string; title: string }[] => {
    let result: { id: string; title: string }[] = [];
    goals.forEach((goal) => {
      const title = [...parentTitles, goal.title].join(" > ");
      result.push({ id: goal.id, title });
      if (goal.sub_goals?.length) {
        result = result.concat(flattenGoals(goal.sub_goals, depth + 1, [...parentTitles, goal.title]));
      }
    });
    return result;
  };

  const renderGoal = (goal: Goal, depth: number = 0) => (
    <div key={goal.id} style={{ marginLeft: `${depth * 20}px` }}>
      <div
        className="p-4 bg-gray-100 rounded-lg dark:bg-gray-800 cursor-pointer flex items-center"
        onClick={() => handleGoalClick(goal)}
      >
        {(goal.sub_goals?.length || 0) > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleGoalExpansion(goal.id);
            }}
            className="mr-2"
          >
            {expandedGoals.has(goal.id) ? <FaChevronDown /> : <FaChevronRight />}
          </button>
        )}
        <div className="flex-1">
          <h2 className="text-base font-medium dark:text-gray-100">{goal.title}</h2>
          <p className="text-sm dark:text-gray-300">
            {goal.metric
              ? `${goal.metric.current || 0}/${goal.metric.target || 0} ${goal.metric.unit || ""}`
              : `${(goal.sub_goals || []).filter((g) => g.status === "completed").length}/${goal.sub_goals?.length || 0} マイルストーン`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {formatInTimeZone(new Date(goal.end_date), timezone, "yyyy年M月d日", { locale: ja })}
          </p>
          {(goal.metric || (goal.sub_goals?.length || 0) > 0) && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${calculateAggregatedProgress(goal)}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
      {expandedGoals.has(goal.id) && goal.sub_goals?.map((subGoal) => renderGoal(subGoal, depth + 1))}
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen dark:bg-gray-900 dark:text-gray-100">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FaArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold dark:text-gray-100">目標管理</h1>
        <button
          onClick={() => {
            setModalMode("create");
            setNewGoal({
              title: "",
              description: "",
              metric: null,
              smart: { specific: "", measurable: "", achievable: "", relevant: "", time_bound: "" },
              fast: { frequently_discussed: "", ambitious: "", specific: "", transparent: "" },
              status: "active",
              parent_goal_id: undefined,
            });
            setIsModalOpen(true);
          }}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <FaPlus size={24} />
        </button>
      </div>

      <div className="space-y-4">
        {goals.map((goal) => renderGoal(goal))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg dark:bg-gray-800 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4 dark:text-gray-100">
              {modalMode === "create" ? "新しい目標" : "目標の修正"}
            </h2>
            <input
              type="text"
              value={newGoal.title}
              onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
              placeholder="目標のタイトル"
              className="w-full p-2 mb-4 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
            <textarea
              value={newGoal.description || ""}
              onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
              placeholder="目標の説明"
              className="w-full p-2 mb-4 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
            <div className="mb-4">
              <label className="block text-sm dark:text-gray-300 mb-1">定量目標</label>
              <input
                type="number"
                value={newGoal.metric?.target || ""}
                onChange={(e) =>
                  setNewGoal({
                    ...newGoal,
                    metric: e.target.value
                      ? { ...newGoal.metric, target: parseInt(e.target.value), current: newGoal.metric?.current || 0 }
                      : null,
                  })
                }
                placeholder="目標値 (空で定性目標)"
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
              />
              {newGoal.metric && (
                <input
                  type="text"
                  value={newGoal.metric?.unit || ""}
                  onChange={(e) =>
                    setNewGoal({
                      ...newGoal,
                      metric: { ...newGoal.metric, unit: e.target.value },
                    })
                  }
                  placeholder="単位"
                  className="w-full p-2 mt-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
                />
              )}
            </div>
            <input
              type="date"
              value={newGoal.end_date ? formatInTimeZone(new Date(newGoal.end_date), timezone, "yyyy-MM-dd") : ""}
              onChange={(e) =>
                setNewGoal({ ...newGoal, end_date: new Date(e.target.value).toISOString() })
              }
              className="w-full p-2 mb-4 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
            />
            <select
              value={newGoal.parent_goal_id || ""}
              onChange={(e) =>
                setNewGoal({ ...newGoal, parent_goal_id: e.target.value || undefined })
              }
              className="w-full p-2 mb-4 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="">親目標なし</option>
              {flattenGoals(goals).filter((goal) => goal.id !== selectedGoal?.id).map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setModalMode("create");
                  setNewGoal({
                    title: "",
                    description: "",
                    metric: null,
                    smart: { specific: "", measurable: "", achievable: "", relevant: "", time_bound: "" },
                    fast: { frequently_discussed: "", ambitious: "", specific: "", transparent: "" },
                    status: "active",
                    parent_goal_id: undefined,
                  });
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg dark:bg-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={modalMode === "create" ? handleCreateGoal : handleModifyGoal}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg dark:bg-blue-600"
              >
                {modalMode === "create" ? "作成" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedGoal && !isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg dark:bg-gray-800 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4 dark:text-gray-100">{selectedGoal.title}</h2>
            <p className="text-sm dark:text-gray-300 mb-4">{selectedGoal.description}</p>
            <div className="mb-4">
              <h3 className="text-base font-medium dark:text-gray-100">進捗</h3>
              {(selectedGoal.metric || (selectedGoal.sub_goals?.length || 0) > 0) && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{
                      width: `${calculateAggregatedProgress(selectedGoal)}%`,
                    }}
                  ></div>
                </div>
              )}
            </div>
            {!selectedGoal.metric && (
              <div className="mb-4">
                <h3 className="text-base font-medium dark:text-gray-100">マイルストーン追加</h3>
                <input
                  type="text"
                  value={newSubGoalTitle}
                  onChange={(e) => setNewSubGoalTitle(e.target.value)}
                  placeholder="マイルストーンのタイトル"
                  className="w-full p-2 mb-2 border rounded-lg dark:bg-gray-700 dark:text-gray-100"
                />
                <button
                  onClick={() => handleAddSubGoal(selectedGoal.id)}
                  className="w-full p-2 bg-green-500 text-white rounded-lg dark:bg-green-600"
                >
                  マイルストーンを追加
                </button>
              </div>
            )}
            <div className="mb-4">
              <h3 className="text-base font-medium dark:text-gray-100">マイルストーン</h3>
              <ul className="mt-2 space-y-2">
                {(selectedGoal.sub_goals || []).map((subGoal) => (
                  <li
                    key={subGoal.id}
                    className="text-sm dark:text-gray-300 cursor-pointer flex justify-between items-center"
                    onClick={() => handleGoalClick(subGoal)}
                  >
                    <span>{subGoal.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        supabase
                          .from("goals")
                          .update({ status: subGoal.status === "completed" ? "active" : "completed" })
                          .eq("id", subGoal.id)
                          .then(() => fetchGoals());
                      }}
                      className={`text-sm px-2 py-1 rounded-lg ${
                        subGoal.status === "completed"
                          ? "bg-gray-500 dark:bg-gray-600"
                          : "bg-blue-500 dark:bg-blue-600"
                      } text-white`}
                    >
                      {subGoal.status === "completed" ? "未完了" : "完了"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => openModifyModal(selectedGoal)}
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg dark:bg-yellow-600 dark:hover:bg-yellow-700"
                aria-label="目標を修正"
              >
                <FaEdit className="inline mr-2" /> 修正
              </button>
              <button
                onClick={() => handleDeleteGoal(selectedGoal.id)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg dark:bg-red-600 dark:hover:bg-red-700"
                aria-label="目標を削除"
              >
                <FaTrash className="inline mr-2" /> 削除
              </button>
              <button
                onClick={() => setSelectedGoal(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg dark:bg-gray-700"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}