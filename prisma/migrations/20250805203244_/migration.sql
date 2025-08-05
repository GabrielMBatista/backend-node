/*
  Warnings:

  - A unique constraint covering the columns `[questionId,categoryId]` on the table `QuestionInCategory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "QuestionInCategory" DROP CONSTRAINT "QuestionInCategory_categoryId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "QuestionInCategory_questionId_categoryId_key" ON "QuestionInCategory"("questionId", "categoryId");

-- AddForeignKey
ALTER TABLE "QuestionInCategory" ADD CONSTRAINT "QuestionInCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
