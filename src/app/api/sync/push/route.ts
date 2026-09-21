export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    const authHeader = req.headers.get('authorization');
    const SYNC_TOKEN = process.env.SYNC_TOKEN || 'tally_local_dev_token';

    if (!authHeader || authHeader !== `Bearer ${SYNC_TOKEN}`) {
        return NextResponse.json({ error: 'Unauthorized connector' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { companyId, data } = body;

        if (!companyId || !data) {
            return NextResponse.json({ error: 'Missing required payload' }, { status: 400 });
        }

        // 1. Verify company exists or auto-create
        let companyName = data.companyName || companyId;
        let company = await db.company.upsert({
            where: { id: companyId },
            update: {
                name: companyName,
                tallyConnected: true,
                lastSyncTime: new Date(),
                lastSyncStatus: 'IN_PROGRESS'
            },
            create: {
                id: companyId,
                name: companyName,
                tallyConnected: true,
                lastSyncTime: new Date(),
                lastSyncStatus: 'IN_PROGRESS'
            }
        });
        const activeCompanyId = company.id;
        const alterIdBefore = company.lastAlterId || 0;
        let maxAlterIdSeen = alterIdBefore;

        // 2. Create SyncLog entry
        const syncLog = await db.syncLog.create({
            data: {
                companyId: activeCompanyId,
                status: 'IN_PROGRESS',
                alterIdBefore: alterIdBefore
            }
        });

        let recordsReceived = 0;
        let recordsCreated = 0;
        let recordsUpdated = 0;
        let recordsSkipped = 0;
        let recordsDeleted = 0;

        // 3. Reconcile Ledgers
        if (data.ledgers && Array.isArray(data.ledgers)) {
            recordsReceived += data.ledgers.length;
            for (const l of data.ledgers) {
                if (!l.name) continue;

                const tallyGuid = l.tallyGuid || (typeof l.tallyId === 'string' && l.tallyId.includes('-') ? l.tallyId : null);
                const masterId = l.masterId ? parseInt(String(l.masterId), 10) : null;
                const alterId = l.alterId ? parseInt(String(l.alterId), 10) : null;

                if (alterId && alterId > maxAlterIdSeen) maxAlterIdSeen = alterId;

                // Find existing ledger
                let existingLedger = null;
                if (tallyGuid) {
                    existingLedger = await db.ledger.findFirst({
                        where: { companyId: activeCompanyId, tallyGuid: tallyGuid }
                    });
                }
                if (!existingLedger) {
                    existingLedger = await db.ledger.findFirst({
                        where: { companyId: activeCompanyId, name: l.name }
                    });
                }

                if (existingLedger) {
                    // Idempotency check: if alterId is not newer, skip update
                    if (alterId && existingLedger.alterId && alterId <= existingLedger.alterId) {
                        recordsSkipped++;
                        continue;
                    }

                    await db.ledger.update({
                        where: { id: existingLedger.id },
                        data: {
                            name: l.name,
                            group: l.group || existingLedger.group,
                            closingBalance: typeof l.closingBalance === 'number' ? l.closingBalance : parseFloat(l.closingBalance) || 0,
                            type: l.type || existingLedger.type,
                            tallyGuid: tallyGuid || existingLedger.tallyGuid,
                            masterId: masterId || existingLedger.masterId,
                            alterId: alterId || existingLedger.alterId
                        }
                    });
                    recordsUpdated++;
                } else {
                    await db.ledger.create({
                        data: {
                            companyId: activeCompanyId,
                            name: l.name,
                            group: l.group || 'Sundry Debtors',
                            closingBalance: typeof l.closingBalance === 'number' ? l.closingBalance : parseFloat(l.closingBalance) || 0,
                            type: l.type || 'Customer',
                            tallyGuid: tallyGuid,
                            masterId: masterId,
                            alterId: alterId
                        }
                    });
                    recordsCreated++;
                }
            }
        }

        // 4. Reconcile Inventory Items
        if (data.inventory && Array.isArray(data.inventory)) {
            recordsReceived += data.inventory.length;
            for (const item of data.inventory) {
                if (!item.name) continue;

                const tallyGuid = item.tallyGuid || (typeof item.tallyId === 'string' && item.tallyId.includes('-') ? item.tallyId : null);
                const masterId = item.masterId ? parseInt(String(item.masterId), 10) : null;
                const alterId = item.alterId ? parseInt(String(item.alterId), 10) : null;

                if (alterId && alterId > maxAlterIdSeen) maxAlterIdSeen = alterId;

                let existingItem = null;
                if (tallyGuid) {
                    existingItem = await db.inventoryItem.findFirst({
                        where: { companyId: activeCompanyId, tallyGuid: tallyGuid }
                    });
                }
                if (!existingItem) {
                    existingItem = await db.inventoryItem.findFirst({
                        where: { companyId: activeCompanyId, name: item.name }
                    });
                }

                if (existingItem) {
                    if (alterId && existingItem.alterId && alterId <= existingItem.alterId) {
                        recordsSkipped++;
                        continue;
                    }

                    await db.inventoryItem.update({
                        where: { id: existingItem.id },
                        data: {
                            name: item.name,
                            category: item.category || existingItem.category,
                            unit: item.unit || existingItem.unit,
                            salesPrice: typeof item.salesPrice === 'number' ? item.salesPrice : parseFloat(item.salesPrice) || 0,
                            currentStock: typeof item.currentStock === 'number' ? item.currentStock : parseFloat(item.currentStock) || 0,
                            tallyGuid: tallyGuid || existingItem.tallyGuid,
                            masterId: masterId || existingItem.masterId,
                            alterId: alterId || existingItem.alterId
                        }
                    });
                    recordsUpdated++;
                } else {
                    await db.inventoryItem.create({
                        data: {
                            companyId: activeCompanyId,
                            name: item.name,
                            category: item.category || null,
                            unit: item.unit || 'Nos',
                            salesPrice: typeof item.salesPrice === 'number' ? item.salesPrice : parseFloat(item.salesPrice) || 0,
                            currentStock: typeof item.currentStock === 'number' ? item.currentStock : parseFloat(item.currentStock) || 0,
                            tallyGuid: tallyGuid,
                            masterId: masterId,
                            alterId: alterId
                        }
                    });
                    recordsCreated++;
                }
            }
        }

        // 5. Reconcile Vouchers in Batches
        if (data.vouchers && Array.isArray(data.vouchers)) {
            recordsReceived += data.vouchers.length;
            const BATCH_SIZE = 100;
            
            for (let i = 0; i < data.vouchers.length; i += BATCH_SIZE) {
                const batch = data.vouchers.slice(i, i + BATCH_SIZE);

                for (const v of batch) {
                    if (!v.vNo) continue;

                    const tallyGuid = v.tallyGuid || (typeof v.tallyId === 'string' && v.tallyId.includes('-') ? v.tallyId : null);
                    const masterId = v.masterId ? parseInt(String(v.masterId), 10) : null;
                    const alterId = v.alterId ? parseInt(String(v.alterId), 10) : null;
                    const isCancelled = v.isCancelled || v.isDeleted || v.status === 'CANCELLED';

                    if (alterId && alterId > maxAlterIdSeen) maxAlterIdSeen = alterId;

                    // Lookup Party Ledger
                    let partyId = null;
                    if (v.partyName) {
                        const partyLedger = await db.ledger.findFirst({
                            where: { companyId: activeCompanyId, name: v.partyName }
                        });
                        if (partyLedger) partyId = partyLedger.id;
                    }

                    // Lookup existing voucher safely
                    let existingVoucher = null;
                    if (tallyGuid) {
                        existingVoucher = await db.voucher.findFirst({
                            where: { companyId: activeCompanyId, tallyGuid: tallyGuid }
                        });
                    }
                    if (!existingVoucher) {
                        // Fallback matching ONLY applies to previously synced Tally records (tallyGuid != null)
                        // Manual REBOXY vouchers (tallyGuid == null) are NEVER overwritten.
                        existingVoucher = await db.voucher.findFirst({
                            where: { 
                                companyId: activeCompanyId, 
                                vNo: String(v.vNo),
                                type: v.type || 'Sales',
                                tallyGuid: { not: null }
                            }
                        });
                    }

                    let targetVoucherId: string;

                    if (existingVoucher) {
                        // Idempotency check: if alterId <= existing.alterId, skip write
                        if (alterId && existingVoucher.alterId && alterId <= existingVoucher.alterId) {
                            recordsSkipped++;
                            continue;
                        }

                        const updatedV = await db.voucher.update({
                            where: { id: existingVoucher.id },
                            data: {
                                vNo: String(v.vNo),
                                type: v.type || existingVoucher.type,
                                date: new Date(v.date || Date.now()),
                                amount: typeof v.amount === 'number' ? v.amount : parseFloat(v.amount) || 0,
                                partyId: partyId || existingVoucher.partyId,
                                narration: v.narration || existingVoucher.narration,
                                status: isCancelled ? 'CANCELLED' : 'COMPLETED',
                                tallyGuid: tallyGuid || existingVoucher.tallyGuid,
                                masterId: masterId || existingVoucher.masterId,
                                alterId: alterId || existingVoucher.alterId
                            }
                        });
                        targetVoucherId = updatedV.id;

                        if (isCancelled) {
                            recordsDeleted++;
                        } else {
                            recordsUpdated++;
                        }
                    } else {
                        const newV = await db.voucher.create({
                            data: {
                                companyId: activeCompanyId,
                                vNo: String(v.vNo),
                                type: v.type || 'Sales',
                                date: new Date(v.date || Date.now()),
                                amount: typeof v.amount === 'number' ? v.amount : parseFloat(v.amount) || 0,
                                partyId: partyId,
                                narration: v.narration || null,
                                status: isCancelled ? 'CANCELLED' : 'COMPLETED',
                                tallyGuid: tallyGuid,
                                masterId: masterId,
                                alterId: alterId
                            }
                        });
                        targetVoucherId = newV.id;
                        recordsCreated++;
                    }

                    // Reconcile Line Items if provided
                    if (v.items && Array.isArray(v.items)) {
                        await db.voucherItem.deleteMany({ where: { voucherId: targetVoucherId } });
                        
                        for (const item of v.items) {
                            if (!item.name) continue;

                            // Lookup or create InventoryItem
                            let invItem = await db.inventoryItem.findFirst({
                                where: { companyId: activeCompanyId, name: item.name }
                            });

                            if (!invItem) {
                                invItem = await db.inventoryItem.create({
                                    data: {
                                        companyId: activeCompanyId,
                                        name: item.name,
                                        salesPrice: typeof item.rate === 'number' ? item.rate : parseFloat(item.rate) || 0
                                    }
                                });
                            }

                            await db.voucherItem.create({
                                data: {
                                    voucherId: targetVoucherId,
                                    itemId: invItem.id,
                                    description: item.name,
                                    quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 1,
                                    rate: typeof item.rate === 'number' ? item.rate : parseFloat(item.rate) || 0,
                                    amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0
                                }
                            });
                        }
                    }
                }
            }
        }

        const totalProcessed = recordsCreated + recordsUpdated + recordsSkipped + recordsDeleted;
        const detailsSummary = {
            recordsReceived,
            recordsCreated,
            recordsUpdated,
            recordsSkipped,
            recordsDeleted
        };

        // 6. Update Company Sync Cursor & State
        await db.company.update({
            where: { id: activeCompanyId },
            data: { 
                name: companyName,
                tallyConnected: true,
                lastSyncTime: new Date(),
                lastAlterId: maxAlterIdSeen,
                lastSyncStatus: 'SUCCESS',
                lastSyncError: null,
                lastSyncDetails: JSON.stringify(detailsSummary)
            }
        });

        // 7. Complete SyncLog
        await db.syncLog.update({
            where: { id: syncLog.id },
            data: {
                status: 'SUCCESS',
                endTime: new Date(),
                recordsSynced: totalProcessed,
                recordsReceived,
                recordsCreated,
                recordsUpdated,
                recordsSkipped,
                recordsDeleted,
                alterIdAfter: maxAlterIdSeen
            }
        });

        return NextResponse.json({ 
            success: true, 
            syncId: syncLog.id, 
            recordsSynced: totalProcessed,
            recordsReceived,
            recordsCreated,
            recordsUpdated,
            recordsSkipped,
            recordsDeleted,
            alterIdBefore,
            alterIdAfter: maxAlterIdSeen
        });
    } catch (error: any) {
        console.error('Push Sync Error:', error);

        // Record failure in database if companyId was identified
        try {
            const body = await req.json().catch(() => ({}));
            if (body?.companyId) {
                await db.company.update({
                    where: { id: body.companyId },
                    data: {
                        lastSyncStatus: 'FAILED',
                        lastSyncError: error.message || 'Sync failed'
                    }
                });
            }
        } catch (e) {
            // Ignore secondary failure error
        }

        return NextResponse.json({ error: error.message || 'Sync processing failed' }, { status: 500 });
    }
}
