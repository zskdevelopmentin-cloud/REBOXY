require('dotenv').config();
const { pushToCloud, checkConnection } = require('./api-client');
const { fetchTallyData } = require('./tally-xml-service');

const SYNC_INTERVAL_MS = process.env.SYNC_INTERVAL_MS || 60000; // 1 minute default
const COMPANY_ID = process.env.COMPANY_ID || 'TALLY-DEMO-COMPANY';

async function performSync() {
    console.log(`[${new Date().toISOString()}] Starting Tally sync for company: ${COMPANY_ID}`);
    
    try {
        // 1. Fetch from local Tally instance (XML/ODBC)
        console.log('Fetching data from Tally Desktop...');
        const tallyData = await fetchTallyData();
        
        if (!tallyData) {
            console.log('No new data found in Tally. Skipping push.');
            return;
        }

        // 2. Push to REBOXY Cloud API
        console.log('Pushing data to REBOXY Cloud...');
        const result = await pushToCloud(COMPANY_ID, tallyData);
        
        console.log(`[${new Date().toISOString()}] Sync completed successfully! Sync ID: ${result.syncId}`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Sync failed:`, error.message);
    }
}

async function start() {
    console.log('--- REBOXY Tally Connector ---');
    console.log('Verifying cloud connection...');
    
    const isConnected = await checkConnection();
    if (!isConnected) {
        console.error('Failed to connect to REBOXY Cloud API. Please check your API URL and Token.');
        process.exit(1);
    }
    
    console.log('Connected to cloud successfully. Starting polling mechanism...');
    
    // Initial sync
    await performSync();
    
    // Scheduled sync
    setInterval(performSync, SYNC_INTERVAL_MS);
}

start();
