import React, { useState } from 'react';
import { useBiz } from '../context/BizContext';
import { formatCurrency } from '../utils/formatters';
import { MessageCircle, Mail, Phone, ExternalLink, ChevronRight, ArrowLeft } from 'lucide-react';

const Outstanding = () => {
  const { data } = useBiz();
  const [tab, setTab] = useState('Receivables');
  const [selectedParty, setSelectedParty] = useState(null);

  const filteredParties = data.ledgers
    .filter(l => tab === 'Receivables' ? l.type === 'Customer' : l.type === 'Supplier')
    .sort((a, b) => b.balance - a.balance);

  const totalOutstanding = filteredParties.reduce((sum, p) => sum + p.balance, 0);

  const sendReminder = (party, method) => {
    const msg = `Dear ${party.name}, a payment of ${formatCurrency(party.balance)} is outstanding for REBOXY TRADERS. Please clear it at the earliest.`;
    if (method === 'wa') {
      window.open(`https://wa.me/${party.phone}?text=${encodeURIComponent(msg)}`);
    } else {
      window.open(`mailto:${party.email}?subject=Payment Reminder&body=${encodeURIComponent(msg)}`);
    }
  };

  const PartyDetail = ({ party }) => (
    <div className="flex flex-col h-full bg-background dark:bg-gray-950 animate-in slide-in-from-right duration-300 z-[60]">
        <header className="p-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800 flex items-center gap-4">
            <button onClick={() => setSelectedParty(null)} className="p-2 dark:text-white"><ArrowLeft size={20} /></button>
            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">{party.name}</h3>
        </header>
        <div className="p-4 space-y-6">
            <div className="bg-primary p-6 rounded-[2rem] text-white shadow-xl shadow-primary/30 text-center">
                <p className="text-[10px] uppercase font-black tracking-widest opacity-70 mb-1">Total Outstanding</p>
                <p className="text-3xl font-black">{formatCurrency(party.balance)}</p>
                <p className="text-[10px] uppercase font-bold mt-2 bg-white/20 inline-block px-3 py-1 rounded-full">Overdue 22 Days</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => sendReminder(party, 'wa')} className="flex flex-col items-center gap-2 p-6 bg-green-500 text-white rounded-[2rem] shadow-lg shadow-green-500/20 active:scale-95 transition-all">
                    <MessageCircle size={28} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-center">WhatsApp RMDR</span>
                </button>
                <button onClick={() => sendReminder(party, 'mail')} className="flex flex-col items-center gap-2 p-6 bg-primary text-white rounded-[2rem] shadow-lg shadow-primary/20 active:scale-95 transition-all">
                    <Mail size={28} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-center">Email Statement</span>
                </button>
            </div>

            <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Pending Invoices</h4>
                {data.vouchers.filter(v => v.partyId === party.id).map(v => (
                    <div key={v.id} className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-between items-center shadow-sm">
                        <div>
                            <p className="text-sm font-black dark:text-white uppercase tracking-tight">{v.vNo}</p>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Due in 5 Days</p>
                        </div>
                        <p className="text-sm font-black dark:text-white">{formatCurrency(v.amount)}</p>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );

  if (selectedParty) return <PartyDetail party={selectedParty} />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="p-4 space-y-4">
        <div className="flex justify-between items-end">
            <div>
                <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Outstanding</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Bills Aging Analysis</p>
            </div>
            <div className="text-right">
                <p className="text-xl font-black text-primary">{formatCurrency(totalOutstanding)}</p>
                <p className="text-[9px] text-gray-400 font-black uppercase">Total {tab}</p>
            </div>
        </div>
        
        <div className="flex p-1.5 bg-gray-100 dark:bg-gray-900 rounded-2xl">
          {['Receivables', 'Payables'].map(t => (
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
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-gray-400 font-black text-lg group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                    {p.name[0]}
                </div>
                <div>
                    <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">{p.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] bg-red-50 text-red-600 dark:bg-red-900/20 px-2 py-0.5 rounded-full font-bold uppercase">Overdue 22d</span>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{p.city}</span>
                    </div>
                </div>
            </div>
            <div className="text-right flex items-center gap-3">
                <div>
                    <p className="text-sm font-black dark:text-white">{formatCurrency(p.balance)}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Balance</p>
                </div>
                <ChevronRight size={16} className="text-gray-300" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Outstanding;
