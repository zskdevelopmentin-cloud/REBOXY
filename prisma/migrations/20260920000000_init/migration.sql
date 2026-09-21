-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'VIEWER',
    "companyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "gstin" TEXT,
    "address" TEXT,
    "financialYear" TEXT,
    "tallyConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncTime" DATETIME,
    "lastAlterId" INTEGER NOT NULL DEFAULT 0,
    "lastSyncStatus" TEXT DEFAULT 'IDLE',
    "lastSyncError" TEXT,
    "lastSyncDetails" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Ledger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "tallyGuid" TEXT,
    "masterId" INTEGER,
    "alterId" INTEGER,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'Sundry Debtors',
    "openingBalance" REAL NOT NULL DEFAULT 0,
    "closingBalance" REAL NOT NULL DEFAULT 0,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "type" TEXT NOT NULL DEFAULT 'Customer',
    "creditLimit" REAL,
    "creditDays" INTEGER,
    "salesPersonId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ledger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ledger_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "SalesPerson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesPerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "code" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesPerson_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CustomerAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesPersonId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" DATETIME
);

-- CreateTable
CREATE TABLE "VisitLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesPersonId" TEXT,
    "visitDate" DATETIME NOT NULL,
    "purpose" TEXT,
    "notes" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'PLANNED',
    "nextFollowUpDate" DATETIME,
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VisitLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VisitLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Ledger" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VisitLog_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "SalesPerson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "salesPersonId" TEXT,
    "amount" REAL,
    "reminderDate" DATETIME NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdByUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentReminder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentReminder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Ledger" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentReminder_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "SalesPerson" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "tallyGuid" TEXT,
    "masterId" INTEGER,
    "alterId" INTEGER,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'Nos',
    "hsnCode" TEXT,
    "taxRate" REAL NOT NULL DEFAULT 0,
    "openingStock" REAL NOT NULL DEFAULT 0,
    "currentStock" REAL NOT NULL DEFAULT 0,
    "purchasePrice" REAL NOT NULL DEFAULT 0,
    "salesPrice" REAL NOT NULL DEFAULT 0,
    "minStockLevel" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "tallyGuid" TEXT,
    "masterId" INTEGER,
    "alterId" INTEGER,
    "vNo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "partyId" TEXT,
    "ledgerId" TEXT,
    "amount" REAL NOT NULL DEFAULT 0,
    "narration" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Voucher_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Voucher_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Ledger" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Voucher_ledgerId_fkey" FOREIGN KEY ("ledgerId") REFERENCES "Ledger" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VoucherItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "voucherId" TEXT NOT NULL,
    "itemId" TEXT,
    "description" TEXT,
    "quantity" REAL NOT NULL DEFAULT 0,
    "rate" REAL NOT NULL DEFAULT 0,
    "amount" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "VoucherItem_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VoucherItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "recordsSynced" INTEGER NOT NULL DEFAULT 0,
    "recordsReceived" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "recordsDeleted" INTEGER NOT NULL DEFAULT 0,
    "alterIdBefore" INTEGER,
    "alterIdAfter" INTEGER,
    "errorDetails" TEXT,
    CONSTRAINT "SyncLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Ledger_companyId_name_idx" ON "Ledger"("companyId", "name");

-- CreateIndex
CREATE INDEX "Ledger_companyId_type_idx" ON "Ledger"("companyId", "type");

-- CreateIndex
CREATE INDEX "Ledger_companyId_salesPersonId_idx" ON "Ledger"("companyId", "salesPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "Ledger_companyId_tallyGuid_key" ON "Ledger"("companyId", "tallyGuid");

-- CreateIndex
CREATE INDEX "SalesPerson_companyId_status_idx" ON "SalesPerson"("companyId", "status");

-- CreateIndex
CREATE INDEX "CustomerAssignment_companyId_customerId_idx" ON "CustomerAssignment"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "CustomerAssignment_companyId_salesPersonId_idx" ON "CustomerAssignment"("companyId", "salesPersonId");

-- CreateIndex
CREATE INDEX "VisitLog_companyId_customerId_idx" ON "VisitLog"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "VisitLog_companyId_salesPersonId_idx" ON "VisitLog"("companyId", "salesPersonId");

-- CreateIndex
CREATE INDEX "VisitLog_companyId_visitDate_idx" ON "VisitLog"("companyId", "visitDate");

-- CreateIndex
CREATE INDEX "VisitLog_companyId_outcome_idx" ON "VisitLog"("companyId", "outcome");

-- CreateIndex
CREATE INDEX "PaymentReminder_companyId_customerId_idx" ON "PaymentReminder"("companyId", "customerId");

-- CreateIndex
CREATE INDEX "PaymentReminder_companyId_status_idx" ON "PaymentReminder"("companyId", "status");

-- CreateIndex
CREATE INDEX "PaymentReminder_companyId_reminderDate_idx" ON "PaymentReminder"("companyId", "reminderDate");

-- CreateIndex
CREATE INDEX "PaymentReminder_companyId_status_reminderDate_idx" ON "PaymentReminder"("companyId", "status", "reminderDate");

-- CreateIndex
CREATE INDEX "InventoryItem_companyId_name_idx" ON "InventoryItem"("companyId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_companyId_tallyGuid_key" ON "InventoryItem"("companyId", "tallyGuid");

-- CreateIndex
CREATE INDEX "Voucher_companyId_alterId_idx" ON "Voucher"("companyId", "alterId");

-- CreateIndex
CREATE INDEX "Voucher_companyId_vNo_idx" ON "Voucher"("companyId", "vNo");

-- CreateIndex
CREATE INDEX "Voucher_companyId_date_idx" ON "Voucher"("companyId", "date");

-- CreateIndex
CREATE INDEX "Voucher_companyId_type_idx" ON "Voucher"("companyId", "type");

-- CreateIndex
CREATE INDEX "Voucher_companyId_partyId_idx" ON "Voucher"("companyId", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_companyId_tallyGuid_key" ON "Voucher"("companyId", "tallyGuid");

-- CreateIndex
CREATE INDEX "VoucherItem_voucherId_idx" ON "VoucherItem"("voucherId");

-- CreateIndex
CREATE INDEX "VoucherItem_itemId_idx" ON "VoucherItem"("itemId");

-- CreateIndex
CREATE INDEX "SyncLog_companyId_startTime_idx" ON "SyncLog"("companyId", "startTime");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
