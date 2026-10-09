'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  TransformerWithStatus,
  MeasurementSession,
  FeederRecord,
} from '@/lib/domain/types';
import {
  calculateEngineeringStatus,
  calculateIMax,
  safeFloat,
} from '@/lib/domain/calculations';
import {
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowDownRight,
  Sliders,
  ChevronDown,
  Check,
} from 'lucide-react';

interface LoadAnalyticsChartsProps {
  transformer: TransformerWithStatus;
}

type ChartTab = 'BALANCE' | 'TREND' | 'VOLTAGE';

export const LoadAnalyticsCharts: React.FC<LoadAnalyticsChartsProps> = ({
  transformer,
}) => {
  const sessions: MeasurementSession[] =
    transformer.historySessions && transformer.historySessions.length > 0
      ? transformer.historySessions
      : transformer.latestSession
      ? [transformer.latestSession]
      : [];

  const [activeTab, setActiveTab] = useState<ChartTab>('BALANCE');
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  if (sessions.length === 0) {
    return null;
  }

  // Active session for Balance & Voltage view (index clamped safely)
  const safeIdx = Math.min(Math.max(0, selectedSessionIdx), sessions.length - 1);
  const currentSession = sessions[safeIdx];

  // Transformer Rated Current
  const kva = Math.max(1, safeFloat(transformer.kva, 50));
  const system = transformer.system || '3';
  const iMax = calculateIMax(kva, system);
  const iMax80 = iMax * 0.8;

  // Active Session Total Currents
  const currentTotal: FeederRecord = currentSession.total || {
    name: 'รวม',
    currentA: 0,
    currentB: 0,
    currentC: 0,
    currentN: 0,
    note: '',
    cableSize: '',
    vt_ab: 0,
    vt_bc: 0,
    vt_ca: 0,
    vt_an: 0,
    vt_bn: 0,
    vt_cn: 0,
    ve_ab: 0,
    ve_bc: 0,
    ve_ca: 0,
    ve_an: 0,
    ve_bn: 0,
    ve_cn: 0,
  };

  const ia = safeFloat(currentTotal.currentA);
  const ib = safeFloat(currentTotal.currentB);
  const ic = safeFloat(currentTotal.currentC);
  const inVal = safeFloat(currentTotal.currentN);

  const engStatus = calculateEngineeringStatus(currentTotal, kva, system);

  // Maximum value for chart scaling (include iMax so threshold line is visible)
  const maxCurrentPeak = Math.max(ia, ib, ic, inVal, iMax, 10);
  const chartMaxScale = maxCurrentPeak * 1.15;

  // Percent heights for Bar Chart (0-100%)
  const barHeightA = (ia / chartMaxScale) * 100;
  const barHeightB = (ib / chartMaxScale) * 100;
  const barHeightC = (ic / chartMaxScale) * 100;
  const barHeightN = (inVal / chartMaxScale) * 100;
  const lineBottomImax = (iMax / chartMaxScale) * 100;
  const lineBottomImax80 = (iMax80 / chartMaxScale) * 100;

  // Multi-round chronological data (oldest to newest)
  const chronoSessions = [...sessions].reverse();

  // Voltage Data Extraction for current session
  const feedersWithVoltage = (currentSession.feeders || []).filter((f) => {
    return (
      (f.vt_an > 0 && f.ve_an > 0) ||
      (f.vt_bn > 0 && f.ve_bn > 0) ||
      (f.vt_cn > 0 && f.ve_cn > 0) ||
      (f.vt_ab > 0 && f.ve_ab > 0) ||
      (f.vt_bc > 0 && f.ve_bc > 0) ||
      (f.vt_ca > 0 && f.ve_ca > 0)
    );
  });

  return (
    <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4 shadow-2xs transition-all">
      {/* Top Header: Tabs & Session Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
        {/* Minimal Segmented Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-200/70 rounded-xl gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('BALANCE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'BALANCE'
                ? 'bg-white text-[#741b77] shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>สมดุลกระแส & พิกัด Imax</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TREND')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'TREND'
                ? 'bg-white text-[#741b77] shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>แนวโน้มภาระโหลด</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VOLTAGE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'VOLTAGE'
                ? 'bg-white text-[#741b77] shadow-2xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>แรงดันตกฟีดเดอร์</span>
          </button>
        </div>

        {/* Modern Minimal Swiss Custom Dropdown: Round Selector */}
        {activeTab !== 'TREND' && sessions.length > 1 && (
          <div
            className="relative flex items-center gap-2 self-end sm:self-auto"
            ref={dropdownRef}
          >
            <span className="text-[11.5px] text-slate-500 font-medium flex items-center gap-1.5 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span>รอบตรวจวัด:</span>
            </span>

            {/* Custom Dropdown Trigger Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                aria-expanded={isDropdownOpen}
                aria-haspopup="listbox"
                className={`h-8.5 px-3 rounded-xl bg-white border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
                  isDropdownOpen
                    ? 'border-[#741b77] ring-2 ring-purple-500/15 bg-purple-50/25 text-[#741b77]'
                    : 'border-slate-200/90 hover:border-purple-300 hover:bg-slate-50/80 text-slate-800'
                }`}
              >
                <span className="px-1.5 py-0.5 rounded-md bg-purple-100/90 text-[#741b77] text-[10.5px] font-bold shrink-0">
                  รอบที่ {sessions.length - safeIdx}
                </span>
                <span className="font-mono text-slate-600 text-[11px] truncate max-w-[130px] sm:max-w-none">
                  ({currentSession.date} {currentSession.time})
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isDropdownOpen ? 'rotate-180 text-[#741b77]' : ''
                  }`}
                />
              </button>

              {/* Floating Menu Popover */}
              {isDropdownOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 top-full mt-1.5 z-50 w-72 sm:w-80 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-xl shadow-slate-900/10 p-1.5 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 mb-1">
                    <span>เลือกรอบตรวจวัดโหลด</span>
                    <span className="font-mono text-[#741b77] font-bold">{sessions.length} รอบ</span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {sessions.map((sess, idx) => {
                      const isSelected = idx === safeIdx;
                      const roundNum = sessions.length - idx;
                      const isLatest = idx === 0;

                      return (
                        <button
                          key={idx}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setSelectedSessionIdx(idx);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-purple-50 text-purple-950 font-bold border border-purple-200/80 shadow-2xs'
                              : 'hover:bg-slate-50 text-slate-700 font-medium border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                isSelected
                                  ? 'bg-[#741b77] text-white shadow-2xs'
                                  : isLatest
                                  ? 'bg-purple-100 text-[#741b77]'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              รอบที่ {roundNum}
                              {isLatest && !isSelected && ' (ล่าสุด)'}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-mono font-medium text-slate-800 truncate">
                                {sess.date}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {sess.time}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-[#741b77] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 3-PHASE BALANCE & IMAX RATING (สมดุลกระแส และ เส้นพิกัด Imax) */}
      {/* ========================================================================= */}
      {activeTab === 'BALANCE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left Chart: 3-Phase Bar Chart with Imax Reference Lines (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>สมดุลกระแสไฟ 3 เฟส (3-Phase Balance)</span>
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  หม้อแปลง {kva} kVA ({system}P) • รอบวันที่ {currentSession.date} ({currentSession.time})
                </p>
              </div>

              {/* Unbalance status pill */}
              <div
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 shrink-0 ${
                  engStatus.unbalanceStatus === 'GOOD'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : engStatus.unbalanceStatus === 'WARNING'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>%Unb: {engStatus.pctUnbalance.toFixed(2)}%</span>
              </div>
            </div>

            {/* Threshold Reference Legend Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 pb-1 px-1 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                  <span className="w-3.5 h-0.5 bg-rose-500 rounded-full inline-block" />
                  <span>พิกัด Imax (100%):</span>
                  <span className="font-mono font-bold text-rose-600">{iMax.toFixed(1)} A</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                  <span className="w-3.5 h-0.5 border-b border-dashed border-amber-500 inline-block" />
                  <span>เฝ้าระวัง (80%):</span>
                  <span className="font-mono font-bold text-amber-600">{iMax80.toFixed(1)} A</span>
                </div>
              </div>
              <div className="text-[10.5px] text-slate-400 font-medium hidden sm:inline-block">
                *พิกัดกระแสหม้อแปลง {kva} kVA ({system}P)
              </div>
            </div>

            {/* Custom High-Precision CSS Bar Chart with Grouped Phases & Isolated Neutral */}
            <div className="relative pt-4 pb-4 px-3 sm:px-4 bg-slate-50/60 rounded-xl border border-slate-100 flex flex-col justify-end">
              {/* Row 1: Real-Time Current Values (Mono Numbers Above Bars) */}
              <div className="flex items-center justify-center gap-4 sm:gap-7 pl-12 sm:pl-16 pr-2 sm:pr-4 mb-1.5">
                {/* 3-Phase Values (Spaced comfortably with gap-5 sm:gap-7) */}
                <div className="flex items-center gap-5 sm:gap-7">
                  <div className="w-12 sm:w-14 text-center font-mono font-bold text-[11px] text-rose-700 leading-none">
                    {ia.toFixed(1)} A
                  </div>
                  <div className="w-12 sm:w-14 text-center font-mono font-bold text-[11px] text-emerald-700 leading-none">
                    {ib.toFixed(1)} A
                  </div>
                  <div className="w-12 sm:w-14 text-center font-mono font-bold text-[11px] text-blue-700 leading-none">
                    {ic.toFixed(1)} A
                  </div>
                </div>

                {/* Vertical Divider Space Placeholder */}
                <div className="w-0 mx-2 sm:mx-3 shrink-0" />

                {/* Neutral Value */}
                <div className="w-12 sm:w-14 text-center font-mono font-bold text-[11px] text-slate-700 leading-none">
                  {inVal.toFixed(1)} A
                </div>
              </div>

              {/* Row 2: Plotting Area (Tracks & Threshold Lines in Exact Shared Coordinate Box) */}
              <div className="relative h-36 w-full flex items-end justify-center">
                {/* Reference Line 1: Imax 100% (Red Dashed) - Left-Aligned Badge, No Collision with Neutral */}
                {lineBottomImax <= 100 && (
                  <div
                    className="absolute left-0 right-0 border-b border-dashed border-rose-400/90 pointer-events-none z-0 flex items-center justify-start pl-1 sm:pl-1.5"
                    style={{ bottom: `${lineBottomImax}%` }}
                  >
                    <span className="bg-rose-50 border border-rose-200/90 text-rose-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-2xs -translate-y-1/2 backdrop-blur-xs">
                      Imax {iMax.toFixed(1)} A
                    </span>
                  </div>
                )}

                {/* Reference Line 2: 80% Imax Warning (Orange Dashed) - Left-Aligned Badge, No Collision with Neutral */}
                {lineBottomImax80 <= 100 && (
                  <div
                    className="absolute left-0 right-0 border-b border-dashed border-amber-400/90 pointer-events-none z-0 flex items-center justify-start pl-1 sm:pl-1.5"
                    style={{ bottom: `${lineBottomImax80}%` }}
                  >
                    <span className="bg-amber-50 border border-amber-200/90 text-amber-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-2xs -translate-y-1/2 backdrop-blur-xs">
                      80% {iMax80.toFixed(1)} A
                    </span>
                  </div>
                )}

                {/* Bar Tracks Container (pl-12 sm:pl-16 provides clear safety margin for left badges) */}
                <div className="w-full flex items-end justify-center gap-4 sm:gap-7 pl-12 sm:pl-16 pr-2 sm:pr-4 h-full z-10">
                  {/* Group 1: 3-Phase Group (Phase A, B, C spaced comfortably with gap-5 sm:gap-7) */}
                  <div className="flex items-end gap-5 sm:gap-7 h-full">
                    {/* Bar 1: Phase A (Red) */}
                    <div className="w-12 sm:w-14 h-full flex justify-center items-end">
                      <div
                        className="w-10 sm:w-11 h-full bg-slate-200/50 rounded-t-lg flex items-end overflow-hidden"
                        title={`Phase A: ${ia.toFixed(1)} A (${iMax > 0 ? ((ia / iMax) * 100).toFixed(1) : 0}% ของพิกัด)`}
                      >
                        <div
                          className="w-full bg-gradient-to-t from-rose-600 to-rose-500 rounded-t-lg transition-all duration-500 shadow-2xs"
                          style={{ height: `${Math.max(2, Math.min(100, barHeightA))}%` }}
                        />
                      </div>
                    </div>

                    {/* Bar 2: Phase B (Green) */}
                    <div className="w-12 sm:w-14 h-full flex justify-center items-end">
                      <div
                        className="w-10 sm:w-11 h-full bg-slate-200/50 rounded-t-lg flex items-end overflow-hidden"
                        title={`Phase B: ${ib.toFixed(1)} A (${iMax > 0 ? ((ib / iMax) * 100).toFixed(1) : 0}% ของพิกัด)`}
                      >
                        <div
                          className="w-full bg-gradient-to-t from-emerald-600 to-emerald-500 rounded-t-lg transition-all duration-500 shadow-2xs"
                          style={{ height: `${Math.max(2, Math.min(100, barHeightB))}%` }}
                        />
                      </div>
                    </div>

                    {/* Bar 3: Phase C (Blue) */}
                    <div className="w-12 sm:w-14 h-full flex justify-center items-end">
                      <div
                        className="w-10 sm:w-11 h-full bg-slate-200/50 rounded-t-lg flex items-end overflow-hidden"
                        title={`Phase C: ${ic.toFixed(1)} A (${iMax > 0 ? ((ic / iMax) * 100).toFixed(1) : 0}% ของพิกัด)`}
                      >
                        <div
                          className="w-full bg-gradient-to-t from-blue-600 to-blue-500 rounded-t-lg transition-all duration-500 shadow-2xs"
                          style={{ height: `${Math.max(2, Math.min(100, barHeightC))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subtle Vertical Divider between 3-Phase Group & Neutral Conductor */}
                  <div className="h-28 border-r border-dashed border-slate-300 mx-2 sm:mx-3 self-center shrink-0" />

                  {/* Group 2: Neutral Conductor Bar (Separate from 3-Phase, completely isolated from labels) */}
                  <div className="flex items-end h-full">
                    <div className="w-12 sm:w-14 h-full flex justify-center items-end">
                      <div
                        className="w-10 sm:w-11 h-full bg-slate-200/50 rounded-t-lg flex items-end overflow-hidden"
                        title={`Neutral N: ${inVal.toFixed(1)} A`}
                      >
                        <div
                          className="w-full bg-gradient-to-t from-slate-600 to-slate-400 rounded-t-lg transition-all duration-500 shadow-2xs"
                          style={{ height: `${Math.max(2, Math.min(100, barHeightN))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Baseline Labels (Phase names, % of Imax, and Conductor type) */}
              <div className="w-full flex items-start justify-center gap-4 sm:gap-7 pl-12 sm:pl-16 pr-2 sm:pr-4 pt-2.5 border-t border-slate-200/70">
                {/* 3-Phase Baseline Labels */}
                <div className="flex items-start gap-5 sm:gap-7">
                  {/* Phase A */}
                  <div className="w-12 sm:w-14 text-center flex flex-col items-center">
                    <span className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 block whitespace-nowrap shadow-2xs">
                      Phase A
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono font-semibold block mt-1">
                      {iMax > 0 ? `${((ia / iMax) * 100).toFixed(0)}%` : '-'}
                    </span>
                  </div>
                  {/* Phase B */}
                  <div className="w-12 sm:w-14 text-center flex flex-col items-center">
                    <span className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 block whitespace-nowrap shadow-2xs">
                      Phase B
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono font-semibold block mt-1">
                      {iMax > 0 ? `${((ib / iMax) * 100).toFixed(0)}%` : '-'}
                    </span>
                  </div>
                  {/* Phase C */}
                  <div className="w-12 sm:w-14 text-center flex flex-col items-center">
                    <span className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 block whitespace-nowrap shadow-2xs">
                      Phase C
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono font-semibold block mt-1">
                      {iMax > 0 ? `${((ic / iMax) * 100).toFixed(0)}%` : '-'}
                    </span>
                  </div>
                </div>

                {/* Vertical Divider Space Placeholder */}
                <div className="w-0 mx-2 sm:mx-3 shrink-0" />

                {/* Neutral Baseline Label */}
                <div className="w-12 sm:w-14 text-center flex flex-col items-center">
                  <span className="px-1.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 block whitespace-nowrap shadow-2xs">
                    Neutral
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium block mt-1 whitespace-nowrap">
                    ไหลกลับ N
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Status Insight Alert */}
            <div
              className={`p-2.5 rounded-xl border text-[11.5px] flex items-center justify-between ${
                engStatus.pctUnbalance > 20
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {engStatus.pctUnbalance > 20 ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>
                  {engStatus.pctUnbalance > 20
                    ? `กระแสไม่สมดุล (${engStatus.pctUnbalance.toFixed(1)}% เกินเกณฑ์ กฟภ. 20%) ควรวางแผนเกลี่ยโหลดระหว่างเฟส A, B, C`
                    : `สมดุลกระแสไฟฟ้าอยู่ในเกณฑ์มาตรฐาน กฟภ. (ต่ำกว่า 20%) สภาพปกติ`}
                </span>
              </div>
            </div>
          </div>

          {/* Right Chart: Feeder Load Share & Capacity Overview (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between space-y-4">
            <div>
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>การแบ่งโหลดของฟีดเดอร์ (Feeder Load Share)</span>
              </h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                สัดส่วนการจ่ายกระแสไฟของแต่ละวงจร
              </p>
            </div>

            {/* Feeder Breakdown Bars */}
            <div className="space-y-3">
              {currentSession.feeders && currentSession.feeders.length > 0 ? (
                currentSession.feeders.map((f, fIdx) => {
                  const fIa = safeFloat(f.currentA);
                  const fIb = safeFloat(f.currentB);
                  const fIc = safeFloat(f.currentC);
                  const fMax = Math.max(fIa, fIb, fIc);
                  const totalPeak = Math.max(1, ia, ib, ic);
                  const sharePct = Math.min(100, Math.round((fMax / totalPeak) * 100));

                  return (
                    <div key={fIdx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-500" />
                          Feeder {f.name || `F${fIdx + 1}`}
                          {f.cableSize && (
                            <span className="text-[10px] text-slate-400 font-normal font-mono">
                              ({f.cableSize})
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-500 text-[11px]">
                            {fMax.toFixed(1)} A
                          </span>
                          <span className="font-bold text-purple-700 text-xs">
                            {sharePct}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-[#741b77] rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, sharePct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic">ไม่มีข้อมูลฟีดเดอร์แยกย่อย</p>
              )}
            </div>

            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                <span className="text-[10.5px] text-purple-900 font-medium block">ภาระโหลด (%UF)</span>
                <span className="text-lg font-bold font-mono text-[#741b77] block mt-0.5">
                  {engStatus.pctLoad.toFixed(2)}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {engStatus.pctLoad > 80 ? '⚠️ เกินพิกัด 80%' : '✅ ปกติ (เกณฑ์ <=80%)'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10.5px] text-slate-600 font-medium block">กระแสสูงสุด (Peak)</span>
                <span className="text-lg font-bold font-mono text-slate-900 block mt-0.5">
                  {engStatus.maxCurrent.toFixed(1)} A
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  จากพิกัด {iMax.toFixed(1)} A
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MULTI-ROUND HISTORICAL TREND (แนวโน้มหลายรอบตรวจวัด) */}
      {/* ========================================================================= */}
      {activeTab === 'TREND' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
          {/* Header & Comprehensive Legend Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span>แนวโน้มภาระโหลดและสมดุลข้ามรอบตรวจวัด ({chronoSessions.length} รอบ)</span>
              </h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                ติดตามผลสัมฤทธิ์ก่อน-หลังการปรับปรุงหม้อแปลง (Load Balancing & Uprating)
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs bg-slate-50/80 px-3 py-1.5 rounded-xl border border-slate-200/70">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#741b77] shadow-2xs" />
                <span className="font-semibold text-slate-700 text-[11px]">%UF (ภาระโหลด)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs" />
                <span className="font-semibold text-slate-700 text-[11px]">%Unbalance</span>
              </div>
              <div className="h-3 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px]">
                <span className="w-3 border-b-2 border-dashed border-rose-500" />
                <span>พิกัด 80% UF</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-[10.5px]">
                <span className="w-3 border-b-2 border-dashed border-emerald-500" />
                <span>เกณฑ์ปกติ ≤ 20%</span>
              </div>
            </div>
          </div>

          {chronoSessions.length >= 2 ? (
            <div className="space-y-4">
              {/* Responsive SVG Multi-Round Chart with Docked Y-Axis and Zero Overlap */}
              <div className="relative w-full h-64 bg-slate-50/60 rounded-xl border border-slate-100 p-2 overflow-hidden">
                {(() => {
                  const svgWidth = Math.max(540, chronoSessions.length * 130);
                  const stepX = (svgWidth - 140) / Math.max(1, chronoSessions.length - 1);
                  const ufPoints: string[] = [];
                  const unbPoints: string[] = [];

                  const dataCoords = chronoSessions.map((sess, idx) => {
                    const st = calculateEngineeringStatus(sess.total, kva, system);
                    const x = 90 + idx * stepX;
                    // Mapping: 0% at y=180, 100% at y=20 (height=160)
                    const yUf = Math.max(20, Math.min(180, 180 - (st.pctLoad / 100) * 160));
                    const yUnb = Math.max(20, Math.min(180, 180 - (st.pctUnbalance / 100) * 160));
                    ufPoints.push(`${x},${yUf}`);
                    unbPoints.push(`${x},${yUnb}`);
                    return { x, yUf, yUnb, sess, st, roundNum: idx + 1 };
                  });

                  const firstX = dataCoords[0]?.x || 90;
                  const lastX = dataCoords[dataCoords.length - 1]?.x || svgWidth - 50;
                  const ufAreaPoints = `${firstX},180 ${ufPoints.join(' ')} ${lastX},180`;
                  const unbAreaPoints = `${firstX},180 ${unbPoints.join(' ')} ${lastX},180`;

                  return (
                    <svg
                      viewBox={`0 0 ${svgWidth} 230`}
                      className="w-full h-full overflow-visible"
                    >
                      <defs>
                        <linearGradient id="ufAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#741b77" stopOpacity="0.14" />
                          <stop offset="100%" stopColor="#741b77" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="unbAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Horizontal Guideline: 80% UF Overload Threshold */}
                      <line
                        x1="74"
                        y1="40"
                        x2={svgWidth - 20}
                        y2="40"
                        stroke="#f87171"
                        strokeWidth="1.2"
                        strokeDasharray="4 4"
                        opacity="0.85"
                      />
                      <rect
                        x="12"
                        y="32"
                        width="56"
                        height="16"
                        rx="4"
                        fill="#fef2f2"
                        stroke="#fecaca"
                        strokeWidth="0.8"
                      />
                      <text
                        x="40"
                        y="43"
                        textAnchor="middle"
                        fill="#dc2626"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        80% UF
                      </text>

                      {/* Horizontal Guideline: 20% Unbalance Standard */}
                      <line
                        x1="74"
                        y1="140"
                        x2={svgWidth - 20}
                        y2="140"
                        stroke="#34d399"
                        strokeWidth="1.2"
                        strokeDasharray="4 4"
                        opacity="0.85"
                      />
                      <rect
                        x="12"
                        y="132"
                        width="56"
                        height="16"
                        rx="4"
                        fill="#ecfdf5"
                        stroke="#a7f3d0"
                        strokeWidth="0.8"
                      />
                      <text
                        x="40"
                        y="143"
                        textAnchor="middle"
                        fill="#059669"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        ≤20% Unb
                      </text>

                      {/* Horizontal Baseline 0% */}
                      <line
                        x1="74"
                        y1="180"
                        x2={svgWidth - 20}
                        y2="180"
                        stroke="#e2e8f0"
                        strokeWidth="1"
                      />
                      <text
                        x="40"
                        y="184"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="8.5"
                        fontFamily="monospace"
                      >
                        0%
                      </text>

                      {/* Area Fills under polylines */}
                      <polygon points={ufAreaPoints} fill="url(#ufAreaGradient)" />
                      <polygon points={unbAreaPoints} fill="url(#unbAreaGradient)" />

                      {/* %UF Polyline */}
                      <polyline
                        fill="none"
                        stroke="#741b77"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={ufPoints.join(' ')}
                      />

                      {/* %Unbalance Polyline */}
                      <polyline
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={unbPoints.join(' ')}
                      />

                      {/* Data Point Nodes and Value Labels with Dynamic Anti-Collision Placement */}
                      {dataCoords.map((d, i) => {
                        // Dynamically determine which series is higher (smaller Y coordinate in SVG)
                        // Higher point badge always sits ABOVE its circle; lower point badge always sits BELOW its circle.
                        // This mathematically guarantees zero criss-crossing or overlapping of badge labels.
                        const isUnbHigher = d.yUnb < d.yUf;

                        const yUfBadge = isUnbHigher
                          ? Math.min(172, d.yUf + 7)   // UF is lower -> place below circle
                          : Math.max(6, d.yUf - 23);  // UF is higher -> place above circle

                        const yUnbBadge = isUnbHigher
                          ? Math.max(6, d.yUnb - 23)  // Unbalance is higher -> place above circle
                          : Math.min(172, d.yUnb + 7);  // Unbalance is lower -> place below circle

                        const yUfText = yUfBadge + 12;
                        const yUnbText = yUnbBadge + 12;

                        return (
                          <g key={i}>
                            {/* X-axis tick & label */}
                            <line x1={d.x} y1="180" x2={d.x} y2="187" stroke="#cbd5e1" strokeWidth="1" />
                            <rect
                              x={d.x - 24}
                              y="192"
                              width="48"
                              height="17"
                              rx="5"
                              fill="#f1f5f9"
                              stroke="#e2e8f0"
                              strokeWidth="0.8"
                            />
                            <text
                              x={d.x}
                              y="204"
                              textAnchor="middle"
                              fill="#334155"
                              fontSize="9.5"
                              fontWeight="bold"
                            >
                              รอบ {d.roundNum}
                            </text>
                            <text
                              x={d.x}
                              y="221"
                              textAnchor="middle"
                              fill="#64748b"
                              fontSize="8.5"
                              fontFamily="monospace"
                            >
                              {d.sess.date}
                            </text>

                            {/* %UF Circle & Shielded Badge */}
                            <circle cx={d.x} cy={d.yUf} r="4.5" fill="#741b77" stroke="#ffffff" strokeWidth="2.5" />
                            <rect
                              x={d.x - 22}
                              y={yUfBadge}
                              width="44"
                              height="16"
                              rx="4"
                              fill="#ffffff"
                              stroke="#741b77"
                              strokeWidth="1.2"
                              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
                            />
                            <text
                              x={d.x}
                              y={yUfText}
                              textAnchor="middle"
                              fill="#741b77"
                              fontSize="9.5"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {d.st.pctLoad.toFixed(1)}%
                            </text>

                            {/* %Unbalance Circle & Shielded Badge */}
                            <circle cx={d.x} cy={d.yUnb} r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2.5" />
                            <rect
                              x={d.x - 22}
                              y={yUnbBadge}
                              width="44"
                              height="16"
                              rx="4"
                              fill="#ffffff"
                              stroke="#d97706"
                              strokeWidth="1.2"
                              filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
                            />
                            <text
                              x={d.x}
                              y={yUnbText}
                              textAnchor="middle"
                              fill="#b45309"
                              fontSize="9.5"
                              fontWeight="bold"
                              fontFamily="monospace"
                            >
                              {d.st.pctUnbalance.toFixed(1)}%
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  );
                })()}
              </div>

              {/* Multi-Round Improvement Summary Cards */}
              {(() => {
                const first = calculateEngineeringStatus(chronoSessions[0].total, kva, system);
                const latest = calculateEngineeringStatus(chronoSessions[chronoSessions.length - 1].total, kva, system);
                const diffUnb = latest.pctUnbalance - first.pctUnbalance;
                const diffUf = latest.pctLoad - first.pctLoad;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Card 1: Phase Balance Improvement */}
                    <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/90 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-xs font-bold text-slate-800">
                            พัฒนาการสมดุลเฟส (%Unbalance)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-600">
                            {first.pctUnbalance.toFixed(1)}%
                          </span>
                          <span className="text-slate-400 text-xs">➔</span>
                          <span
                            className={`font-mono text-sm font-bold ${
                              latest.pctUnbalance <= 20 ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {latest.pctUnbalance.toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium hidden xs:inline sm:inline">
                            {latest.pctUnbalance <= 20 ? '(เกณฑ์ปกติ ≤20%)' : '(เกินเกณฑ์)'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                            diffUnb < 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                              : 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs'
                          }`}
                        >
                          {diffUnb < 0 ? (
                            <>
                              <TrendingDown className="w-3 h-3" />
                              <span>ลดลง {Math.abs(diffUnb).toFixed(1)}%</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-3 h-3" />
                              <span>เพิ่มขึ้น +{diffUnb.toFixed(1)}%</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Transformer Loading Growth */}
                    <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-[#741b77] shrink-0" />
                          <span className="text-xs font-bold text-purple-950">
                            การเปลี่ยนแปลงภาระโหลด (%UF Growth)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-600">
                            {first.pctLoad.toFixed(1)}%
                          </span>
                          <span className="text-slate-400 text-xs">➔</span>
                          <span className="font-mono text-sm font-bold text-[#741b77]">
                            {latest.pctLoad.toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium hidden xs:inline sm:inline">
                            {latest.pctLoad <= 80 ? '(พิกัดปลอดภัย ≤80%)' : '(เกินพิกัด)'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg border border-purple-200/80 bg-white text-[#741b77] shadow-2xs">
                          {diffUf >= 0 ? `+${diffUf.toFixed(1)}%` : `${diffUf.toFixed(1)}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
              <Calendar className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">มีประวัติการตรวจวัด 1 รอบ</p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                เมื่อช่างเทคนิคลงพื้นที่ตรวจวัดรอบที่ 2, 3 ในอนาคต ระบบจะวาดเส้นกราฟแนวโน้มข้ามรอบเพื่อเปรียบเทียบพัฒนาการให้อัตโนมัติทันที
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VOLTAGE DROP & PROFILE (แรงดันใต้หม้อแปลง vs ปลายสาย) */}
      {/* ========================================================================= */}
      {activeTab === 'VOLTAGE' && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>โปรไฟล์แรงดันฟีดเดอร์: ใต้หม้อแปลง vs ปลายสาย</span>
              </h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                วิเคราะห์แรงดันตก (Voltage Drop) และตรวจจับปัญหาไฟตกปลายสายตามเกณฑ์ กฟภ.
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-700">แรงดันใต้หม้อแปลง (ต้นทาง)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="font-semibold text-slate-700">แรงดันปลายสาย (ปลายทาง)</span>
              </div>
            </div>
          </div>

          {feedersWithVoltage.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {feedersWithVoltage.map((f, fIdx) => {
                // Check phase voltages AN, BN, CN first, fallback to line-to-line AB, BC, CA
                const isPhaseV = f.vt_an > 0 || f.ve_an > 0;
                const headV = isPhaseV
                  ? Math.round((f.vt_an + f.vt_bn + f.vt_cn) / 3 || f.vt_an)
                  : Math.round((f.vt_ab + f.vt_bc + f.vt_ca) / 3 || f.vt_ab);
                const endV = isPhaseV
                  ? Math.round((f.ve_an + f.ve_bn + f.ve_cn) / 3 || f.ve_an)
                  : Math.round((f.ve_ab + f.ve_bc + f.ve_ca) / 3 || f.ve_ab);

                const dropV = Math.max(0, headV - endV);
                const pctDrop = headV > 0 ? (dropV / headV) * 100 : 0;
                const minThreshold = isPhaseV ? 207 : 360; // 230V - 10% = 207V, 400V - 10% = 360V
                const isUndervoltage = endV > 0 && endV < minThreshold;

                return (
                  <div
                    key={fIdx}
                    className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                        Feeder {f.name || `F${fIdx + 1}`}
                      </span>
                      <span
                        className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border ${
                          isUndervoltage
                            ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                            : pctDrop > 10
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isUndervoltage
                          ? '⚠️ ไฟตกปลายสาย (< 207V)'
                          : `แรงดันตก ΔV: ${dropV} V (${pctDrop.toFixed(1)}%)`}
                      </span>
                    </div>

                    {/* Bar comparison */}
                    <div className="space-y-2 pt-1">
                      {/* Head Voltage Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-500 font-medium">ใต้หม้อแปลง:</span>
                          <span className="font-mono font-bold text-emerald-700">{headV} V</span>
                        </div>
                        <div className="w-full h-3 bg-slate-200/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${Math.min(100, (headV / (isPhaseV ? 260 : 440)) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* End Voltage Bar */}
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-500 font-medium">ปลายสาย:</span>
                          <span
                            className={`font-mono font-bold ${
                              isUndervoltage ? 'text-rose-600' : 'text-blue-700'
                            }`}
                          >
                            {endV} V
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-200/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isUndervoltage ? 'bg-rose-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, (endV / (isPhaseV ? 260 : 440)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span>เกณฑ์มาตรฐาน กฟภ.: ไม่ต่ำกว่า {minThreshold} V</span>
                      <span>{pctDrop <= 10 ? '✅ ผ่านเกณฑ์ (Drop <= 10%)' : '⚠️ แรงดันตกเกิน 10%'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
              <Zap className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                ยังไม่มีการบันทึกค่าแรงดันในรอบตรวจวัดนี้
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                เมื่อช่างระบุค่าแรงดันใต้หม้อแปลงและแรงดันปลายสายผ่านแบบฟอร์มบันทึกโหลด
                ระบบจะคำนวณผลต่างแรงดันตก (ΔV) และแจ้งเตือนปัญหาไฟตกให้อัตโนมัติ
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
