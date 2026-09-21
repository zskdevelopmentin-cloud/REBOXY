'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useBiz } from '@/context/BizContext';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { 
  Bell, Calendar, CheckCircle2, Clock, XCircle, 
  Plus, Search, User, Filter, AlertTriangle, MessageSquare, ChevronRight, Phone
} from 'lucide-react';

interface Visit {
  id: string;
  customerId: string;
  salesPersonId: string;
  visitDate: string;
  purpose: string;
  notes?: string;
  outcome?: string;
  nextFollowUpDate?: string;
  customer?: { id: string; name: string; phone?: string; closingBalance?: number };
  salesPerson?: { id: string; name: string };
}

interface PaymentReminder {
  id: string;
  customerId: string;
  salesPersonId?: string;
  amount?: number;
  reminderDate: string;
  note?: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  customer?: { id: string; name: string; phone?: string; closingBalance?: number };
  salesPerson?: { id: string; name: string };
}

interface SalesPerson {
  id: string;
  name: string;
}

export default function RemindersPage() {
  const { data, addToast } = useBiz();
  const [activeTab, setActiveTab] = useState<'reminders' | 'visits' | 'watchlist'>('reminders');
  
  const [visits, setVisits] = useState<Visit[]>([]);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [salespeople, setSalespeople] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [repFilter, setRepFilter] = useState<string>('ALL');

  // Modals
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);

  // Form States
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState('');
  
  // Visit Form
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitPurpose, setVisitPurpose] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [visitOutcome, setVisitOutcome] = useState('PLANNED');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  // Reminder Form
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderAmount, setReminderAmount] = useState('');
  const [reminderNote, setReminderNote] = useState('');

  const customers = useMemo(() => {
    return data.ledgers.filter(l => l.type === 'Customer');
  }, [data.ledgers]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resV, resR, resS] = await Promise.all([
        fetch('/api/visits'),
        fetch('/api/payment-reminders'),
        fetch('/api/salespeople')
      ]);

      if (resV.ok) {
        const vData = await resV.json();
        setVisits(vData);
      }
      if (resR.ok) {
        const rData = await resR.json();
        setReminders(rData);
      }
      if (resS.ok) {
        const sData = await resS.json();
        setSalespeople(sData);
      }
    } catch (err) {
      console.error('Failed to load operational data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Credit Risk Watchlist calculation
  const overLimitCustomers = useMemo(() => {
    return customers.filter(c => {
      if (c.creditLimit && c.creditLimit > 0) {
        return (c.closingBalance || 0) > c.creditLimit;
      }
      return false;
    });
  }, [customers]);

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (repFilter !== 'ALL' && r.salesPersonId !== repFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const cName = r.customer?.name?.toLowerCase() || '';
        const note = r.note?.toLowerCase() || '';
        return cName.includes(q) || note.includes(q);
      }
      return true;
    });
  }, [reminders, statusFilter, repFilter, search]);

  const filteredVisits = useMemo(() => {
    return visits.filter(v => {
      if (statusFilter !== 'ALL' && v.outcome !== statusFilter) return false;
      if (repFilter !== 'ALL' && v.salesPersonId !== repFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const cName = v.customer?.name?.toLowerCase() || '';
        const purpose = v.purpose?.toLowerCase() || '';
        return cName.includes(q) || purpose.includes(q);
      }
      return true;
    });
  }, [visits, statusFilter, repFilter, search]);

  // Actions
  const handleUpdateReminderStatus = async (id: string, status: 'COMPLETED' | 'CANCELLED') => {
    try {
      const res = await fetch('/api/payment-reminders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        addToast(`Reminder marked as ${status.toLowerCase()}`, 'success');
        loadData();
      } else {
        addToast('Failed to update reminder', 'error');
      }
    } catch {
      addToast('Error updating reminder', 'error');
    }
  };

  const handleUpdateVisitOutcome = async (id: string, outcome: string) => {
    try {
      const res = await fetch('/api/visits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, outcome })
      });
      if (res.ok) {
        addToast(`Visit status updated to ${outcome}`, 'success');
        loadData();
      } else {
        addToast('Failed to update visit', 'error');
      }
    } catch {
      addToast('Error updating visit', 'error');
    }
  };

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !visitPurpose) {
      addToast('Please select customer and enter visit purpose', 'error');
      return;
    }

    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          salesPersonId: selectedSalesPersonId || undefined,
          visitDate,
          purpose: visitPurpose,
          notes: visitNotes || undefined,
          outcome: visitOutcome,
          nextFollowUpDate: nextFollowUpDate || undefined
        })
      });

      if (res.ok) {
        addToast('Customer visit logged successfully', 'success');
        setShowVisitModal(false);
        setVisitPurpose('');
        setVisitNotes('');
        loadData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Failed to record visit', 'error');
      }
    } catch {
      addToast('Failed to connect to server', 'error');
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !reminderDate) {
      addToast('Please select customer and reminder date', 'error');
      return;
    }

    try {
      const res = await fetch('/api/payment-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          salesPersonId: selectedSalesPersonId || undefined,
          reminderDate,
          amount: reminderAmount ? parseFloat(reminderAmount) : undefined,
          note: reminderNote || undefined,
          status: 'PENDING'
        })
      });

      if (res.ok) {
        addToast('Payment reminder set successfully', 'success');
        setShowReminderModal(false);
        setReminderAmount('');
        setReminderNote('');
        loadData();
      } else {
        const err = await res.json();
        addToast(err.error || 'Failed to create reminder', 'error');
      }
    } catch {
      addToast('Failed to connect to server', 'error');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background dark:bg-gray-950 overflow-hidden pb-24">
      {/* Header */}
      <header className="p-4 space-y-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter flex items-center gap-2">
              <Bell className="text-amber-500" size={24} /> Follow-ups & Reminders
            </h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              Business Operations & Collection Task Center
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setSelectedCustomerId(customers[0]?.id || ''); setShowVisitModal(true); }}
              className="px-3 py-2 bg-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-teal-500/20 active:scale-95 transition-all"
            >
              <Plus size={14} /> Log Visit
            </button>
            <button 
              onClick={() => { setSelectedCustomerId(customers[0]?.id || ''); setShowReminderModal(true); }}
              className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-primary/20 active:scale-95 transition-all"
            >
              <Plus size={14} /> Set Reminder
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-1.5 bg-gray-100 dark:bg-gray-800 rounded-2xl">
          <button
            onClick={() => { setActiveTab('reminders'); setStatusFilter('ALL'); }}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              activeTab === 'reminders' ? 'bg-white dark:bg-gray-900 text-primary shadow-sm' : 'text-gray-400'
            }`}
          >
            Payment Reminders ({reminders.filter(r => r.status === 'PENDING').length})
          </button>
          <button
            onClick={() => { setActiveTab('visits'); setStatusFilter('ALL'); }}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              activeTab === 'visits' ? 'bg-white dark:bg-gray-900 text-teal-600 shadow-sm' : 'text-gray-400'
            }`}
          >
            Visits & Logs ({visits.length})
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
              activeTab === 'watchlist' ? 'bg-white dark:bg-gray-900 text-red-500 shadow-sm' : 'text-gray-400'
            }`}
          >
            Risk Watchlist ({overLimitCustomers.length})
          </button>
        </div>

        {/* Filter Controls */}
        {activeTab !== 'watchlist' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search customer, note..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              {activeTab === 'reminders' ? (
                <>
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </>
              ) : (
                <>
                  <option value="PLANNED">Planned</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FOLLOW_UP">Follow Up Required</option>
                  <option value="CANCELLED">Cancelled</option>
                </>
              )}
            </select>
            <select
              value={repFilter}
              onChange={e => setRepFilter(e.target.value)}
              className="py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold dark:text-white"
            >
              <option value="ALL">All Sales Reps</option>
              {salespeople.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {loading ? (
          <div className="py-12 text-center text-gray-400 font-bold text-xs uppercase tracking-widest">
            Loading Operational Tasks...
          </div>
        ) : activeTab === 'reminders' ? (
          filteredReminders.length > 0 ? (
            filteredReminders.map(r => {
              const isOverdue = r.status === 'PENDING' && r.reminderDate < todayStr;
              const isToday = r.reminderDate === todayStr;

              return (
                <div key={r.id} className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black dark:text-white uppercase tracking-tight">
                          {r.customer?.name || 'Customer'}
                        </span>
                        {isOverdue && (
                          <span className="text-[9px] bg-red-100 text-red-600 dark:bg-red-900/30 px-2 py-0.5 rounded-full font-black uppercase">
                            Overdue
                          </span>
                        )}
                        {isToday && r.status === 'PENDING' && (
                          <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 px-2 py-0.5 rounded-full font-black uppercase">
                            Due Today
                          </span>
                        )}
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                          r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          r.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                        Due Date: {formatDate(r.reminderDate)} {r.salesPerson ? `• Rep: ${r.salesPerson.name}` : ''}
                      </p>
                    </div>
                    {r.amount && (
                      <div className="text-right">
                        <p className="text-sm font-black text-primary">{formatCurrency(r.amount)}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">Reminder Target</p>
                      </div>
                    )}
                  </div>

                  {r.note && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl font-medium">
                      "{r.note}"
                    </p>
                  )}

                  {r.status === 'PENDING' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleUpdateReminderStatus(r.id, 'COMPLETED')}
                        className="px-3 py-1.5 bg-green-50 text-green-700 dark:bg-green-900/20 hover:bg-green-100 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                      >
                        <CheckCircle2 size={13} /> Mark Completed
                      </button>
                      <button
                        onClick={() => handleUpdateReminderStatus(r.id, 'CANCELLED')}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 dark:bg-gray-800 hover:bg-gray-200 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                      >
                        <XCircle size={13} /> Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <p className="text-xs font-bold uppercase tracking-wider">No payment reminders match filters.</p>
            </div>
          )
        ) : activeTab === 'visits' ? (
          filteredVisits.length > 0 ? (
            filteredVisits.map(v => (
              <div key={v.id} className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black dark:text-white uppercase tracking-tight">
                        {v.customer?.name || 'Customer'}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                        v.outcome === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        v.outcome === 'FOLLOW_UP' ? 'bg-amber-100 text-amber-700' :
                        v.outcome === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-teal-100 text-teal-700'
                      }`}>
                        {v.outcome || 'PLANNED'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                      Visit Date: {formatDate(v.visitDate)} {v.salesPerson ? `• Rep: ${v.salesPerson.name}` : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold dark:text-white uppercase tracking-tight">Purpose: {v.purpose}</p>
                  {v.notes && <p className="text-xs text-gray-500 font-medium">Notes: {v.notes}</p>}
                  {v.nextFollowUpDate && (
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase">
                      Next Follow-up: {formatDate(v.nextFollowUpDate)}
                    </p>
                  )}
                </div>

                {v.outcome !== 'COMPLETED' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleUpdateVisitOutcome(v.id, 'COMPLETED')}
                      className="px-3 py-1.5 bg-green-50 text-green-700 dark:bg-green-900/20 hover:bg-green-100 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                    >
                      <CheckCircle2 size={13} /> Mark Visit Completed
                    </button>
                    <button
                      onClick={() => handleUpdateVisitOutcome(v.id, 'FOLLOW_UP')}
                      className="px-3 py-1.5 bg-amber-50 text-amber-700 dark:bg-amber-900/20 hover:bg-amber-100 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1"
                    >
                      Needs Follow-up
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <p className="text-xs font-bold uppercase tracking-wider">No customer visit logs found.</p>
            </div>
          )
        ) : (
          /* Risk Watchlist */
          overLimitCustomers.length > 0 ? (
            overLimitCustomers.map(c => (
              <div key={c.id} className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">{c.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{c.phone || 'No Phone Number'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black bg-red-500 text-white px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Over Limit
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center p-3 bg-red-50/50 dark:bg-red-950/20 rounded-xl">
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Current Outstanding</p>
                    <p className="text-sm font-black text-red-600">{formatCurrency(c.closingBalance || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Configured Credit Limit</p>
                    <p className="text-sm font-black dark:text-white">{formatCurrency(c.creditLimit || 0)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs font-bold text-red-600 dark:text-red-400 pt-1">
                  <span>Exceeded By: {formatCurrency((c.closingBalance || 0) - (c.creditLimit || 0))}</span>
                  <button 
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setShowReminderModal(true);
                    }}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-red-700"
                  >
                    Set Collection Task
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <p className="text-xs font-bold uppercase tracking-wider">No customers are currently over their credit limit.</p>
            </div>
          )
        )}
      </div>

      {/* Log Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
            <h3 className="text-base font-black dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Calendar className="text-teal-500" size={20} /> Record Customer Visit
            </h3>

            <form onSubmit={handleCreateVisit} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-gray-400 uppercase text-[9px] mb-1">Select Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                  required
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({formatCurrency(c.closingBalance || 0)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Assigned Salesperson</label>
                  <select
                    value={selectedSalesPersonId}
                    onChange={e => setSelectedSalesPersonId(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                  >
                    <option value="">Unassigned</option>
                    {salespeople.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
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
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[9px] mb-1">Purpose of Visit</label>
                <input
                  type="text"
                  placeholder="Payment collection, order taking, courtesy check..."
                  value={visitPurpose}
                  onChange={e => setVisitPurpose(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Status / Outcome</label>
                  <select
                    value={visitOutcome}
                    onChange={e => setVisitOutcome(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FOLLOW_UP">Follow Up Required</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Next Follow-up Date</label>
                  <input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={e => setNextFollowUpDate(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[9px] mb-1">Notes / Discussion</label>
                <textarea
                  rows={2}
                  placeholder="Key discussion points, promises made..."
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

      {/* Set Payment Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 space-y-4 border border-gray-100 dark:border-gray-800 shadow-2xl">
            <h3 className="text-base font-black dark:text-white uppercase tracking-tight flex items-center gap-2">
              <Bell className="text-primary" size={20} /> Create Payment Reminder
            </h3>

            <form onSubmit={handleCreateReminder} className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-gray-400 uppercase text-[9px] mb-1">Select Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                  required
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({formatCurrency(c.closingBalance || 0)})</option>
                  ))}
                </select>
              </div>

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
                  <label className="block text-gray-400 uppercase text-[9px] mb-1">Target Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="Optional amount"
                    value={reminderAmount}
                    onChange={e => setReminderAmount(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[9px] mb-1">Assigned Salesperson</label>
                <select
                  value={selectedSalesPersonId}
                  onChange={e => setSelectedSalesPersonId(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 dark:text-white"
                >
                  <option value="">Unassigned</option>
                  {salespeople.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 uppercase text-[9px] mb-1">Reminder Note / Instruction</label>
                <textarea
                  rows={2}
                  placeholder="Follow up on cheque deposit, call owner, etc."
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
                  className="flex-1 py-3 bg-primary text-white rounded-2xl font-black uppercase text-xs shadow-md"
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
}
