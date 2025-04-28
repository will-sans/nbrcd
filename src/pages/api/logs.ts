// src/pages/api/logs.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ActionLog } from "../../types/actionLog";
import fs from "fs/promises";
import path from "path";

const LOG_FILE_PATH = path.join(process.cwd(), "logs.json");

const initializeLogFile = async () => {
  try {
    await fs.access(LOG_FILE_PATH);
  } catch (error) {
    await fs.writeFile(LOG_FILE_PATH, JSON.stringify([]));
  }
};

const readLogs = async (): Promise<ActionLog[]> => {
  await initializeLogFile();
  const data = await fs.readFile(LOG_FILE_PATH, "utf-8");
  return JSON.parse(data);
};

const writeLogs = async (logs: ActionLog[]) => {
  await fs.writeFile(LOG_FILE_PATH, JSON.stringify(logs, null, 2));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const log: ActionLog = req.body;
    const logs = await readLogs();
    logs.push(log);
    await writeLogs(logs);
    console.log("Received log:", log);
    console.log("Current logs:", logs);
    res.status(200).json({ message: "Log saved" });
  } else if (req.method === "GET") {
    const logs = await readLogs();
    console.log("Returning logs:", logs);
    res.status(200).json(logs);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}