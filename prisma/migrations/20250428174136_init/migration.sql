-- CreateTable
CREATE TABLE "ActionLog" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "philosopherId" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);
