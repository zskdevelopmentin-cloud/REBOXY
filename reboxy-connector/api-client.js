const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const SYNC_TOKEN = process.env.SYNC_TOKEN || 'tally_local_dev_token';

// Configure standard headers for all requests
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SYNC_TOKEN}`
    },
    timeout: 30000 // 30 seconds timeout
});

/**
 * Checks if the cloud API is reachable and token is valid
 */
async function checkConnection() {
    try {
        const response = await apiClient.get('/sync/ping');
        return response.status === 200;
    } catch (error) {
        if (error.response) {
            console.error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`Network Error: ${error.message}`);
        }
        return false;
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
        console.error('Failed to push to cloud.');
        if (error.response) {
            console.error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            throw new Error(`API Error: ${error.response.status}`);
        }
        throw error;
    }
}

module.exports = {
    checkConnection,
    pushToCloud
};
