const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function deleteTempUsers() {
  try {
    // テストユーザーの確認
    console.log("Fetching temp users...");
    const tempUsers = await prisma.user.findMany({
      where: {
        username: {
          contains: "WILL",
        },
      },
    });
    console.log("Temp users found:", tempUsers);

    // テストユーザーがいない場合
    if (tempUsers.length === 0) {
      console.log("No temp users found.");
      return;
    }

    // テストユーザーのIDリストを取得
    const tempUserIds = tempUsers.map((user) => user.id);

    // テストユーザーに紐づく Session レコードを削除
    console.log("Deleting related sessions...");
    const deleteSessions = await prisma.session.deleteMany({
      where: {
        userId: {
          in: tempUserIds,
        },
      },
    });
    console.log(`Deleted ${deleteSessions.count} sessions.`);

    // テストユーザーに紐づく ActionLog レコードを削除
    console.log("Deleting related action logs...");
    const deleteActionLogs = await prisma.actionLog.deleteMany({
      where: {
        userId: {
          in: tempUserIds,
        },
      },
    });
    console.log(`Deleted ${deleteActionLogs.count} action logs.`);

    // テストユーザーの削除
    console.log("Deleting temp users...");
    const deleteResult = await prisma.user.deleteMany({
      where: {
        username: {
          contains: "WILL",
        },
      },
    });
    console.log(`Deleted ${deleteResult.count} temp users.`);

    // 削除後の確認
    const remainingUsers = await prisma.user.findMany({
      where: {
        username: {
          contains: "WILL",
        },
      },
    });
    console.log("Remaining temp users:", remainingUsers);
  } catch (error) {
    console.error("Error deleting temp users:", error);
  } finally {
    await prisma.$disconnect();
    console.log("Database connection closed.");
  }
}

deleteTempUsers();