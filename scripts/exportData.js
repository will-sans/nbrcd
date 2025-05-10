const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient();

async function exportData() {
  try {
    console.log("Exporting data...");

    // User テーブルのデータを取得
    const users = await prisma.user.findMany();
    console.log("Users exported:", users.length);

    // Session テーブルのデータを取得
    const sessions = await prisma.session.findMany();
    console.log("Sessions exported:", sessions.length);

    // ActionLog テーブルのデータを取得
    const actionLogs = await prisma.actionLog.findMany();
    console.log("ActionLogs exported:", actionLogs.length);

    // データを JSON ファイルに保存
    const data = {
      users,
      sessions,
      actionLogs,
    };
    fs.writeFileSync("backup.json", JSON.stringify(data, null, 2));
    console.log("Data exported to backup.json");
  } catch (error) {
    console.error("Error exporting data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();