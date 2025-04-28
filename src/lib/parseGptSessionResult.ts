export interface ParsedSessionResult {
  quote: string;
  explanation: string;
  actions: string[];
}

export function parseGptSessionResult(rawText: string): ParsedSessionResult {
  const lines = rawText.split("\n").map((line) => line.trim()).filter((line) => line !== "");

  let quote = "";
  let explanation = "";
  const actions: string[] = [];

  let mode: "none" | "explanation" | "quote" | "actions" = "none";

  for (const line of lines) {
    if (line.startsWith("まとめ:")) {
      mode = "explanation";
      explanation = line.replace(/^まとめ:[:：]?\s*/, "");
    } else if (line.startsWith("名言:")) {
      mode = "quote";
      quote = line.replace(/^名言:[:：]?\s*/, "").replace(/^"|"$/g, "");
    } else if (line.startsWith("おすすめ書籍:")) {
      mode = "none"; // 書籍はパース対象外
    } else if (line.startsWith("アクションプラン:")) {
      mode = "actions";
      // アクションプラン: 1. [行動1] 2. [行動2] 3. [行動3]
      const actionText = line.replace(/^アクションプラン:[:：]?\s*/, "");
      // "1." "2." "3." を区切りとして分割
      const actionItems = actionText.split(/(?=\d+\.\s)/).map((item) => {
        return item.trim().replace(/^\d+\.\s*/, "");
      });
      actions.push(...actionItems.filter((item) => item !== ""));
    } else if (mode === "explanation") {
      explanation += (explanation ? " " : "") + line;
    }
  }

  return {
    quote,
    explanation,
    actions,
  };
}