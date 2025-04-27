// src/lib/gptSession.ts

import { PhilosopherGPT } from "@/data/philosophers";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!; // 環境変数から安全に取得

export async function callGptSession(
  philosopher: PhilosopherGPT,
  questionText: string
) {
  const prompt = `
あなたは${philosopher.name}の哲学スタイルに基づくAIコーチです。

以下の問いに対して、${philosopher.name}らしい口調・思考で、次の情報を順番に出力してください：

1. 名言（短くインパクトあるもの）
2. 解説（優しく具体的に、Willが腹落ちする表現で）
3. 推奨アクション（行動プラン）を3つ、箇条書きで

問い：「${questionText}」
`;
//スタイルの特徴は次の通りです：「${philosopher.gptPromptStyle}」//エラーが出るので、promptから削除

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4", // 必要ならgpt-3.5-turboにも変更できる
      messages: [
        {
          role: "system",
          content: "あなたはユーザーの行動を促すプロフェッショナルな経営AIコーチです。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";

  return content;
}
