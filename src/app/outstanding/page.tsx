'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useBiz } from '@/context/BizContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { 
  MessageCircle, Mail, ArrowLeft, ChevronRight, Search, X, Phone, MapPin, 
  FileText, ShieldAlert, User, Calendar, Bell, Plus, Clock, Activity, Edit3
} from 'lucide-react';
import { Ledger } from '@/types';
import { calculateParty360 } from '@/utils/party360';
import { exportReportData } from '@/utils/export';

interface SalesPerson {
  id: string;
  name: string;
  phone?: string;
}

interface ActivityItem {
  id: string;
  type: 'VOUCHER' | 'VISIT' | 'REMINDER' | 'ASSIGNMENT';
  date: string;
  title: string;
  details: string;
  amount?: number;
  status?: string;
  salesPersonName?: string;
}

const OutstandingPage = () => {
  const { data, addToast } = useBiz();
  const [tab, setTab] = useState<'Receivables' | 'Payables'>('Receivables');
  const [selectedParty, setSelectedParty] = useState<Ledger | null>(null);
  const [search, setSearch] = useState('');

  const [salespeople, setSalespeople] = useState<SalesPerson[]>([]);

  useEffect(() => {
    fetch('/api/salespeople')
      .then(res => res.json())
      .then(sData => {
        if (Array.isArray(sData)) setSalespeople(sData);
      })
      .catch(err => console.error('Failed to load salespeople', err));
  }, []);

  const handleExportCSV = () => {
    if (!filteredParties || filteredParties.length === 0) return;
    const headers = ['Party Name', 'Type', 'Phone', 'Aging Bucket', 'Days Old', 'Credit Limit (₹)', 'Credit Status', 'Closing Balance (₹)'];
    const rows = filteredParties.map(p => [
      p.name,
      p.type,
      p.phone || '',
      p.agingBucket,
      p.daysOld,
      p.creditLimit || 0,
      p.limitStatus,
      p.closingBalance || 0
    ]);
    exportReportData(`outstanding_${tab.toLowerCase()}`, headers, rows);
  };

  const filteredParties = useMemo(() => {
    const q = search.trim().toLowerCase();

    return data.ledgers
      .filter(l => {
        const matchesTab = tab === 'Receivables' ? l.type === 'Customer' : l.type === 'Supplier';
        if (!matchesTab) return false;
        if (!q) return true;
        const nameMatch = (l.name || '').toLowerCase().includes(q);
        const phoneMatch = (l.phone || '').toLowerCase().includes(q);
        const cityMatch = (l.city || '').toLowerCase().includes(q);
        return nameMatch || phoneMatch || cityMatch;
      })
      .map(p => {
        const metrics = calculateParty360(p, data.vouchers);
        const daysOld = metrics.daysSinceLastTransaction || 0;

        let agingBucket = '0-30 Days';
        if (daysOld > 90) agingBucket = '90+ Days';
        else if (daysOld > 60) agingBucket = '61-90 Days';
        else if (daysOld > 30) agingBucket = '31-60 Days';

        // Credit Limit Status
        let limitStatus: 'Within Limit' | 'Near Limit' | 'Over Limit' | 'Not Set' = 'Not Set';
        if (p.creditLimit && p.creditLimit > 0) {
          const bal = p.closingBalance || 0;
          if (bal > p.creditLimit) {
            limitStatus = 'Over Limit';
          } else if (bal >= p.creditLimit * 0.8) {
            limitStatus = 'Near Limit';
          } else {
            limitStatus = 'Within Limit';
          }
        }

        // Assigned Rep name if available
        const rep = salespeople.find(s => s.id === p.salesPersonId);

        return {
          ...p,
          metrics,
          daysOld,
          agingBucket,
          limitStatus,
          salesPersonName: rep?.name
        };
      })
      .sort((a, b) => (b.closingBalance || 0) - (a.closingBalance || 0));
  }, [data.ledgers, data.vouchers, tab, search, salespeople]);

  const totalOutstanding = filteredParties.reduce((sum, p) => sum + (p.closingBalance || 0), 0);

  const sendReminder = (party: Ledger, method: 'wa' | 'mail') => {
    const amountStr = formatCurrency(party.closingBalance || 0);
    const msg = `Dear ${party.name}, a payment of ${amountStr} is outstanding for REBOXY TRADERS. Please clear it at the earliest.`;
    if (method === 'wa') {
      window.open(`https://wa.me/${party.phone || ''}?text=${encodeURIComponent(msg)}`);
    } else {
      window.open(`mailto:${party.email || ''}?subject=Payment Reminder&body=${encodeURIComponent(msg)}`);
    }
  };

  const PartyDetail360 = ({ partyItem }: { partyItem: typeof filteredParties[0] }) => {
    const m = partyItem.metrics;
    const isCustomer = partyItem.type === 'Customer';

    const [activeTab, setActiveTab] = useState<'financial' | 'timeline'>('financial');
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loadingTimeline, setLoadingTimeline] = useState(false);

    // Modals in 360
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedRepId, setSelectedRepId] = useState(partyItem.salesPersonId || '');
    const [creditLimitInput, setCreditLimitInput] = useState(partyItem.creditLimit ? String(partyItem.creditLimit) : '');
    const [creditDaysInput, setCreditDaysInput] = useState(partyItem.creditDays ? String(partyItem.creditDays) : '');

    const [showVisitModal, setShowVisitModal] = useState(false);
    const [showReminderModal, setShowReminderModal] = useState(false);

    // Visit Form
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
    const [visitPurpose, setVisitPurpose] = useState('');
    const [visitNotes, setVisitNotes] = useState('');

    // Reminder Form
    const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
    const [reminderAmount, setReminderAmount] = useState(partyItem.closingBalance ? String(partyItem.closingBalance) : '');
    const [reminderNote, setReminderNote] = useState('');

    useEffect(() => {
      if (activeTab === 'timeline') {
        setLoadingTimeline(true);
        fetch(`/api/customer-activities?customerId=${partyItem.id}`)
          .then(res => res.json())
          .then(resData => {
            if (resData.activities) {
              setActivities(resData.activities);
            }
          })
          .catch(err => console.error('Failed to load timeline', err))
          .finally(() => setLoadingTimeline(false));
      }
    }, [activeTab, partyItem.id]);

    const handleSaveTermsAndAssignment = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const res = await fetch('/api/customer-assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: partyItem.id,
            salesPersonId: selectedRepId || undefined,
            creditLimit: creditLimitInput ? parseFloat(creditLimitInput) : undefined,
            creditDays: creditDaysInput ? parseInt(creditDaysInput, 10) : undefined
          })
        });

        if (res.ok) {
          addToast('Customer assignment & credit terms updated', 'success');
          setShowAssignModal(false);
          // Update current party item fields in local state
          partyItem.salesPersonId = selectedRepId;
          partyItem.creditLimit = creditLimitInput ? parseFloat(creditLimitInput) : undefined;
          partyItem.creditDays = creditDaysInput ? parseInt(creditDaysInput, 10) : undefined;
        } else {
          addToast('Failed to update terms', 'error');
        }
      } catch {
        addToast('Error connecting to server', 'error');
      }
    };

    const handleCreateVisit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!visitPurpose) return;
      try {
        const res = await fetch('/api/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: partyItem.id,
            salesPersonId: partyItem.salesPersonId || undefined,
            visitDate,
            purpose: visitPurpose,
            notes: visitNotes || undefined,
            outcome: 'PLANNED'
          })
        });

        if (res.ok) {
          addToast('Visit logged successfully', 'success');
          setShowVisitModal(false);
          setVisitPurpose('');
          setVisitNotes('');
        } else {
          addToast('Failed to record visit', 'error');
        }
      } catch {
        addToast('Error connecting to server', 'error');
      }
    };

    const handleCreateReminder = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const res = await fetch('/api/payment-reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: partyItem.id,
            salesPersonId: partyItem.salesPersonId || undefined,
            reminderDate,
            amount: reminderAmount ? parseFloat(reminderAmount) : undefined,
            note: reminderNote || undefined,
            status: 'PENDING'
          })
        });

        if (res.ok) {
          addToast('Payment reminder saved', 'success');
          setShowReminderModal(false);
          setReminderNote('');
        } else {
          addToast('Failed to set reminder', 'error');
        }
      } catch {
        addToast('Error connecting to server', 'error');
      }
    };

    return (
      <div className="flex flex-col h-full bg-background dark:bg-gray-950 animate-in slide-in-from-right duration-300 z-[60] pb-24">
        <header className="p-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedParty(null)} className="p-2 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter truncate max-w-[200px] sm:max-w-xs">{partyItem.name}</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{partyItem.type} 360 View</p>
            </div>
          </div>

          <button
            onClick={() => setShowAssignModal(true)}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 dark:text-white"
          >
            <Edit3 size={13} /> Edit Terms & Rep
          </button>
        </header>

        <div className="p-4 space-y-5 overflow-y-auto">
          {/* Main KPI Banner */}
          <div className="bg-primary p-6 rounded-[2rem] text-white shadow-xl shadow-primary/30 text-center space-y-2 relative overflow-hidden">
            <p className="text-[10px] uppercase font-black tracking-widest opacity-70">
              {isCustomer ? 'Total Outstanding Receivable' : 'Total Outstanding Payable'}
            </p>
            <p className="text-3xl font-black">{formatCurrency(partyItem.closingBalance || 0)}</p>
            
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="text-[10px] uppercase font-bold bg-white/20 px-3 py-1 rounded-full">
                {m.daysSinceLastTransaction !== null ? `Last Active ${m.daysSinceLastTransaction} Days Ago` : 'No Activity'}
              </span>

              {partyItem.limitStatus === 'Over Limit' && (
                <span className="text-[10px] font-black bg-red-500 text-white px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert size={12} /> Over Limit
                </span>
              )}
              {partyItem.limitStatus === 'Near Limit' && (
                <span className="text-[10px] font-black bg-amber-500 text-white px-3 py-1 rounded-full uppercase tracking-wider">
                  Near Limit
                </span>
              )}
              {partyItem.limitStatus === 'Within Limit' && (
                <span className="text-[10px] font-black bg-emerald-500 text-white px-3 py-1 rounded-full uppercase tracking-wider">
                  Within Limit
                </span>
              )}
            </div>
          </div>

          {/* Operational & Terms Metadata Card */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase">Assigned Salesperson</p>
              <p className="font-black dark:text-white uppercase flex items-center gap-1 mt-0.5">
                <User size={13} className="text-teal-500 shrink-0" />
                {partyItem.salesPersonName || 'Unassigned'}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase">Credit Limit / Terms</p>
              <p className="font-black dark:text-white uppercase mt-0.5">
                {partyItem.creditLimit ? formatCurrency(partyItem.creditLimit) : 'No Limit'} 
                {partyItem.creditDays ? ` (${partyItem.creditDays} days)` : ''}
              </p>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2 text-xs">
            <h4 className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Contact Info</h4>
            <div className="grid grid-cols-2 gap-2 font-bold dark:text-white">
              {partyItem.phone && <div className="flex items-center gap-1.5"><Phone size={14} className="text-primary shrink-0" /> {partyItem.phone}</div>}
              {partyItem.email && <div className="flex items-center gap-1.5"><Mail size={14} className="text-primary shrink-0" /> {partyItem.email}</div>}
              {partyItem.city && <div className="flex items-center gap-1.5"><MapPin size={14} className="text-primary shrink-0" /> {partyItem.city}</div>}
              {partyItem.gst && <div className="flex items-center gap-1.5"><FileText size={14} className="text-primary shrink-0" /> GST: {partyItem.gst}</div>}
            </div>
          </div>

          {/* Operational Quick Actions Grid */}
          <div className="grid grid-cols-4 gap-2">
            <button onClick={() => sendReminder(partyItem, 'wa')} className="flex flex-col items-center gap-1 p-3 bg-green-500 text-white rounded-2xl shadow-sm active:scale-95 transition-all text-[9px] font-black uppercase tracking-wider">
              <MessageCircle size={20} />
              <span>WhatsApp</span>
            </button>
            <button onClick={() => sendReminder(partyItem, 'mail')} className="flex flex-col items-center gap-1 p-3 bg-primary text-white rounded-2xl shadow-sm active:scale-95 transition-all text-[9px] font-black uppercase tracking-wider">
              <Mail size={20} />
              <span>Email</span>
            </button>
            <button onClick={() => setShowVisitModal(true)} className="flex flex-col items-center gap-1 p-3 bg-teal-500 text-white rounded-2xl shadow-sm active:scale-95 transition-all text-[9px] font-black uppercase tracking-wider">
              <Calendar size={20} />
              <span>Log Visit</span>
            </button>
            <button onClick={() => setShowReminderModal(true)} className="flex flex-col items-center gap-1 p-3 bg-amber-500 text-white rounded-2xl shadow-sm active:scale-95 transition-all text-[9px] font-black uppercase tracking-wider">
              <Bell size={20} />
              <span>Set Task</span>
            </button>
          </div>

          {/* Section Selector Tabs */}
          <div className="flex p-1.5 bg-gray-100 dark:bg-gray-900 rounded-2xl">
            <button
              onClick={() => setActiveTab('financial')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                activeTab === 'financial' ? 'bg-white dark:bg-gray-800 dark:text-white shadow-sm text-primary' : 'text-gray-400'
              }`}
            >
              Financial Summary
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                activeTab === 'timeline' ? 'bg-white dark:bg-gray-800 dark:text-white shadow-sm text-primary' : 'text-gray-400'
              }`}
            >
              Activity Timeline
            </button>
          </div>

          {activeTab === 'financial' ? (
            <>
              {/* 360 Financial Breakdown Grid */}
              <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Financial Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">{isCustomer ? 'Gross Sales' : 'Gross Purchases'}</p>
                    <p className="text-sm font-black dark:text-white">{formatCurrency(isCustomer ? m.totalSales : m.totalPurchases)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">{isCustomer ? 'Total Receipts' : 'Total Payments'}</p>
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(isCustomer ? m.totalReceipts : m.totalPayments)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">{isCustomer ? 'Credit Notes' : 'Debit Notes'}</p>
                    <p className="text-sm font-black text-orange-600">{formatCurrency(isCustomer ? m.creditNotes : m.debitNotes)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">{isCustomer ? 'Net Sales' : 'Net Purchases'}</p>
                    <p className="text-sm font-black text-primary">{formatCurrency(isCustomer ? m.netSales : m.netPurchases)}</p>
                  </div>
                </div>
              </div>

              {/* Transaction History Ledger */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Transaction History ({m.transactionCount})</h4>
                  <span className="text-[10px] font-bold text-gray-400">Opening: ₹{m.openingBalance.toLocaleString()}</span>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800">
                  {m.chronologicalLedger.map((v) => (
                    <div key={v.id} className="p-3.5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black dark:text-white uppercase tracking-tight">{v.vNo}</span>
                          <span className="text-[9px] px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-md uppercase">{v.type}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(v.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black dark:text-white">{formatCurrency(v.amount)}</p>
                        <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400">Bal: ₹{v.runningBalance.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {m.chronologicalLedger.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">No transaction records found for this account.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Activity Timeline Stream */
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Combined Activity Timeline</h4>

              {loadingTimeline ? (
                <div className="py-8 text-center text-xs text-gray-400 font-bold uppercase tracking-wider">Loading Timeline...</div>
              ) : activities.length > 0 ? (
                <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800">
                  {activities.map(act => (
                    <div key={act.id} className="relative pl-9 p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1">
                      <div className={`absolute left-2.5 top-4 w-3 h-3 rounded-full -translate-x-1/2 ring-4 ring-white dark:ring-gray-900 ${
                        act.type === 'VOUCHER' ? 'bg-primary' :
                        act.type === 'VISIT' ? 'bg-teal-500' :
                        act.type === 'REMINDER' ? 'bg-amber-500' : 'bg-indigo-500'
                      }`} />

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-gray-400">{formatDate(act.date)}</span>
                        <span className="text-[9px] px-2 py-0.5 bg-gray-100 dark:bg-gray-800 font-bold rounded-md uppercase dark:text-gray-300">
                          {act.type}
                        </span>
                      </div>

                      <p className="text-xs font-black dark:text-white uppercase tracking-tight">{act.title}</p>
                      <p className="text-xs text-gray-500 font-medium">{act.details}</p>
                      {act.amount !== undefined && (
                        <p className="text-xs font-black text-primary">{formatCurrency(act.amount)}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-xs font-bold uppercase tracking-wider">No operational activity recorded yet.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Edit Terms & Salesperson Modal */}
        {showAssignModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
              <h3 className="text-base font-black dark:text-white uppercase tracking-tight">Credit Terms & Rep Assignment</h3>

              <form onSubmit={handleSaveTermsAndAssignment} className="space-y-3 text-xs font-bold">
                <div>
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Assign Salesperson</label>
                  <select
                    value={selectedRepId}
                    onChange={e => setSelectedRepId(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                  >
                    <option value="">-- No Assigned Rep --</option>
                    {salespeople.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={creditLimitInput}
                    onChange={e => setCreditLimitInput(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Credit Days</label>
                  <input
                    type="number"
                    placeholder="e.g. 30"
                    value={creditDaysInput}
                    onChange={e => setCreditDaysInput(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-600 dark:text-gray-300 font-black uppercase text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-primary text-white rounded-2xl font-black uppercase text-xs shadow-md"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Visit Modal */}
        {showVisitModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
              <h3 className="text-base font-black dark:text-white uppercase tracking-tight">Log Visit for {partyItem.name}</h3>

              <form onSubmit={handleCreateVisit} className="space-y-3 text-xs font-bold">
                <div>
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Visit Date</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={e => setVisitDate(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Purpose of Visit</label>
                  <input
                    type="text"
                    placeholder="Payment collection, order booking, courtesy check..."
                    value={visitPurpose}
                    onChange={e => setVisitPurpose(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Discussion / Outcome Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Notes on conversation..."
                    value={visitNotes}
                    onChange={e => setVisitNotes(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowVisitModal(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-600 dark:text-gray-300 font-black uppercase text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-teal-500 text-white rounded-2xl font-black uppercase text-xs shadow-md"
                  >
                    Save Visit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Reminder Modal */}
        {showReminderModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
              <h3 className="text-base font-black dark:text-white uppercase tracking-tight">Payment Reminder for {partyItem.name}</h3>

              <form onSubmit={handleCreateReminder} className="space-y-3 text-xs font-bold">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 uppercase text-[9px] mb-1">Reminder Date</label>
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={e => setReminderDate(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 uppercase text-[9px] mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      value={reminderAmount}
                      onChange={e => setReminderAmount(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Note / Instructions</label>
                  <textarea
                    rows={3}
                    placeholder="Instructions for collection..."
                    value={reminderNote}
                    onChange={e => setReminderNote(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReminderModal(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-600 dark:text-gray-300 font-black uppercase text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs shadow-md"
                  >
                    Set Reminder
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (selectedParty) {
    const detailedParty = filteredParties.find(p => p.id === selectedParty.id) || filteredParties[0];
    if (detailedParty) return <PartyDetail360 partyItem={detailedParty} />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="p-4 space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Outstanding</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Bills Aging Analysis & 360</p>
          </div>
          <div className="text-right flex items-center gap-3">
            <div>
              <p className="text-xl font-black text-primary">{formatCurrency(totalOutstanding)}</p>
              <p className="text-[9px] text-gray-400 font-black uppercase">Total {tab}</p>
            </div>
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Export
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder={`Search ${tab} by name, phone, city...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        
        <div className="flex p-1.5 bg-gray-100 dark:bg-gray-900 rounded-2xl">
          {(['Receivables', 'Payables'] as const).map(t => (
            <button 
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                tab === t ? 'bg-white dark:bg-gray-800 dark:text-white shadow-md text-primary' : 'text-gray-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 no-scrollbar">
        {filteredParties.map(p => (
          <div 
            key={p.id} 
            onClick={() => setSelectedParty(p)}
            className="p-4 bg-white dark:bg-gray-800 rounded-[1.5rem] border border-gray-50 dark:border-gray-700 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 font-black text-lg group-hover:bg-primary/5 group-hover:text-primary transition-colors uppercase">
                {p.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">{p.name}</h4>
                  {p.limitStatus === 'Over Limit' && (
                    <span className="text-[9px] bg-red-100 text-red-600 dark:bg-red-900/30 px-2 py-0.5 rounded-full font-black uppercase">
                      Over Limit
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] bg-blue-50 text-blue-600 dark:bg-blue-900/20 px-2 py-0.5 rounded-full font-bold uppercase">{p.agingBucket}</span>
                  {p.salesPersonName && (
                    <span className="text-[9px] bg-teal-50 text-teal-700 dark:bg-teal-900/20 px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                      <User size={10} /> {p.salesPersonName}
                    </span>
                  )}
                  {p.phone && <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{p.phone}</span>}
                </div>
              </div>
            </div>
            <div className="text-right flex items-center gap-3">
              <div>
                <p className="text-sm font-black dark:text-white">{formatCurrency(p.closingBalance || 0)}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Closing Balance</p>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          </div>
        ))}
        {filteredParties.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            <p className="text-sm">No {tab.toLowerCase()} found matching "{search}".</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutstandingPage;
