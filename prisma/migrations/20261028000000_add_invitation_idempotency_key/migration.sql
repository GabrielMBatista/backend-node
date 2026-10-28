ALTER TABLE "InterviewInvitation" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "InterviewInvitation_idempotencyKey_key"
ON "InterviewInvitation"("idempotencyKey");
