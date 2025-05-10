const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function deleteTestUsers() {
  try {
    // テストユーザーの確認
    console.log("Fetching test users...");
    const testUsers = await prisma.user.findMany({
      where: {
        username: {
          contains: "test",
        },
      },
    });
    console.log("Test users found:", testUsers);

    // テストユーザーがいない場合
    if (testUsers.length === 0) {
      console.log("No test users found.");
      return;
    }

    // テストユーザーのIDリストを取得
    const testUserIds = testUsers.map((user) => user.id);

    // テストユーザーに紐づく Session レコードを削除
    console.log("Deleting related sessions...");
    const deleteSessions = await prisma.session.deleteMany({
      where: {
        userId: {
          in: testUserIds,
        },
      },
    });
    console.log(`Deleted ${deleteSessions.count} sessions.`);

    // テストユーザーに紐づく ActionLog レコードを削除
    console.log("Deleting related action logs...");
    const deleteActionLogs = await prisma.actionLog.deleteMany({
      where: {
        userId: {
          in: testUserIds,
        },
      },
    });
    console.log(`Deleted ${deleteActionLogs.count} action logs.`);

    // テストユーザーの削除
    console.log("Deleting test users...");
    const deleteResult = await prisma.user.deleteMany({
      where: {
        username: {
          contains: "test",
        },
      },
    });
    console.log(`Deleted ${deleteResult.count} test users.`);

    // 削除後の確認
    const remainingUsers = await prisma.user.findMany({
      where: {
        username: {
          contains: "test",
        },
      },
    });
    console.log("Remaining test users:", remainingUsers);
  } catch (error) {
    console.error("Error deleting test users:", error);
  } finally {
    await prisma.$disconnect();
    console.log("Database connection closed.");
  }
}

deleteTestUsers();