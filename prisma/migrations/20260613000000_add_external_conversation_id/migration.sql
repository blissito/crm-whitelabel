-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "externalConversationId" TEXT;

-- CreateIndex
CREATE INDEX "Conversation_externalConversationId_idx" ON "Conversation"("externalConversationId");
