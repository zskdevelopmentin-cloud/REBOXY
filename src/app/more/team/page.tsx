'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBiz } from '@/context/BizContext';
import { 
  ArrowLeft, User, Plus, Search, Phone, Mail, 
  Users, CheckCircle2, AlertCircle, Edit2, ShieldAlert,
  UserCheck, DollarSign, Calendar
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

export default function SalesTeamPage() {
  const { addToast } = useBiz();
  const router = useRouter();

  const [salespeople, setSalespeople] = useState<any[]>([]);
  const [allLedgers, setAllLedgers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Add/Edit Salesperson Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [isSaving, setIsSaving] = useState(false);

  // Customer Assignment Modal State
  const [assigningPerson, setAssigningPerson] = useState<any | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const fetchSalespeople = async () => {
    setIsLoading(true);
    try {
      const [spRes, lRes] = await Promise.all([
        fetch('/api/salespeople'),
        fetch('/api/reports/all')
      ]);

      if (spRes.ok) {
        const spData = await spRes.json();
        setSalespeople(spData.salespeople || []);
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        setAllLedgers(lData.ledgers || []);
      }
    } catch (err) {
      console.error('Fetch salespeople error:', err);
      addToast('Failed to load sales team data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalespeople();
  }, []);

  const openCreateModal = () => {
    setEditingPerson(null);
    setName('');
    setPhone('');
    setEmail('');
    setCode('');
    setStatus('ACTIVE');
    setShowModal(true);
  };

  const openEditModal = (sp: any) => {
    setEditingPerson(sp);
    setName(sp.name || '');
    setPhone(sp.phone || '');
    setEmail(sp.email || '');
    setCode(sp.code || '');
    setStatus(sp.status || 'ACTIVE');
    setShowModal(true);
  };

  const handleSaveSalesperson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const method = editingPerson ? 'PUT' : 'POST';
      const body: any = { name, phone, email, code, status };
      if (editingPerson) body.id = editingPerson.id;

      const res = await fetch('/api/salespeople', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const responseData = await res.json();
      if (!res.ok) {
        addToast(responseData.error || 'Failed to save salesperson', 'error');
        return;
      }

      addToast(`Salesperson ${editingPerson ? 'updated' : 'created'} successfully`, 'success');
      setShowModal(false);
      await fetchSalespeople();
    } catch (err) {
      console.error(err);
      addToast('Error saving salesperson', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openAssignModal = (sp: any) => {
    setAssigningPerson(sp);
    const assignedIds = sp.assignedCustomers?.map((c: any) => c.id) || [];
    setSelectedCustomerIds(assignedIds);
    setCustomerSearch('');
  };

  const handleToggleCustomer = async (customerId: string) => {
    if (!assigningPerson) return;
    const isAssigned = selectedCustomerIds.includes(customerId);

    try {
      const res = await fetch('/api/customer-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          salesPersonId: isAssigned ? null : assigningPerson.id
        })
      });

      if (!res.ok) {
        addToast('Failed to update customer assignment', 'error');
        return;
      }

      if (isAssigned) {
        setSelectedCustomerIds(prev => prev.filter(id => id !== customerId));
      } else {
        setSelectedCustomerIds(prev => [...prev, customerId]);
      }
      fetchSalespeople();
    } catch (err) {
      console.error(err);
      addToast('Error updating assignment', 'error');
    }
  };

  const filteredSalespeople = (Array.isArray(salespeople) ? salespeople : []).filter(sp => {
    const q = search.trim().toLowerCase();
    const matchesStatus = statusFilter === 'ALL' || sp.status === statusFilter;
    if (!matchesStatus) return false;
    if (!q) return true;
    return (
      (sp?.name || '').toLowerCase().includes(q) ||
      (sp?.code || '').toLowerCase().includes(q) ||
      (sp?.phone || '').toLowerCase().includes(q)
    );
  });


  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 font-inter animate-in slide-in-from-right duration-300 pb-24">
      
      {/* Top Header */}
      <div className="p-4 flex items-center justify-between bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <ArrowLeft size={22} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-lg font-black dark:text-white uppercase tracking-tight">Sales Team Management</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Territory & Performance CRM</p>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="px-3 py-2 bg-primary text-white rounded-2xl font-black uppercase text-xs tracking-wider flex items-center gap-1.5 shadow-md shadow-primary/20 active:scale-95 transition-all"
        >
          <Plus size={16} /> Add Rep
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto no-scrollbar max-w-4xl mx-auto w-full">
        
        {/* Search & Filter Bar */}
        <div className="bg-white dark:bg-gray-900 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, code, phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold focus:outline-none"
            />
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  statusFilter === st ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Salespeople List */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Sales Team...</p>
          </div>
        ) : filteredSalespeople.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-6 space-y-3">
            <User size={36} className="mx-auto text-gray-300" />
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">No salespeople found.</p>
            <button onClick={openCreateModal} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider">
              Create First Salesperson
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSalespeople.map(sp => {
              const m = sp.metrics || {};
              const isActive = sp.status === 'ACTIVE';

              return (
                <div key={sp.id} className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 relative overflow-hidden">
                  
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 flex items-center justify-center font-black text-lg uppercase shrink-0">
                        {sp.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black dark:text-white uppercase tracking-tight">{sp.name}</h3>
                          {sp.code && <span className="text-[9px] px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 font-black rounded-md">{sp.code}</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-gray-500">
                          {sp.phone && <span className="flex items-center gap-1"><Phone size={12} className="text-teal-600" /> {sp.phone}</span>}
                          {sp.email && <span className="flex items-center gap-1"><Mail size={12} className="text-teal-600" /> {sp.email}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-500 border border-red-200'}`}>
                        {sp.status}
                      </span>
                      <button onClick={() => openEditModal(sp)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Operational Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-center">
                    <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Assigned</p>
                      <p className="text-sm font-black text-gray-900 dark:text-white mt-0.5">{m.assignedCustomerCount || 0} Accounts</p>
                    </div>
                    <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl">
                      <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Net Sales</p>
                      <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{formatCurrency(m.netSales || 0)}</p>
                    </div>
                    <div className="p-2 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl">
                      <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase">Receivables</p>
                      <p className="text-sm font-black text-blue-700 dark:text-blue-300 mt-0.5">{formatCurrency(m.totalReceivables || 0)}</p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">
                      {m.visitCount || 0} Visits • {m.reminderCount || 0} Reminders
                    </span>
                    <button
                      onClick={() => openAssignModal(sp)}
                      className="px-3 py-1.5 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-teal-100 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all"
                    >
                      <UserCheck size={14} /> Assign Accounts
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Salesperson Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 space-y-4 shadow-2xl">
            <h3 className="text-base font-black dark:text-white uppercase tracking-tight">
              {editingPerson ? 'Edit Salesperson' : 'Create New Salesperson'}
            </h3>

            <form onSubmit={handleSaveSalesperson} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Employee Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="e.g. REP-001"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Status</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold dark:text-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="rahul@company.com"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl text-xs font-black uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md shadow-primary/20"
                >
                  {isSaving ? 'Saving...' : 'Save Salesperson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Accounts Modal */}
      {assigningPerson && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-black dark:text-white uppercase tracking-tight">Assign Accounts to {assigningPerson.name}</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Select customer accounts for this rep</p>
              </div>
              <button onClick={() => setAssigningPerson(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filter customer accounts..."
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold focus:outline-none"
              />
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto no-scrollbar border border-gray-100 dark:border-gray-800 rounded-2xl">
              {(Array.isArray(allLedgers) ? allLedgers : [])
                .filter(l => l.type === 'Customer' || l.group?.toLowerCase().includes('debtor'))
                .filter(l => (l.name || '').toLowerCase().includes(customerSearch.toLowerCase()))
                .map(cust => {

                  const isChecked = selectedCustomerIds.includes(cust.id);

                  return (
                    <div
                      key={cust.id}
                      onClick={() => handleToggleCustomer(cust.id)}
                      className="p-3 bg-white dark:bg-gray-900 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-black dark:text-white uppercase tracking-tight">{cust.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">Closing Bal: {formatCurrency(cust.closingBalance || 0)}</p>
                      </div>

                      <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                        isChecked ? 'bg-teal-500 border-teal-500 text-white' : 'border-gray-300 dark:border-gray-700'
                      }`}>
                        {isChecked && <CheckCircle2 size={14} />}
                      </div>
                    </div>
                  );
                })}
            </div>

            <button
              onClick={() => setAssigningPerson(null)}
              className="w-full py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md"
            >
              Done Managing Assignments
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
