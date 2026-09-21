require('dotenv').config();
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

const TALLY_URL = process.env.TALLY_URL || 'http://localhost:9000';

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

function parseBool(val) {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    return s === 'yes' || s === 'true' || s === '1';
}

function parseIntSafe(val, fallback = 0) {
    if (!val) return fallback;
    const n = parseInt(String(val).trim(), 10);
    return isNaN(n) ? fallback : n;
}

/**
 * Fetches ledgers, stock items, and vouchers from Tally XML server.
 * Supports incremental sync filtering by sinceAlterId and historical date-range chunking via options.
 * @param {number} sinceAlterId 
 * @param {object} options - { fromDate: 'YYYYMMDD', toDate: 'YYYYMMDD', fetchMasters: true/false }
 */
async function fetchTallyData(sinceAlterId = 0, options = {}) {
    const fromDate = options.fromDate || (sinceAlterId > 0 ? '20200401' : '20150101');
    const toDate = options.toDate || getFormattedDate();
    const includeMasters = options.fetchMasters !== false;

    console.log(`[Tally Service] Querying Tally XML at ${TALLY_URL} (Period: ${fromDate} -> ${toDate}, sinceAlterId: ${sinceAlterId}, masters: ${includeMasters})...`);

    try {
        let maxAlterIdSeen = sinceAlterId;

        // 1. Fetch Day Book / Vouchers
        const vchXmlReq = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Day Book</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><SVFROMDATE>${fromDate}</SVFROMDATE><SVTODATE>${toDate}</SVTODATE></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
        
        const vchRes = await axios.post(TALLY_URL, vchXmlReq, {
            headers: { 'Content-Type': 'text/xml' },
            timeout: 180000
        });

        const vchJson = xmlParser.parse(vchRes.data);
        const messages = vchJson?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE || [];
        const msgList = Array.isArray(messages) ? messages : (messages ? [messages] : []);

        let companyName = vchJson?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDESC?.STATICVARIABLES?.SVCURRENTCOMPANY || 'SUPREME FOOTCARE';

        const vouchers = [];
        msgList.forEach(m => {
            if (m.VOUCHER) {
                const v = m.VOUCHER;
                const alterId = parseIntSafe(v.ALTERID || v['@_ALTERID'] || v.MASTERID || 0);
                const masterId = parseIntSafe(v.MASTERID || v['@_MASTERID'] || 0);
                const tallyGuid = String(v.GUID || v['@_GUID'] || v['@_REMOTEID'] || '');

                if (alterId > maxAlterIdSeen) {
                    maxAlterIdSeen = alterId;
                }

                // If doing incremental sync, only send if alterId > sinceAlterId (or if sinceAlterId is 0)
                if (sinceAlterId > 0 && alterId > 0 && alterId <= sinceAlterId) {
                    return;
                }

                const vType = v['@_VCHTYPE'] || v.VOUCHERTYPENAME || 'Sales';
                const partyName = v.PARTYLEDGERNAME || v.PARTYNAME || 'Cash';
                const vNo = v.VOUCHERNUMBER || v['@_VCHKEY'] || (masterId ? `VCH-${masterId}` : `VCH-${Date.now()}`);
                const rawDate = v.DATE;
                const isCancelled = parseBool(v.ISCANCELLED || v['@_ISCANCELLED']);
                const isDeleted = parseBool(v.ISDELETED || v['@_ISDELETED']);

                let amount = 0;
                const ledgerEntries = v['ALLLEDGERENTRIES.LIST'] || v['LEDGERENTRIES.LIST'] || [];
                const entriesList = Array.isArray(ledgerEntries) ? ledgerEntries : (ledgerEntries ? [ledgerEntries] : []);
                
                entriesList.forEach(entry => {
                    const amt = Math.abs(parseFloat(entry.AMOUNT) || 0);
                    if (amt > amount) amount = amt;
                });

                // Parse Line Items
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
                    tallyGuid: tallyGuid || null,
                    masterId: masterId || null,
                    alterId: alterId || null,
                    vNo: String(vNo),
                    type: String(vType),
                    date: parseTallyDate(rawDate),
                    partyName: String(partyName),
                    amount: amount,
                    narration: v.NARRATION ? String(v.NARRATION) : null,
                    status: (isCancelled || isDeleted) ? 'CANCELLED' : 'COMPLETED',
                    isCancelled: isCancelled,
                    isDeleted: isDeleted,
                    items: items
                });
            }
        });

        const ledgers = [];
        const inventory = [];

        if (includeMasters) {
            // 2. Fetch Ledgers
            const ledgerXmlReq = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Accounts</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><ACCOUNTTYPE>Ledgers</ACCOUNTTYPE></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
            
            const ledgerRes = await axios.post(TALLY_URL, ledgerXmlReq, {
                headers: { 'Content-Type': 'text/xml' },
                timeout: 180000
            });

            const ledgerJson = xmlParser.parse(ledgerRes.data);
            const ledgerMsgs = ledgerJson?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE || [];
            const ledgerMsgList = Array.isArray(ledgerMsgs) ? ledgerMsgs : (ledgerMsgs ? [ledgerMsgs] : []);

            ledgerMsgList.forEach(m => {
                if (m.LEDGER) {
                    const l = m.LEDGER;
                    const alterId = parseIntSafe(l.ALTERID || l['@_ALTERID'] || l.MASTERID || 0);
                    const masterId = parseIntSafe(l.MASTERID || l['@_MASTERID'] || 0);
                    const tallyGuid = String(l.GUID || l['@_GUID'] || '');

                    if (alterId > maxAlterIdSeen) {
                        maxAlterIdSeen = alterId;
                    }

                    if (sinceAlterId > 0 && alterId > 0 && alterId <= sinceAlterId) {
                        return;
                    }

                    const parent = l.PARENT || 'Sundry Debtors';
                    let type = 'Customer';
                    if (typeof parent === 'string' && parent.includes('Creditor')) type = 'Supplier';
                    if (typeof parent === 'string' && parent.includes('Bank')) type = 'Bank';
                    if (typeof parent === 'string' && parent.includes('Cash')) type = 'Cash';

                    ledgers.push({
                        tallyGuid: tallyGuid || null,
                        masterId: masterId || null,
                        alterId: alterId || null,
                        name: String(l.NAME || ''),
                        group: typeof parent === 'string' ? parent : 'Sundry Debtors',
                        closingBalance: Math.abs(parseFloat(l.CLOSINGBALANCE) || 0),
                        type: type
                    });
                }
            });

            // 3. Fetch Inventory / Stock Items
            const stockXmlReq = `<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Accounts</REPORTNAME><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><ACCOUNTTYPE>Stock Items</ACCOUNTTYPE></STATICVARIABLES></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
            
            const stockRes = await axios.post(TALLY_URL, stockXmlReq, {
                headers: { 'Content-Type': 'text/xml' },
                timeout: 180000
            });

            const stockJson = xmlParser.parse(stockRes.data);
            const stockMsgs = stockJson?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE || [];
            const stockMsgList = Array.isArray(stockMsgs) ? stockMsgs : (stockMsgs ? [stockMsgs] : []);

            stockMsgList.forEach(m => {
                if (m.STOCKITEM) {
                    const s = m.STOCKITEM;
                    const alterId = parseIntSafe(s.ALTERID || s['@_ALTERID'] || s.MASTERID || 0);
                    const masterId = parseIntSafe(s.MASTERID || s['@_MASTERID'] || 0);
                    const tallyGuid = String(s.GUID || s['@_GUID'] || '');

                    if (alterId > maxAlterIdSeen) {
                        maxAlterIdSeen = alterId;
                    }

                    if (sinceAlterId > 0 && alterId > 0 && alterId <= sinceAlterId) {
                        return;
                    }

                    inventory.push({
                        tallyGuid: tallyGuid || null,
                        masterId: masterId || null,
                        alterId: alterId || null,
                        name: String(s.NAME || ''),
                        category: s.CATEGORY ? String(s.CATEGORY) : null,
                        unit: s.BASEUNITS ? String(s.BASEUNITS) : 'Nos',
                        salesPrice: Math.abs(parseFloat(s.LASTSALESPRICE || s.OPENINGRATE) || 0),
                        currentStock: Math.abs(parseFloat(s.CLOSINGBALANCE) || 0)
                    });
                }
            });
        }

        console.log(`[Tally Service] Extracted ${vouchers.length} Vouchers, ${ledgers.length} Ledgers, ${inventory.length} Items for "${companyName}" (Period: ${fromDate}-${toDate}, maxAlterId: ${maxAlterIdSeen}).`);

        return {
            companyName,
            maxAlterIdSeen,
            ledgers,
            inventory,
            vouchers
        };
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.error(`[Tally Service] Tally Desktop is unreachable at ${TALLY_URL} (${error.code}).`);
        } else {
            console.error('[Tally Service] Error querying Tally XML:', error.message);
        }
        throw error;
    }
}

module.exports = {
    fetchTallyData,
    getFormattedDate
};

