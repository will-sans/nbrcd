// src/lib/parseGptSessionResult.ts

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
  
    let mode: "none" | "quote" | "explanation" | "action" = "none";
  
    for (const line of lines) {
      if (line.startsWith("1.") || line.startsWith("名言")) {
        mode = "quote";
        quote = line.replace(/^1\.\s*名言[:：]?\s*/, "").replace(/^名言[:：]?\s*/, "").replace(/^"|"$/g, "");
      } else if (line.startsWith("2.") || line.startsWith("解説")) {
        mode = "explanation";
        explanation = line.replace(/^2\.\s*解説[:：]?\s*/, "").replace(/^解説[:：]?\s*/, "");
      } else if (line.startsWith("3.") || line.startsWith("推奨アクション")) {
        mode = "action";
        // ここではまだ何もpushしない
      } else {
        if (mode === "quote" && quote === "") {
          quote = line.replace(/^"|"$/g, ""); // 念のためダブルクオートを除去
        } else if (mode === "explanation") {
          explanation += (explanation ? " " : "") + line;
        } else if (mode === "action") {
          if (line.startsWith("-") || line.startsWith("・")) {
            actions.push(line.replace(/^[-・]\s*/, ""));
          }
        }
      }
    }
  
    return {
      quote,
      explanation,
      actions,
    };
  }
  