'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ClipboardList, Banknote, UserX, PackageX, Book, 
  BookOpen, FileUp, FileDown, LineChart, Landmark,
  ChevronRight
} from 'lucide-react';

const ReportListItem = ({ id, name, icon: Icon }: { id: string, name: string, icon: any }) => (
  <Link 
    href={`/reports/${id}`}
    className="flex items-center gap-4 py-4 px-4 bg-white hover:bg-blue-50 active:bg-blue-100 transition-colors border-b border-gray-100 group last:border-b-0"
  >
    <div className="text-gray-500 group-hover:text-blue-500 transition-colors">
      <Icon size={24} strokeWidth={1.5} />
    </div>
    <span className="flex-1 text-gray-800 text-[15px] font-medium">{name}</span>
  </Link>
);

const ReportsPage = () => {
  const reports = [
    { id: 'top', name: 'Top Report', icon: ClipboardList },
    { id: 'expenses', name: 'Expenses', icon: Banknote },
    { id: 'inactive-customers', name: 'Inactive Customers', icon: UserX },
    { id: 'inactive-items', name: 'Inactive Items', icon: PackageX },
    { id: 'ledger', name: 'Ledger Report', icon: Book },
    { id: 'day-book', name: 'Day Book', icon: BookOpen },
    { id: 'pending-so', name: 'Pending Sales Order', icon: FileUp },
    { id: 'pending-po', name: 'Pending Purchase Order', icon: FileDown },
    { id: 'pnl', name: 'Profit & Loss', icon: LineChart },
    { id: 'balance-sheet', name: 'Balance Sheet', icon: Landmark }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <h3 className="text-lg font-medium tracking-wide">Reports</h3>
        <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center text-xs font-bold text-white">?</div>
      </header>

      <div className="bg-white mt-2 shadow-sm rounded-t-xl overflow-hidden">
        <div className="flex flex-col">
          {reports.map((r) => (
            <ReportListItem key={r.id} {...r} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
