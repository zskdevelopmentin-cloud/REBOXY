import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBiz } from '../context/BizContext';
import { 
  Receipt, ShoppingCart, ArrowDownLeft, ArrowUpRight, 
  FileText, FileCheck, MinusSquare, PlusSquare, 
  Plus, Trash2, ChevronRight, ArrowLeft
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const EntryTypeCard = ({ id, icon: Icon, color, desc, onClick }) => (
  <button 
    onClick={() => onClick(id)}
    className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 text-left hover:border-primary/50 transition-all shadow-sm group"
  >
    <div className={`p-3 rounded-2xl text-white ${color} group-hover:scale-110 transition-transform`}>
      <Icon size={24} />
    </div>
    <div className="flex-1">
      <span className="block text-sm font-black dark:text-white uppercase tracking-tight">{id}</span>
      <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-widest">{desc}</span>
    </div>
    <ChevronRight size={18} className="text-gray-300" />
  </button>
);

const InvoiceForm = ({ type, onBack }) => {
  const { data, addVoucher } = useBiz();
  const [partyId, setPartyId] = useState('');
  const [items, setItems] = useState([{ itemId: '', qty: 1, rate: 0 }]);
  
  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!partyId || items.some(i => !i.itemId)) return;
    
    addVoucher({
      id: `vch_${Date.now()}`,
      vNo: `${type.substring(0, 3).toUpperCase()}/${Math.floor(Math.random() * 9000 + 1000)}`,
      type,
      date: new Date().toISOString(),
      partyId,
      partyName: data.ledgers.find(l => l.id === partyId)?.name,
      amount: total,
      items: items.map(i => ({ ...i, total: i.qty * i.rate }))
    });
    onBack();
  };

  return (
    <div className="p-4 space-y-6 animate-in slide-in-from-right duration-300 pb-32">
        <header className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 dark:text-white"><ArrowLeft size={20} /></button>
            <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">New {type}</h3>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
            <section className="space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1 tracking-widest">Party Details</label>
                    <select 
                        value={partyId}
                        onChange={e => setPartyId(e.target.value)}
                        className="w-full p-4 bg-white dark:bg-gray-800 rounded-2xl border-none ring-1 ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-primary dark:text-white transition-all font-bold"
                    >
                        <option value="">Select Account</option>
                        {data.ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>

                <div className="space-y-3">
                    <label className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-widest">
                        Line Items
                        <button type="button" onClick={() => setItems([...items, { itemId: '', qty: 1, rate: 0 }])} className="text-primary flex items-center gap-1"><Plus size={14} /> Add</button>
                    </label>
                    
                    {items.map((item, i) => (
                        <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3 relative shadow-sm">
                            <select 
                                value={item.itemId} 
                                onChange={e => {
                                    const newItems = [...items];
                                    newItems[i].itemId = e.target.value;
                                    newItems[i].rate = data.stock.find(s => s.id === e.target.value)?.rate || 0;
                                    setItems(newItems);
                                }}
                                className="w-full bg-transparent border-none text-sm font-black dark:text-white p-0 focus:ring-0 uppercase tracking-tighter"
                            >
                                <option value="">Select Product Item</option>
                                {data.stock.map(si => <option key={si.id} value={si.id}>{si.name}</option>)}
                            </select>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Quantity</p>
                                    <input 
                                        type="number" 
                                        value={item.qty} 
                                        onChange={e => {
                                            const newItems = [...items];
                                            newItems[i].qty = Number(e.target.value);
                                            setItems(newItems);
                                        }}
                                        className="w-full bg-gray-50 dark:bg-gray-900 rounded-xl p-2 text-sm font-bold dark:text-white" 
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Rate (₹)</p>
                                    <input 
                                        type="number" 
                                        value={item.rate} 
                                        onChange={e => {
                                            const newItems = [...items];
                                            newItems[i].rate = Number(e.target.value);
                                            setItems(newItems);
                                        }}
                                        className="w-full bg-gray-50 dark:bg-gray-900 rounded-xl p-2 text-sm font-bold dark:text-white" 
                                    />
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Total</p>
                                    <p className="text-sm font-black dark:text-white">{formatCurrency(item.qty * item.rate)}</p>
                                </div>
                            </div>
                            {items.length > 1 && (
                                <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1 text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <section className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10 space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-widest"><span>Tax (GST 18%)</span><span>{formatCurrency(tax)}</span></div>
                <div className="flex justify-between text-xl font-black dark:text-white border-t border-gray-200 dark:border-gray-700 pt-3 mt-1 uppercase tracking-tighter"><span>Grand Total</span><span className="text-primary">{formatCurrency(total)}</span></div>
            </section>

            <button type="submit" className="w-full p-5 bg-primary text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all">
                Save & Post Voucher
            </button>
        </form>
    </div>
  );
};

const Entries = () => {
  const [selectedType, setSelectedType] = useState(null);
  const types = [
    { id: 'Sales', icon: Receipt, color: 'bg-green-500 shadow-green-500/20', desc: 'Create Sale Invoice' },
    { id: 'Purchase', icon: ShoppingCart, color: 'bg-orange-500 shadow-orange-500/20', desc: 'Book Purchase Bill' },
    { id: 'Receipt', icon: ArrowDownLeft, color: 'bg-blue-500 shadow-blue-500/20', desc: 'Money From Customer' },
    { id: 'Payment', icon: ArrowUpRight, color: 'bg-red-500 shadow-red-500/20', desc: 'Money To Supplier' },
    { id: 'Sales Order', icon: FileText, color: 'bg-teal-500 shadow-teal-500/20', desc: 'Customer Order' },
    { id: 'Purchase Order', icon: FileCheck, color: 'bg-indigo-500 shadow-indigo-500/20', desc: 'Supplier Order' },
    { id: 'Credit Note', icon: MinusSquare, color: 'bg-pink-500 shadow-pink-500/20', desc: 'Sales Return' },
    { id: 'Debit Note', icon: PlusSquare, color: 'bg-purple-500 shadow-purple-500/20', desc: 'Purchase Return' }
  ];

  if (selectedType) {
    return <InvoiceForm type={selectedType} onBack={() => setSelectedType(null)} />;
  }

  return (
    <div className="p-4 space-y-6">
      <header className="px-1">
        <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">New Entry</h3>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Record Daily Transactions</p>
      </header>
      <div className="grid grid-cols-1 gap-3">
        {types.map(t => <EntryTypeCard key={t.id} {...t} onClick={id => setSelectedType(id)} />)}
      </div>
    </div>
  );
};

export default Entries;
