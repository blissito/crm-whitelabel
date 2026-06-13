-- AlterTable
ALTER TABLE "WhatsAppChannel" ADD COLUMN "formmyIntegrationId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppChannel_formmyIntegrationId_key" ON "WhatsAppChannel"("formmyIntegrationId");
