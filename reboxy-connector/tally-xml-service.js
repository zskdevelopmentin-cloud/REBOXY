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

function getFormattedDate(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

async function fetchTallyData() {
    console.log(`[Tally Service] Connecting to Tally XML at ${TALLY_URL}...`);

    const fromDate = '20260401';
    const toDate = getFormattedDate();

    try {
        // 1. Fetch Day Book (Vouchers for the entire date range up to today)
        const vchXmlReq = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Day Book</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><SVFROMDATE>${fromDate}</SVFROMDATE><SVTODATE>${toDate}</SVTODATE></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
        
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

                // Parse Inventory Line Items if available in XML
                const inventoryEntries = v['ALLINVENTORYENTRIES.LIST'] || v['INVENTORYENTRIES.LIST'] || [];
                const invList = Array.isArray(inventoryEntries) ? inventoryEntries : (inventoryEntries ? [inventoryEntries] : []);
                
                const items = [];
                invList.forEach(inv => {
                    if (inv.STOCKITEMNAME) {
                        const rawQty = String(inv.BILLEDQTY || inv.ACTUALQTY || inv.QTY || '1');
                        const qtyMatch = rawQty.match(/-?[\d.]+/);
                        const qty = qtyMatch ? Math.abs(parseFloat(qtyMatch[0])) : 1;
                        const rate = Math.abs(parseFloat(inv.RATE) || 0);
                        const amt = Math.abs(parseFloat(inv.AMOUNT) || (qty * rate));
                        
                        items.push({
                            name: String(inv.STOCKITEMNAME),
                            quantity: qty,
                            rate: rate,
                            amount: amt
                        });
                    }
                });

                vouchers.push({
                    tallyId: v.GUID || v['@_REMOTEID'] || String(vNo),
                    vNo: String(vNo),
                    type: String(vType),
                    date: parseTallyDate(rawDate),
                    partyName: String(partyName),
                    amount: amount,
                    items: items
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
