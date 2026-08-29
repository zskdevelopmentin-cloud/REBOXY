require('dotenv').config();
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const TALLY_URL = process.env.TALLY_URL || 'http://192.168.1.33:9000';


const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
});

function parseTallyDate(dateStr) {
    if (!dateStr) return new Date().toISOString();
    const str = String(dateStr);
    if (str.length === 8) {
        const year = str.substring(0, 4);
        const month = str.substring(4, 6);
        const day = str.substring(6, 8);
        return new Date(`${year}-${month}-${day}`).toISOString();
    }
    return new Date().toISOString();
}

async function fetchTallyData() {
    console.log(`[Tally Service] Connecting to Tally XML at ${TALLY_URL}...`);

    try {
        // 1. Fetch Day Book (Vouchers)
        const vchXmlReq = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Day Book</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
        
        const vchRes = await axios.post(TALLY_URL, vchXmlReq, {
            headers: { 'Content-Type': 'text/xml' },
            timeout: 60000
        });

        const vchJson = xmlParser.parse(vchRes.data);
        const messages = vchJson?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE || [];
        const msgList = Array.isArray(messages) ? messages : [messages];

        let companyName = vchJson?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDESC?.STATICVARIABLES?.SVCURRENTCOMPANY || 'SUPREME FOOTCARE';

        const vouchers = [];
        msgList.forEach(m => {
            if (m.VOUCHER) {
                const v = m.VOUCHER;
                const vType = v['@_VCHTYPE'] || v.VOUCHERTYPENAME || 'Sales';
                const partyName = v.PARTYLEDGERNAME || v.PARTYNAME || 'Cash';
                const vNo = v.VOUCHERNUMBER || v['@_VCHKEY'] || `VCH-${Date.now()}`;
                const rawDate = v.DATE;
                
                let amount = 0;
                const ledgerEntries = v['ALLLEDGERENTRIES.LIST'] || v['LEDGERENTRIES.LIST'] || [];
                const entriesList = Array.isArray(ledgerEntries) ? ledgerEntries : [ledgerEntries];
                
                entriesList.forEach(entry => {
                    const amt = Math.abs(parseFloat(entry.AMOUNT) || 0);
                    if (amt > amount) amount = amt;
                });

                vouchers.push({
                    tallyId: v.GUID || v['@_REMOTEID'] || String(vNo),
                    vNo: String(vNo),
                    type: vType,
                    date: parseTallyDate(rawDate),
                    partyName: partyName,
                    amount: amount
                });
            }
        });

        // 2. Fetch Ledgers (Masters)
        const ledgerXmlReq = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Accounts</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><ACCOUNTTYPE>Ledgers</ACCOUNTTYPE></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
        
        const ledgerRes = await axios.post(TALLY_URL, ledgerXmlReq, {
            headers: { 'Content-Type': 'text/xml' },
            timeout: 60000
        });

        const ledgerJson = xmlParser.parse(ledgerRes.data);
        const ledgerMsgs = ledgerJson?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE || [];
        const ledgerMsgList = Array.isArray(ledgerMsgs) ? ledgerMsgs : [ledgerMsgs];

        const ledgers = [];
        ledgerMsgList.forEach(m => {
            if (m.LEDGER) {
                const l = m.LEDGER;
                const parent = l.PARENT || 'Sundry Debtors';
                let type = 'Customer';
                if (typeof parent === 'string' && parent.includes('Creditor')) type = 'Supplier';
                if (typeof parent === 'string' && parent.includes('Bank')) type = 'Bank';
                if (typeof parent === 'string' && parent.includes('Cash')) type = 'Cash';

                ledgers.push({
                    tallyId: l.GUID || l.NAME,
                    name: l.NAME,
                    group: typeof parent === 'string' ? parent : 'Sundry Debtors',
                    closingBalance: Math.abs(parseFloat(l.CLOSINGBALANCE) || 0),
                    type: type
                });
            }
        });

        console.log(`[Tally Service] Successfully extracted ${vouchers.length} Vouchers and ${ledgers.length} Ledgers for "${companyName}".`);

        return {
            companyName,
            ledgers,
            vouchers
        };
    } catch (error) {
        console.error('[Tally Service] Error querying Tally XML:', error.message);
        throw error;
    }
}

module.exports = {
    fetchTallyData
};
