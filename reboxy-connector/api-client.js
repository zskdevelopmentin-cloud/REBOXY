const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const SYNC_TOKEN = process.env.SYNC_TOKEN || 'tally_local_dev_token';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SYNC_TOKEN}`,
        'bypass-tunnel-reminder': 'true'
    },
    timeout: 30000
});

/**
 * Checks if cloud API is reachable and token is valid
 */
async function checkConnection() {
    try {
        const response = await apiClient.get('/sync/ping');
        return response.status === 200;
    } catch (error) {
        if (error.response) {
            console.error(`[API Client] Health Check Failed: HTTP ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`[API Client] Network Connection Error: ${error.message}`);
        }
        return false;
    }
}

/**
 * Fetches current company sync cursor (lastAlterId) from cloud
 * @param {string} companyId 
 */
async function getSyncState(companyId) {
    try {
        const response = await apiClient.get(`/sync/status?companyId=${encodeURIComponent(companyId)}`);
        return response.data;
    } catch (error) {
        console.warn(`[API Client] Warning: Could not fetch remote sync state (${error.message}). Defaulting to full sync.`);
        return { lastAlterId: 0 };
    }
}

/**
 * Pushes formatted Tally data to the cloud
 * @param {string} companyId 
 * @param {object} payload 
 */
async function pushToCloud(companyId, payload) {
    try {
        const response = await apiClient.post('/sync/push', {
            companyId,
            timestamp: new Date().toISOString(),
            data: payload
        });
        
        return response.data;
    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            console.error(`[API Client] Cloud API Error ${status}: ${JSON.stringify(error.response.data)}`);
            if (status === 401 || status === 403) {
                const err = new Error(`AUTHENTICATION_FAILED: HTTP ${status}`);
                err.isAuthError = true;
                throw err;
            }
            throw new Error(`API_ERROR_${status}`);
        }
        throw error;
    }
}

module.exports = {
    checkConnection,
    getSyncState,
    pushToCloud
};
