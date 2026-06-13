ALTER TABLE "User" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetExpires" DATETIME;
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");
