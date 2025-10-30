/*
  Warnings:

  - Made the column `index` on table `Photo` required. This step will fail if there are existing NULL values in that column.
  - Made the column `key` on table `Photo` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Photo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "watchId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT,
    "mime" TEXT,
    "index" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Photo_watchId_fkey" FOREIGN KEY ("watchId") REFERENCES "Watch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Photo" ("createdAt", "id", "index", "key", "mime", "url", "watchId") SELECT "createdAt", "id", "index", "key", "mime", "url", "watchId" FROM "Photo";
DROP TABLE "Photo";
ALTER TABLE "new_Photo" RENAME TO "Photo";
CREATE INDEX "Photo_watchId_idx" ON "Photo"("watchId");
CREATE UNIQUE INDEX "Photo_watchId_index_key" ON "Photo"("watchId", "index");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
