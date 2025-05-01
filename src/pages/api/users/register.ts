import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username } = req.body;

  if (!username || username.length < 3) {
    return res.status(400).json({ error: "ユーザー名は3文字以上で入力してください" });
  }

  try {
    const user = await prisma.user.create({
      data: {
        username,
      },
    });
    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to register user:", error);
    res.status(500).json({ error: "ユーザー登録に失敗しました" });
  }
}