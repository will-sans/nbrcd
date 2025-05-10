import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, Prisma } from "@prisma/client";

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
    // 同じusernameが既に存在するか確認
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(409).json({ error: "このユーザー名はすでに使用されています" });
    }

    const user = await prisma.user.create({
      data: {
        username,
      },
    });
    res.status(200).json(user);
  } catch (error) {
    console.error("Failed to register user:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        // 一意性制約違反
        return res.status(409).json({ error: "このユーザー名はすでに使用されています" });
      }
    }
    // errorをError型にキャスト
    if (error instanceof Error) {
      res.status(500).json({ error: "ユーザー登録に失敗しました", details: error.message });
    } else {
      res.status(500).json({ error: "ユーザー登録に失敗しました", details: "不明なエラーが発生しました" });
    }
  } finally {
    await prisma.$disconnect();
  }
}