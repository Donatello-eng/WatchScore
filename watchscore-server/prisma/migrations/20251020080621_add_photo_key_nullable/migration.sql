/*
  Warnings:

  - You are about to drop the column `bucket` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `Photo` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `Photo` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Photo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "watchId" INTEGER NOT NULL,
    "key" TEXT,
    "url" TEXT,
    "mime" TEXT,
    "index" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "Watch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("createdAt", "id", "index", "key", "mime", "url", "watchId") SELECT "createdAt", "id", "index", "key", "mime", "url", "watchId" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE INDEX "Photo_watchId_idx" ON "Photo"("watchId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
