'use client';

import React from 'react';
import { ArrowLeft, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReportLayoutProps {
  title: string;
  children: React.ReactNode;
}

const ReportLayout: React.FC<ReportLayoutProps> = ({ title, children }) => {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full bg-background dark:bg-gray-950 animate-in slide-in-from-right duration-300">
      <div className="p-4 border-b dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-black text-lg dark:text-white uppercase tracking-tighter">{title}</h2>
        </div>
        <button className="p-2 text-primary bg-primary/10 rounded-xl">
          <Download size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {children}
      </div>
    </div>
  );
};

export default ReportLayout;
