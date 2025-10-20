/*
  Warnings:

  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `path` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Photo` table. All the data in the column will be lost.
  - Made the column `url` on table `Photo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `watchId` on table `Photo` required. This step will fail if there are existing NULL values in that column.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Session";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Photo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "watchId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT,
    "index" INTEGER,
    "provider" TEXT,
    "bucket" TEXT,
    "key" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "Watch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("bucket", "createdAt", "height", "id", "index", "key", "mime", "provider", "url", "watchId", "width") SELECT "bucket", "createdAt", "height", "id", "index", "key", "mime", "provider", "url", "watchId", "width" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE INDEX "Photo_watchId_idx" ON "Photo"("watchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
