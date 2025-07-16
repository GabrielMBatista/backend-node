/*
  Warnings:

  - You are about to drop the column `audioUrl` on the `Answer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "audioUrl",
ADD COLUMN     "audioBlob" BYTEA;
