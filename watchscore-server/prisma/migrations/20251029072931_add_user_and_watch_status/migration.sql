-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kind" TEXT NOT NULL DEFAULT 'anon',
    "clientId" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Watch" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "name" TEXT,
    "subtitle" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "overallLetter" TEXT,
    "overallNumeric" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Watch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Watch" ("brand", "createdAt", "id", "model", "name", "overallLetter", "overallNumeric", "subtitle", "updatedAt", "year") SELECT "brand", "createdAt", "id", "model", "name", "overallLetter", "overallNumeric", "subtitle", "updatedAt", "year" FROM "Watch";
DROP TABLE "Watch";
ALTER TABLE "new_Watch" RENAME TO "Watch";
CREATE INDEX "Watch_userId_createdAt_idx" ON "Watch"("userId", "createdAt");
CREATE INDEX "Watch_status_idx" ON "Watch"("status");
CREATE UNIQUE INDEX "Watch_brand_model_year_key" ON "Watch"("brand", "model", "year");
CREATE TABLE "new_WatchAnalysis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "watchId" INTEGER NOT NULL,
    "aiJsonStr" TEXT NOT NULL,
    "sections" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WatchAnalysis_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "Watch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WatchAnalysis" ("aiJsonStr", "createdAt", "id", "watchId") SELECT "aiJsonStr", "createdAt", "id", "watchId" FROM "WatchAnalysis";
DROP TABLE "WatchAnalysis";
ALTER TABLE "new_WatchAnalysis" RENAME TO "WatchAnalysis";
CREATE UNIQUE INDEX "WatchAnalysis_watchId_key" ON "WatchAnalysis"("watchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_clientId_key" ON "User"("clientId");
