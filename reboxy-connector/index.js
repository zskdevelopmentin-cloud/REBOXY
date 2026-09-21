require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pushToCloud, checkConnection, getSyncState } = require('./api-client');
const { fetchTallyData, getFormattedDate } = require('./tally-xml-service');

const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '60000', 10);
const COMPANY_ID = process.env.COMPANY_ID || 'SUPREME-FOOTCARE';
const START_YEAR = parseInt(process.env.START_YEAR || '2015', 10);
const STATE_FILE = path.join(__dirname, 'sync-state.json');

function loadLocalState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const raw = fs.readFileSync(STATE_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn('Could not read local sync-state.json:', e.message);
    }
    return {
        companyId: COMPANY_ID,
        lastAlterId: 0,
        initialSyncCompleted: false,
        completedChunks: [],
        stats: {
            recordsCreated: 0,
            recordsUpdated: 0,
            recordsSkipped: 0,
            recordsDeleted: 0
        }
    };
}

function saveLocalState(state) {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
        console.error('Could not save local sync-state.json:', e.message);
    }
}

function generateYearChunks(startYear) {
    const currentYear = new Date().getFullYear();
    const chunks = [];
    for (let yr = startYear; yr <= currentYear; yr++) {
        const fromDate = `${yr}0101`;
        const toDate = yr === currentYear ? getFormattedDate() : `${yr}1231`;
        chunks.push({
            id: String(yr),
            fromDate,
            toDate
        });
    }
    return chunks;
}

async function performHistoricalSync(localState, remoteState) {
    console.log('\n==================================================');
    console.log('       REBOXY INITIAL HISTORICAL SYNC START       ');
    console.log('==================================================');

    const chunks = generateYearChunks(START_YEAR);
    const completedChunks = new Set(localState.completedChunks || []);
    let maxAlterIdSeen = Math.max(localState.lastAlterId || 0, remoteState.lastAlterId || 0);
    
    const stats = localState.stats || {
        recordsCreated: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        recordsDeleted: 0
    };

    console.log(`Historical Date Range: ${chunks[0].fromDate} -> ${chunks[chunks.length - 1].toDate}`);
    console.log(`Total Date Chunks   : ${chunks.length} chunks (${chunks.length - completedChunks.size} remaining)`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (completedChunks.has(chunk.id)) {
            console.log(`[Initial Sync] Skipping completed chunk ${chunk.id} (${chunk.fromDate} -> ${chunk.toDate})`);
            continue;
        }

        console.log(`\n[Initial Sync Progress] Processing Chunk ${i + 1}/${chunks.length} (Year ${chunk.id}: ${chunk.fromDate} -> ${chunk.toDate}) | Status: RUNNING...`);

        // Fetch Tally data for this historical period
        // Include masters (Ledgers & Items) on the first pending chunk
        const isFirstChunk = completedChunks.size === 0;
        const tallyData = await fetchTallyData(0, {
            fromDate: chunk.fromDate,
            toDate: chunk.toDate,
            fetchMasters: isFirstChunk
        });

        const vchCount = tallyData.vouchers?.length || 0;
        const ledgerCount = tallyData.ledgers?.length || 0;
        const invCount = tallyData.inventory?.length || 0;
        const totalChunkCount = vchCount + ledgerCount + invCount;

        if (totalChunkCount > 0) {
            console.log(`[Initial Sync] Chunk ${chunk.id}: Found ${vchCount} vouchers, ${ledgerCount} ledgers, ${invCount} items. Pushing to cloud...`);
            
            const result = await pushToCloud(COMPANY_ID, tallyData);

            stats.recordsCreated += (result.recordsCreated || 0);
            stats.recordsUpdated += (result.recordsUpdated || 0);
            stats.recordsSkipped += (result.recordsSkipped || 0);
            stats.recordsDeleted += (result.recordsDeleted || 0);

            maxAlterIdSeen = Math.max(maxAlterIdSeen, tallyData.maxAlterIdSeen || 0, result.alterIdAfter || 0);

            console.log(`[Initial Sync Progress] Chunk ${chunk.id} Complete! Imported: ${stats.recordsCreated}, Skipped: ${stats.recordsSkipped}, Updated: ${stats.recordsUpdated}, Deleted: ${stats.recordsDeleted}`);
        } else {
            console.log(`[Initial Sync] Chunk ${chunk.id}: No records found in date window.`);
        }

        completedChunks.add(chunk.id);

        // Save progress locally after each successful chunk
        saveLocalState({
            companyId: COMPANY_ID,
            lastAlterId: maxAlterIdSeen,
            initialSyncCompleted: false,
            completedChunks: Array.from(completedChunks),
            stats,
            lastSyncTime: new Date().toISOString()
        });
    }

    // All chunks completed successfully!
    console.log('\n==================================================');
    console.log('        INITIAL HISTORICAL SYNC COMPLETE          ');
    console.log('==================================================');
    console.log(`Records Imported: ${stats.recordsCreated}`);
    console.log(`Records Skipped : ${stats.recordsSkipped}`);
    console.log(`Records Updated : ${stats.recordsUpdated}`);
    console.log(`Records Deleted : ${stats.recordsDeleted}`);
    console.log(`Highest AlterID : ${maxAlterIdSeen}`);
    console.log('==================================================\n');

    saveLocalState({
        companyId: COMPANY_ID,
        lastAlterId: maxAlterIdSeen,
        initialSyncCompleted: true,
        completedChunks: Array.from(completedChunks),
        stats,
        lastSyncTime: new Date().toISOString()
    });
}

async function performSync() {
    console.log(`\n[${new Date().toISOString()}] Starting Tally sync cycle for company: ${COMPANY_ID}`);
    
    try {
        const localState = loadLocalState();
        const remoteState = await getSyncState(COMPANY_ID);

        const remoteAlterId = typeof remoteState?.lastAlterId === 'number' ? remoteState.lastAlterId : 0;
        const localAlterId = localState.lastAlterId || 0;
        const isInitialPending = !localState.initialSyncCompleted && remoteAlterId === 0 && localAlterId === 0;

        if (isInitialPending) {
            await performHistoricalSync(localState, remoteState);
            return;
        }

        // Standard incremental sync
        const sinceAlterId = Math.max(localAlterId, remoteAlterId);
        console.log(`Using incremental sync cursor (sinceAlterId): ${sinceAlterId}`);

        const tallyData = await fetchTallyData(sinceAlterId, { fetchMasters: true });
        
        const totalCount = (tallyData.vouchers?.length || 0) + (tallyData.ledgers?.length || 0) + (tallyData.inventory?.length || 0);

        if (totalCount === 0) {
            console.log(`No new or altered records in Tally since AlterID ${sinceAlterId}. Sync skipped.`);
            return;
        }

        console.log(`Pushing ${totalCount} records (${tallyData.vouchers?.length || 0} vouchers, ${tallyData.ledgers?.length || 0} ledgers, ${tallyData.inventory?.length || 0} items) to REBOXY Cloud...`);
        
        const result = await pushToCloud(COMPANY_ID, tallyData);
        
        console.log(`[${new Date().toISOString()}] Sync Success! Sync ID: ${result.syncId} | Synced: ${result.recordsSynced} records (Created: ${result.recordsCreated || 0}, Updated: ${result.recordsUpdated || 0}, Skipped: ${result.recordsSkipped || 0}, Deleted: ${result.recordsDeleted || 0})`);

        const maxAlterId = Math.max(sinceAlterId, tallyData.maxAlterIdSeen || 0, result.alterIdAfter || 0);
        saveLocalState({
            ...localState,
            companyId: COMPANY_ID,
            lastAlterId: maxAlterId,
            initialSyncCompleted: true,
            lastSyncTime: new Date().toISOString(),
            lastSyncId: result.syncId
        });
    } catch (error) {
        if (error.isAuthError) {
            console.error(`[${new Date().toISOString()}] FATAL AUTH ERROR: Invalid SYNC_TOKEN or unauthorized company. Please check your .env configuration.`);
            process.exit(1);
        }
        console.error(`[${new Date().toISOString()}] Sync cycle failed: ${error.message}. Will retry on next cycle.`);
    }
}

async function start() {
    console.log('==================================================');
    console.log('       REBOXY Tally Desktop Connector v2.5        ');
    console.log('==================================================');
    console.log(`Target Company: ${COMPANY_ID}`);
    console.log(`Poll Interval : ${SYNC_INTERVAL_MS}ms`);
    console.log('Verifying cloud connection...');
    
    const isConnected = await checkConnection();
    if (!isConnected) {
        console.error('Failed to connect to REBOXY Cloud API. Retrying connection in 15 seconds...');
        setTimeout(start, 15000);
        return;
    }
    
    console.log('Cloud Connection Verified! Starting sync worker...');
    
    // Initial run
    await performSync();
    
    // Scheduled runs
    setInterval(performSync, SYNC_INTERVAL_MS);
}

start();
