require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pushToCloud, checkConnection, getSyncState } = require('./api-client');
const { fetchTallyData } = require('./tally-xml-service');

const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '60000', 10);
const COMPANY_ID = process.env.COMPANY_ID || 'SUPREME-FOOTCARE';
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
    return { lastAlterId: 0 };
}

function saveLocalState(state) {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
        console.error('Could not save local sync-state.json:', e.message);
    }
}

async function performSync() {
    console.log(`\n[${new Date().toISOString()}] Starting Tally sync cycle for company: ${COMPANY_ID}`);
    
    try {
        // 1. Determine sync cursor (lastAlterId)
        let lastAlterId = 0;
        const remoteState = await getSyncState(COMPANY_ID);
        if (remoteState && typeof remoteState.lastAlterId === 'number') {
            lastAlterId = remoteState.lastAlterId;
        } else {
            const localState = loadLocalState();
            lastAlterId = localState.lastAlterId || 0;
        }

        console.log(`Using sync cursor (lastAlterId): ${lastAlterId}`);

        // 2. Fetch data from local Tally instance
        const tallyData = await fetchTallyData(lastAlterId);
        
        const totalCount = (tallyData.vouchers?.length || 0) + (tallyData.ledgers?.length || 0) + (tallyData.inventory?.length || 0);

        if (totalCount === 0) {
            console.log(`No new or altered records in Tally since AlterID ${lastAlterId}. Sync skipped.`);
            return;
        }

        // 3. Push to REBOXY Cloud API
        console.log(`Pushing ${totalCount} records (${tallyData.vouchers?.length || 0} vouchers, ${tallyData.ledgers?.length || 0} ledgers, ${tallyData.inventory?.length || 0} items) to REBOXY Cloud...`);
        
        const result = await pushToCloud(COMPANY_ID, tallyData);
        
        console.log(`[${new Date().toISOString()}] Sync Success! Sync ID: ${result.syncId} | Synced: ${result.recordsSynced} records (Created: ${result.recordsCreated || 0}, Updated: ${result.recordsUpdated || 0}, Skipped: ${result.recordsSkipped || 0}, Deleted: ${result.recordsDeleted || 0})`);

        // Save local state
        const maxAlterId = Math.max(lastAlterId, tallyData.maxAlterIdSeen || 0, result.alterIdAfter || 0);
        saveLocalState({
            companyId: COMPANY_ID,
            lastAlterId: maxAlterId,
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
    console.log('       REBOXY Tally Desktop Connector v2.0        ');
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
