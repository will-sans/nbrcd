import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(200).json({ username: "ゲスト" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId as string) },
    });
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(200).json({ username: "ゲスト" });
    }
  } catch (error) {
    console.error("Failed to fetch user:", error);
    res.status(500).json({ error: "ユーザー情報の取得に失敗しました" });
  } finally {
    await prisma.$disconnect();
  }
}