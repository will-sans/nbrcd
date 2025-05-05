import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { action, timestamp, sessionId, philosopherId, category, details, userId } = req.body;

    if (!action || !timestamp || !sessionId || !philosopherId || !userId) {
      return res.status(400).json({ error: "必要なフィールドがありません" });
    }

    // userId のバリデーション
    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      return res.status(400).json({ error: "ユーザーIDが無効です" });
    }

    try {
      const log = await prisma.actionLog.create({
        data: {
          action,
          timestamp,
          sessionId,
          philosopherId,
          category,
          details,
          userId: parsedUserId,
        },
      });

      res.status(200).json(log);
    } catch (error) {
      const err = error as Error;
      console.error("Error saving log:", err.message, err.stack); // 詳細なエラーログを出力
      res.status(500).json({ error: "ログの保存に失敗しました", details: err.message });
    }
  } else if (req.method === "GET") {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ error: "ユーザーIDがありません" });
    }

    try {
      const logs = await prisma.actionLog.findMany({
        where: { userId: parseInt(userId) },
        orderBy: { timestamp: "desc" },
      });

      res.status(200).json(logs);
    } catch (error) {
      const err = error as Error;
      console.error("Error fetching logs:", err.message, err.stack);
      res.status(500).json({ error: "ログの取得に失敗しました", details: err.message });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}