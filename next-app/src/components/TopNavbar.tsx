'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Calendar, Clock, LayoutDashboard, ShieldCheck } from 'lucide-react';

export default function TopNavbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');

  // Live Thai Date & Time updater
  useEffect(() => {
    setMounted(true);
    const updateClock = () => {
      const now = new Date();
      // Format Thai Buddhist Era Date (e.g., "02/10/2569")
      const d = now.toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      // Format 24h Time with seconds (e.g., "10:48:30")
      const t = now.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setDateStr(d);
      setTimeStr(t);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between transition-all">
      {/* Brand & Logo */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <Link href="/?dashboard=1" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 transition-transform group-hover:scale-105 duration-200">
            <Image
              src="/pea-logo.png"
              alt="PEA Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-xs sm:text-base font-bold text-slate-900 tracking-tight leading-tight group-hover:text-[#741b77] transition-colors whitespace-nowrap truncate">
                ระบบวัดโหลดหม้อแปลง
              </h1>
            </div>
            {/* Subtitle: แผนกมิเตอร์และหม้อแปลง กฟจ.พะเยา */}
            <p className="text-[10px] sm:text-[11px] font-medium text-[#741b77] sm:text-slate-600 tracking-tight truncate leading-tight mt-0.5">
              แผนกมิเตอร์และหม้อแปลง กฟจ.พะเยา
            </p>
          </div>
        </Link>
      </div>

      {/* Header Right: Live Date & Time Display (Guaranteed zero overlap) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Mobile View (< sm): Compact 2-line Stack (Saves horizontal space, prevents overlap) */}
        <div className="flex sm:hidden items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/90 border border-slate-200/90 shadow-2xs font-mono select-none">
          <Clock className="w-3.5 h-3.5 text-[#f39c12] shrink-0" />
          <div className="flex flex-col text-right leading-none">
            <span className="text-[11px] font-bold text-slate-900 tracking-tight">
              {mounted ? timeStr : '--:--:--'}
            </span>
            <span className="text-[9px] text-slate-500 font-medium tracking-tight mt-0.5">
              {mounted ? dateStr : '--/--/----'}
            </span>
          </div>
        </div>

        {/* Tablet & Desktop View (>= sm): Horizontal Pill */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/90 shadow-2xs font-mono select-none">
          <div className="flex items-center gap-1.5 text-xs text-slate-700 font-semibold whitespace-nowrap">
            <Calendar className="w-3.5 h-3.5 text-[#741b77] flex-shrink-0" />
            <span>{mounted ? dateStr : '--/--/----'}</span>
          </div>
          <span className="text-slate-300 text-xs">|</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-900 font-bold whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-[#f39c12] flex-shrink-0" />
            <span>{mounted ? timeStr : '--:--:--'}</span>
          </div>
        </div>

        {/* Desktop Quick Nav to Dashboard */}
        <Link
          href="/?dashboard=1"
          title="หน้าสำนักงาน (Dashboard)"
          className="hidden md:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-slate-600 hover:text-[#741b77] hover:bg-purple-50 transition-colors border border-transparent hover:border-purple-200"
        >
          <LayoutDashboard className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#741b77]" />
          <span>Dashboard</span>
        </Link>

        <div className="hidden xl:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-purple-50/80 border border-purple-200/70 text-[#741b77] font-medium ml-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#741b77]" />
          <span>PEA Smart Utility</span>
        </div>
      </div>
    </header>
  );
}
