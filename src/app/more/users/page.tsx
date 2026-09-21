'use client';

import React, { useState, useEffect } from 'react';
import { useBiz } from '@/context/BizContext';
import { ChevronLeft, UserPlus, Users, Shield, CheckCircle, XCircle, Edit3, X, KeyRound, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UserManagementPage() {
  const { addToast } = useBiz();
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [status, setStatus] = useState('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        const errorData = await res.json();
        addToast(errorData.error || 'Failed to fetch users', 'error');
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Fetch users error:', error);
      addToast('Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, role, status })
      });

      const responseData = await res.json();
      if (!res.ok) {
        addToast(responseData.error || 'Failed to create user', 'error');
        return;
      }

      addToast(`User ${responseData.user.email} created successfully`, 'success');
      setShowAddModal(false);
      resetForm();
      await fetchUsers();
    } catch (error) {
      console.error(error);
      addToast('Failed to create user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name,
          role,
          status,
          ...(password ? { newPassword: password } : {})
        })
      });

      const responseData = await res.json();
      if (!res.ok) {
        addToast(responseData.error || 'Failed to update user', 'error');
        return;
      }

      addToast('User updated successfully', 'success');
      setEditingUser(null);
      resetForm();
      await fetchUsers();
    } catch (error) {
      console.error(error);
      addToast('Failed to update user', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (user: any) => {
    const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        addToast(errData.error || 'Failed to update status', 'error');
        return;
      }

      addToast(`User status updated to ${newStatus}`, 'success');
      await fetchUsers();
    } catch (error) {
      console.error(error);
      addToast('Failed to update status', 'error');
    }
  };

  const resetForm = () => {
    setEmail('');
    setName('');
    setPassword('');
    setRole('VIEWER');
    setStatus('ACTIVE');
  };

  const startEdit = (user: any) => {
    setEditingUser(user);
    setEmail(user.email);
    setName(user.name || '');
    setRole(user.role);
    setStatus(user.status);
    setPassword('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 font-inter animate-in slide-in-from-right duration-300 pb-24">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <ChevronLeft size={24} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-lg font-black dark:text-white uppercase tracking-tighter">User Management</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Company Roles & Permissions</p>
          </div>
        </div>

        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md hover:bg-primary/90 transition-all active:scale-95"
        >
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Company Users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-6 opacity-60">
            <Users size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No users found for this company.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm uppercase text-white ${
                    u.role === 'SUPER_ADMIN' ? 'bg-purple-600' :
                    u.role === 'ADMIN' ? 'bg-indigo-600' :
                    u.role === 'ACCOUNTANT' ? 'bg-teal-600' :
                    'bg-blue-500'
                  }`}>
                    {u.name ? u.name[0] : u.email[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">{u.name || u.email.split('@')[0]}</h4>
                    <p className="text-[10px] text-gray-400 font-medium">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {u.role}
                      </span>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        u.status === 'ACTIVE' ? 'bg-green-50 text-green-700 dark:bg-green-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'
                      }`}>
                        {u.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStatus(u)}
                    className={`p-2 rounded-xl transition-colors ${
                      u.status === 'ACTIVE' ? 'text-green-600 hover:bg-green-50' : 'text-red-500 hover:bg-red-50'
                    }`}
                    title={u.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
                  >
                    {u.status === 'ACTIVE' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  </button>
                  <button
                    onClick={() => startEdit(u)}
                    className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <Edit3 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 space-y-4 shadow-2xl">
            <header className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-black dark:text-white uppercase tracking-tight">Create New User</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </header>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="rahul@company.com"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Assign Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold dark:text-white focus:outline-none"
                >
                  <option value="VIEWER">VIEWER (Read-only)</option>
                  <option value="SALES_STAFF">SALES_STAFF (Sales & Entries)</option>
                  <option value="ACCOUNTANT">ACCOUNTANT (Full Reports & Entries)</option>
                  <option value="ADMIN">ADMIN (Full Company Access)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Creating User...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 space-y-4 shadow-2xl">
            <header className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-black dark:text-white uppercase tracking-tight">Edit User Settings</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </header>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email (Read-only)</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800/50 rounded-xl text-xs font-bold text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Role</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold dark:text-white focus:outline-none"
                >
                  <option value="VIEWER">VIEWER</option>
                  <option value="SALES_STAFF">SALES_STAFF</option>
                  <option value="ACCOUNTANT">ACCOUNTANT</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold dark:text-white focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Reset Password (Optional)</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold dark:text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-wider text-xs shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Saving Changes...' : 'Save User Settings'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
