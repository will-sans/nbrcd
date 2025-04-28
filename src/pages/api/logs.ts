// src/pages/api/logs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ActionLog } from "../../types/actionLog";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "POST") {
      const log: ActionLog = req.body;
      await prisma.actionLog.create({
        data: {
          action: log.action,
          timestamp: log.timestamp,
          sessionId: log.sessionId,
          philosopherId: log.philosopherId,
          details: log.details,
        },
      });
      console.log("Received log:", log);
      res.status(200).json({ message: "Log saved" });
    } else if (req.method === "GET") {
      const logs = await prisma.actionLog.findMany();
      console.log("Returning logs:", logs);
      res.status(200).json(logs);
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
}