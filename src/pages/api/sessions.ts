import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, conversation, analysis, score } = req.body;

  if (!userId || !conversation || !analysis || typeof score !== "number") {
    return res.status(400).json({ error: "必要なデータが不足しています" });
  }

  try {
    const session = await prisma.session.create({
      data: {
        userId: parseInt(userId),
        conversation,
        analysis,
        score,
      },
    });
    res.status(200).json(session);
  } catch (error) {
    console.error("Failed to save session:", error);
    res.status(500).json({ error: "セッションの保存に失敗しました" });
  }
}