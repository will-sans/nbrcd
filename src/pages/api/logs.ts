import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { action, timestamp, sessionId, philosopherId, category, details, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "ユーザーIDが必要です" });
    }

    try {
      const log = await prisma.actionLog.create({
        data: {
          action,
          timestamp: new Date(timestamp),
          sessionId,
          philosopherId,
          category,
          details: details || {},
          userId: parseInt(userId),
        },
      });
      res.status(200).json(log);
    } catch (error) {
      console.error("Failed to save log:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: "ログの保存に失敗しました", details: error.message });
      } else {
        res.status(500).json({ error: "ログの保存に失敗しました", details: "不明なエラーが発生しました" });
      }
    }
  } else if (req.method === "GET") {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: "ユーザーIDが必要です" });
    }

    try {
      const logs = await prisma.actionLog.findMany({
        where: {
          userId: parseInt(userId),
        },
        orderBy: {
          timestamp: "desc",
        },
      });
      res.status(200).json(logs);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
      if (error instanceof Error) {
        res.status(500).json({ error: "ログの取得に失敗しました", details: error.message });
      } else {
        res.status(500).json({ error: "ログの取得に失敗しました", details: "不明なエラーが発生しました" });
      }
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
} 