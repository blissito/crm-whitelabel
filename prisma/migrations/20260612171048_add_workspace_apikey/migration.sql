ALTER TABLE "Workspace" ADD COLUMN "apiKey" TEXT;
CREATE UNIQUE INDEX "Workspace_apiKey_key" ON "Workspace"("apiKey");
