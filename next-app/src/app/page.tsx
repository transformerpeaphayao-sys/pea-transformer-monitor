'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { TransformerWithStatus, MeasurementSession, FeederRecord, getErrorMessage } from '@/lib/domain/types';
import {
  calculateEngineeringStatus,
  safeFloat,
  calculateVectorNeutral,
  getDriveThumbnailUrl,
  computeFeederStatus,
  parseDateToTimestamp,
  normalizeDateToYMD,
  formatYMDToThai,
} from '@/lib/domain/calculations';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Download,
  Activity,
  Layers,
  MapPin,
  Clock,
  Info,
  X,
  FileSpreadsheet,
  History,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  RotateCcw,
  Calendar,
  Gauge,
  Compass,
  FileText,
  FileEdit,
  ChevronRight,
  Save,
  LayoutGrid,
  ListTree,
  Link2,
  PlusCircle,
  Trash2,
  Flag,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import Link from 'next/link';
import { AiReportViewer } from '@/components/AiReportViewer';
import { RegisterTransformerModal } from '@/components/RegisterTransformerModal';

export default function BackofficeDashboard() {
  const [mounted, setMounted] = useState(false);
  const [transformers, setTransformers] = useState<TransformerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // View Mode: Summary Table vs Detailed Feeder Records
  const [tableViewMode, setTableViewMode] = useState<'summary' | 'detail'>('summary');

  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [feederPhaseFilter, setFeederPhaseFilter] = useState<'MAX' | 'A' | 'B' | 'C' | 'N' | 'TOTAL'>('MAX');
  const [minFeederCurrent, setMinFeederCurrent] = useState<string>('');
  const [maxFeederCurrent, setMaxFeederCurrent] = useState<string>('');
  const [minHarmonicCurrent, setMinHarmonicCurrent] = useState<string>('');
  const [maxHarmonicCurrent, setMaxHarmonicCurrent] = useState<string>('');

  // Date Filter State
  const [dateFilterMode, setDateFilterMode] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customDateFilter, setCustomDateFilter] = useState<string>('');

  // Table Sort State (Default: latest inspection date descending)
  const [sortColumn, setSortColumn] = useState<'latestDate' | 'peaNo' | 'kva' | 'pctLoad' | 'pctUnbalance' | 'harmonic'>('latestDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [viewingTransformer, setViewingTransformer] = useState<TransformerWithStatus | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedAiTransformer, setSelectedAiTransformer] = useState<TransformerWithStatus | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  
  // Delete Transformer Dialog State
  const [deletingPea, setDeletingPea] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  // Delete Measurement Session Dialog State
  const [deletingSession, setDeletingSession] = useState<{
    peaNo: string;
    date: string;
    time: string;
    sessionNum?: number;
    imageUrls?: string[];
  } | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [deleteSessionError, setDeleteSessionError] = useState<string | null>(null);
  const [deleteSessionSuccessMsg, setDeleteSessionSuccessMsg] = useState<string | null>(null);

  // Re-inspection Task State (สั่งตรวจซ้ำ)
  const [submittingTaskPea, setSubmittingTaskPea] = useState<string | null>(null);
  const [taskSuccessMsg, setTaskSuccessMsg] = useState<string | null>(null);
  const [taskErrorMsg, setTaskErrorMsg] = useState<string | null>(null);

  // Inline Table Edit State
  const [editingSessionKey, setEditingSessionKey] = useState<string | null>(null);
  const [editFeeders, setEditFeeders] = useState<Array<{
    name: string;
    currentA: string;
    currentB: string;
    currentC: string;
    currentN: string;
    note: string;
    vt_ab: string; vt_bc: string; vt_ca: string;
    vt_an: string; vt_bn: string; vt_cn: string;
    ve_ab: string; ve_bc: string; ve_ca: string;
    ve_an: string; ve_bn: string; ve_cn: string;
  }>>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const handleStartEdit = (session: MeasurementSession) => {
    const key = `${session.date}_${session.time}`;
    setEditingSessionKey(key);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
    setEditFeeders(
      session.feeders.map(f => ({
        name: f.name,
        currentA: String(f.currentA || ''),
        currentB: String(f.currentB || ''),
        currentC: String(f.currentC || ''),
        currentN: String(f.currentN || ''),
        note: f.note || '',
        vt_ab: f.vt_ab ? String(f.vt_ab) : '',
        vt_bc: f.vt_bc ? String(f.vt_bc) : '',
        vt_ca: f.vt_ca ? String(f.vt_ca) : '',
        vt_an: f.vt_an ? String(f.vt_an) : '',
        vt_bn: f.vt_bn ? String(f.vt_bn) : '',
        vt_cn: f.vt_cn ? String(f.vt_cn) : '',
        ve_ab: f.ve_ab ? String(f.ve_ab) : '',
        ve_bc: f.ve_bc ? String(f.ve_bc) : '',
        ve_ca: f.ve_ca ? String(f.ve_ca) : '',
        ve_an: f.ve_an ? String(f.ve_an) : '',
        ve_bn: f.ve_bn ? String(f.ve_bn) : '',
        ve_cn: f.ve_cn ? String(f.ve_cn) : '',
      }))
    );
  };

  const handleCancelEdit = () => {
    setEditingSessionKey(null);
    setEditFeeders([]);
    setSaveErrorMsg(null);
  };

  const updateDraftFeeder = (fIdx: number, field: string, value: string) => {
    setEditFeeders(prev => {
      const copy = [...prev];
      if (copy[fIdx]) {
        copy[fIdx] = { ...copy[fIdx], [field]: value };
      }
      return copy;
    });
  };

  const handleSaveEdit = async (session: MeasurementSession) => {
    if (!viewingTransformer) return;
    setSavingEdit(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);
    try {
      const payload = {
        peaNo: viewingTransformer.peaNo,
        originalDate: session.date,
        originalTime: session.time,
        tap: session.tap,
        feeders: editFeeders.map(f => ({
          name: f.name,
          currentA: parseFloat(f.currentA) || 0,
          currentB: parseFloat(f.currentB) || 0,
          currentC: parseFloat(f.currentC) || 0,
          currentN: parseFloat(f.currentN) || 0,
          note: f.note,
          vt_ab: parseFloat(f.vt_ab) || 0,
          vt_bc: parseFloat(f.vt_bc) || 0,
          vt_ca: parseFloat(f.vt_ca) || 0,
          vt_an: parseFloat(f.vt_an) || 0,
          vt_bn: parseFloat(f.vt_bn) || 0,
          vt_cn: parseFloat(f.vt_cn) || 0,
          ve_ab: parseFloat(f.ve_ab) || 0,
          ve_bc: parseFloat(f.ve_bc) || 0,
          ve_ca: parseFloat(f.ve_ca) || 0,
          ve_an: parseFloat(f.ve_an) || 0,
          ve_bn: parseFloat(f.ve_bn) || 0,
          ve_cn: parseFloat(f.ve_cn) || 0,
        })),
      };

      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }

      setSaveSuccessMsg('✅ บันทึกการแก้ไขข้อมูลโหลดลง Google Sheets เรียบร้อยแล้ว!');
      setEditingSessionKey(null);
      setEditFeeders([]);

      // Refresh data
      await fetchTransformers();

      setTimeout(() => {
        setSaveSuccessMsg(null);
      }, 4500);
    } catch (err: unknown) {
      setSaveErrorMsg(`❌ ${getErrorMessage(err)}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteTransformer = async (peaNo: string) => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/transformers?peaNo=${encodeURIComponent(peaNo)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถลบข้อมูลหม้อแปลงได้');
      }

      setDeleteSuccessMsg(`ลบข้อมูลหม้อแปลง PEA ${peaNo} และรูปภาพใน Google Drive เรียบร้อยแล้ว`);
      setDeletingPea(null);
      if (viewingTransformer?.peaNo === peaNo) {
        setViewingTransformer(null);
      }
      await fetchTransformers();
      setTimeout(() => setDeleteSuccessMsg(null), 6000);
    } catch (err: unknown) {
      setDeleteError(getErrorMessage(err) || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteSession = async () => {
    if (!deletingSession) return;
    setIsDeletingSession(true);
    setDeleteSessionError(null);
    try {
      const res = await fetch(
        `/api/records?peaNo=${encodeURIComponent(deletingSession.peaNo)}&date=${encodeURIComponent(deletingSession.date)}&time=${encodeURIComponent(deletingSession.time)}`,
        {
          method: 'DELETE',
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถลบข้อมูลรอบตรวจวัดได้');
      }

      setDeleteSessionSuccessMsg(data.message || 'ลบข้อมูลรอบตรวจวัดเรียบร้อยแล้ว');
      setDeletingSession(null);

      // Refresh transformers so viewingTransformer and dashboard tables update immediately
      await fetchTransformers();

      setTimeout(() => setDeleteSessionSuccessMsg(null), 6000);
    } catch (err: unknown) {
      setDeleteSessionError(getErrorMessage(err) || 'เกิดข้อผิดพลาดในการลบข้อมูลรอบตรวจวัด');
    } finally {
      setIsDeletingSession(false);
    }
  };

  const handleOrderTask = async (peaNo: string) => {
    setSubmittingTaskPea(peaNo);
    setTaskErrorMsg(null);
    setTaskSuccessMsg(null);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peaNo, assigner: 'ผู้ดูแลระบบ (Admin)' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถสั่งตรวจซ้ำได้');
      }

      setTaskSuccessMsg(data.message || `บันทึกคำสั่งตรวจซ้ำหม้อแปลง PEA ${peaNo} สำเร็จ หมุดบนแผนที่จะเปลี่ยนเป็นสีส้ม`);
      await fetchTransformers();
      setTimeout(() => setTaskSuccessMsg(null), 6000);
    } catch (err: unknown) {
      setTaskErrorMsg(getErrorMessage(err) || 'เกิดข้อผิดพลาดในการสั่งตรวจซ้ำ');
      setTimeout(() => setTaskErrorMsg(null), 6000);
    } finally {
      setSubmittingTaskPea(null);
    }
  };

  const handleCancelTask = async (peaNo: string) => {
    setSubmittingTaskPea(peaNo);
    setTaskErrorMsg(null);
    setTaskSuccessMsg(null);
    try {
      const res = await fetch(`/api/tasks?peaNo=${encodeURIComponent(peaNo)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถยกเลิกคำสั่งตรวจซ้ำได้');
      }

      setTaskSuccessMsg(data.message || `ยกเลิกคำสั่งตรวจซ้ำหม้อแปลง PEA ${peaNo} สำเร็จ`);
      await fetchTransformers();
      setTimeout(() => setTaskSuccessMsg(null), 6000);
    } catch (err: unknown) {
      setTaskErrorMsg(getErrorMessage(err) || 'เกิดข้อผิดพลาดในการยกเลิกคำสั่งตรวจซ้ำ');
      setTimeout(() => setTaskErrorMsg(null), 6000);
    } finally {
      setSubmittingTaskPea(null);
    }
  };

  const fetchTransformers = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/transformers');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTransformers(json.data);
        setLastRefreshed(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setViewingTransformer(prev => {
          if (!prev) return prev;
          const found = (json.data as TransformerWithStatus[]).find(t => t.peaNo === prev.peaNo);
          return found || prev;
        });
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const viewNo = urlParams.get('view');
          if (viewNo) {
            const found = (json.data as TransformerWithStatus[]).find(t => t.peaNo === viewNo);
            if (found) setViewingTransformer(found);
          }
          const aiNo = urlParams.get('ai');
          if (aiNo) {
            const found = (json.data as TransformerWithStatus[]).find(t => t.peaNo === aiNo);
            if (found) {
              handleAnalyzeAI(found);
            }
          }
          const modeParam = urlParams.get('mode');
          if (modeParam === 'detail') {
            setTableViewMode('detail');
          } else if (modeParam === 'register') {
            setIsRegisterModalOpen(true);
          }
        }
      } else {
        setLoadError(json.error || 'ไม่สามารถโหลดข้อมูลหม้อแปลงจากฐานข้อมูลได้');
      }
    } catch (err: unknown) {
      console.error('Failed to load transformers:', err);
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-redirect to /field if opened as an installed PWA on a mobile device
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isMobile = window.innerWidth < 768;
      const urlParams = new URLSearchParams(window.location.search);
      const forceDashboard =
        urlParams.get('dashboard') === '1' ||
        sessionStorage.getItem('pea_force_dashboard') === '1';

      if (urlParams.get('dashboard') === '1') {
        sessionStorage.setItem('pea_force_dashboard', '1');
      }

      if (isStandalone && isMobile && !forceDashboard) {
        window.location.replace('/field');
        return;
      }
    }

    setMounted(true);
    fetchTransformers();
  }, []);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = transformers.length;
    const completed = transformers.filter(t => t.statusColor === 'done').length;
    const uninspected = transformers.filter(t => t.statusColor === 'red').length;
    const pending = transformers.filter(t => t.statusColor === 'orange').length;

    let overload = 0;
    let criticalUnbalance = 0;
    let harmonicRisk = 0;

    for (const t of transformers) {
      if (t.engineeringStatus) {
        if (t.engineeringStatus.loadStatus === 'OVERLOAD') overload++;
        if (t.engineeringStatus.unbalanceStatus === 'CRITICAL') criticalUnbalance++;
        if (t.engineeringStatus.isHarmonicRisk) harmonicRisk++;
      }
    }

    return { total, completed, uninspected, pending, overload, criticalUnbalance, harmonicRisk };
  }, [transformers]);

  // Local Today & Yesterday in YYYY-MM-DD
  const localTodayYMD = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const localYesterdayYMD = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Inspection date statistics across all transformers
  const dateStats = useMemo(() => {
    let todayCount = 0;
    let yesterdayCount = 0;
    let last7DaysCount = 0;
    let thisMonthCount = 0;

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sevenDaysAgoTs = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    const countsByYMD: Record<string, number> = {};

    for (const t of transformers) {
      if (!t.latestSession?.date) continue;
      const ymd = normalizeDateToYMD(t.latestSession.date);
      if (!ymd) continue;

      countsByYMD[ymd] = (countsByYMD[ymd] || 0) + 1;

      if (ymd === localTodayYMD) todayCount++;
      if (ymd === localYesterdayYMD) yesterdayCount++;
      if (ymd.startsWith(currentYearMonth)) thisMonthCount++;

      const ts = parseDateToTimestamp(t.latestSession.date, t.latestSession.time);
      if (ts >= sevenDaysAgoTs) last7DaysCount++;
    }

    const availableDates = Object.keys(countsByYMD).sort().reverse();

    return {
      todayCount,
      yesterdayCount,
      last7DaysCount,
      thisMonthCount,
      countsByYMD,
      availableDates,
    };
  }, [transformers, localTodayYMD, localYesterdayYMD]);

  // Check active advanced filter count
  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (minFeederCurrent || maxFeederCurrent) count++;
    if (minHarmonicCurrent || maxHarmonicCurrent) count++;
    return count;
  }, [minFeederCurrent, maxFeederCurrent, minHarmonicCurrent, maxHarmonicCurrent]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setDateFilterMode('ALL');
    setCustomDateFilter('');
    setSortColumn('latestDate');
    setSortDirection('desc');
    setMinFeederCurrent('');
    setMaxFeederCurrent('');
    setMinHarmonicCurrent('');
    setMaxHarmonicCurrent('');
    setFeederPhaseFilter('MAX');
  };

  // Filtered List with Date Filtering & Sorting (Latest date first by default)
  const filteredList = useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sevenDaysAgoTs = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    const filtered = transformers.filter(t => {
      // 1. Text Search
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        t.peaNo.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.brand.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // 2. Status Segment Filter
      if (statusFilter === 'RED' && t.statusColor !== 'red') return false;
      if (statusFilter === 'ORANGE' && t.statusColor !== 'orange') return false;
      if (statusFilter === 'DONE' && t.statusColor !== 'done') return false;
      if (statusFilter === 'OVERLOAD' && t.engineeringStatus?.loadStatus !== 'OVERLOAD') return false;
      if (statusFilter === 'UNBALANCE' && t.engineeringStatus?.unbalanceStatus !== 'CRITICAL') return false;
      if (statusFilter === 'CRYPTO' && !t.engineeringStatus?.isHarmonicRisk) return false;

      // 3. Date Filter (e.g. today completed count, custom date, presets)
      if (dateFilterMode !== 'ALL' || statusFilter === 'TODAY') {
        if (!t.latestSession?.date) return false;
        const ymd = normalizeDateToYMD(t.latestSession.date);
        if (!ymd) return false;

        if ((dateFilterMode === 'TODAY' || statusFilter === 'TODAY') && ymd !== localTodayYMD) {
          return false;
        }
        if (dateFilterMode === 'YESTERDAY' && ymd !== localYesterdayYMD) {
          return false;
        }
        if (dateFilterMode === 'LAST_7_DAYS') {
          const ts = parseDateToTimestamp(t.latestSession.date, t.latestSession.time);
          if (ts < sevenDaysAgoTs) return false;
        }
        if (dateFilterMode === 'THIS_MONTH' && !ymd.startsWith(currentYearMonth)) {
          return false;
        }
        if (dateFilterMode === 'CUSTOM' && customDateFilter && ymd !== customDateFilter) {
          return false;
        }
      }

      // 4. Feeder Current Filter
      const minCurrentNum = minFeederCurrent !== '' ? parseFloat(minFeederCurrent) : null;
      const maxCurrentNum = maxFeederCurrent !== '' ? parseFloat(maxFeederCurrent) : null;

      if (minCurrentNum !== null || maxCurrentNum !== null) {
        if (!t.latestSession) return false;

        let testedValue = 0;
        const total = t.latestSession.total;
        const feeders = t.latestSession.feeders;

        if (feederPhaseFilter === 'MAX') {
          const allA = feeders.map(f => f.currentA).concat(total.currentA);
          const allB = feeders.map(f => f.currentB).concat(total.currentB);
          const allC = feeders.map(f => f.currentC).concat(total.currentC);
          testedValue = Math.max(...allA, ...allB, ...allC, 0);
        } else if (feederPhaseFilter === 'A') {
          testedValue = Math.max(...feeders.map(f => f.currentA), total.currentA, 0);
        } else if (feederPhaseFilter === 'B') {
          testedValue = Math.max(...feeders.map(f => f.currentB), total.currentB, 0);
        } else if (feederPhaseFilter === 'C') {
          testedValue = Math.max(...feeders.map(f => f.currentC), total.currentC, 0);
        } else if (feederPhaseFilter === 'N') {
          testedValue = Math.max(...feeders.map(f => f.currentN), total.currentN, 0);
        } else if (feederPhaseFilter === 'TOTAL') {
          testedValue = Math.max(total.currentA, total.currentB, total.currentC);
        }

        if (minCurrentNum !== null && testedValue < minCurrentNum) return false;
        if (maxCurrentNum !== null && testedValue > maxCurrentNum) return false;
      }

      // 5. Harmonic Current Filter (I_harmonic = In - In_calc)
      const minHarmonicNum = minHarmonicCurrent !== '' ? parseFloat(minHarmonicCurrent) : null;
      const maxHarmonicNum = maxHarmonicCurrent !== '' ? parseFloat(maxHarmonicCurrent) : null;

      if (minHarmonicNum !== null || maxHarmonicNum !== null) {
        const harmonicCurrent = t.engineeringStatus?.harmonicCurrent ?? null;
        if (harmonicCurrent === null) return false;
        if (minHarmonicNum !== null && harmonicCurrent < minHarmonicNum) return false;
        if (maxHarmonicNum !== null && harmonicCurrent > maxHarmonicNum) return false;
      }

      return true;
    });

    // Sort order: Latest inspection date/time descending ALWAYS by default!
    return filtered.sort((a, b) => {
      let diff = 0;
      if (sortColumn === 'latestDate') {
        const tsA = parseDateToTimestamp(a.latestSession?.date, a.latestSession?.time);
        const tsB = parseDateToTimestamp(b.latestSession?.date, b.latestSession?.time);
        diff = tsB - tsA; // Default: newest first
        if (sortDirection === 'asc') diff = -diff;
      } else if (sortColumn === 'peaNo') {
        diff = a.peaNo.localeCompare(b.peaNo);
        if (sortDirection === 'desc') diff = -diff;
      } else if (sortColumn === 'kva') {
        diff = a.kva - b.kva;
        if (sortDirection === 'desc') diff = -diff;
      } else if (sortColumn === 'pctLoad') {
        const la = a.engineeringStatus?.pctLoad ?? -1;
        const lb = b.engineeringStatus?.pctLoad ?? -1;
        diff = lb - la;
        if (sortDirection === 'asc') diff = -diff;
      } else if (sortColumn === 'pctUnbalance') {
        const ua = a.engineeringStatus?.pctUnbalance ?? -1;
        const ub = b.engineeringStatus?.pctUnbalance ?? -1;
        diff = ub - ua;
        if (sortDirection === 'asc') diff = -diff;
      } else if (sortColumn === 'harmonic') {
        const ha = a.engineeringStatus?.harmonicCurrent ?? -1;
        const hb = b.engineeringStatus?.harmonicCurrent ?? -1;
        diff = hb - ha;
        if (sortDirection === 'asc') diff = -diff;
      }

      if (diff !== 0) return diff;
      return a.peaNo.localeCompare(b.peaNo);
    });
  }, [
    transformers,
    search,
    statusFilter,
    dateFilterMode,
    customDateFilter,
    sortColumn,
    sortDirection,
    feederPhaseFilter,
    minFeederCurrent,
    maxFeederCurrent,
    minHarmonicCurrent,
    maxHarmonicCurrent,
    localTodayYMD,
    localYesterdayYMD,
  ]);

  // Detailed Feeder Records List (Flattened and sorted newest first)
  const detailedSessions = useMemo(() => {
    const sessions: Array<{
      session: MeasurementSession;
      transformer: TransformerWithStatus;
      feeders: FeederRecord[];
    }> = [];

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sevenDaysAgoTs = now.getTime() - 7 * 24 * 60 * 60 * 1000;

    for (const t of filteredList) {
      const sList = t.historySessions && t.historySessions.length > 0
        ? t.historySessions
        : t.latestSession ? [t.latestSession] : [];

      for (const s of sList) {
        if (dateFilterMode !== 'ALL' || statusFilter === 'TODAY') {
          const sYmd = normalizeDateToYMD(s.date);
          if ((dateFilterMode === 'TODAY' || statusFilter === 'TODAY') && sYmd !== localTodayYMD) continue;
          if (dateFilterMode === 'YESTERDAY' && sYmd !== localYesterdayYMD) continue;
          if (dateFilterMode === 'CUSTOM' && customDateFilter && sYmd !== customDateFilter) continue;
          if (dateFilterMode === 'THIS_MONTH' && !sYmd.startsWith(currentYearMonth)) continue;
          if (dateFilterMode === 'LAST_7_DAYS') {
            const ts = parseDateToTimestamp(s.date, s.time);
            if (ts < sevenDaysAgoTs) continue;
          }
        }

        const validFeeders = s.feeders && s.feeders.length > 0
          ? s.feeders.filter(f => f.name.replace(/\s+/g, '') !== 'รวม')
          : (s.total ? [s.total] : []);

        if (validFeeders.length > 0) {
          sessions.push({
            session: s,
            transformer: t,
            feeders: validFeeders,
          });
        }
      }
    }

    // Sort newest date & time first
    sessions.sort((a, b) => {
      const tsA = parseDateToTimestamp(a.session.date, a.session.time);
      const tsB = parseDateToTimestamp(b.session.date, b.session.time);
      return tsB - tsA;
    });

    return sessions;
  }, [filteredList, dateFilterMode, customDateFilter, statusFilter, localTodayYMD, localYesterdayYMD]);

  // AI Analysis Handler with Session Caching
  const [aiReportsCache, setAiReportsCache] = useState<Record<string, string>>({});

  const handleAnalyzeAI = async (t: TransformerWithStatus, forceRefresh: boolean = false) => {
    setSelectedAiTransformer(t);
    if (!forceRefresh && aiReportsCache[t.peaNo]) {
      setAiReport(aiReportsCache[t.peaNo]);
      setAiLoading(false);
      return;
    }

    setAiReport(null);
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transformer: t }),
      });
      const data = await res.json();
      if (data.success) {
        setAiReport(data.report);
        setAiReportsCache(prev => ({ ...prev, [t.peaNo]: data.report }));
      } else {
        setAiReport(`❌ เกิดข้อผิดพลาด: ${data.error}`);
      }
    } catch (err: unknown) {
      setAiReport(`❌ ไม่สามารถเชื่อมต่อกับ AI Service: ${getErrorMessage(err)}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'PEA NO',
      'ขนาด kVA',
      'ระบบเฟส',
      'ยี่ห้อ',
      'สถานที่',
      'สถานะหมุด',
      'วันที่ตรวจล่าสุด',
      'กระแส A',
      'กระแส B',
      'กระแส C',
      'กระแส N',
      '%โหลด (UF)',
      '%Unbalance',
      'กระแสฮาร์มอนิก (A)',
      'ความเสี่ยงฮาร์มอนิก',
    ];
    const rows = filteredList.map(t => [
      `"${t.peaNo}"`,
      t.kva,
      t.system,
      `"${t.brand}"`,
      `"${t.location}"`,
      t.statusColor === 'red' ? 'ยังไม่ตรวจ' : t.statusColor === 'orange' ? 'สั่งตรวจซ้ำ' : 'ตรวจแล้ว',
      t.latestSession ? `"${t.latestSession.date} ${t.latestSession.time}"` : '"-"',
      t.latestSession?.total.currentA.toFixed(2) || '0',
      t.latestSession?.total.currentB.toFixed(2) || '0',
      t.latestSession?.total.currentC.toFixed(2) || '0',
      t.latestSession?.total.currentN.toFixed(2) || '0',
      t.engineeringStatus?.pctLoad.toFixed(2) || '0',
      t.engineeringStatus?.pctUnbalance.toFixed(2) || '0',
      t.engineeringStatus?.harmonicCurrent.toFixed(2) || '0',
      t.engineeringStatus?.isHarmonicRisk ? 'มีความเสี่ยง' : 'ปกติ',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PEA_Transformer_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  if (!mounted) {
    return (
      <div className="flex-1 p-4 md:px-7 md:py-6 w-full min-h-[70vh] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-[#741b77]/20 border-t-[#741b77] animate-spin" />
          <p className="text-sm font-medium text-slate-500">กำลังเตรียมพร้อมข้อมูลระบบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:px-7 md:py-6 w-full space-y-6">
      {/* Minimal Header Greeting & Status Overview */}
      <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-5 md:p-6">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#741b77] via-[#8e24aa] to-[#f39c12]" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            {/* Live Beacon Status Chip */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-[11px] font-semibold text-emerald-800 mb-2.5 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>ระบบตรวจสอบโหลดออนไลน์</span>
              <span className="text-emerald-300">•</span>
              <span className="font-mono text-[10px] text-emerald-700">PEA Realtime DB</span>
            </div>

            <div className="flex items-center gap-3">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                ภาพรวมการตรวจสอบโหลดหม้อแปลงไฟฟ้า
              </h2>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-[#741b77] border border-purple-200/60 font-mono">
                Smart Utility
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span>ฐานข้อมูลหลัก MasterData และผลตรวจวัดตามแผนงาน</span>
                <span className="text-[#741b77] font-semibold bg-purple-50 border border-purple-100 px-1.5 py-0.2 rounded text-[11px]">กฟภ. พะเยา</span>
              </span>
              {lastRefreshed && (
                <>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-md font-mono text-[11px]">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>อัปเดตล่าสุด: {lastRefreshed} น.</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Toolbar Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 sm:self-start lg:self-center">
            <button
              onClick={fetchTransformers}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs hover:border-slate-300 active:scale-95 disabled:opacity-60"
              title="ดึงข้อมูลล่าสุดจาก Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#741b77] ${loading ? 'animate-spin' : ''}`} />
              <span>รีเฟรชข้อมูล</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-purple-50/80 hover:bg-purple-100 text-[#741b77] border border-purple-200/80 text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs active:scale-95"
              title="ดาวน์โหลดข้อมูลเป็นไฟล์ Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#741b77]" />
              <span>ส่งออก CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-50/90 hover:bg-purple-100 text-[#741b77] border border-purple-200/90 text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs hover:border-purple-300 active:scale-95 group"
              title="ลงทะเบียนหม้อแปลงใหม่เข้าสู่ฐานข้อมูล MasterData"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#741b77] group-hover:scale-110 transition-transform" />
              <span>ลงทะเบียนหม้อแปลงใหม่</span>
            </button>

            <Link
              href="/field"
              className="px-4 py-2 rounded-xl bg-[#741b77] hover:bg-[#58145a] text-white text-xs font-semibold flex items-center gap-2 shadow-sm shadow-purple-900/15 hover:shadow-md transition-all active:scale-95 group"
            >
              <MapPin className="w-3.5 h-3.5 text-[#f39c12] group-hover:scale-110 transition-transform" />
              <span>แผนที่หน้างาน</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {deleteSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-emerald-800 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900">{deleteSuccessMsg}</p>
              <p className="text-[11px] text-emerald-700/90 mt-0.5">ระบบได้ลบข้อมูลออกจาก Google Sheets ทุกชีต และลบรูปถ่ายใน Google Drive เรียบร้อยแล้ว</p>
            </div>
          </div>
          <button
            onClick={() => setDeleteSuccessMsg(null)}
            className="p-1.5 rounded-xl text-emerald-600 hover:bg-emerald-100 transition-colors"
            title="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Load Error Alert Banner */}
      {loadError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล Google Sheets</p>
              <p className="text-[11px] text-amber-800 mt-0.5">{loadError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={fetchTransformers}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>ลองใหม่อีกครั้ง</span>
            </button>
            <button
              onClick={() => setLoadError(null)}
              className="p-1.5 rounded-xl text-amber-700 hover:bg-amber-100 transition-colors"
              title="ปิดการแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid - Executive Modern Industrial Style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* 1. หม้อแปลงทั้งหมด */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter('ALL')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter('ALL'); } }}
          className={`relative overflow-hidden bg-white p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none group active:scale-[0.98] ${
            statusFilter === 'ALL'
              ? 'border-purple-300 ring-2 ring-purple-600/25 shadow-sm bg-gradient-to-b from-purple-50/20 via-white to-white'
              : 'border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5'
          }`}
          title="คลิกเพื่อแสดงหม้อแปลงทั้งหมด"
        >
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-[#741b77] to-purple-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 group-hover:text-slate-800 transition-colors">
              หม้อแปลงทั้งหมด
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100/80 flex items-center justify-center text-[#741b77] shadow-2xs group-hover:scale-110 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black mt-2 text-slate-900 tracking-tight tabular-nums">
            {metrics.total}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            ฐานข้อมูล Master
          </div>
          <Layers className="w-16 h-16 absolute -right-3 -bottom-3 text-[#741b77] opacity-[0.035] pointer-events-none group-hover:opacity-[0.06] transition-opacity" />
        </div>

        {/* 2. ตรวจแล้ว */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter(statusFilter === 'DONE' ? 'ALL' : 'DONE')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter(statusFilter === 'DONE' ? 'ALL' : 'DONE'); } }}
          className={`relative overflow-hidden bg-white p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none group active:scale-[0.98] ${
            statusFilter === 'DONE'
              ? 'border-emerald-400 ring-2 ring-emerald-500/25 shadow-sm bg-gradient-to-b from-emerald-50/25 via-white to-white'
              : 'border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300/80 hover:-translate-y-0.5'
          }`}
          title="คลิกเพื่อกรองเฉพาะที่ตรวจแล้ว"
        >
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 group-hover:text-emerald-700 transition-colors">
              ตรวจแล้ว
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-600 shadow-2xs group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black mt-2 text-emerald-600 tracking-tight tabular-nums">
            {metrics.completed}
          </div>
          <div className="mt-1">
            <div className="text-[11px] text-emerald-700/80 font-medium">
              {((metrics.completed / (metrics.total || 1)) * 100).toFixed(1)}% ของทั้งหมด
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, (metrics.completed / (metrics.total || 1)) * 100))}%`,
                }}
              />
            </div>
          </div>
          <CheckCircle2 className="w-16 h-16 absolute -right-3 -bottom-3 text-emerald-600 opacity-[0.035] pointer-events-none group-hover:opacity-[0.06] transition-opacity" />
        </div>

        {/* 3. ยังไม่ตรวจ */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter(statusFilter === 'RED' ? 'ALL' : 'RED')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter(statusFilter === 'RED' ? 'ALL' : 'RED'); } }}
          className={`relative overflow-hidden bg-white p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none group active:scale-[0.98] ${
            statusFilter === 'RED'
              ? 'border-rose-300 ring-2 ring-rose-500/25 shadow-sm bg-gradient-to-b from-rose-50/25 via-white to-white'
              : 'border-slate-200/90 shadow-2xs hover:shadow-md hover:border-rose-300/80 hover:-translate-y-0.5'
          }`}
          title="คลิกเพื่อกรองเฉพาะที่ยังไม่ตรวจ"
        >
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-rose-500 to-red-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 group-hover:text-rose-700 transition-colors">
              ยังไม่ตรวจ
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100/80 flex items-center justify-center text-rose-600 shadow-2xs group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black mt-2 text-rose-600 tracking-tight tabular-nums">
            {metrics.uninspected}
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>รอการเข้าตรวจวัด</span>
          </div>
          <AlertTriangle className="w-16 h-16 absolute -right-3 -bottom-3 text-rose-600 opacity-[0.035] pointer-events-none group-hover:opacity-[0.06] transition-opacity" />
        </div>

        {/* 4. สั่งตรวจซ้ำ */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter(statusFilter === 'ORANGE' ? 'ALL' : 'ORANGE')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter(statusFilter === 'ORANGE' ? 'ALL' : 'ORANGE'); } }}
          className={`relative overflow-hidden bg-white p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none group active:scale-[0.98] ${
            statusFilter === 'ORANGE'
              ? 'border-amber-300 ring-2 ring-amber-500/25 shadow-sm bg-gradient-to-b from-amber-50/25 via-white to-white'
              : 'border-slate-200/90 shadow-2xs hover:shadow-md hover:border-amber-300/80 hover:-translate-y-0.5'
          }`}
          title="คลิกเพื่อกรองเฉพาะที่สั่งตรวจซ้ำ"
        >
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 group-hover:text-amber-700 transition-colors">
              สั่งตรวจซ้ำ
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100/80 flex items-center justify-center text-amber-600 shadow-2xs group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black mt-2 text-amber-600 tracking-tight tabular-nums">
            {metrics.pending}
          </div>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-700/90 font-medium mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>ใบงาน Task Pending</span>
          </div>
          <Activity className="w-16 h-16 absolute -right-3 -bottom-3 text-amber-600 opacity-[0.035] pointer-events-none group-hover:opacity-[0.06] transition-opacity" />
        </div>

        {/* 5. โหลดเกินพิกัด */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter(statusFilter === 'OVERLOAD' ? 'ALL' : 'OVERLOAD')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter(statusFilter === 'OVERLOAD' ? 'ALL' : 'OVERLOAD'); } }}
          className={`relative overflow-hidden bg-white p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none group active:scale-[0.98] ${
            statusFilter === 'OVERLOAD'
              ? 'border-red-400 ring-2 ring-red-500/25 shadow-sm bg-gradient-to-b from-red-50/25 via-white to-white'
              : 'border-slate-200/90 shadow-2xs hover:shadow-md hover:border-red-300/80 hover:-translate-y-0.5'
          }`}
          title="คลิกเพื่อกรองเฉพาะหม้อแปลงโหลดเกินพิกัด"
        >
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-red-600 to-rose-600" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 group-hover:text-red-700 transition-colors">
              โหลดเกินพิกัด
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-100/80 flex items-center justify-center text-red-600 shadow-2xs group-hover:scale-110 transition-transform">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black mt-2 text-red-600 tracking-tight tabular-nums">
            {metrics.overload}
          </div>
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-[10.5px] text-red-700 bg-red-50/90 border border-red-200/70 px-1.5 py-0.5 rounded-md font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              <span>%UF &gt; 80% (เกณฑ์ กฟภ.)</span>
            </span>
          </div>
          <Flame className="w-16 h-16 absolute -right-3 -bottom-3 text-red-600 opacity-[0.035] pointer-events-none group-hover:opacity-[0.06] transition-opacity" />
        </div>

        {/* 6. เสี่ยงบิตคอยน์ */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setStatusFilter(statusFilter === 'CRYPTO' ? 'ALL' : 'CRYPTO')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStatusFilter(statusFilter === 'CRYPTO' ? 'ALL' : 'CRYPTO'); } }}
          className={`relative overflow-hidden bg-white p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none group active:scale-[0.98] ${
            statusFilter === 'CRYPTO'
              ? 'border-amber-400 ring-2 ring-amber-500/25 shadow-sm bg-gradient-to-b from-amber-50/25 via-white to-white'
              : 'border-slate-200/90 shadow-2xs hover:shadow-md hover:border-amber-300/80 hover:-translate-y-0.5'
          }`}
          title="คลิกเพื่อกรองเฉพาะกลุ่มเสี่ยงบิตคอยน์ (Harmonic สูง)"
        >
          <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 group-hover:text-amber-800 transition-colors">
              เสี่ยงบิตคอยน์
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50/90 border border-amber-200/70 flex items-center justify-center text-[#f39c12] shadow-2xs group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4 fill-amber-400/20" />
            </div>
          </div>
          <div className="text-2xl lg:text-3xl font-black mt-2 text-[#d68910] tracking-tight tabular-nums">
            {metrics.harmonicRisk}
          </div>
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 text-[10.5px] text-amber-800 bg-amber-50/90 border border-amber-200/70 px-1.5 py-0.5 rounded-md font-semibold">
              <Zap className="w-2.5 h-2.5 text-[#f39c12] fill-[#f39c12]" />
              <span>Harmonic แฝงสูง</span>
            </span>
          </div>
          <Zap className="w-16 h-16 absolute -right-3 -bottom-3 text-amber-500 opacity-[0.035] pointer-events-none group-hover:opacity-[0.06] transition-opacity" />
        </div>
      </div>

      {/* Primary Search & Quick Filters Bar */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left Group: Search Input + Status Filter Pills naturally adjacent */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-72 md:w-80 flex-shrink-0">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="ค้นหา PEA NO, สถานที่, ยี่ห้อ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50/80 border border-slate-200/90 text-slate-800 placeholder:text-slate-400 text-xs md:text-sm focus:outline-none focus:bg-white focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 shadow-2xs transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
                  title="ล้างคำค้นหา"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Status Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL', label: 'ทั้งหมด', dotColor: null, icon: null },
                { id: 'RED', label: 'ยังไม่ตรวจ', dotColor: 'bg-rose-500', icon: null },
                { id: 'ORANGE', label: 'สั่งตรวจซ้ำ', dotColor: 'bg-amber-500', icon: null },
                { id: 'DONE', label: 'ตรวจแล้ว', dotColor: 'bg-emerald-500', icon: null },
                { id: 'TODAY', label: `ตรวจวันนี้ (${dateStats.todayCount})`, dotColor: 'bg-emerald-500', icon: 'calendar' },
                { id: 'OVERLOAD', label: 'โหลดเกิน 80%', dotColor: 'bg-rose-500', icon: null },
                { id: 'UNBALANCE', label: 'ไม่สมดุล', dotColor: 'bg-amber-500', icon: null },
                { id: 'CRYPTO', label: 'เสี่ยงบิตคอยน์', dotColor: null, icon: 'zap' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    setStatusFilter(f.id);
                    if (f.id === 'TODAY') {
                      setDateFilterMode('TODAY');
                      setCustomDateFilter('');
                    } else if (f.id === 'ALL' && dateFilterMode === 'TODAY') {
                      setDateFilterMode('ALL');
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-150 ${
                    statusFilter === f.id
                      ? 'bg-[#741b77] text-white shadow-sm font-semibold border border-[#741b77]'
                      : 'bg-slate-50 hover:bg-slate-100/90 text-slate-600 border border-slate-200/70 hover:border-slate-300 font-medium'
                  }`}
                >
                  {f.dotColor && f.icon !== 'calendar' && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        statusFilter === f.id ? 'bg-white' : f.dotColor
                      }`}
                    />
                  )}
                  {f.icon === 'calendar' && (
                    <Calendar
                      className={`w-3 h-3 ${
                        statusFilter === f.id ? 'text-white' : 'text-emerald-600'
                      }`}
                    />
                  )}
                  {f.icon === 'zap' && (
                    <Zap
                      className={`w-3 h-3 ${
                        statusFilter === f.id ? 'text-amber-300 fill-amber-300' : 'text-[#f39c12] fill-[#f39c12]'
                      }`}
                    />
                  )}
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Advanced Filter Toggle Button */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all self-end lg:self-center shadow-2xs flex-shrink-0 ${
              showAdvancedFilters || activeAdvancedFilterCount > 0
                ? 'bg-purple-50 text-[#741b77] border-purple-200 font-bold ring-1 ring-purple-100'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#741b77]" />
            <span>กรองกระแส &amp; Harmonic</span>
            {activeAdvancedFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#741b77] text-white text-[10px] flex items-center justify-center font-bold">
                {activeAdvancedFilterCount}
              </span>
            )}
            {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5 text-[#741b77]" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>

        {/* Collapsible Advanced Filters Drawer - Organized Executive Design */}
        {showAdvancedFilters && (
          <div className="pt-3.5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch animate-in fade-in duration-150">
            {/* 1. Feeder Current Filter */}
            <div className="relative overflow-hidden p-4 sm:p-5 bg-gradient-to-b from-white via-white to-slate-50/40 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3.5">
              <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-[#741b77] to-purple-500" />
              
              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100/80 flex items-center justify-center text-[#741b77] shadow-2xs shrink-0">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-snug">
                      กรองตามกระแสฟีดเดอร์ (Feeder Current)
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      กำหนดช่วงกระแสโหลดเพื่อค้นหา
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-slate-500 font-semibold hidden sm:inline">เกณฑ์:</span>
                  <select
                    value={feederPhaseFilter}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'MAX' || val === 'A' || val === 'B' || val === 'C' || val === 'N' || val === 'TOTAL') {
                        setFeederPhaseFilter(val);
                      }
                    }}
                    className="bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 font-bold focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 cursor-pointer transition-all shadow-2xs"
                  >
                    <option value="MAX">กระแสสูงสุด (Max Current)</option>
                    <option value="A">เฟส A</option>
                    <option value="B">เฟส B</option>
                    <option value="C">เฟส C</option>
                    <option value="N">สายนิวทรัล N</option>
                    <option value="TOTAL">กระแสรวม (Total Feeder)</option>
                  </select>
                </div>
              </div>

              {/* Connected Dual Range Input Group */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-600">กระแสต่ำสุด (Min)</span>
                      {minFeederCurrent && (
                        <button
                          type="button"
                          onClick={() => setMinFeederCurrent('')}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold transition-colors"
                        >
                          ล้าง
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="5"
                        placeholder="เช่น 50"
                        value={minFeederCurrent}
                        onChange={e => setMinFeederCurrent(e.target.value)}
                        className="w-full bg-white border border-slate-200/90 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold tabular-nums text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 shadow-2xs transition-all"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 pointer-events-none">A</span>
                    </div>
                  </div>

                  <div className="pt-5 shrink-0 text-slate-300 font-bold text-xs select-none">
                    ถึง
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-600">กระแสสูงสุด (Max)</span>
                      {maxFeederCurrent && (
                        <button
                          type="button"
                          onClick={() => setMaxFeederCurrent('')}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold transition-colors"
                        >
                          ล้าง
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="5"
                        placeholder="ไม่จำกัด (เช่น 200)"
                        value={maxFeederCurrent}
                        onChange={e => setMaxFeederCurrent(e.target.value)}
                        className="w-full bg-white border border-slate-200/90 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold tabular-nums text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 shadow-2xs transition-all"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 pointer-events-none">A</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-400 font-bold text-[10.5px] uppercase tracking-wider shrink-0">ทางลัด:</span>
                  {[
                    { label: '≥ 50 A', min: '50' },
                    { label: '≥ 100 A', min: '100' },
                    { label: '≥ 150 A', min: '150' },
                    { label: '≥ 200 A', min: '200' },
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setMinFeederCurrent(p.min);
                        setMaxFeederCurrent('');
                      }}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold tabular-nums transition-all active:scale-95 shadow-2xs ${
                        minFeederCurrent === p.min && maxFeederCurrent === ''
                          ? 'bg-[#741b77] text-white border-[#741b77] shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {(minFeederCurrent || maxFeederCurrent) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMinFeederCurrent('');
                      setMaxFeederCurrent('');
                    }}
                    className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 ml-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>รีเซ็ต</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. Harmonic Current Filter */}
            <div className="relative overflow-hidden p-4 sm:p-5 bg-gradient-to-b from-white via-white to-slate-50/40 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3.5">
              <div className="h-1 w-full absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-yellow-400" />

              {/* Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-[#f39c12] shadow-2xs shrink-0">
                    <Zap className="w-4 h-4 fill-amber-400/30" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight leading-snug">
                      กรองช่วงกระแส Harmonic แฝง
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">
                      คัดกรองกระแสผิดปกติที่อาจเสี่ยงบิตคอยน์
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] text-slate-500 font-semibold hidden sm:inline">สูตร:</span>
                  <span className="inline-flex items-center font-mono text-[11px] text-amber-900 bg-amber-100/80 border border-amber-200/90 px-3 py-1.5 rounded-xl font-bold shadow-2xs">
                    In - In_calc
                  </span>
                </div>
              </div>

              {/* Connected Dual Range Input Group */}
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-600">Harmonic ต่ำสุด (Min)</span>
                      {minHarmonicCurrent && (
                        <button
                          type="button"
                          onClick={() => setMinHarmonicCurrent('')}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold transition-colors"
                        >
                          ล้าง
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="5"
                        placeholder="เช่น 15 (เฝ้าระวัง)"
                        value={minHarmonicCurrent}
                        onChange={e => setMinHarmonicCurrent(e.target.value)}
                        className="w-full bg-white border border-slate-200/90 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold tabular-nums text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 shadow-2xs transition-all"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 pointer-events-none">A</span>
                    </div>
                  </div>

                  <div className="pt-5 shrink-0 text-slate-300 font-bold text-xs select-none">
                    ถึง
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-600">Harmonic สูงสุด (Max)</span>
                      {maxHarmonicCurrent && (
                        <button
                          type="button"
                          onClick={() => setMaxHarmonicCurrent('')}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold transition-colors"
                        >
                          ล้าง
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="5"
                        placeholder="ไม่จำกัด"
                        value={maxHarmonicCurrent}
                        onChange={e => setMaxHarmonicCurrent(e.target.value)}
                        className="w-full bg-white border border-slate-200/90 rounded-xl pl-3 pr-8 py-2 text-xs font-mono font-bold tabular-nums text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 shadow-2xs transition-all"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400 pointer-events-none">A</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Harmonic Presets & Clear Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-400 font-bold text-[10.5px] uppercase tracking-wider shrink-0">ทางลัด:</span>
                  {[
                    { label: '≥ 15 A (เฝ้าระวัง)', min: '15' },
                    { label: '≥ 25 A (สูง)', min: '25' },
                    { label: '≥ 50 A (วิกฤต)', min: '50' },
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setMinHarmonicCurrent(p.min);
                        setMaxHarmonicCurrent('');
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold tabular-nums transition-all active:scale-95 shadow-2xs ${
                        minHarmonicCurrent === p.min && maxHarmonicCurrent === ''
                          ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      {p.min === '15' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      {p.min === '25' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                      {p.min === '50' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>

                {activeAdvancedFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-transparent hover:border-rose-200/60 flex items-center gap-1.5 font-bold transition-all ml-auto active:scale-95 shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ล้างตัวกรองทั้งหมด</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transformers Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-[#741b77] border border-purple-100/80 flex-shrink-0 shadow-2xs">
              <FileSpreadsheet className="w-4 h-4 text-[#741b77]" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">
              ตารางข้อมูลหม้อแปลงและสถานะทางวิศวกรรม
            </span>
            <span className="text-[11px] text-slate-600 bg-white border border-slate-200/80 px-2.5 py-0.5 rounded-full font-medium shadow-2xs">
              {tableViewMode === 'summary'
                ? `แสดง ${filteredList.length.toLocaleString()} จาก ${transformers.length.toLocaleString()} รายการ`
                : `แสดง ${detailedSessions.length.toLocaleString()} รอบตรวจวัด`}
            </span>
            {tableViewMode === 'summary' && (
              <span className="text-[11px] text-[#741b77] bg-purple-50/90 border border-purple-200/70 px-2.5 py-0.5 rounded-full font-medium hidden md:inline-flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>คลิกแถวเพื่อเปิดดูประวัติและข้อมูลเต็ม</span>
              </span>
            )}
            {tableViewMode === 'detail' && (
              <span className="text-[11px] text-[#741b77] bg-purple-50/90 border border-purple-200/70 px-2.5 py-0.5 rounded-full font-medium hidden md:inline-flex items-center gap-1 shadow-2xs">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>คลิกเลข PEA NO เพื่อดูประวัติและข้อมูลเต็ม</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle: ภาพรวม vs รายละเอียด */}
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setTableViewMode('summary')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  tableViewMode === 'summary'
                    ? 'bg-white text-[#741b77] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="โหมดภาพรวมหม้อแปลง"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>ภาพรวม</span>
              </button>
              <button
                type="button"
                onClick={() => setTableViewMode('detail')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 ${
                  tableViewMode === 'detail'
                    ? 'bg-white text-[#741b77] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="โหมดดูรายละเอียดตามฟีดเดอร์"
              >
                <ListTree className="w-3.5 h-3.5" />
                <span>รายละเอียด</span>
              </button>
            </div>

            <Link
              href="/field"
              className="text-xs text-[#741b77] hover:text-[#58145a] font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-purple-50/80 border border-transparent hover:border-purple-200/70 transition-all active:scale-95"
            >
              <span>เปิดหน้าแผนที่ตำแหน่งหมุด</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Date Filter & Inspection Status Toolbar */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-purple-50/40 via-white to-slate-50/60 border-b border-slate-200/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
              <Calendar className="w-4 h-4 text-[#741b77]" />
              <span>กรองวันที่ตรวจ:</span>
            </div>

            {/* All */}
            <button
              type="button"
              onClick={() => {
                setDateFilterMode('ALL');
                setCustomDateFilter('');
                if (statusFilter === 'TODAY') setStatusFilter('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                dateFilterMode === 'ALL' && !customDateFilter && statusFilter !== 'TODAY'
                  ? 'bg-[#741b77] text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              ทั้งหมด
            </button>

            {/* วันนี้ with live count badge */}
            <button
              type="button"
              onClick={() => {
                setDateFilterMode('TODAY');
                setCustomDateFilter('');
                setStatusFilter('ALL');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                dateFilterMode === 'TODAY' || statusFilter === 'TODAY'
                  ? 'bg-emerald-600 text-white shadow-2xs font-bold ring-2 ring-emerald-500/20'
                  : 'bg-white text-emerald-700 border border-emerald-200/90 hover:bg-emerald-50/70'
              }`}
              title="กรองเฉพาะหม้อแปลงที่ตรวจวัดเสร็จในวันนี้"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  dateFilterMode === 'TODAY' || statusFilter === 'TODAY'
                    ? 'bg-white'
                    : 'bg-emerald-500 animate-pulse'
                }`}
              />
              <span>วันนี้</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  dateFilterMode === 'TODAY' || statusFilter === 'TODAY'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {dateStats.todayCount} เครื่อง
              </span>
            </button>

            {/* เมื่อวาน */}
            <button
              type="button"
              onClick={() => {
                setDateFilterMode('YESTERDAY');
                setCustomDateFilter('');
                setStatusFilter('ALL');
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                dateFilterMode === 'YESTERDAY'
                  ? 'bg-[#741b77] text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <span>เมื่อวาน</span>
              {dateStats.yesterdayCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    dateFilterMode === 'YESTERDAY'
                      ? 'bg-purple-800 text-purple-100'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {dateStats.yesterdayCount}
                </span>
              )}
            </button>

            {/* 7 วันล่าสุด */}
            <button
              type="button"
              onClick={() => {
                setDateFilterMode('LAST_7_DAYS');
                setCustomDateFilter('');
                setStatusFilter('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                dateFilterMode === 'LAST_7_DAYS'
                  ? 'bg-[#741b77] text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              7 วันล่าสุด
            </button>

            {/* เดือนนี้ */}
            <button
              type="button"
              onClick={() => {
                setDateFilterMode('THIS_MONTH');
                setCustomDateFilter('');
                setStatusFilter('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                dateFilterMode === 'THIS_MONTH'
                  ? 'bg-[#741b77] text-white shadow-2xs font-bold'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              เดือนนี้
            </button>

            {/* Date Input */}
            <div className="inline-flex items-center gap-1 bg-white border border-slate-200/90 rounded-lg px-2 py-0.5 shadow-2xs">
              <span className="text-[11px] text-slate-400 font-medium">ระบุวันที่:</span>
              <input
                type="date"
                value={customDateFilter}
                onChange={e => {
                  const val = e.target.value;
                  setCustomDateFilter(val);
                  if (val) {
                    setDateFilterMode('CUSTOM');
                    setStatusFilter('ALL');
                  } else {
                    setDateFilterMode('ALL');
                  }
                }}
                className="text-xs text-slate-700 bg-transparent border-0 focus:outline-none cursor-pointer font-mono"
              />
            </div>

            {/* Dropdown of past inspection dates */}
            {dateStats.availableDates.length > 0 && (
              <select
                value={dateFilterMode === 'CUSTOM' ? customDateFilter : ''}
                onChange={e => {
                  const val = e.target.value;
                  if (val) {
                    setCustomDateFilter(val);
                    setDateFilterMode('CUSTOM');
                    setStatusFilter('ALL');
                  } else {
                    setCustomDateFilter('');
                    setDateFilterMode('ALL');
                  }
                }}
                className="text-xs text-slate-700 bg-white border border-slate-200/90 rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer shadow-2xs"
              >
                <option value="">เลือกจากประวัติวันที่ตรวจ ({dateStats.availableDates.length} วัน)...</option>
                {dateStats.availableDates.map(ymd => (
                  <option key={ymd} value={ymd}>
                    {formatYMDToThai(ymd)} ({dateStats.countsByYMD[ymd]} เครื่อง)
                  </option>
                ))}
              </select>
            )}

            {/* Clear Button */}
            {(dateFilterMode !== 'ALL' || customDateFilter || statusFilter === 'TODAY') && (
              <button
                type="button"
                onClick={() => {
                  setDateFilterMode('ALL');
                  setCustomDateFilter('');
                  if (statusFilter === 'TODAY') setStatusFilter('ALL');
                }}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg border border-rose-200/60 font-semibold transition-all active:scale-95 shadow-2xs"
                title="ล้างตัวกรองวันที่"
              >
                <RotateCcw className="w-3 h-3" />
                <span>ล้างตัวกรองวันที่</span>
              </button>
            )}
          </div>

          {/* Right Status Feedback */}
          <div className="flex items-center gap-2">
            {dateFilterMode === 'TODAY' || statusFilter === 'TODAY' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 shadow-2xs animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  วันนี้ทำเสร็จไปแล้ว{' '}
                  <span className="font-extrabold font-mono text-emerald-900 text-sm">
                    {dateStats.todayCount}
                  </span>{' '}
                  เครื่อง
                </span>
              </div>
            ) : dateFilterMode === 'CUSTOM' && customDateFilter ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-[#741b77] shadow-2xs animate-in fade-in">
                <Calendar className="w-3.5 h-3.5 text-[#741b77] shrink-0" />
                <span>
                  วันที่ {formatYMDToThai(customDateFilter)} ทำเสร็จ{' '}
                  <span className="font-extrabold font-mono text-[#741b77] text-sm">
                    {dateStats.countsByYMD[customDateFilter] || 0}
                  </span>{' '}
                  เครื่อง
                </span>
              </div>
            ) : dateFilterMode === 'YESTERDAY' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs">
                <span>
                  เมื่อวานทำเสร็จ{' '}
                  <span className="font-extrabold font-mono text-slate-900">
                    {dateStats.yesterdayCount}
                  </span>{' '}
                  เครื่อง
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-600 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>
                  เรียงลำดับ:{' '}
                  <span className="font-bold text-[#741b77]">
                    {sortColumn === 'latestDate'
                      ? sortDirection === 'desc'
                        ? 'ตรวจล่าสุดขึ้นก่อนเสมอ'
                        : 'ตรวจเก่าสุดขึ้นก่อน'
                      : sortColumn === 'pctLoad'
                      ? '%โหลด'
                      : sortColumn === 'pctUnbalance'
                      ? '%Unbalance'
                      : sortColumn === 'harmonic'
                      ? 'Harmonic'
                      : sortColumn}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          {tableViewMode === 'summary' ? (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 text-[11px] font-semibold tracking-wider uppercase select-none">
              <tr>
                <th
                  className="py-3.5 px-5 cursor-pointer hover:bg-slate-100/90 transition-colors"
                  onClick={() => {
                    if (sortColumn === 'peaNo') {
                      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortColumn('peaNo');
                      setSortDirection('asc');
                    }
                  }}
                  title="คลิกเพื่อเรียงลำดับ PEA NO"
                >
                  <div className="flex items-center gap-1.5">
                    <span>PEA NO</span>
                    {sortColumn === 'peaNo' ? (
                      <span className="text-[#741b77]">{sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/90 transition-colors"
                  onClick={() => {
                    if (sortColumn === 'kva') {
                      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortColumn('kva');
                      setSortDirection('desc');
                    }
                  }}
                  title="คลิกเพื่อเรียงลำดับขนาด kVA"
                >
                  <div className="flex items-center gap-1.5">
                    <span>ขนาด (kVA)</span>
                    {sortColumn === 'kva' && (
                      <span className="text-[#741b77]">{sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span>
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4">สถานที่ติดตั้ง</th>
                <th className="py-3.5 px-4 text-center">สถานะตรวจวัด</th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:bg-purple-50/70 transition-colors"
                  onClick={() => {
                    if (sortColumn === 'latestDate') {
                      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortColumn('latestDate');
                      setSortDirection('desc');
                    }
                  }}
                  title="คลิกเพื่อสลับการเรียงลำดับวัน-เวลาล่าสุด (ล่าสุดขึ้นก่อนเสมอ)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>วัน-เวลาล่าสุด</span>
                    {sortColumn === 'latestDate' ? (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#741b77] bg-purple-100/90 border border-purple-200/90 px-1.5 py-0.5 rounded-full shadow-2xs">
                        {sortDirection === 'desc' ? (
                          <>
                            <span>ล่าสุดก่อน</span>
                            <ArrowDown className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <span>เก่าสุดก่อน</span>
                            <ArrowUp className="w-3 h-3" />
                          </>
                        )}
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100/90 transition-colors"
                  onClick={() => {
                    if (sortColumn === 'pctLoad') {
                      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortColumn('pctLoad');
                      setSortDirection('desc');
                    }
                  }}
                  title="คลิกเพื่อเรียงลำดับ %โหลด"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {sortColumn === 'pctLoad' && (
                      <span className="text-[#741b77]">{sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span>
                    )}
                    <span>%โหลด (UF)</span>
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100/90 transition-colors"
                  onClick={() => {
                    if (sortColumn === 'pctUnbalance') {
                      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortColumn('pctUnbalance');
                      setSortDirection('desc');
                    }
                  }}
                  title="คลิกเพื่อเรียงลำดับ %Unbalance"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {sortColumn === 'pctUnbalance' && (
                      <span className="text-[#741b77]">{sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span>
                    )}
                    <span>%Unbalance</span>
                  </div>
                </th>
                <th
                  className="py-3.5 px-5 text-right cursor-pointer hover:bg-slate-100/90 transition-colors"
                  onClick={() => {
                    if (sortColumn === 'harmonic') {
                      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
                    } else {
                      setSortColumn('harmonic');
                      setSortDirection('desc');
                    }
                  }}
                  title="คลิกเพื่อเรียงลำดับ Harmonic"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    {sortColumn === 'harmonic' && (
                      <span className="text-[#741b77]">{sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</span>
                    )}
                    <span>Harmonic (A)</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-500">
                    <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-[#741b77]" />
                    <p className="font-medium text-slate-700">กำลังดึงข้อมูลหม้อแปลงจาก Google Sheets...</p>
                    <p className="text-[11px] text-slate-400 mt-1">เชื่อมต่อฐานข้อมูล MasterData &amp; Record Data</p>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-500">
                    <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">ไม่พบรายการหม้อแปลงที่ตรงกับเงื่อนไขตัวกรอง</p>
                    {(dateFilterMode === 'TODAY' || statusFilter === 'TODAY') && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">วันนี้ยังไม่มีรายการหม้อแปลงที่ตรวจวัดเสร็จ (0 เครื่อง)</p>
                    )}
                    {dateFilterMode === 'CUSTOM' && customDateFilter && (
                      <p className="text-xs text-[#741b77] font-medium mt-1">ไม่พบรายการที่ตรวจวัดในวันที่ {formatYMDToThai(customDateFilter)}</p>
                    )}
                    <button
                      onClick={handleResetFilters}
                      className="mt-2 text-xs font-semibold text-[#741b77] hover:underline"
                    >
                      กดที่นี่เพื่อล้างตัวกรองทั้งหมด
                    </button>
                  </td>
                </tr>
              ) : (
                filteredList.slice(0, 100).map((t, idx) => {
                  const pctLoad = t.engineeringStatus?.pctLoad ?? null;
                  const pctUnb = t.engineeringStatus?.pctUnbalance ?? null;
                  const harmonicA = t.engineeringStatus?.harmonicCurrent ?? null;
                  const isCrypto = t.engineeringStatus?.isHarmonicRisk ?? false;
                  const historyCount = t.historySessions ? t.historySessions.length : (t.latestSession ? 1 : 0);
                  const isAltRow = idx % 2 === 1;

                  return (
                    <tr
                      key={t.peaNo}
                      onClick={() => setViewingTransformer(t)}
                      className={`cursor-pointer transition-colors duration-150 group ${
                        isAltRow
                          ? 'bg-slate-50/75 hover:bg-purple-50/50'
                          : 'bg-white hover:bg-purple-50/30'
                      }`}
                      title="คลิกเพื่อดูประวัติบันทึกข้อมูลโหลดและรายละเอียดหม้อแปลง"
                    >
                      {/* PEA NO */}
                      <td className="py-3.5 px-5 font-semibold text-slate-900 flex items-center gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ring-4 ${
                            t.statusColor === 'red'
                              ? 'bg-rose-500 ring-rose-100'
                              : t.statusColor === 'orange'
                              ? 'bg-amber-500 ring-amber-100'
                              : 'bg-emerald-500 ring-emerald-100'
                          }`}
                        />
                        <span className="font-mono text-xs font-semibold tracking-tight text-slate-800 group-hover:text-[#741b77] transition-colors">
                          {t.peaNo}
                        </span>
                        {historyCount > 1 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-[#741b77] border border-purple-200/60 text-[10px] font-semibold tabular-nums">
                            {historyCount} รอบ
                          </span>
                        )}
                      </td>

                      {/* kVA */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <span className="font-mono text-xs font-medium tabular-nums text-slate-800">
                          {t.kva} kVA
                        </span>
                        <span className="text-[11px] text-slate-400 font-sans ml-1">
                          ({t.system}P)
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="max-w-xs md:max-w-md xl:max-w-xl truncate text-xs text-slate-600" title={t.location}>
                          {t.location || '-'}
                        </div>
                      </td>

                      {/* Inspection Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {t.statusColor === 'red' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            ยังไม่ตรวจ
                          </span>
                        ) : t.statusColor === 'orange' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            สั่งตรวจซ้ำ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            ตรวจแล้ว
                          </span>
                        )}
                      </td>

                      {/* Last Date/Time */}
                      <td className="py-3.5 px-4 text-slate-500">
                        {t.latestSession ? (
                          <div className="font-mono text-xs tabular-nums text-slate-600">
                            <span>{t.latestSession.date}</span>{' '}
                            <span className="text-slate-400 text-[11px]">{t.latestSession.time}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* % Load (UF) */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                        {pctLoad !== null ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-semibold text-xs tabular-nums ${
                              pctLoad > 100
                                ? 'text-rose-700 bg-rose-100 border border-rose-300 font-bold'
                                : pctLoad > 80
                                ? 'text-rose-700 bg-rose-50 border border-rose-200/80 font-bold'
                                : pctLoad > 70
                                ? 'text-amber-700 bg-amber-50 border border-amber-200/80 font-semibold'
                                : 'text-emerald-700 bg-emerald-50 border border-emerald-200/80 font-semibold'
                            }`}
                          >
                            {pctLoad.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* % Unbalance */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                        {pctUnb !== null ? (
                          <span
                            className={`font-semibold tabular-nums ${
                              pctUnb > 30
                                ? 'text-rose-600 font-bold'
                                : pctUnb > 20
                                ? 'text-amber-600'
                                : 'text-slate-700'
                            }`}
                          >
                            {pctUnb.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Harmonic Current (A) */}
                      <td className="py-3.5 px-5 text-right font-mono text-xs tabular-nums">
                        {harmonicA !== null ? (
                          isCrypto ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs text-amber-900 bg-amber-100 border border-amber-300/80 tabular-nums shadow-2xs"
                              title="Harmonic แฝงสูง (เสี่ยงการใช้งานผิดปกติ เช่น เครื่องขุดบิตคอยน์)"
                            >
                              <span>{harmonicA.toFixed(1)} A</span>
                              <Zap className="w-3 h-3 text-[#d68910] fill-[#f39c12]" />
                            </span>
                          ) : (
                            <span
                              className={`tabular-nums ${
                                harmonicA > 10
                                  ? 'text-amber-600 font-semibold'
                                  : 'text-slate-600 font-medium'
                              }`}
                            >
                              {harmonicA.toFixed(1)} A
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingTransformer(t)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#741b77] hover:bg-purple-50 transition-colors"
                            title="ดูรายละเอียดหม้อแปลง"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (t.statusColor === 'orange' || t.pendingTask) {
                                handleCancelTask(t.peaNo);
                              } else {
                                handleOrderTask(t.peaNo);
                              }
                            }}
                            disabled={submittingTaskPea === t.peaNo}
                            className={`p-1.5 rounded-lg transition-colors ${
                              t.statusColor === 'orange' || t.pendingTask
                                ? 'text-amber-600 hover:bg-amber-100 bg-amber-50'
                                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                            title={
                              t.statusColor === 'orange' || t.pendingTask
                                ? `สั่งตรวจซ้ำแล้วเมื่อ ${t.pendingTask?.orderDate || ''} (กดเพื่อยกเลิกคำสั่ง)`
                                : 'สั่งตรวจซ้ำ (หมุดบนแผนที่จะเปลี่ยนเป็นสีส้ม)'
                            }
                          >
                            {submittingTaskPea === t.peaNo ? (
                              <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                            ) : (
                              <Flag
                                className={`w-4 h-4 ${
                                  t.statusColor === 'orange' || t.pendingTask ? 'fill-amber-500' : ''
                                }`}
                              />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingPea(t.peaNo)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="ลบข้อมูลหม้อแปลงนี้และรูปภาพใน Google Drive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          ) : (
            <table className="w-full text-left text-xs min-w-[1020px]">
              <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200/80 text-[11px] font-semibold tracking-wider uppercase select-none">
                <tr>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">DATE</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">TIME</th>
                  <th className="py-3.5 px-5 text-left whitespace-nowrap">PEA NO</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">FEEDER</th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap">A</th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap">B</th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap">C</th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap">N (วัด)</th>
                  <th className="py-3.5 px-3 text-right whitespace-nowrap">N (คำนวณ)</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">HARMONIC แฝง</th>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap">หมายเหตุ</th>
                  <th className="py-3.5 px-5 text-left whitespace-nowrap">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="text-center py-16 text-slate-500">
                      <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3 text-[#741b77]" />
                      <p className="font-medium text-slate-700">กำลังดึงข้อมูลโหลดตามฟีดเดอร์จาก Google Sheets...</p>
                      <p className="text-[11px] text-slate-400 mt-1">เชื่อมต่อฐานข้อมูล Record Data</p>
                    </td>
                  </tr>
                ) : detailedSessions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-16 text-slate-500">
                      <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">ไม่พบรายการรอบตรวจวัดที่ตรงกับเงื่อนไขตัวกรอง</p>
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 text-xs font-semibold text-[#741b77] hover:underline"
                      >
                        กดที่นี่เพื่อล้างตัวกรองทั้งหมด
                      </button>
                    </td>
                  </tr>
                ) : (
                  detailedSessions.slice(0, 150).map((item, sIdx) => {
                    const { session, transformer, feeders } = item;
                    const rowSpan = feeders.length;
                    const isAltSession = sIdx % 2 === 1;
                    const sessionBg = isAltSession ? 'bg-slate-50/75' : 'bg-white';
                    const sessionHover = isAltSession ? 'hover:bg-purple-50/50' : 'hover:bg-purple-50/30';

                    return (
                      <React.Fragment key={`${session.peaNo}_${session.date}_${session.time}_${sIdx}`}>
                        {feeders.map((f, fIdx) => {
                          const inCalc = calculateVectorNeutral(f.currentA, f.currentB, f.currentC);
                          const harmonic = f.currentN - inCalc;
                          const statusInfo = computeFeederStatus(
                            f.currentA,
                            f.currentB,
                            f.currentC,
                            transformer.kva,
                            transformer.system as '1' | '3'
                          );
                          const isLastFeeder = fIdx === feeders.length - 1;

                          return (
                            <tr
                              key={`${f.name}_${fIdx}`}
                              className={`${sessionBg} ${sessionHover} transition-colors duration-150 ${
                                isLastFeeder ? 'border-b border-slate-200/80' : 'border-b border-slate-100/70 border-dashed'
                              }`}
                            >
                              {/* DATE (Spans all feeders in session) */}
                              {fIdx === 0 && (
                                <td
                                  rowSpan={rowSpan}
                                  className={`py-3.5 px-3 text-center align-middle font-mono text-xs font-medium text-slate-600 whitespace-nowrap ${sessionBg}`}
                                >
                                  {session.date}
                                </td>
                              )}

                              {/* TIME (Spans all feeders in session) */}
                              {fIdx === 0 && (
                                <td
                                  rowSpan={rowSpan}
                                  className={`py-3.5 px-3 text-center align-middle font-mono text-xs text-slate-400 whitespace-nowrap ${sessionBg}`}
                                >
                                  {session.time}
                                </td>
                              )}

                              {/* PEA NO (Spans all feeders in session) */}
                              {fIdx === 0 && (
                                <td
                                  rowSpan={rowSpan}
                                  className={`py-3.5 px-5 align-middle whitespace-nowrap ${sessionBg}`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => setViewingTransformer(transformer)}
                                    className="flex items-center gap-2.5 text-left group cursor-pointer"
                                    title={`คลิกเพื่อดูประวัติบันทึกข้อมูลโหลด ${session.peaNo}`}
                                  >
                                    <span
                                      className={`w-2 h-2 rounded-full flex-shrink-0 ring-4 ${
                                        transformer.statusColor === 'red'
                                          ? 'bg-rose-500 ring-rose-100'
                                          : transformer.statusColor === 'orange'
                                          ? 'bg-amber-500 ring-amber-100'
                                          : 'bg-emerald-500 ring-emerald-100'
                                      }`}
                                    />
                                    <span className="font-mono text-xs font-semibold tracking-tight text-slate-800 group-hover:text-[#741b77] transition-colors">
                                      {session.peaNo}
                                    </span>
                                  </button>
                                </td>
                              )}

                              {/* FEEDER */}
                              <td className="py-3.5 px-3 text-center whitespace-nowrap">
                                <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px] font-semibold border border-slate-200/60 shadow-2xs">
                                  {f.name}
                                </span>
                              </td>

                              {/* A */}
                              <td className="py-3.5 px-3 text-right font-mono font-semibold text-xs text-rose-600 tabular-nums">
                                {f.currentA.toFixed(2)}
                              </td>

                              {/* B */}
                              <td className="py-3.5 px-3 text-right font-mono font-semibold text-xs text-emerald-600 tabular-nums">
                                {f.currentB.toFixed(2)}
                              </td>

                              {/* C */}
                              <td className="py-3.5 px-3 text-right font-mono font-semibold text-xs text-sky-600 tabular-nums">
                                {f.currentC.toFixed(2)}
                              </td>

                              {/* N (วัด) */}
                              <td className="py-3.5 px-3 text-right font-mono font-semibold text-xs text-slate-800 tabular-nums">
                                {f.currentN.toFixed(2)}
                              </td>

                              {/* N (คำนวณ) */}
                              <td className="py-3.5 px-3 text-right font-mono font-medium text-xs text-slate-400 tabular-nums">
                                {inCalc.toFixed(2)}
                              </td>

                              {/* HARMONIC แฝง */}
                              <td className="py-3.5 px-4 text-right tabular-nums">
                                {harmonic > 15 ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-xs text-amber-900 bg-amber-100 border border-amber-300/80 tabular-nums shadow-2xs"
                                    title="Harmonic แฝงสูง (เสี่ยงการใช้งานผิดปกติ เช่น เครื่องขุดบิตคอยน์)"
                                  >
                                    <span>{harmonic.toFixed(2)}</span>
                                    <Zap className="w-3 h-3 text-[#d68910] fill-[#f39c12]" />
                                  </span>
                                ) : (
                                  <span className="font-mono font-medium text-xs text-slate-600">
                                    {harmonic.toFixed(2)}
                                  </span>
                                )}
                              </td>

                              {/* หมายเหตุ */}
                              <td className="py-3.5 px-3 text-center text-xs text-slate-500 font-sans">
                                {f.note ? (
                                  <span className="text-slate-700 font-medium inline-block max-w-[120px] truncate" title={f.note}>
                                    {f.note}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-sans select-none inline-block">—</span>
                                )}
                              </td>

                              {/* STATUS */}
                              <td className="py-3.5 px-5 text-left whitespace-nowrap">
                                {statusInfo.type === 'critical' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    <span>{statusInfo.text}</span>
                                  </span>
                                ) : statusInfo.type === 'warning' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span>{statusInfo.text}</span>
                                  </span>
                                ) : statusInfo.type === 'normal' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>ปกติ</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-sans select-none">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🌟 TRANSFORMER DETAILS & MEASUREMENT HISTORY MODAL (ประวัติการบันทึกโหลด) 🌟 */}
      {/* ========================================================================= */}
      {viewingTransformer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-[96vw] 2xl:max-w-[1600px] w-full max-h-[94vh] flex flex-col overflow-hidden my-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-[#741b77] border border-purple-100">
                  <History className="w-5 h-5 text-[#741b77]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base md:text-lg font-bold text-slate-900 font-mono">
                      PEA {viewingTransformer.peaNo}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-[#741b77] border border-purple-200">
                      {viewingTransformer.kva} kVA ({viewingTransformer.system} Phase)
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        viewingTransformer.statusColor === 'red'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : viewingTransformer.statusColor === 'orange'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {viewingTransformer.statusColor === 'red' ? 'ยังไม่ตรวจ' : viewingTransformer.statusColor === 'orange' ? 'สั่งตรวจซ้ำ' : 'ตรวจแล้ว'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    {viewingTransformer.brand ? `ยี่ห้อ: ${viewingTransformer.brand} • ` : ''}
                    สถานที่: {viewingTransformer.location || 'ไม่ระบุสถานที่'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* 🚩 สั่งตรวจซ้ำ / ยกเลิกคำสั่งตรวจซ้ำ */}
                {viewingTransformer.statusColor === 'orange' || viewingTransformer.pendingTask ? (
                  <button
                    type="button"
                    onClick={() => handleCancelTask(viewingTransformer.peaNo)}
                    disabled={submittingTaskPea === viewingTransformer.peaNo}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                    title={`สั่งตรวจซ้ำแล้วเมื่อ ${viewingTransformer.pendingTask?.orderDate || ''} (กดเพื่อยกเลิกคำสั่ง)`}
                  >
                    {submittingTaskPea === viewingTransformer.peaNo ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    ) : (
                      <Flag className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    )}
                    <span>สั่งตรวจซ้ำแล้ว</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOrderTask(viewingTransformer.peaNo)}
                    disabled={submittingTaskPea === viewingTransformer.peaNo}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                    title="สั่งงานตรวจวัดโหลดซ้ำ (หมุดบนแผนที่หน้างานจะกลายเป็นสีส้ม)"
                  >
                    {submittingTaskPea === viewingTransformer.peaNo ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <Flag className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>สั่งตรวจซ้ำ</span>
                  </button>
                )}

                <button
                  onClick={() => handleAnalyzeAI(viewingTransformer)}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-[#741b77] text-[#741b77] hover:text-white border border-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                  title="วิเคราะห์ข้อมูลทางวิศวกรรมด้วย Gemini AI"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#f39c12]" />
                  <span>AI วิเคราะห์</span>
                </button>

                {viewingTransformer.lat && viewingTransformer.lng && (
                  <a
                    href={`https://www.google.com/maps?layer=c&cbll=${viewingTransformer.lat},${viewingTransformer.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    title="เปิดดูภาพสถานที่จริงบน Google Street View"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                    <span className="hidden sm:inline">Google Street View</span>
                    <span className="sm:hidden">Street View</span>
                  </a>
                )}

                <button
                  onClick={() => setViewingTransformer(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
              {/* Transformer Spec & Location Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-xs">
                <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-[#741b77] shrink-0 border border-purple-100/60">
                    <Zap className="w-4 h-4 text-[#741b77]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wider block">พิกัดกำลัง / ระบบ</span>
                    <b className="text-slate-800 font-mono text-sm block truncate">{viewingTransformer.kva} kVA <span className="text-xs font-normal text-slate-500">({viewingTransformer.system}P)</span></b>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-100/60">
                    <Activity className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wider block">พิกัดกระแสสูงสุด (Imax)</span>
                    <b className="text-[#741b77] font-mono text-sm block truncate">
                      {viewingTransformer.engineeringStatus ? viewingTransformer.engineeringStatus.iMax.toFixed(1) : (viewingTransformer.kva * 1000 / (Math.sqrt(3) * 400)).toFixed(1)} A
                    </b>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100/60">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wider block">จำนวนรอบบันทึก</span>
                    <b className="text-slate-800 text-sm block truncate">
                      {viewingTransformer.historySessions?.length || (viewingTransformer.latestSession ? 1 : 0)} รอบตรวจวัด
                    </b>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-100 shadow-2xs">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100/60">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wider block">พิกัด GPS</span>
                    {viewingTransformer.lat && viewingTransformer.lng ? (
                      <a
                        href={`https://www.google.com/maps?q=${viewingTransformer.lat},${viewingTransformer.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 font-mono text-sm font-semibold truncate"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Google Maps</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* History Records Timeline Section */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-100/80 flex items-center justify-center text-[#741b77]">
                      <Activity className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">
                      ประวัติบันทึกข้อมูลโหลด
                    </h4>
                    {viewingTransformer.historySessions && viewingTransformer.historySessions.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-[#741b77] border border-purple-200/80 font-mono">
                        {viewingTransformer.historySessions.length} รอบตรวจวัด
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-medium hidden sm:flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                    <span>เรียงจากรอบล่าสุดไปรอบแรกสุด</span>
                  </span>
                </div>

                {/* Save Feedback Alerts */}
                {saveSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-xl text-emerald-800 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{saveSuccessMsg}</span>
                    </div>
                    <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {saveErrorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200/90 rounded-xl text-rose-800 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{saveErrorMsg}</span>
                    </div>
                    <button onClick={() => setSaveErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {deleteSessionSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-xl text-emerald-800 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{deleteSessionSuccessMsg}</span>
                    </div>
                    <button onClick={() => setDeleteSessionSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {taskSuccessMsg && (
                  <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-xl text-amber-900 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2 font-medium">
                      <Flag className="w-4 h-4 text-amber-600 shrink-0 fill-amber-500" />
                      <span>{taskSuccessMsg}</span>
                    </div>
                    <button onClick={() => setTaskSuccessMsg(null)} className="text-amber-500 hover:text-amber-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {taskErrorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200/90 rounded-xl text-rose-800 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{taskErrorMsg}</span>
                    </div>
                    <button onClick={() => setTaskErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {(!viewingTransformer.historySessions || viewingTransformer.historySessions.length === 0) && !viewingTransformer.latestSession ? (
                  <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <Info className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-semibold text-slate-700 text-sm">ยังไม่มีประวัติการบันทึกผลการวัดโหลดสำหรับหม้อแปลงเครื่องนี้</p>
                    <p className="text-xs text-slate-400">ช่างไฟฟ้าสามารถเข้าตรวจวัดและบันทึกโหลดผ่านหน้างาน (Field PWA) ได้ทันที</p>
                    <div className="pt-2">
                      <Link
                        href="/field"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#741b77] text-white text-xs font-semibold hover:bg-[#58145a] transition-all"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[#f39c12]" />
                        <span>ไปที่หน้าบันทึกโหลดภาคสนาม</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden bg-white">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      <table className="w-full text-left text-xs border-collapse min-w-[1420px]">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs font-semibold select-none">
                          <tr className="border-b border-slate-200/80">
                            <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200 whitespace-nowrap bg-slate-100/70 text-slate-700 font-semibold w-[85px]">
                              <div className="flex items-center justify-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>วันที่</span>
                              </div>
                            </th>
                            <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-200 whitespace-nowrap bg-slate-100/70 text-slate-700 font-semibold w-[72px]">
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>เวลา</span>
                              </div>
                            </th>
                            <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-200 whitespace-nowrap bg-slate-100/70 text-slate-700 font-semibold w-[52px]">
                              <div className="flex items-center justify-center gap-1">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <span>ฟีดเดอร์</span>
                              </div>
                            </th>
                            <th colSpan={6} className="py-2 px-2 text-center border-r border-slate-200 bg-sky-50 text-sky-900 font-bold tracking-tight text-[11px]">
                              แรงดันใต้หม้อแปลง (V)
                            </th>
                            <th colSpan={6} className="py-2 px-2 text-center border-r border-slate-200 bg-slate-100/80 text-slate-700 font-bold tracking-tight text-[11px]">
                              แรงดันปลายสาย (V)
                            </th>
                            <th colSpan={4} className="py-2 px-2 text-center border-r border-slate-200 bg-purple-50 text-[#741b77] font-bold tracking-tight text-[11px]">
                              กระแสไฟฟ้า (A)
                            </th>
                            <th rowSpan={2} className="py-2.5 px-2.5 text-right border-r border-slate-200 whitespace-nowrap bg-slate-100/70 text-slate-700 font-semibold w-[68px]">
                              นิวตรอล<br /><span className="text-[10px] text-slate-400 font-normal">คำนวณ (A)</span>
                            </th>
                            <th rowSpan={2} className="py-2.5 px-2.5 text-right border-r border-slate-200 whitespace-nowrap bg-slate-100/70 text-slate-700 font-semibold w-[74px]">
                              HARMONIC<br /><span className="text-[10px] text-slate-400 font-normal">แฝง (A)</span>
                            </th>
                            <th rowSpan={2} className="py-2.5 px-2.5 text-right border-r border-slate-200 whitespace-nowrap bg-slate-100/70 text-slate-700 font-semibold w-[66px]">
                              โหลด<br /><span className="text-[10px] text-slate-400 font-normal">(kVA)</span>
                            </th>
                            <th rowSpan={2} className="py-2.5 px-2.5 text-right border-r border-slate-200 whitespace-nowrap bg-slate-100/70 text-slate-700 font-semibold w-[68px]">
                              %UF
                            </th>
                            <th rowSpan={2} className="py-2.5 px-2.5 text-right border-r border-slate-200 whitespace-nowrap bg-slate-100/70 text-slate-700 font-semibold w-[68px]">
                              %Unb
                            </th>
                            <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200 whitespace-nowrap bg-slate-100/70 text-slate-700 font-semibold min-w-[100px]">
                              <div className="flex items-center justify-center gap-1">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                <span>หมายเหตุ</span>
                              </div>
                            </th>
                            <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200 whitespace-nowrap bg-slate-100/70 text-slate-700 font-semibold min-w-[190px]">
                              <div className="flex items-center justify-center gap-1">
                                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                                <span>รูปถ่าย</span>
                              </div>
                            </th>
                            <th rowSpan={2} className="py-2.5 px-3 text-center whitespace-nowrap bg-slate-100 text-slate-700 font-semibold w-[85px] sticky right-0 z-20 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200">
                              <div className="flex items-center justify-center gap-1">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                                <span>จัดการ</span>
                              </div>
                            </th>
                          </tr>
                          <tr className="bg-slate-50/70 text-[11px] font-semibold border-b border-slate-200 text-center">
                            {/* แรงดันใต้หม้อแปลง */}
                            <th className="py-1 px-1.5 border-r border-slate-200 text-sky-700 font-mono text-[10.5px] font-bold whitespace-nowrap bg-sky-50/40">A-B</th>
                            <th className="py-1 px-1.5 border-r border-slate-200 text-sky-700 font-mono text-[10.5px] font-bold whitespace-nowrap bg-sky-50/40">B-C</th>
                            <th className="py-1 px-1.5 border-r border-slate-200 text-sky-700 font-mono text-[10.5px] font-bold whitespace-nowrap bg-sky-50/40">C-A</th>
                            <th className="py-1 px-1.5 border-r border-slate-200 text-slate-500 font-mono text-[10.5px] font-medium whitespace-nowrap bg-slate-50">A-N</th>
                            <th className="py-1 px-1.5 border-r border-slate-200 text-slate-500 font-mono text-[10.5px] font-medium whitespace-nowrap bg-slate-50">B-N</th>
                            <th className="py-1 px-1.5 border-r border-slate-200 text-slate-500 font-mono text-[10.5px] font-medium whitespace-nowrap bg-slate-50">C-N</th>
                            {/* แรงดันปลายสาย */}
                            <th className="py-1 px-1.5 border-r border-slate-200 text-sky-700 font-mono text-[10.5px] font-bold whitespace-nowrap bg-slate-100/50">A-B</th>
                            <th className="py-1 px-1.5 border-r border-slate-200 text-sky-700 font-mono text-[10.5px] font-bold whitespace-nowrap bg-slate-100/50">B-C</th>
                            <th className="py-1 px-1.5 border-r border-slate-200 text-sky-700 font-mono text-[10.5px] font-bold whitespace-nowrap bg-slate-100/50">C-A</th>
                            <th className="py-1 px-1.5 border-r border-slate-200 text-slate-500 font-mono text-[10.5px] font-medium whitespace-nowrap bg-slate-50">A-N</th>
                            <th className="py-1 px-1.5 border-r border-slate-200 text-slate-500 font-mono text-[10.5px] font-medium whitespace-nowrap bg-slate-50">B-N</th>
                            <th className="py-1 px-1.5 border-r border-slate-200 text-slate-500 font-mono text-[10.5px] font-medium whitespace-nowrap bg-slate-50">C-N</th>
                            {/* กระแสไฟฟ้า */}
                            <th className="py-1 px-2 border-r border-slate-200 text-right text-rose-600 font-bold whitespace-nowrap bg-rose-50/50">A</th>
                            <th className="py-1 px-2 border-r border-slate-200 text-right text-emerald-600 font-bold whitespace-nowrap bg-emerald-50/50">B</th>
                            <th className="py-1 px-2 border-r border-slate-200 text-right text-blue-600 font-bold whitespace-nowrap bg-blue-50/50">C</th>
                            <th className="py-1 px-2 border-r border-slate-200 text-right text-slate-700 font-bold whitespace-nowrap bg-slate-100/80">N</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-xs">
                          {(
                            viewingTransformer.historySessions && viewingTransformer.historySessions.length > 0
                              ? viewingTransformer.historySessions
                              : viewingTransformer.latestSession ? [viewingTransformer.latestSession] : []
                          ).map((session, sIdx, allSessions) => {
                            const tKva = viewingTransformer.kva > 0 ? viewingTransformer.kva : 100;
                            const sessionNum = allSessions.length - sIdx;
                            const sessionKey = `${session.date}_${session.time}`;
                            const isEditingThisSession = editingSessionKey === sessionKey;

                            // Calculate Session Total Values
                            const totIa = isEditingThisSession
                              ? editFeeders.reduce((sum, ef) => sum + safeFloat(ef.currentA), 0)
                              : safeFloat(session.total.currentA);
                            const totIb = isEditingThisSession
                              ? editFeeders.reduce((sum, ef) => sum + safeFloat(ef.currentB), 0)
                              : safeFloat(session.total.currentB);
                            const totIc = isEditingThisSession
                              ? editFeeders.reduce((sum, ef) => sum + safeFloat(ef.currentC), 0)
                              : safeFloat(session.total.currentC);
                            const totIn = isEditingThisSession
                              ? editFeeders.reduce((sum, ef) => sum + safeFloat(ef.currentN), 0)
                              : safeFloat(session.total.currentN);
                            const totInCalc = calculateVectorNeutral(totIa, totIb, totIc);
                            const totHarmonic = totIn - totInCalc;

                            const firstEf = isEditingThisSession && editFeeders.length > 0 ? editFeeders[0] : null;
                            const totVan = firstEf ? (safeFloat(firstEf.vt_an) > 0 ? safeFloat(firstEf.vt_an) : 230) : (session.total.vt_an > 0 ? session.total.vt_an : 230);
                            const totVbn = firstEf ? (safeFloat(firstEf.vt_bn) > 0 ? safeFloat(firstEf.vt_bn) : 230) : (session.total.vt_bn > 0 ? session.total.vt_bn : 230);
                            const totVcn = firstEf ? (safeFloat(firstEf.vt_cn) > 0 ? safeFloat(firstEf.vt_cn) : 230) : (session.total.vt_cn > 0 ? session.total.vt_cn : 230);
                            const totKva = (totIa * totVan + totIb * totVbn + totIc * totVcn) / 1000;
                            const totUf = tKva > 0 ? (totKva / tKva) * 100 : 0;
                            const totAvgI = (totIa + totIb + totIc) / 3;
                            const totMaxDev = totAvgI > 0 ? Math.max(Math.abs(totIa - totAvgI), Math.abs(totIb - totAvgI), Math.abs(totIc - totAvgI)) : 0;
                            const totUnb = totAvgI > 0 ? (totMaxDev / totAvgI) * 100 : 0;

                            const sessionRowSpan = session.feeders.length + 1;

                            return (
                              <React.Fragment key={`${session.date}_${session.time}_${sIdx}`}>
                                {/* Per-Feeder Rows */}
                                {session.feeders.map((f, fIdx) => {
                                  const ef = isEditingThisSession && editFeeders[fIdx] ? editFeeders[fIdx] : null;
                                  const ia = ef ? safeFloat(ef.currentA) : safeFloat(f.currentA);
                                  const ib = ef ? safeFloat(ef.currentB) : safeFloat(f.currentB);
                                  const ic = ef ? safeFloat(ef.currentC) : safeFloat(f.currentC);
                                  const inVal = ef ? safeFloat(ef.currentN) : safeFloat(f.currentN);
                                  const inCalc = calculateVectorNeutral(ia, ib, ic);
                                  const harmonic = inVal - inCalc;
                                  const van = ef ? (safeFloat(ef.vt_an) > 0 ? safeFloat(ef.vt_an) : 230) : (f.vt_an > 0 ? f.vt_an : 230);
                                  const vbn = ef ? (safeFloat(ef.vt_bn) > 0 ? safeFloat(ef.vt_bn) : 230) : (f.vt_bn > 0 ? f.vt_bn : 230);
                                  const vcn = ef ? (safeFloat(ef.vt_cn) > 0 ? safeFloat(ef.vt_cn) : 230) : (f.vt_cn > 0 ? f.vt_cn : 230);
                                  const fKva = (ia * van + ib * vbn + ic * vcn) / 1000;
                                  const fUf = tKva > 0 ? (fKva / tKva) * 100 : 0;
                                  const avgI = (ia + ib + ic) / 3;
                                  const maxDev = avgI > 0 ? Math.max(Math.abs(ia - avgI), Math.abs(ib - avgI), Math.abs(ic - avgI)) : 0;
                                  const fUnb = avgI > 0 ? (maxDev / avgI) * 100 : 0;

                                  return (
                                    <tr
                                      key={f.name}
                                      className={`transition-colors ${
                                        isEditingThisSession
                                          ? 'bg-amber-50/40 ring-1 ring-amber-300/70'
                                          : 'hover:bg-slate-50/80'
                                      }`}
                                    >
                                      <td className="py-2.5 px-3 text-center border-r border-slate-100 font-mono text-xs text-slate-800 whitespace-nowrap">
                                        {session.date}
                                      </td>
                                      <td className="py-2.5 px-2.5 text-center border-r border-slate-100 font-mono text-xs text-slate-500 whitespace-nowrap">
                                        {session.time}
                                      </td>
                                      <td className="py-2.5 px-2.5 text-center border-r border-slate-100 whitespace-nowrap">
                                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold font-mono text-[11px] border border-slate-200/80">
                                          {f.name}
                                        </span>
                                      </td>

                                      {/* แรงดันใต้หม้อแปลง (V) */}
                                      {isEditingThisSession && ef ? (
                                        <>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              value={ef.vt_ab}
                                              onChange={e => updateDraftFeeder(fIdx, 'vt_ab', e.target.value)}
                                              className="w-12 px-1 py-0.5 text-right font-mono text-[11px] text-sky-800 bg-white border border-sky-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                                              placeholder="—"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              value={ef.vt_bc}
                                              onChange={e => updateDraftFeeder(fIdx, 'vt_bc', e.target.value)}
                                              className="w-12 px-1 py-0.5 text-right font-mono text-[11px] text-sky-800 bg-white border border-sky-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                                              placeholder="—"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              value={ef.vt_ca}
                                              onChange={e => updateDraftFeeder(fIdx, 'vt_ca', e.target.value)}
                                              className="w-12 px-1 py-0.5 text-right font-mono text-[11px] text-sky-800 bg-white border border-sky-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                                              placeholder="—"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              value={ef.vt_an}
                                              onChange={e => updateDraftFeeder(fIdx, 'vt_an', e.target.value)}
                                              className="w-12 px-1 py-0.5 text-right font-mono text-[11px] text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-2xs"
                                              placeholder="—"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              value={ef.vt_bn}
                                              onChange={e => updateDraftFeeder(fIdx, 'vt_bn', e.target.value)}
                                              className="w-12 px-1 py-0.5 text-right font-mono text-[11px] text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-2xs"
                                              placeholder="—"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              value={ef.vt_cn}
                                              onChange={e => updateDraftFeeder(fIdx, 'vt_cn', e.target.value)}
                                              className="w-12 px-1 py-0.5 text-right font-mono text-[11px] text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-2xs"
                                              placeholder="—"
                                            />
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="py-2 px-1.5 text-right border-r border-slate-100 text-sky-700 text-[11px] font-mono tabular-nums">
                                            {f.vt_ab ? f.vt_ab.toFixed(0) : <span className="text-slate-300 font-sans select-none">—</span>}
                                          </td>
                                          <td className="py-2 px-1.5 text-right border-r border-slate-100 text-sky-700 text-[11px] font-mono tabular-nums">
                                            {f.vt_bc ? f.vt_bc.toFixed(0) : <span className="text-slate-300 font-sans select-none">—</span>}
                                          </td>
                                          <td className="py-2 px-1.5 text-right border-r border-slate-100 text-sky-700 text-[11px] font-mono tabular-nums">
                                            {f.vt_ca ? f.vt_ca.toFixed(0) : <span className="text-slate-300 font-sans select-none">—</span>}
                                          </td>
                                          <td className="py-2 px-1.5 text-right border-r border-slate-100 text-slate-500 text-[11px] font-mono tabular-nums">
                                            {f.vt_an ? f.vt_an.toFixed(0) : <span className="text-slate-300 font-sans select-none">—</span>}
                                          </td>
                                          <td className="py-2 px-1.5 text-right border-r border-slate-100 text-slate-500 text-[11px] font-mono tabular-nums">
                                            {f.vt_bn ? f.vt_bn.toFixed(0) : <span className="text-slate-300 font-sans select-none">—</span>}
                                          </td>
                                          <td className="py-2 px-1.5 text-right border-r border-slate-100 text-slate-500 text-[11px] font-mono tabular-nums">
                                            {f.vt_cn ? f.vt_cn.toFixed(0) : <span className="text-slate-300 font-sans select-none">—</span>}
                                          </td>
                                        </>
                                      )}

                                      {/* แรงดันปลายสาย (V) */}
                                      {isEditingThisSession && ef ? (
                                        <>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              value={ef.ve_ab}
                                              onChange={e => updateDraftFeeder(fIdx, 've_ab', e.target.value)}
                                              className="w-12 px-1 py-0.5 text-right font-mono text-[11px] text-sky-800 bg-white border border-sky-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                                              placeholder="—"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              value={ef.ve_bc}
                                              onChange={e => updateDraftFeeder(fIdx, 've_bc', e.target.value)}
                                              className="w-12 px-1 py-0.5 text-right font-mono text-[11px] text-sky-800 bg-white border border-sky-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                                              placeholder="—"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              value={ef.ve_ca}
                                              onChange={e => updateDraftFeeder(fIdx, 've_ca', e.target.value)}
                                              className="w-12 px-1 py-0.5 text-right font-mono text-[11px] text-sky-800 bg-white border border-sky-300 rounded focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                                              placeholder="—"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              value={ef.ve_an}
                                              onChange={e => updateDraftFeeder(fIdx, 've_an', e.target.value)}
                                              className="w-12 px-1 py-0.5 text-right font-mono text-[11px] text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-2xs"
                                              placeholder="—"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              value={ef.ve_bn}
                                              onChange={e => updateDraftFeeder(fIdx, 've_bn', e.target.value)}
                                              className="w-12 px-1 py-0.5 text-right font-mono text-[11px] text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-2xs"
                                              placeholder="—"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              value={ef.ve_cn}
                                              onChange={e => updateDraftFeeder(fIdx, 've_cn', e.target.value)}
                                              className="w-12 px-1 py-0.5 text-right font-mono text-[11px] text-slate-800 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-2xs"
                                              placeholder="—"
                                            />
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="py-2 px-1.5 text-right border-r border-slate-100 text-sky-700 text-[11px] font-mono tabular-nums">
                                            {f.ve_ab ? f.ve_ab.toFixed(0) : <span className="text-slate-300 font-sans select-none">—</span>}
                                          </td>
                                          <td className="py-2 px-1.5 text-right border-r border-slate-100 text-sky-700 text-[11px] font-mono tabular-nums">
                                            {f.ve_bc ? f.ve_bc.toFixed(0) : <span className="text-slate-300 font-sans select-none">—</span>}
                                          </td>
                                          <td className="py-2 px-1.5 text-right border-r border-slate-100 text-sky-700 text-[11px] font-mono tabular-nums">
                                            {f.ve_ca ? f.ve_ca.toFixed(0) : <span className="text-slate-300 font-sans select-none">—</span>}
                                          </td>
                                          <td className="py-2 px-1.5 text-right border-r border-slate-100 text-slate-500 text-[11px] font-mono tabular-nums">
                                            {f.ve_an ? f.ve_an.toFixed(0) : <span className="text-slate-300 font-sans select-none">—</span>}
                                          </td>
                                          <td className="py-2 px-1.5 text-right border-r border-slate-100 text-slate-500 text-[11px] font-mono tabular-nums">
                                            {f.ve_bn ? f.ve_bn.toFixed(0) : <span className="text-slate-300 font-sans select-none">—</span>}
                                          </td>
                                          <td className="py-2 px-1.5 text-right border-r border-slate-100 text-slate-500 text-[11px] font-mono tabular-nums">
                                            {f.ve_cn ? f.ve_cn.toFixed(0) : <span className="text-slate-300 font-sans select-none">—</span>}
                                          </td>
                                        </>
                                      )}

                                      {/* กระแสไฟฟ้า (A) */}
                                      {isEditingThisSession && ef ? (
                                        <>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              step="0.1"
                                              value={ef.currentA}
                                              onChange={e => updateDraftFeeder(fIdx, 'currentA', e.target.value)}
                                              className="w-14 px-1 py-0.5 text-right font-mono text-xs font-bold text-rose-600 bg-rose-50/70 border border-rose-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 shadow-2xs"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              step="0.1"
                                              value={ef.currentB}
                                              onChange={e => updateDraftFeeder(fIdx, 'currentB', e.target.value)}
                                              className="w-14 px-1 py-0.5 text-right font-mono text-xs font-bold text-emerald-600 bg-emerald-50/70 border border-emerald-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              step="0.1"
                                              value={ef.currentC}
                                              onChange={e => updateDraftFeeder(fIdx, 'currentC', e.target.value)}
                                              className="w-14 px-1 py-0.5 text-right font-mono text-xs font-bold text-blue-600 bg-blue-50/70 border border-blue-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                                            />
                                          </td>
                                          <td className="py-1 px-1 text-right border-r border-slate-100">
                                            <input
                                              type="number"
                                              step="0.1"
                                              value={ef.currentN}
                                              onChange={e => updateDraftFeeder(fIdx, 'currentN', e.target.value)}
                                              className="w-14 px-1 py-0.5 text-right font-mono text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500 shadow-2xs"
                                            />
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="py-2 px-2 text-right border-r border-slate-100 text-rose-600 font-bold tabular-nums">
                                            {ia.toFixed(1)}
                                          </td>
                                          <td className="py-2 px-2 text-right border-r border-slate-100 text-emerald-600 font-bold tabular-nums">
                                            {ib.toFixed(1)}
                                          </td>
                                          <td className="py-2 px-2 text-right border-r border-slate-100 text-blue-600 font-bold tabular-nums">
                                            {ic.toFixed(1)}
                                          </td>
                                          <td className="py-2 px-2 text-right border-r border-slate-100 text-slate-700 font-semibold tabular-nums">
                                            {inVal.toFixed(1)}
                                          </td>
                                        </>
                                      )}

                                      {/* นิวตรอลคำนวณ */}
                                      <td className="py-2 px-2.5 text-right border-r border-slate-100 text-slate-600 tabular-nums">
                                        {inCalc.toFixed(2)}
                                      </td>

                                      {/* Harmonic แฝง */}
                                      <td className={`py-2 px-2.5 text-right border-r border-slate-100 tabular-nums ${harmonic > 15 ? 'text-rose-600 font-bold bg-rose-50/60' : harmonic > 0 ? 'text-rose-500 font-semibold' : 'text-slate-400'}`}>
                                        {harmonic.toFixed(2)}
                                      </td>

                                      {/* โหลด kVA */}
                                      <td className="py-2 px-2.5 text-right border-r border-slate-100 font-bold text-slate-800 tabular-nums">
                                        {fKva.toFixed(2)}
                                      </td>

                                      {/* %UF */}
                                      <td className="py-2 px-2.5 text-right border-r border-slate-100 font-semibold text-slate-900 tabular-nums">
                                        {fUf.toFixed(2)}%
                                      </td>

                                      {/* %Unb */}
                                      <td className="py-2 px-2.5 text-right border-r border-slate-100 font-semibold text-slate-900 tabular-nums">
                                        {fUnb.toFixed(2)}%
                                      </td>

                                      {/* หมายเหตุ */}
                                      <td className="py-2 px-2 text-center border-r border-slate-100 text-[11px] text-slate-500 font-sans">
                                        {isEditingThisSession && ef ? (
                                          <input
                                            type="text"
                                            value={ef.note}
                                            onChange={e => updateDraftFeeder(fIdx, 'note', e.target.value)}
                                            className="w-24 px-1.5 py-0.5 text-[11px] text-slate-700 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-2xs text-center"
                                            placeholder="หมายเหตุ"
                                          />
                                        ) : (
                                          f.note ? (
                                            <span className="text-slate-600 font-medium">{f.note}</span>
                                          ) : (
                                            <span className="text-slate-300 font-sans select-none">—</span>
                                          )
                                        )}
                                      </td>

                                      {/* รูปถ่าย (Spans all rows in this session) */}
                                      {fIdx === 0 && (
                                        <td
                                          rowSpan={sessionRowSpan}
                                          className="py-2 px-2.5 text-center border-r border-slate-200 align-middle bg-white"
                                        >
                                          {session.imageUrls && session.imageUrls.length > 0 ? (
                                            <div className="flex items-center justify-center gap-2 flex-nowrap">
                                              {session.imageUrls.map((url, imgIdx) => (
                                                <a
                                                  key={`${url}_${imgIdx}`}
                                                  href={url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="group relative inline-block w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:border-[#741b77] transition-all shadow-2xs hover:shadow-md shrink-0"
                                                  title={`คลิกเพื่อดูรูปภาพที่ ${imgIdx + 1} ขนาดเต็ม`}
                                                >
                                                  <img
                                                    src={getDriveThumbnailUrl(url, 400)}
                                                    alt={`รูปถ่ายที่ ${imgIdx + 1} รอบที่ ${sessionNum}`}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                    referrerPolicy="no-referrer"
                                                    onError={e => {
                                                      const match = url.match(/(?:\/d\/|id=)([-\w]{25,})/);
                                                      const target = e.currentTarget;
                                                      if (match && target.src.includes('/api/drive-image')) {
                                                        target.src = `https://lh3.googleusercontent.com/d/${match[1]}`;
                                                      }
                                                    }}
                                                  />
                                                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px]">
                                                    <ExternalLink className="w-4 h-4 drop-shadow" />
                                                  </div>
                                                </a>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-50 text-slate-300 text-xs border border-dashed border-slate-200 select-none" title="ไม่มีรูปถ่าย">
                                              —
                                            </span>
                                          )}
                                        </td>
                                      )}

                                      {/* จัดการ (Spans all rows in this session) */}
                                      {fIdx === 0 && (
                                        <td
                                          rowSpan={sessionRowSpan}
                                          className="py-2 px-2 text-center align-middle bg-white sticky right-0 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-slate-200"
                                        >
                                          {isEditingThisSession ? (
                                            <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
                                              <button
                                                onClick={() => handleSaveEdit(session)}
                                                disabled={savingEdit}
                                                className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs hover:shadow-xs transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                                                title="บันทึกข้อมูลโหลดลง Google Sheets"
                                              >
                                                {savingEdit ? (
                                                  <>
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    <span>บันทึก...</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Save className="w-3.5 h-3.5" />
                                                    <span>บันทึก</span>
                                                  </>
                                                )}
                                              </button>
                                              <button
                                                onClick={handleCancelEdit}
                                                disabled={savingEdit}
                                                className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                                                title="ยกเลิกการแก้ไข"
                                              >
                                                <X className="w-3 h-3" />
                                                <span>ยกเลิก</span>
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
                                              <button
                                                onClick={() => handleStartEdit(session)}
                                                className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-purple-50 hover:bg-[#741b77] text-[#741b77] hover:text-white border border-purple-200/90 hover:border-[#741b77] text-xs font-semibold shadow-2xs hover:shadow-xs transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                title="แก้ไขข้อมูลโหลดในตารางนี้ทันที"
                                              >
                                                <FileEdit className="w-3.5 h-3.5" />
                                                <span>แก้ไข</span>
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setDeletingSession({
                                                    peaNo: viewingTransformer.peaNo,
                                                    date: session.date,
                                                    time: session.time,
                                                    sessionNum,
                                                    imageUrls: session.imageUrls,
                                                  })
                                                }
                                                className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200/90 hover:border-rose-600 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                title="ลบข้อมูลรอบตรวจวัดนี้และรูปภาพใน Google Drive"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>ลบ</span>
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}

                                {/* Session Highlighted Total Row (Minimalist Compact Design) */}
                                <tr className="bg-slate-50/20 hover:bg-purple-50/20 transition-colors font-bold border-y border-purple-200/70 h-9">
                                  <td
                                    colSpan={15}
                                    className="py-1 px-3 text-right border-r border-purple-200/70 bg-white font-sans"
                                  >
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50/90 hover:bg-purple-100/80 border border-purple-200/80 text-[#741b77] font-bold text-xs tracking-tight shadow-2xs transition-colors">
                                      <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                                      <span>สรุปผลรวมหม้อแปลง รอบที่ {sessionNum}</span>
                                      <ChevronRight className="w-3 h-3 text-purple-400" />
                                    </div>
                                  </td>

                                  {/* Currents */}
                                  <td className="py-1 px-2 text-right border-r border-purple-200/70 text-rose-600 font-extrabold tabular-nums bg-purple-50/30">
                                    {totIa.toFixed(1)}
                                  </td>
                                  <td className="py-1 px-2 text-right border-r border-purple-200/70 text-emerald-600 font-extrabold tabular-nums bg-purple-50/30">
                                    {totIb.toFixed(1)}
                                  </td>
                                  <td className="py-1 px-2 text-right border-r border-purple-200/70 text-blue-600 font-extrabold tabular-nums bg-purple-50/30">
                                    {totIc.toFixed(1)}
                                  </td>
                                  <td className="py-1 px-2 text-right border-r border-purple-200/70 text-slate-800 font-extrabold tabular-nums bg-purple-50/30">
                                    {totIn.toFixed(1)}
                                  </td>

                                  {/* นิวตรอลคำนวณ */}
                                  <td className="py-1 px-2.5 text-right border-r border-purple-200/70 text-slate-700 font-bold tabular-nums bg-purple-50/30">
                                    {totInCalc.toFixed(2)}
                                  </td>

                                  {/* Harmonic แฝง */}
                                  <td className="py-1 px-2.5 text-right border-r border-purple-200/70 tabular-nums bg-purple-50/30">
                                    {totHarmonic > 15 ? (
                                      <span className="inline-block px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs">
                                        {totHarmonic.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-rose-600 font-bold text-xs">
                                        {totHarmonic.toFixed(2)}
                                      </span>
                                    )}
                                  </td>

                                  {/* โหลด kVA */}
                                  <td className="py-1 px-2.5 text-right border-r border-purple-200/70 font-extrabold text-slate-900 tabular-nums bg-purple-50/30">
                                    {totKva.toFixed(2)}
                                  </td>

                                  {/* %UF */}
                                  <td className="py-1 px-2.5 text-right border-r border-purple-200/70 tabular-nums bg-purple-50/30">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold font-mono border ${
                                        totUf >= 100
                                          ? 'bg-rose-200 text-rose-900 border-rose-400 font-bold'
                                          : totUf >= 80
                                          ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                                          : totUf >= 70
                                          ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold'
                                          : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
                                      }`}
                                    >
                                      {totUf.toFixed(2)}%
                                    </span>
                                  </td>

                                  {/* %Unb */}
                                  <td className="py-1 px-2.5 text-right border-r border-purple-200/70 tabular-nums bg-purple-50/30">
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold font-mono border ${
                                        totUnb >= 25
                                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                                          : totUnb >= 15
                                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                                          : 'bg-slate-100 text-slate-700 border-slate-200'
                                      }`}
                                    >
                                      {totUnb.toFixed(2)}%
                                    </span>
                                  </td>

                                  {/* หมายเหตุ */}
                                  <td className="py-1 px-2 text-center border-r border-purple-200/70 text-slate-300 font-sans select-none bg-purple-50/30">
                                    —
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>แหล่งข้อมูล: Google Sheets (Record Data)</span>
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeletingPea(viewingTransformer.peaNo)}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 active:scale-95 shadow-2xs"
                  title="ลบข้อมูลหม้อแปลงนี้และรูปภาพทั้งหมดใน Google Drive"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>ลบข้อมูลหม้อแปลงนี้</span>
                </button>
                <button
                  onClick={() => setViewingTransformer(null)}
                  className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-all duration-150 active:scale-95 shadow-2xs"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌟 GEMINI AI ANALYSIS MODAL DIALOG 🌟 */}
      {/* ========================================================================= */}
      {selectedAiTransformer && (
        <AiReportViewer
          report={aiReport}
          transformer={selectedAiTransformer}
          loading={aiLoading}
          onReanalyze={() => handleAnalyzeAI(selectedAiTransformer, true)}
          onClose={() => setSelectedAiTransformer(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* 🌟 REGISTER NEW TRANSFORMER MODAL DIALOG 🌟 */}
      {/* ========================================================================= */}
      <RegisterTransformerModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={async (newPeaNo) => {
          await fetchTransformers();
        }}
        existingTransformers={transformers}
      />

      {/* ========================================================================= */}
      {/* ⚠️ CONFIRM DELETE TRANSFORMER MODAL DIALOG ⚠️ */}
      {/* ========================================================================= */}
      {deletingPea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Dialog Header */}
            <div className="px-6 py-5 bg-rose-50/70 border-b border-rose-100 flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200/80">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบข้อมูลหม้อแปลง
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ระบบจะทำการลบข้อมูลทั้งหมดที่เกี่ยวข้องอย่างถาวร
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) {
                    setDeletingPea(null);
                    setDeleteError(null);
                  }
                }}
                disabled={isDeleting}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors disabled:opacity-50"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-6 space-y-4 text-xs text-slate-600">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <span className="text-slate-500 font-medium">รหัสหม้อแปลงที่ต้องการลบ:</span>
                <span className="font-mono font-bold text-sm text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                  PEA {deletingPea}
                </span>
              </div>

              <div className="space-y-2 p-4 bg-rose-50/60 rounded-2xl border border-rose-100/90 text-rose-950">
                <p className="font-bold flex items-center gap-1.5 text-rose-800">
                  <Flame className="w-4 h-4 text-rose-600" />
                  รายการข้อมูลที่จะถูกลบถาวร:
                </p>
                <ul className="space-y-1.5 pl-5 list-disc text-rose-800/90 text-[11.5px] leading-relaxed">
                  <li>ข้อมูลหม้อแปลงจากฐานข้อมูลหลัก (<strong>MasterData</strong>)</li>
                  <li>ประวัติบันทึกผลการวัดโหลดและแท็ปทั้งหมด (<strong>Record Data</strong>)</li>
                  <li>รายการสั่งงานตรวจซ้ำ (<strong>Task Data</strong>)</li>
                  <li>ผลการวิเคราะห์ทางวิศวกรรมด้วย AI (<strong>AI Reports</strong>)</li>
                  <li>
                    <strong className="text-rose-900 underline decoration-rose-400 underline-offset-2">รูปถ่ายทั้งหมดของหม้อแปลงนี้ใน Google Drive จะถูกลบออก</strong>
                  </li>
                </ul>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                ⚠️ คำเตือน: การกระทำนี้ไม่สามารถย้อนกลับได้ (Irreversible) โปรดตรวจสอบรหัสหม้อแปลงให้ถูกต้องก่อนดำเนินการ
              </p>

              {deleteError && (
                <div className="p-3.5 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-900 text-xs">
                  <p className="font-bold">เกิดข้อผิดพลาดในการลบ:</p>
                  <p className="mt-0.5 text-rose-800">{deleteError}</p>
                </div>
              )}
            </div>

            {/* Dialog Actions */}
            <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingPea(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 shadow-2xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteTransformer(deletingPea)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>กำลังลบข้อมูลและรูปใน Drive...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>ยืนยันการลบข้อมูล (ถาวร)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚠️ CONFIRM DELETE MEASUREMENT SESSION MODAL DIALOG ⚠️ */}
      {/* ========================================================================= */}
      {deletingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Dialog Header */}
            <div className="px-6 py-5 bg-rose-50/70 border-b border-rose-100 flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 border border-rose-200/80">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบข้อมูลรอบตรวจวัด
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ระบบจะทำการลบข้อมูลผลการวัดโหลดและรูปถ่ายของรอบนี้อย่างถาวร
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingSession) {
                    setDeletingSession(null);
                    setDeleteSessionError(null);
                  }
                }}
                disabled={isDeletingSession}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors disabled:opacity-50"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-6 space-y-4 text-xs text-slate-600">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">รหัสหม้อแปลง:</span>
                  <span className="font-mono font-bold text-sm text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
                    PEA {deletingSession.peaNo}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">รอบตรวจวัดที่:</span>
                  <span className="font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200/80">
                    รอบที่ {deletingSession.sessionNum || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">วัน-เวลาที่ตรวจวัด:</span>
                  <span className="font-mono text-slate-800 font-medium">
                    {deletingSession.date} เวลา {deletingSession.time} น.
                  </span>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-rose-50/60 rounded-2xl border border-rose-100/90 text-rose-950">
                <p className="font-bold flex items-center gap-1.5 text-rose-800">
                  <Flame className="w-4 h-4 text-rose-600" />
                  รายการข้อมูลที่จะถูกลบถาวร:
                </p>
                <ul className="space-y-1.5 pl-5 list-disc text-rose-800/90 text-[11.5px] leading-relaxed">
                  <li>
                    แถวบันทึกผลการวัดโหลดและแรงดันทุกฟีดเดอร์ของรอบนี้ใน <strong>Record Data</strong>
                  </li>
                  <li>
                    <strong className="text-rose-900 underline decoration-rose-400 underline-offset-2">
                      รูปถ่ายหน้างานทั้งหมดใน Google Drive ของรอบวัดนี้
                      {deletingSession.imageUrls && deletingSession.imageUrls.length > 0
                        ? ` (${deletingSession.imageUrls.length} รูป)`
                        : ''} จะถูกลบออกถาวร
                    </strong>
                  </li>
                  <li>
                    ข้อมูลของรอบตรวจวัดอื่นและข้อมูลหม้อแปลงใน MasterData จะยังคงอยู่ครบถ้วน
                  </li>
                </ul>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                ⚠️ คำเตือน: การลบนี้ไม่สามารถเรียกคืนได้ โปรดตรวจสอบความถูกต้องก่อนยืนยัน
              </p>

              {deleteSessionError && (
                <div className="p-3.5 rounded-xl bg-rose-100/90 border border-rose-300 text-rose-900 text-xs">
                  <p className="font-bold">เกิดข้อผิดพลาดในการลบ:</p>
                  <p className="mt-0.5 text-rose-800">{deleteSessionError}</p>
                </div>
              )}
            </div>

            {/* Dialog Actions */}
            <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingSession}
                onClick={() => {
                  setDeletingSession(null);
                  setDeleteSessionError(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 shadow-2xs"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeletingSession}
                onClick={handleConfirmDeleteSession}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingSession ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>กำลังลบข้อมูลและรูปใน Drive...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>ยืนยันการลบรอบวัดนี้ (ถาวร)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
