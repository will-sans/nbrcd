import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "ユーザーIDが必要です" });
  }

  try {
    // ユーザーを削除（カスケード削除で関連データも削除される）
    await prisma.user.delete({
      where: { id: parseInt(userId as string) },
    });

    res.status(200).json({ message: "ユーザーデータが削除されました" });
  } catch (error) {
    console.error("Failed to delete user:", error);
    res.status(500).json({ error: "ユーザーデータの削除に失敗しました" });
  } finally {
    await prisma.$disconnect();
  }
}