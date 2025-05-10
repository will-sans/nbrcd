const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function deleteUnnecessaryLogs() {
  try {
    // start_session と end_session の ActionLog を削除
    console.log("Deleting unnecessary action logs...");
    const deleteActionLogs = await prisma.actionLog.deleteMany({
      where: {
        OR: [
          { action: "start_session" },
          { action: "end_session" },
        ],
      },
    });
    console.log(`Deleted ${deleteActionLogs.count} unnecessary action logs.`);

    // 短いメッセージ（3文字未満）の send_message を削除
    console.log("Deleting short send_message logs...");
    const deleteShortMessages = await prisma.actionLog.deleteMany({
      where: {
        action: "send_message",
        details: {
          path: ["input"],
          string_contains: "^.{1,2}$", // 1～2文字のメッセージ
        },
      },
    });
    console.log(`Deleted ${deleteShortMessages.count} short message logs.`);

  } catch (error) {
    console.error("Error deleting unnecessary logs:", error);
  } finally {
    await prisma.$disconnect();
    console.log("Database connection closed.");
  }
}

deleteUnnecessaryLogs();