'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Printer,
  RotateCcw,
  X,
  Layers,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  FileText,
  TrendingUp,
  Scale,
  Gauge,
  Wrench,
  ChevronRight,
  Info,
} from 'lucide-react';
import { TransformerWithStatus } from '@/lib/domain/types';
import { calculateIMax, safeFloat } from '@/lib/domain/calculations';

interface AiReportViewerProps {
  report: string | null;
  transformer: TransformerWithStatus;
  loading: boolean;
  onReanalyze: () => void;
  onClose: () => void;
}

export const AiReportViewer: React.FC<AiReportViewerProps> = ({
  report,
  transformer,
  loading,
  onReanalyze,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [viewRaw, setViewRaw] = useState(false);

  const totalSessions =
    transformer.historySessions && transformer.historySessions.length > 0
      ? transformer.historySessions.length
      : transformer.latestSession
      ? 1
      : 0;

  const iMax = calculateIMax(transformer.kva, transformer.system as '1' | '3');
  const pctLoad = transformer.engineeringStatus?.pctLoad ?? null;
  const pctUnb = transformer.engineeringStatus?.pctUnbalance ?? null;
  const harmonicA = transformer.engineeringStatus?.harmonicCurrent ?? null;

  const handleCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to parse text with inline markdown (bold, code, units)
  const renderInlineFormatted = (text: string) => {
    // Sanitize LaTeX math expressions e.g. $I_{max}$ -> I_max
    const sanitizedText = text
      .replace(/\$I_\{?([a-zA-Z0-9_]+)\}?\$/g, 'I_$1')
      .replace(/\$V_\{?([a-zA-Z0-9_]+)\}?\$/g, 'V_$1')
      .replace(/\$([^\$]+)\$/g, '$1');

    // Split by bold (**text**)
    const parts = sanitizedText.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const inner = part.slice(2, -2);
        // Highlight critical terms inside bold
        const isCritical = /วิกฤต|overload|เกินพิกัด|อันตราย|สูงมาก|ไหม้|ตกต่ำ/i.test(inner);
        const isWarning = /เฝ้าระวัง|เตือน|ไม่สมดุล|unbalance/i.test(inner);
        const isSuccess = /ปกติ|สมบูรณ์|ปลอดภัย|สมดุล/i.test(inner);

        if (isCritical) {
          return (
            <span key={pIdx} className="font-bold text-rose-700 bg-rose-50 px-1 py-0.5 rounded">
              {inner}
            </span>
          );
        }
        if (isWarning) {
          return (
            <span key={pIdx} className="font-bold text-amber-800 bg-amber-50 px-1 py-0.5 rounded">
              {inner}
            </span>
          );
        }
        if (isSuccess) {
          return (
            <span key={pIdx} className="font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">
              {inner}
            </span>
          );
        }
        return (
          <strong key={pIdx} className="font-bold text-slate-900">
            {inner}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={pIdx} className="font-mono text-xs text-[#741b77] bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={pIdx}>{part}</span>;
    });
  };

  // Helper to parse and render sections cleanly
  const renderFormattedReport = (rawText: string) => {
    // Split into sections by Markdown ## Headers
    const rawSections = rawText.split(/^##\s+/m).filter(Boolean);

    if (rawSections.length <= 1 && !rawText.includes('##')) {
      // Fallback if AI didn't use ## format
      return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs text-slate-800 text-sm whitespace-pre-line leading-relaxed">
          {rawText}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {rawSections.map((sec, sIdx) => {
          const lines = sec.trim().split('\n');
          const titleLine = lines[0].trim().replace(/^#+\s*/, '');
          const bodyLines = lines.slice(1);

          // Get section icon and accent style based on title
          let icon = <FileText className="w-4 h-4 text-[#741b77]" />;
          let borderAccent = 'border-l-4 border-l-purple-500';
          let headerBg = 'bg-slate-50/80';

          if (/1\.|สรุป|executive/i.test(titleLine)) {
            icon = <Activity className="w-4 h-4 text-purple-600" />;
            borderAccent = 'border-l-4 border-l-[#741b77]';
            headerBg = 'bg-purple-50/50';
          } else if (/2\.|โหลด|trend|load/i.test(titleLine)) {
            icon = <TrendingUp className="w-4 h-4 text-sky-600" />;
            borderAccent = 'border-l-4 border-l-sky-500';
            headerBg = 'bg-sky-50/40';
          } else if (/3\.|ไม่สมดุล|unbalance|เฟส/i.test(titleLine)) {
            icon = <Scale className="w-4 h-4 text-amber-600" />;
            borderAccent = 'border-l-4 border-l-amber-500';
            headerBg = 'bg-amber-50/40';
          } else if (/4\.|harmonic|ฮาร์มอนิก|crypto/i.test(titleLine)) {
            icon = <Zap className="w-4 h-4 text-[#f39c12]" />;
            borderAccent = 'border-l-4 border-l-[#f39c12]';
            headerBg = 'bg-amber-50/50';
          } else if (/5\.|แรงดัน|voltage/i.test(titleLine)) {
            icon = <Gauge className="w-4 h-4 text-indigo-600" />;
            borderAccent = 'border-l-4 border-l-indigo-500';
            headerBg = 'bg-indigo-50/40';
          } else if (/6\.|ข้อเสนอแนะ|แผน|recommend/i.test(titleLine)) {
            icon = <Wrench className="w-4 h-4 text-emerald-600" />;
            borderAccent = 'border-l-4 border-l-emerald-500';
            headerBg = 'bg-emerald-50/50';
          }

          // Parse body into blocks: paragraphs, lists, tables, callouts
          const renderedBlocks: React.ReactNode[] = [];
          let currentList: string[] = [];
          let currentTable: string[] = [];

          const flushList = () => {
            if (currentList.length > 0) {
              renderedBlocks.push(
                <ul key={`list-${renderedBlocks.length}`} className="space-y-1.5 my-2 pl-1">
                  {currentList.map((item, lIdx) => (
                    <li key={lIdx} className="flex items-start gap-2 text-xs md:text-sm text-slate-700 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#741b77] mt-2 flex-shrink-0" />
                      <div>{renderInlineFormatted(item)}</div>
                    </li>
                  ))}
                </ul>
              );
              currentList = [];
            }
          };

          const flushTable = () => {
            if (currentTable.length > 0) {
              const tableRows = currentTable
                .map(r => r.trim())
                .filter(r => r.startsWith('|') && r.endsWith('|'))
                .map(r => r.slice(1, -1).split('|').map(c => c.trim()));

              if (tableRows.length > 1) {
                const headerRow = tableRows[0];
                const dataRows = tableRows.slice(1).filter(r => !r.every(c => /^[-:]+$/.test(c)));

                renderedBlocks.push(
                  <div key={`table-${renderedBlocks.length}`} className="overflow-x-auto my-3 rounded-xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <tr>
                          {headerRow.map((h, hIdx) => (
                            <th key={hIdx} className="py-2.5 px-3 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {dataRows.map((dr, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/80">
                            {dr.map((cell, cIdx) => (
                              <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-slate-700 font-mono text-[11px]">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              currentTable = [];
            }
          };

          for (let i = 0; i < bodyLines.length; i++) {
            const line = bodyLines[i].trim();

            if (!line) {
              flushList();
              flushTable();
              continue;
            }

            // Table line
            if (line.startsWith('|') && line.endsWith('|')) {
              flushList();
              currentTable.push(line);
              continue;
            } else {
              flushTable();
            }

            // List item (- or * or numbered)
            const listMatch = line.match(/^[-*•]\s+(.*)$/) || line.match(/^\d+\.\s+(.*)$/);
            if (listMatch) {
              currentList.push(listMatch[1]);
              continue;
            } else {
              flushList();
            }

            // Subheading ###
            if (line.startsWith('###')) {
              const subTitle = line.replace(/^###\s*/, '');
              renderedBlocks.push(
                <h4 key={`sub-${i}`} className="text-xs md:text-sm font-bold text-slate-800 mt-3 mb-1.5 flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-[#741b77]" />
                  <span>{subTitle}</span>
                </h4>
              );
              continue;
            }

            // Callout or alert lines
            const isAlert = /^[⚠️🚨❗️]/.test(line);
            const isSuccess = /^[✅]/.test(line);
            const isTip = /^[💡📌]/.test(line);

            if (isAlert) {
              renderedBlocks.push(
                <div key={`alert-${i}`} className="p-3 my-2 rounded-xl bg-rose-50/90 border border-rose-200/80 text-rose-800 text-xs md:text-sm flex items-start gap-2.5 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{renderInlineFormatted(line.replace(/^[⚠️🚨❗️]\s*/, ''))}</div>
                </div>
              );
              continue;
            }

            if (isSuccess) {
              renderedBlocks.push(
                <div key={`succ-${i}`} className="p-3 my-2 rounded-xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-800 text-xs md:text-sm flex items-start gap-2.5 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{renderInlineFormatted(line.replace(/^[✅]\s*/, ''))}</div>
                </div>
              );
              continue;
            }

            if (isTip) {
              renderedBlocks.push(
                <div key={`tip-${i}`} className="p-3 my-2 rounded-xl bg-purple-50/90 border border-purple-200/80 text-purple-900 text-xs md:text-sm flex items-start gap-2.5 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-[#f39c12] flex-shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{renderInlineFormatted(line.replace(/^[💡📌]\s*/, ''))}</div>
                </div>
              );
              continue;
            }

            // Normal paragraph
            renderedBlocks.push(
              <p key={`p-${i}`} className="text-xs md:text-sm text-slate-700 leading-relaxed my-1.5">
                {renderInlineFormatted(line)}
              </p>
            );
          }

          flushList();
          flushTable();

          return (
            <div
              key={sIdx}
              className={`bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all ${borderAccent}`}
            >
              {/* Card Section Header */}
              <div className={`px-4.5 py-3 ${headerBg} border-b border-slate-100 flex items-center gap-2.5`}>
                <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center shadow-2xs flex-shrink-0">
                  {icon}
                </div>
                <h3 className="text-xs md:text-sm font-bold text-slate-900 tracking-tight">
                  {titleLine}
                </h3>
              </div>

              {/* Card Section Body */}
              <div className="p-4 md:p-5">
                {renderedBlocks}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100/70 border border-purple-200/80 flex items-center justify-center text-[#741b77] shadow-2xs flex-shrink-0">
              <Sparkles className="w-5 h-5 text-[#f39c12] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">
                  รายงานผลการวิเคราะห์วิศวกรรมไฟฟ้า (Gemini AI)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-[#741b77] border border-purple-200 font-mono">
                  PEA Smart Analysis
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-normal mt-0.5">
                <span>หม้อแปลง:</span>
                <span className="font-mono font-bold text-slate-800">{transformer.peaNo}</span>
                <span>•</span>
                <span>{transformer.kva} kVA ({transformer.system}P)</span>
                {transformer.location && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline truncate max-w-xs">{transformer.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {report && !loading && (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                  title="คัดลอกข้อความรายงานทั้งหมด"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>คัดลอก</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 hidden sm:inline-flex"
                  title="พิมพ์รายงาน"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>พิมพ์</span>
                </button>

                <button
                  type="button"
                  onClick={onReanalyze}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#741b77] border border-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                  title="รันการวิเคราะห์ใหม่"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#741b77]" />
                  <span className="hidden sm:inline">วิเคราะห์ใหม่</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors ml-1"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              ฐานข้อมูลวิเคราะห์:
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white text-[#741b77] border border-purple-200 font-semibold text-[11px] shadow-2xs">
              <Layers className="w-3 h-3 text-[#741b77]" />
              <span>ประวัติ {totalSessions} รอบตรวจวัด (ครบทุกฟีดเดอร์)</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white text-slate-600 border border-slate-200 text-[11px] font-mono">
              IMAX: {iMax.toFixed(1)} A
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {pctLoad !== null && (
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono ${
                  pctLoad > 100
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : pctLoad > 80
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                โหลดล่าสุด: {pctLoad.toFixed(1)}%
              </span>
            )}
            {pctUnb !== null && (
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono ${
                  pctUnb > 30
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : pctUnb > 20
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                Unbalance: {pctUnb.toFixed(1)}%
              </span>
            )}
            {report && (
              <button
                type="button"
                onClick={() => setViewRaw(!viewRaw)}
                className="text-[10px] text-slate-400 hover:text-purple-700 underline font-medium ml-1"
              >
                {viewRaw ? 'มุมมองการ์ดสรุป' : 'ดู Markdown ดิบ'}
              </button>
            )}
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <div className="relative w-14 h-14 mx-auto">
                <div className="w-14 h-14 border-4 border-purple-100 border-t-[#741b77] rounded-full animate-spin" />
                <Sparkles className="w-6 h-6 text-[#f39c12] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Gemini AI กำลังวิเคราะห์ประวัติข้อมูลโหลดทุกรอบตรวจวัด...
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  ประมวลผลกระแสแยกรายเฟส A, B, C, N ทุกฟีดเดอร์, ตรวจสอบแนวโน้ม %โหลด, %Unbalance, Vector Neutral, กระแสฮาร์มอนิกแฝง และแรงดันตกปลายสาย
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 border border-purple-200/80 text-[11px] text-[#741b77] font-semibold animate-pulse">
                <span>กำลังสังเคราะห์ข้อเสนอแนะเชิงวิศวกรรมสำหรับทีม กฟภ.</span>
              </div>
            </div>
          ) : report ? (
            viewRaw ? (
              <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto shadow-inner">
                {report}
              </div>
            ) : (
              renderFormattedReport(report)
            )
          ) : (
            <div className="text-center py-16 space-y-3">
              <Info className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">ไม่มีข้อมูลรายงานการวิเคราะห์</p>
              <button
                type="button"
                onClick={onReanalyze}
                className="px-4 py-2 rounded-xl bg-[#741b77] text-white text-xs font-semibold hover:bg-[#58145a] transition-all shadow-sm"
              >
                กดเพื่อเริ่มการวิเคราะห์ด้วย AI
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>เกณฑ์มาตรฐาน กฟภ.: %UF ปกติ ≤ 80%, โหลดเกินพิกัด &gt; 80%, วิกฤต &gt; 100% | %Unbalance ปกติ ≤ 20%, วิกฤต &gt; 30%</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all ml-auto active:scale-95"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
