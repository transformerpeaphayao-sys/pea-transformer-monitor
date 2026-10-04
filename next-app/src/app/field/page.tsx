'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { TransformerWithStatus, FeederRecord, OfflineRecordItem, getErrorMessage } from '@/lib/domain/types';
import { calculateEngineeringStatus, safeFloat } from '@/lib/domain/calculations';
import {
  MapPin,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Layers,
  Calendar,
  Clock,
  Settings2,
  Info,
  ChevronRight,
  Database,
  ArrowRight,
  SlidersHorizontal,
  Compass,
  FileSpreadsheet,
  Navigation,
  Navigation2,
  X,
  Maximize2,
  Minimize2,
  Activity,
  Camera,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Dynamically import Leaflet map with SSR disabled
const TransformerMap = dynamic(
  () => import('@/components/map/TransformerMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[460px] bg-slate-50/50 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#741b77]" />
        <span className="font-medium text-sm text-slate-600">กำลังโหลดแผนที่ดาวเทียม Google Hybrid...</span>
      </div>
    ),
  }
);

export default function FieldInspectionPage() {
  const [mounted, setMounted] = useState(false);
  const [transformers, setTransformers] = useState<TransformerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransformer, setSelectedTransformer] = useState<TransformerWithStatus | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'RED' | 'ORANGE'>('RED');
  const [mobileTab, setMobileTab] = useState<'map' | 'form'>('map');
  const [offlineCount, setOfflineCount] = useState<number>(0);
  const [syncingOffline, setSyncingOffline] = useState<boolean>(false);
  const [showMapActionCard, setShowMapActionCard] = useState<boolean>(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // Fullscreen Toggle Handler (Universal CSS Fullscreen - 100% compatible with iOS Safari & Android)
  const toggleMapFullscreen = () => {
    setIsMapFullscreen(prev => !prev);
  };

  // Listen for ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMapFullscreen) {
        setIsMapFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMapFullscreen]);

  // Fetch transformers from API
  const fetchTransformers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/transformers');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTransformers(json.data);
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const viewNo = urlParams.get('peaNo') || urlParams.get('view');
          const found = viewNo ? json.data.find((t: TransformerWithStatus) => t.peaNo === viewNo) : null;
          if (found) {
            setSelectedTransformer(found);
            setShowMapActionCard(true);
          } else if (json.data.length > 0) {
            setSelectedTransformer((prev: TransformerWithStatus | null) => prev || json.data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load transformers in field page:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchTransformers();
    try {
      const offlineQueue = JSON.parse(localStorage.getItem('pea_offline_records') || '[]');
      setOfflineCount(offlineQueue.length);
    } catch {
      // ignore
    }
  }, []);

  // Filter Counts
  const filterCounts = useMemo(() => {
    const total = transformers.length;
    const red = transformers.filter(t => t.statusColor === 'red').length;
    const orange = transformers.filter(t => t.statusColor === 'orange').length;
    const green = transformers.filter(t => t.statusColor === 'done').length;
    return { total, red, orange, green };
  }, [transformers]);

  // Form State
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  });
  const [tap, setTap] = useState('3');
  const [recordMode, setRecordMode] = useState<'full' | 'quick'>('full');
  const [selectedFeederNames, setSelectedFeederNames] = useState<string[]>(['F1']);
  const [feedersMap, setFeedersMap] = useState<Record<string, FeederRecord>>({
    F1: { name: 'F1', currentA: 0, currentB: 0, currentC: 0, currentN: 0, note: '', cableSize: '', vt_ab: 0, vt_bc: 0, vt_ca: 0, vt_an: 0, vt_bn: 0, vt_cn: 0, ve_ab: 0, ve_bc: 0, ve_ca: 0, ve_an: 0, ve_bn: 0, ve_cn: 0 },
    F2: { name: 'F2', currentA: 0, currentB: 0, currentC: 0, currentN: 0, note: '', cableSize: '', vt_ab: 0, vt_bc: 0, vt_ca: 0, vt_an: 0, vt_bn: 0, vt_cn: 0, ve_ab: 0, ve_bc: 0, ve_ca: 0, ve_an: 0, ve_bn: 0, ve_cn: 0 },
    F3: { name: 'F3', currentA: 0, currentB: 0, currentC: 0, currentN: 0, note: '', cableSize: '', vt_ab: 0, vt_bc: 0, vt_ca: 0, vt_an: 0, vt_bn: 0, vt_cn: 0, ve_ab: 0, ve_bc: 0, ve_ca: 0, ve_an: 0, ve_bn: 0, ve_cn: 0 },
    F4: { name: 'F4', currentA: 0, currentB: 0, currentC: 0, currentN: 0, note: '', cableSize: '', vt_ab: 0, vt_bc: 0, vt_ca: 0, vt_an: 0, vt_bn: 0, vt_cn: 0, ve_ab: 0, ve_bc: 0, ve_ca: 0, ve_an: 0, ve_bn: 0, ve_cn: 0 },
  });
  const [expandedEndOfLine, setExpandedEndOfLine] = useState<Record<string, boolean>>({});
  const [globalNote, setGlobalNote] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<{ name: string; url: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Active Feeders computed list
  const activeFeeders = useMemo(() => {
    return selectedFeederNames.map(
      name =>
        feedersMap[name] || {
          name,
          currentA: 0, currentB: 0, currentC: 0, currentN: 0,
          note: '', cableSize: '',
          vt_ab: 0, vt_bc: 0, vt_ca: 0, vt_an: 0, vt_bn: 0, vt_cn: 0,
          ve_ab: 0, ve_bc: 0, ve_ca: 0, ve_an: 0, ve_bn: 0, ve_cn: 0,
        }
    );
  }, [selectedFeederNames, feedersMap]);

  // Compute Live Total Feeder
  const liveTotal = useMemo<FeederRecord>(() => {
    const totA = activeFeeders.reduce((s, f) => s + safeFloat(f.currentA), 0);
    const totB = activeFeeders.reduce((s, f) => s + safeFloat(f.currentB), 0);
    const totC = activeFeeders.reduce((s, f) => s + safeFloat(f.currentC), 0);
    const totN = activeFeeders.reduce((s, f) => s + safeFloat(f.currentN), 0);
    const vAn = activeFeeders.find(f => f.vt_an > 0)?.vt_an || 230;
    const vBn = activeFeeders.find(f => f.vt_bn > 0)?.vt_bn || 230;
    const vCn = activeFeeders.find(f => f.vt_cn > 0)?.vt_cn || 230;

    return {
      name: 'รวม',
      currentA: totA,
      currentB: totB,
      currentC: totC,
      currentN: totN,
      note: globalNote,
      cableSize: '',
      vt_ab: activeFeeders[0]?.vt_ab || 0,
      vt_bc: activeFeeders[0]?.vt_bc || 0,
      vt_ca: activeFeeders[0]?.vt_ca || 0,
      vt_an: vAn,
      vt_bn: vBn,
      vt_cn: vCn,
      ve_ab: activeFeeders[0]?.ve_ab || 0,
      ve_bc: activeFeeders[0]?.ve_bc || 0,
      ve_ca: activeFeeders[0]?.ve_ca || 0,
      ve_an: activeFeeders[0]?.ve_an || 0,
      ve_bn: activeFeeders[0]?.ve_bn || 0,
      ve_cn: activeFeeders[0]?.ve_cn || 0,
    };
  }, [activeFeeders, globalNote]);

  // Compute Live Engineering Status
  const liveStatus = useMemo(() => {
    if (!selectedTransformer) return null;
    return calculateEngineeringStatus(liveTotal, selectedTransformer.kva, selectedTransformer.system);
  }, [liveTotal, selectedTransformer]);

  // Feeder mutations
  const toggleFeederSelection = (name: string) => {
    setSelectedFeederNames(prev => {
      if (prev.includes(name)) {
        if (prev.length <= 1) return prev; // Keep at least one feeder
        return prev.filter(n => n !== name);
      } else {
        return [...prev, name].sort();
      }
    });
  };

  const updateFeederMap = (fName: string, field: keyof FeederRecord, value: unknown) => {
    setFeedersMap(prev => ({
      ...prev,
      [fName]: {
        ...(prev[fName] || {
          name: fName,
          currentA: 0, currentB: 0, currentC: 0, currentN: 0,
          note: '', cableSize: '',
          vt_ab: 0, vt_bc: 0, vt_ca: 0, vt_an: 0, vt_bn: 0, vt_cn: 0,
          ve_ab: 0, ve_bc: 0, ve_ca: 0, ve_an: 0, ve_bn: 0, ve_cn: 0,
        }),
        [field]: value,
      },
    }));
  };

  const toggleEndOfLine = (fName: string) => {
    setExpandedEndOfLine(prev => ({ ...prev, [fName]: !prev[fName] }));
  };

  // Fast Client-Side Image Compression using HTML5 Canvas (Reduces 10MB camera photos to ~180KB in < 50ms)
  const compressImageFile = (file: File, maxWidth = 1280, quality = 0.8): Promise<string> => {
    return new Promise(resolve => {
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = ev => resolve((ev.target?.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const reader = new FileReader();
          reader.onload = ev => resolve((ev.target?.result as string) || '');
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = ev => resolve((ev.target?.result as string) || '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      };

      img.src = objectUrl;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    // Compress all selected photos in parallel
    const compressedList = await Promise.all(
      fileList.map(async file => {
        const compressedUrl = await compressImageFile(file);
        if (!compressedUrl) return null;
        return { name: file.name, url: compressedUrl };
      })
    );

    const validPhotos = compressedList.filter((p): p is { name: string; url: string } => p !== null);
    setUploadedPhotos(prev => [...prev, ...validPhotos]);

    // Reset input value so technician can snap or pick new photos repeatedly
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Sync offline queue to Google Sheets
  const syncOfflineQueue = async () => {
    if (typeof window === 'undefined') return;
    try {
      const rawQueue = JSON.parse(localStorage.getItem('pea_offline_records') || '[]');
      const offlineQueue: OfflineRecordItem[] = Array.isArray(rawQueue) ? rawQueue : [];
      if (offlineQueue.length === 0) return;

      setSyncingOffline(true);
      const remaining: OfflineRecordItem[] = [];
      let successCount = 0;

      for (const item of offlineQueue) {
        try {
          const res = await fetch('/api/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
          const json = await res.json();
          if (res.ok && json.success) {
            successCount++;
          } else {
            remaining.push(item);
          }
        } catch {
          remaining.push(item);
        }
      }

      localStorage.setItem('pea_offline_records', JSON.stringify(remaining));
      setOfflineCount(remaining.length);

      if (successCount > 0) {
        await fetchTransformers();
      }

      if (remaining.length === 0) {
        setSaveMessage(`✅ ซิงค์ข้อมูล ${successCount} รายการขึ้น Google Sheets สำเร็จเรียบร้อย!`);
        setTimeout(() => setSaveMessage(null), 5000);
      } else {
        setSaveMessage(`⚠️ ซิงค์สำเร็จ ${successCount} รายการ เหลือ ${remaining.length} รายการ`);
      }
    } catch (e: unknown) {
      console.error('Failed to sync offline queue:', e);
    } finally {
      setSyncingOffline(false);
    }
  };

  // Submit Handler
  const handleSaveMeasurement = async () => {
    if (!selectedTransformer) return;
    setSaving(true);
    setSaveMessage(null);

    const payload = {
      action: 'create',
      peaNo: selectedTransformer.peaNo,
      date,
      time,
      tap,
      mode: recordMode,
      feeders: activeFeeders.map(f => ({
        name: f.name,
        currentA: safeFloat(f.currentA),
        currentB: safeFloat(f.currentB),
        currentC: safeFloat(f.currentC),
        currentN: safeFloat(f.currentN),
        note: f.note || '',
        cableSize: f.cableSize || '',
        vt_ab: safeFloat(f.vt_ab),
        vt_bc: safeFloat(f.vt_bc),
        vt_ca: safeFloat(f.vt_ca),
        vt_an: safeFloat(f.vt_an),
        vt_bn: safeFloat(f.vt_bn),
        vt_cn: safeFloat(f.vt_cn),
        ve_ab: safeFloat(f.ve_ab),
        ve_bc: safeFloat(f.ve_bc),
        ve_ca: safeFloat(f.ve_ca),
        ve_an: safeFloat(f.ve_an),
        ve_bn: safeFloat(f.ve_bn),
        ve_cn: safeFloat(f.ve_cn),
      })),
      total: {
        name: 'รวม',
        currentA: safeFloat(liveTotal.currentA),
        currentB: safeFloat(liveTotal.currentB),
        currentC: safeFloat(liveTotal.currentC),
        currentN: safeFloat(liveTotal.currentN),
        note: globalNote || '',
      },
      globalNote,
      images: uploadedPhotos.map(p => p.url),
    };

    try {
      // 1. Save directly to Google Sheets via API
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถบันทึกข้อมูลได้');
      }

      setSaveMessage(`✅ บันทึกข้อมูลหม้อแปลง PEA ${selectedTransformer.peaNo} ขึ้น Google Sheets สำเร็จ!`);

      // Refresh list to immediately update map marker color
      await fetchTransformers();

      // Trigger sync for any previously queued offline records
      const rawCurrent = JSON.parse(localStorage.getItem('pea_offline_records') || '[]');
      const currentOffline: OfflineRecordItem[] = Array.isArray(rawCurrent) ? rawCurrent : [];
      if (currentOffline.length > 0) {
        syncOfflineQueue();
      }

      // Clear uploaded photos & global note
      setUploadedPhotos([]);
      setGlobalNote('');

      // Dismiss transformer action card from map
      setShowMapActionCard(false);
      setSelectedTransformer(null);

      // Always return to Map Coordinates tab upon saving
      setMobileTab('map');

      setTimeout(() => setSaveMessage(null), 5000);
    } catch (err: unknown) {
      console.warn('Online save failed, saving offline fallback:', err);
      // Fallback: save locally in localStorage
      try {
        const rawQueue = JSON.parse(localStorage.getItem('pea_offline_records') || '[]');
        const offlineQueue: OfflineRecordItem[] = Array.isArray(rawQueue) ? rawQueue : [];
        offlineQueue.push({ ...payload, timestamp: Date.now() });
        localStorage.setItem('pea_offline_records', JSON.stringify(offlineQueue));
        setOfflineCount(offlineQueue.length);
        setSaveMessage(`⚠️ บันทึกข้อมูลลงในเครื่องเรียบร้อย (โหมดออฟไลน์: ${getErrorMessage(err)})`);
        setUploadedPhotos([]);
        setGlobalNote('');
        setShowMapActionCard(false);
        setSelectedTransformer(null);
        setMobileTab('map');
        setTimeout(() => setSaveMessage(null), 5000);
      } catch (storageErr: unknown) {
        setSaveMessage(`❌ เกิดข้อผิดพลาดในการบันทึก: ${getErrorMessage(storageErr)}`);
        setTimeout(() => setSaveMessage(null), 5000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex-1 p-2 sm:p-4 md:px-7 md:py-5 w-full min-h-[70vh] flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-3 border-[#741b77]/20 border-t-[#741b77] animate-spin" />
          <p className="text-sm font-medium text-slate-500">กำลังเตรียมพร้อมระบบงานภาคสนาม...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full max-w-[1600px] mx-auto min-h-0 ${
        mobileTab === 'map'
          ? 'h-[calc(100dvh-54px)] max-h-[calc(100dvh-54px)] p-1.5 sm:p-3 flex flex-col gap-1.5 sm:gap-2 overflow-hidden overscroll-none'
          : 'min-h-full p-2 sm:p-4 md:px-7 md:py-5 flex flex-col gap-2.5 sm:gap-4 overflow-y-auto pb-16'
      }`}
    >
      {/* Global Status Notification Banner */}
      {saveMessage && (
        <div
          className={`p-2.5 sm:p-3 rounded-2xl border text-xs sm:text-sm text-center font-semibold shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 flex items-center justify-center gap-2 flex-shrink-0 ${
            saveMessage.startsWith('✅')
              ? 'bg-emerald-50 border-emerald-200/90 text-emerald-800'
              : saveMessage.startsWith('⚠️')
              ? 'bg-amber-50 border-amber-200/90 text-amber-800'
              : 'bg-rose-50 border-rose-200/90 text-rose-800'
          }`}
        >
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Mobile Top Segmented View Switcher (< lg screens) - Compact Mobile-First Design */}
      <div className="lg:hidden flex items-center p-0.5 bg-slate-100/90 rounded-xl border border-slate-200/90 shadow-2xs flex-shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-[0.98] ${
            mobileTab === 'map'
              ? 'bg-white text-[#741b77] shadow-xs border border-slate-200/60 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-[#741b77] flex-shrink-0" />
          <span>แผนที่พิกัด</span>
          <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-purple-50 text-[#741b77] border border-purple-200/60 font-mono font-bold shrink-0">
            {transformers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-[0.98] ${
            mobileTab === 'form'
              ? 'bg-white text-[#741b77] shadow-xs border border-slate-200/60 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-[#f39c12] fill-[#f39c12] flex-shrink-0" />
          <span>แบบฟอร์มบันทึก</span>
          {selectedTransformer && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200/80 animate-pulse shrink-0"
              title={`เลือกหม้อแปลง PEA ${selectedTransformer.peaNo} แล้ว`}
            />
          )}
        </button>
      </div>

      {/* Main Responsive Grid Layout */}
      <div
        className={`flex-1 flex flex-col lg:flex-row gap-2 sm:gap-4 min-h-0 w-full ${
          mobileTab === 'map' ? 'h-full overflow-hidden items-stretch' : 'items-start'
        }`}
      >
        {/* Left Column: Interactive Map & Unified Filter Console */}
        <div
          className={`w-full lg:flex-1 flex-col space-y-1.5 sm:space-y-2 min-h-0 ${
            mobileTab === 'map' ? 'flex flex-1 h-full overflow-hidden' : 'hidden lg:flex'
          }`}
        >
          {/* Unified Map Console Header (Compact Mobile-First Minimalist Modern Design) */}
          <div className="bg-white/95 backdrop-blur-md p-1.5 sm:p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col gap-1.5 flex-shrink-0">
            {/* Top Row: Title, Live Status, Subtitle, and Fullscreen Action */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-50 border border-purple-200/70 flex items-center justify-center text-[#741b77] shadow-2xs flex-shrink-0">
                  <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#741b77]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight whitespace-nowrap">
                      แผนที่หม้อแปลงภาคสนาม
                    </h2>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live GPS
                    </span>
                  </div>
                  <p className="text-[9.5px] sm:text-[10.5px] text-slate-400 font-medium truncate">
                    ดาวเทียม Google Hybrid • MasterData กฟภ.
                  </p>
                </div>
              </div>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleMapFullscreen}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-purple-200/80 bg-purple-50/70 hover:bg-purple-100/80 text-[#741b77] text-[10.5px] sm:text-xs font-bold transition-all active:scale-95 shadow-2xs shrink-0"
                title="ขยายแผนที่เต็มจอ (Full Screen)"
              >
                <Maximize2 className="w-3 h-3 text-[#741b77]" />
                <span>เต็มจอ</span>
              </button>
            </div>

            {/* Bottom Row: Filter Segmented Control (Grid 3 Columns for Equal Mobile Balance) */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100/90 p-0.5 sm:p-1 rounded-lg text-xs w-full select-none">
              <button
                type="button"
                onClick={() => setFilterMode('ALL')}
                className={`py-1 px-1 sm:py-1.5 sm:px-1.5 rounded-md font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1 ${
                  filterMode === 'ALL'
                    ? 'bg-[#741b77] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <span>ทั้งหมด</span>
                <span
                  className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                    filterMode === 'ALL'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {filterCounts.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('RED')}
                className={`py-1 px-1 sm:py-1.5 sm:px-1.5 rounded-md font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1 ${
                  filterMode === 'RED'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 hover:text-rose-900 hover:bg-rose-50/70'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 ring-1 ring-white/60" />
                <span>ยังไม่ตรวจ</span>
                <span
                  className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                    filterMode === 'RED'
                      ? 'bg-white/20 text-white'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {filterCounts.red}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('ORANGE')}
                className={`py-1 px-1 sm:py-1.5 sm:px-1.5 rounded-md font-bold text-[11px] sm:text-xs transition-all flex items-center justify-center gap-1 ${
                  filterMode === 'ORANGE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-amber-700 hover:text-amber-900 hover:bg-amber-50/70'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-1 ring-white/60" />
                <span>สั่งตรวจซ้ำ</span>
                <span
                  className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                    filterMode === 'ORANGE'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {filterCounts.orange}
                </span>
              </button>
            </div>
          </div>

          {/* Leaflet Map Frame with Floating Action Card */}
          <div
            ref={mapContainerRef}
            className={
              isMapFullscreen
                ? 'fixed inset-0 z-[9999] w-screen h-screen bg-slate-100 rounded-none border-none p-0 m-0 overflow-hidden'
                : 'relative w-full flex-1 min-h-0 h-full lg:h-[calc(100dvh-170px)] bg-white rounded-2xl border border-slate-200/90 shadow-sm p-1 sm:p-1.5 overflow-hidden transition-all duration-200'
            }
          >
            {/* Fullscreen Floating Controls Bar (Positioned at top-14 to guarantee zero overlap with top controls) */}
            {isMapFullscreen && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-2xl border border-slate-200/90 shadow-xl max-w-[95vw] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-1 bg-slate-100/90 p-0.5 rounded-xl text-xs overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setFilterMode('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap ${
                      filterMode === 'ALL'
                        ? 'bg-[#741b77] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ทั้งหมด ({filterCounts.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('RED')}
                    className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 whitespace-nowrap ${
                      filterMode === 'RED'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-rose-700 hover:text-rose-900'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>ยังไม่ตรวจ ({filterCounts.red})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('ORANGE')}
                    className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 whitespace-nowrap ${
                      filterMode === 'ORANGE'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-700 hover:text-amber-900'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>สั่งตรวจซ้ำ ({filterCounts.orange})</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={toggleMapFullscreen}
                  className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition-all"
                  title="ออกจากโหมดเต็มจอ (ESC)"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <TransformerMap
              transformers={transformers}
              selectedPea={showMapActionCard ? selectedTransformer?.peaNo : undefined}
              filterMode={filterMode}
              isFullscreen={isMapFullscreen}
              onToggleFullscreen={toggleMapFullscreen}
              onSelectTransformer={t => {
                setSelectedTransformer(t);
                setShowMapActionCard(true);
              }}
            />

            {/* Floating Quick Action Island on Map (Ultra-compact Mobile-First Minimalist Card) */}
            {showMapActionCard && selectedTransformer && (
              <div className="absolute bottom-2 left-2 right-2 sm:left-3 sm:right-auto sm:w-[350px] z-[1000] bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.12),0_2px_6px_rgba(15,23,42,0.06)] p-2 sm:p-2.5 transition-all animate-in slide-in-from-bottom-2 duration-200">
                {/* Close Button at Top-Right Corner */}
                <button
                  type="button"
                  onClick={() => setShowMapActionCard(false)}
                  aria-label="ปิดการ์ดข้อมูลหม้อแปลง"
                  title="ปิด (Close)"
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors active:scale-90"
                >
                  <X className="w-3 h-3" />
                </button>

                <div className="flex items-center justify-between gap-2 pr-5">
                  {/* Left Column: Compact Information */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    {/* Row 1: PEA No & Status Badge */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 text-[12.5px] sm:text-sm tracking-tight">
                        PEA {selectedTransformer.peaNo}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[9px] sm:text-[9.5px] font-semibold px-1.5 py-0.2 rounded-full ${
                          selectedTransformer.statusColor === 'red'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                            : selectedTransformer.statusColor === 'orange'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            selectedTransformer.statusColor === 'red'
                              ? 'bg-rose-500 animate-pulse'
                              : selectedTransformer.statusColor === 'orange'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <span>
                          {selectedTransformer.statusColor === 'red'
                            ? 'ยังไม่ตรวจ'
                            : selectedTransformer.statusColor === 'orange'
                            ? 'สั่งตรวจซ้ำ'
                            : 'ตรวจแล้ว'}
                        </span>
                      </span>
                    </div>

                    {/* Row 2: Specs */}
                    <div className="text-[10.5px] sm:text-[11px] font-medium text-slate-600 flex items-center gap-1 truncate">
                      <span className="font-bold text-slate-800">{selectedTransformer.kva} kVA</span>
                      <span className="text-slate-300">•</span>
                      <span>{selectedTransformer.system || 3} เฟส</span>
                      {selectedTransformer.brand && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 truncate">{selectedTransformer.brand}</span>
                        </>
                      )}
                    </div>

                    {/* Row 3: Location */}
                    <div className="text-[10px] sm:text-[10.5px] text-slate-500 flex items-center gap-1 truncate">
                      <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-slate-400 shrink-0" />
                      <span className="truncate" title={selectedTransformer.location || 'ไม่ระบุสถานที่'}>
                        {selectedTransformer.location || 'ไม่ระบุสถานที่'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Icon Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    {/* GPS Navigation Icon Button */}
                    {selectedTransformer.lat && selectedTransformer.lng ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedTransformer.lat},${selectedTransformer.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="นำทาง GPS ด้วย Google Maps"
                        title="นำทาง GPS (Google Maps)"
                        className="w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-2xs hover:shadow transition-all active:scale-95"
                      >
                        <Navigation2 className="w-5 h-5 text-white" strokeWidth={2.2} />
                      </a>
                    ) : (
                      <button
                        disabled
                        aria-label="ไม่มีพิกัด GPS สำหรับนำทาง"
                        title="ไม่มีพิกัด GPS"
                        className="w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-xl bg-slate-100 text-slate-300 flex items-center justify-center cursor-not-allowed"
                      >
                        <Navigation2 className="w-5 h-5 text-slate-300" strokeWidth={2.2} />
                      </button>
                    )}

                    {/* Record Load Measurement Icon Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMapFullscreen(false);
                        setMobileTab('form');
                      }}
                      aria-label="บันทึกผลการวัดโหลดหม้อแปลงลูกนี้"
                      title="บันทึกผลการวัดโหลดหม้อแปลงลูกนี้"
                      className="w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-xl bg-gradient-to-tr from-[#741b77] to-[#8e2488] hover:from-[#58145a] hover:to-[#741b77] text-white flex items-center justify-center shadow-2xs hover:shadow transition-all active:scale-95"
                    >
                      <Zap className="w-5 h-5 text-white" strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Measurement Recording Drawer */}
        <div
          className={`w-full lg:w-[480px] xl:w-[500px] flex-col space-y-3.5 ${
            mobileTab === 'form' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Active Transformer Info Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Form Top Header (Minimalist Swiss Style) */}
            <div className="px-3.5 py-2.5 sm:px-4 bg-white border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#741b77] border border-purple-200/60 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-[#741b77] fill-[#741b77]" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug whitespace-nowrap">
                    แบบฟอร์มบันทึกการวัดโหลด
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5 whitespace-nowrap">
                    ระบบตรวจสอบวิศวกรรม กฟภ.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedTransformer && (
                  <span className="text-[10px] sm:text-xs bg-purple-50 text-[#741b77] border border-purple-200/80 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-mono font-bold whitespace-nowrap shadow-2xs">
                    PEA {selectedTransformer.peaNo}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setMobileTab('map')}
                  className="lg:hidden p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200/60 transition-all active:scale-95 flex items-center gap-1 text-[11px] font-bold"
                  title="สลับกลับไปดูแผนที่พิกัด"
                >
                  <Compass className="w-3.5 h-3.5 text-[#741b77]" />
                  <span className="hidden sm:inline">ดูแผนที่</span>
                </button>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 space-y-4 text-xs">
              {/* === Section 1: ข้อมูลทั่วไป === */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-3.5 bg-[#741b77] rounded-full" />
                    <span className="font-bold text-xs text-slate-800 tracking-tight">ข้อมูลทั่วไป</span>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1 text-[11px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#741b77]" />
                      <span>วันที่</span>
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-slate-50/70 hover:bg-white border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-slate-800 font-medium text-xs focus:bg-white focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 shadow-2xs transition-all"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-600 font-semibold text-[11px] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#f39c12]" />
                        <span>เวลา (24 ชม.)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          setTime(now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }));
                        }}
                        className="text-[9px] text-[#741b77] hover:text-[#58145a] font-bold underline"
                      >
                        ตอนนี้
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={time}
                        onChange={e => setTime(e.target.value)}
                        placeholder="13:30"
                        maxLength={5}
                        className="w-full bg-slate-50/70 hover:bg-white border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-slate-800 font-mono font-bold text-xs focus:bg-white focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 shadow-2xs transition-all"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                        น.
                      </span>
                    </div>
                  </div>
                </div>

                {/* PEA NO Dropdown */}
                <div>
                  <label className="text-slate-600 font-semibold block mb-1 text-[11px]">
                    ค้นหา / เลือก PEANO หม้อแปลง
                  </label>
                  <select
                    value={selectedTransformer?.peaNo || ''}
                    onChange={e => {
                      const found = transformers.find(t => t.peaNo === e.target.value);
                      if (found) setSelectedTransformer(found);
                    }}
                    className="w-full bg-slate-50/70 hover:bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-slate-800 font-medium text-xs focus:outline-none focus:bg-white focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 transition-all shadow-2xs"
                  >
                    {transformers.map(t => (
                      <option key={t.peaNo} value={t.peaNo}>
                        {t.peaNo} — {t.kva} kVA ({t.location || 'ไม่ระบุสถานที่'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transformer Spec Card (Clean Minimalist Swiss Style) */}
                {selectedTransformer && (
                  <div className="p-3 bg-gradient-to-r from-purple-50/40 to-slate-50/40 rounded-xl border border-purple-100/80 text-slate-800 text-xs space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 font-medium text-[10px] block">ระบบเฟส</span>
                        <b className="text-slate-900 font-bold text-xs">หม้อแปลง {selectedTransformer.system || 3} Phase</b>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium text-[10px] block">พิกัด</span>
                        <b className="text-[#741b77] font-bold font-mono text-xs">{selectedTransformer.kva} kVA</b>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-purple-100/60">
                      <div className="truncate">
                        <span className="text-slate-400 font-medium text-[10px] block">สถานที่</span>
                        <span className="text-slate-700 font-medium truncate text-xs block">{selectedTransformer.location || '-'}</span>
                      </div>
                      {selectedTransformer.lat && selectedTransformer.lng && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${selectedTransformer.lat},${selectedTransformer.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-200/70 transition-all flex items-center gap-1 shrink-0 active:scale-95 shadow-2xs whitespace-nowrap"
                          title="เปิด Google Maps นำทาง GPS"
                        >
                          <Navigation className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                          <span>นำทาง GPS</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Tap Position (Segmented Control) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-600 font-semibold text-[11px]">
                      แท็ปหม้อแปลง (Tap)
                    </label>
                    <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 border border-purple-200/60 px-2 py-0.2 rounded-full font-mono">
                      {tap === '3' ? 'แท็ป 3 (กลาง - มาตรฐาน)' : `แท็ป ${tap}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 bg-slate-100/70 p-1 rounded-xl text-xs select-none">
                    {['1', '2', '3', '4', '5'].map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setTap(t)}
                        className={`py-1.5 px-1 rounded-lg font-bold text-xs transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                          tap === t
                            ? 'bg-white text-[#741b77] shadow-xs border border-purple-200/70'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                        }`}
                      >
                        <span className="leading-none text-[11px]">แท็ป {t}</span>
                        <span
                          className={`text-[9px] font-normal leading-none ${
                            tap === t ? 'text-[#741b77]/80 font-medium' : 'text-slate-400'
                          }`}
                        >
                          {t === '3' ? '(กลาง)' : t === '1' ? '(+5%)' : t === '5' ? '(-5%)' : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* === Section 2: โหมดการบันทึกข้อมูล === */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-3.5 bg-[#741b77] rounded-full" />
                    <span className="font-bold text-xs text-slate-800 tracking-tight">โหมดการบันทึกข้อมูล</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 select-none">
                  <button
                    type="button"
                    onClick={() => setRecordMode('full')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-98 ${
                      recordMode === 'full'
                        ? 'bg-purple-50/80 border-[#741b77] text-[#741b77] shadow-2xs ring-1 ring-purple-600/20'
                        : 'bg-slate-50/70 border-slate-200/80 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-[#741b77]" />
                    <span>วัดโหลด+วิเคราะห์ไฟตก</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordMode('quick')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-98 ${
                      recordMode === 'quick'
                        ? 'bg-purple-50/80 border-[#741b77] text-[#741b77] shadow-2xs ring-1 ring-purple-600/20'
                        : 'bg-slate-50/70 border-slate-200/80 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-[#f39c12] fill-[#f39c12]" />
                    <span>วัดกระแส (รวดเร็ว)</span>
                  </button>
                </div>
              </div>

              {/* === Section 3: เลือกฟีดเดอร์ที่ต้องการบันทึก === */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-3.5 bg-[#741b77] rounded-full" />
                    <span className="font-bold text-xs text-slate-800 tracking-tight">เลือกฟีดเดอร์ที่ต้องการบันทึก</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono font-medium">
                    เลือก {selectedFeederNames.length} ฟีดเดอร์
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 select-none">
                  {['F1', 'F2', 'F3', 'F4'].map(name => {
                    const isSelected = selectedFeederNames.includes(name);
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => toggleFeederSelection(name)}
                        className={`py-2 rounded-xl border font-bold text-xs transition-all active:scale-95 flex items-center justify-center ${
                          isSelected
                            ? 'border-2 border-purple-600 bg-purple-50 text-[#741b77] shadow-2xs font-extrabold ring-1 ring-purple-500/20'
                            : 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* === Section 4: ข้อมูลแต่ละฟีดเดอร์ === */}
              <div className="space-y-3.5 pt-1">
                {selectedFeederNames.map(fName => {
                  const f = feedersMap[fName] || {
                    name: fName,
                    currentA: 0, currentB: 0, currentC: 0, currentN: 0,
                    cableSize: '', note: '',
                    vt_ab: 0, vt_bc: 0, vt_ca: 0, vt_an: 0, vt_bn: 0, vt_cn: 0,
                    ve_ab: 0, ve_bc: 0, ve_ca: 0, ve_an: 0, ve_bn: 0, ve_cn: 0,
                  };
                  const isEndOfLineOpen = !!expandedEndOfLine[fName];

                  return (
                    <div
                      key={fName}
                      className="p-3.5 bg-white rounded-2xl border border-slate-200/80 space-y-3 text-xs shadow-2xs"
                    >
                      {/* Feeder Title */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-[#741b77] font-bold text-xs font-mono">
                            {fName}
                          </span>
                          <span className="text-xs font-bold text-slate-800">ฟีดเดอร์ {fName}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {recordMode === 'full' ? 'วัดโหลด+ไฟตก' : 'วัดกระแส'}
                        </span>
                      </div>

                      {/* Full Mode: Voltages */}
                      {recordMode === 'full' && (
                        <div className="space-y-3 pt-0.5">
                          {/* Under Transformer Voltage (V) */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-[#741b77]" />
                                แรงดันใต้หม้อแปลง (V)
                              </span>
                              <span className="text-[10px] font-semibold text-purple-900 bg-purple-50/80 px-2 py-0.5 rounded-md border border-purple-200/60">
                                พิกัด 400 / 230V
                              </span>
                            </div>

                            {/* L-L Group */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between px-0.5">
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                  แรงดันระหว่างสาย (L-L)
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">พิกัด 400V</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                {/* V_ab */}
                                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-purple-400/20 focus-within:border-[#741b77] transition-all">
                                  <div className="flex items-center justify-center gap-1 py-1 bg-slate-50/80 border-b border-slate-100">
                                    <span className="text-slate-700 text-[10px] font-bold">V_ab</span>
                                    <span className="text-[8.5px] text-slate-500 font-medium">(L-L)</span>
                                  </div>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    value={f.vt_ab || ''}
                                    onChange={e => updateFeederMap(fName, 'vt_ab', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm sm:text-base focus:outline-none"
                                  />
                                </div>

                                {/* V_bc */}
                                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-purple-400/20 focus-within:border-[#741b77] transition-all">
                                  <div className="flex items-center justify-center gap-1 py-1 bg-slate-50/80 border-b border-slate-100">
                                    <span className="text-slate-700 text-[10px] font-bold">V_bc</span>
                                    <span className="text-[8.5px] text-slate-500 font-medium">(L-L)</span>
                                  </div>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    value={f.vt_bc || ''}
                                    onChange={e => updateFeederMap(fName, 'vt_bc', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm sm:text-base focus:outline-none"
                                  />
                                </div>

                                {/* V_ca */}
                                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-purple-400/20 focus-within:border-[#741b77] transition-all">
                                  <div className="flex items-center justify-center gap-1 py-1 bg-slate-50/80 border-b border-slate-100">
                                    <span className="text-slate-700 text-[10px] font-bold">V_ca</span>
                                    <span className="text-[8.5px] text-slate-500 font-medium">(L-L)</span>
                                  </div>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    value={f.vt_ca || ''}
                                    onChange={e => updateFeederMap(fName, 'vt_ca', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm sm:text-base focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* L-N Group */}
                            <div className="space-y-1 pt-0.5">
                              <div className="flex items-center justify-between px-0.5">
                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                  แรงดันเทียบสายนิวทรัล (L-N)
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">พิกัด 230V</span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                {/* V_an (Phase A) */}
                                <div className="bg-white rounded-xl border border-rose-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-rose-400/20 focus-within:border-rose-500 transition-all">
                                  <div className="flex items-center justify-center gap-1 py-1 bg-rose-50/70 border-b border-rose-100/70">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    <span className="text-rose-800 text-[10px] font-bold">V_an</span>
                                    <span className="text-[8.5px] text-rose-500 font-medium">(A-N)</span>
                                  </div>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    value={f.vt_an || ''}
                                    onChange={e => updateFeederMap(fName, 'vt_an', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm sm:text-base focus:outline-none"
                                  />
                                </div>

                                {/* V_bn (Phase B) */}
                                <div className="bg-white rounded-xl border border-amber-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-amber-400/20 focus-within:border-amber-500 transition-all">
                                  <div className="flex items-center justify-center gap-1 py-1 bg-amber-50/70 border-b border-amber-100/70">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span className="text-amber-800 text-[10px] font-bold">V_bn</span>
                                    <span className="text-[8.5px] text-amber-600 font-medium">(B-N)</span>
                                  </div>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    value={f.vt_bn || ''}
                                    onChange={e => updateFeederMap(fName, 'vt_bn', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm sm:text-base focus:outline-none"
                                  />
                                </div>

                                {/* V_cn (Phase C) */}
                                <div className="bg-white rounded-xl border border-sky-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-sky-400/20 focus-within:border-sky-500 transition-all">
                                  <div className="flex items-center justify-center gap-1 py-1 bg-sky-50/70 border-b border-sky-100/70">
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                    <span className="text-sky-800 text-[10px] font-bold">V_cn</span>
                                    <span className="text-[8.5px] text-sky-600 font-medium">(C-N)</span>
                                  </div>
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    value={f.vt_cn || ''}
                                    onChange={e => updateFeederMap(fName, 'vt_cn', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm sm:text-base focus:outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Collapsible End of Line Voltages (Expander) */}
                          <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/30 transition-all">
                            <button
                              type="button"
                              onClick={() => toggleEndOfLine(fName)}
                              className="w-full px-3 py-2 bg-slate-50/90 hover:bg-purple-50/40 text-left text-xs text-slate-700 flex items-center justify-between transition-colors gap-2"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                                <span className="font-bold text-slate-800 text-xs whitespace-nowrap">
                                  แรงดันปลายสาย (V)
                                </span>
                                <span className="text-[10px] text-slate-400 font-normal whitespace-nowrap">
                                  (ไม่บังคับ)
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[#741b77] text-[11px] font-semibold whitespace-nowrap shrink-0">
                                <span>{isEndOfLineOpen ? 'ย่อข้อมูล' : 'กรอกข้อมูล'}</span>
                                {isEndOfLineOpen ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-[#741b77]" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </div>
                            </button>

                            {isEndOfLineOpen && (
                              <div className="p-3 space-y-2.5 bg-white border-t border-slate-200/60">
                                {/* L-L End of Line */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between px-0.5">
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                      แรงดันระหว่างสายปลายสาย (L-L)
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-purple-400/20 focus-within:border-[#741b77] transition-all">
                                      <div className="flex items-center justify-center gap-1 py-1 bg-slate-50/80 border-b border-slate-100">
                                        <span className="text-slate-700 text-[10px] font-bold">V_ab</span>
                                        <span className="text-[8.5px] text-slate-600 font-medium">(ปลายสาย)</span>
                                      </div>
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.1"
                                        value={f.ve_ab || ''}
                                        onChange={e => updateFeederMap(fName, 've_ab', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm focus:outline-none"
                                      />
                                    </div>

                                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-purple-400/20 focus-within:border-[#741b77] transition-all">
                                      <div className="flex items-center justify-center gap-1 py-1 bg-slate-50/80 border-b border-slate-100">
                                        <span className="text-slate-700 text-[10px] font-bold">V_bc</span>
                                        <span className="text-[8.5px] text-slate-600 font-medium">(ปลายสาย)</span>
                                      </div>
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.1"
                                        value={f.ve_bc || ''}
                                        onChange={e => updateFeederMap(fName, 've_bc', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm focus:outline-none"
                                      />
                                    </div>

                                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-purple-400/20 focus-within:border-[#741b77] transition-all">
                                      <div className="flex items-center justify-center gap-1 py-1 bg-slate-50/80 border-b border-slate-100">
                                        <span className="text-slate-700 text-[10px] font-bold">V_ca</span>
                                        <span className="text-[8.5px] text-slate-600 font-medium">(ปลายสาย)</span>
                                      </div>
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.1"
                                        value={f.ve_ca || ''}
                                        onChange={e => updateFeederMap(fName, 've_ca', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* L-N End of Line */}
                                <div className="space-y-1 pt-0.5">
                                  <div className="flex items-center justify-between px-0.5">
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                      แรงดันเทียบสายนิวทรัลปลายสาย (L-N)
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <div className="bg-white rounded-xl border border-rose-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-rose-400/20 focus-within:border-rose-500 transition-all">
                                      <div className="flex items-center justify-center gap-1 py-1 bg-rose-50/70 border-b border-rose-100/70">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        <span className="text-rose-800 text-[10px] font-bold">V_an</span>
                                        <span className="text-[8.5px] text-rose-500 font-medium">(ปลายสาย)</span>
                                      </div>
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.1"
                                        value={f.ve_an || ''}
                                        onChange={e => updateFeederMap(fName, 've_an', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm focus:outline-none"
                                      />
                                    </div>

                                    <div className="bg-white rounded-xl border border-amber-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-amber-400/20 focus-within:border-amber-500 transition-all">
                                      <div className="flex items-center justify-center gap-1 py-1 bg-amber-50/70 border-b border-amber-100/70">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                        <span className="text-amber-800 text-[10px] font-bold">V_bn</span>
                                        <span className="text-[8.5px] text-amber-600 font-medium">(ปลายสาย)</span>
                                      </div>
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.1"
                                        value={f.ve_bn || ''}
                                        onChange={e => updateFeederMap(fName, 've_bn', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm focus:outline-none"
                                      />
                                    </div>

                                    <div className="bg-white rounded-xl border border-sky-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-sky-400/20 focus-within:border-sky-500 transition-all">
                                      <div className="flex items-center justify-center gap-1 py-1 bg-sky-50/70 border-b border-sky-100/70">
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                                        <span className="text-sky-800 text-[10px] font-bold">V_cn</span>
                                        <span className="text-[8.5px] text-sky-600 font-medium">(ปลายสาย)</span>
                                      </div>
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.1"
                                        value={f.ve_cn || ''}
                                        onChange={e => updateFeederMap(fName, 've_cn', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Currents (A) */}
                      <div className="space-y-1.5">
                        <span className="font-semibold text-slate-600 text-[11px] block">
                          กระแสไฟฟ้า (A)
                        </span>
                        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                          {/* Neutral N */}
                          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-slate-400/20 focus-within:border-slate-500 transition-all">
                            <div className="flex items-center justify-center gap-1 py-1 bg-slate-50 border-b border-slate-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <label className="text-slate-600 text-[10px] font-bold">นิวทรัล N</label>
                            </div>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              value={f.currentN || ''}
                              onChange={e => updateFeederMap(fName, 'currentN', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm sm:text-base focus:outline-none"
                            />
                          </div>

                          {/* Phase A */}
                          <div className="bg-white rounded-xl border border-rose-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-rose-400/20 focus-within:border-rose-500 transition-all">
                            <div className="flex items-center justify-center gap-1 py-1 bg-rose-50/70 border-b border-rose-100/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <label className="text-rose-700 text-[10px] font-bold">เฟส A</label>
                            </div>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              value={f.currentA || ''}
                              onChange={e => updateFeederMap(fName, 'currentA', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm sm:text-base focus:outline-none"
                            />
                          </div>

                          {/* Phase B */}
                          <div className="bg-white rounded-xl border border-amber-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-amber-400/20 focus-within:border-amber-500 transition-all">
                            <div className="flex items-center justify-center gap-1 py-1 bg-amber-50/70 border-b border-amber-100/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <label className="text-amber-800 text-[10px] font-bold">เฟส B</label>
                            </div>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              value={f.currentB || ''}
                              onChange={e => updateFeederMap(fName, 'currentB', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm sm:text-base focus:outline-none"
                            />
                          </div>

                          {/* Phase C */}
                          <div className="bg-white rounded-xl border border-sky-200/90 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-sky-400/20 focus-within:border-sky-500 transition-all">
                            <div className="flex items-center justify-center gap-1 py-1 bg-sky-50/70 border-b border-sky-100/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                              <label className="text-sky-800 text-[10px] font-bold">เฟส C</label>
                            </div>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              value={f.currentC || ''}
                              onChange={e => updateFeederMap(fName, 'currentC', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white py-1.5 px-1 text-slate-900 font-mono font-bold text-center text-sm sm:text-base focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Note for this Feeder */}
                      <div className="pt-0.5">
                        <label className="text-slate-500 text-[10px] font-semibold block mb-0.5">
                          หมายเหตุ {fName}
                        </label>
                        <input
                          type="text"
                          value={f.note || ''}
                          onChange={e => updateFeederMap(fName, 'note', e.target.value)}
                          placeholder="หมายเหตุเฉพาะฟีดเดอร์นี้..."
                          className="w-full bg-slate-50/70 hover:bg-white border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-[#741b77]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* === Section 5: สรุปสถานะรวมของหม้อแปลงเครื่องนี้ === */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-[#741b77] rounded-full" />
                    <span className="font-bold text-xs text-slate-800 tracking-tight">สรุปสถานะรวมของหม้อแปลง</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded-full border border-slate-200/50">
                    คำนวณอัตโนมัติ
                  </span>
                </div>

                {/* 4 Currents Total Display */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  <div className="bg-white rounded-xl border border-rose-200/80 p-2 text-center shadow-2xs">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span className="text-[10px] font-bold text-rose-800">รวม I_a</span>
                    </div>
                    <div className="font-mono text-xs sm:text-sm font-bold text-rose-600">
                      {liveTotal.currentA.toFixed(1)} <span className="text-[9px] font-normal text-rose-400">A</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-amber-200/80 p-2 text-center shadow-2xs">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="text-[10px] font-bold text-amber-800">รวม I_b</span>
                    </div>
                    <div className="font-mono text-xs sm:text-sm font-bold text-amber-600">
                      {liveTotal.currentB.toFixed(1)} <span className="text-[9px] font-normal text-amber-400">A</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-sky-200/80 p-2 text-center shadow-2xs">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      <span className="text-[10px] font-bold text-sky-800">รวม I_c</span>
                    </div>
                    <div className="font-mono text-xs sm:text-sm font-bold text-sky-600">
                      {liveTotal.currentC.toFixed(1)} <span className="text-[9px] font-normal text-sky-400">A</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200/80 p-2 text-center shadow-2xs">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span className="text-[10px] font-bold text-slate-700">รวม I_n</span>
                    </div>
                    <div className="font-mono text-xs sm:text-sm font-bold text-slate-700">
                      {liveTotal.currentN.toFixed(1)} <span className="text-[9px] font-normal text-slate-400">A</span>
                    </div>
                  </div>
                </div>

                {/* 3 Main Metrics */}
                {liveStatus && (
                  <div className="grid grid-cols-3 gap-2">
                    {/* kVA */}
                    <div className="p-2.5 bg-gradient-to-b from-purple-50/50 to-white rounded-xl border border-purple-100/90 shadow-2xs text-center">
                      <span className="text-slate-600 font-bold block text-[10px]">โหลดรวม (kVA)</span>
                      <b className="text-xs sm:text-sm font-mono font-bold text-purple-950 mt-0.5 block">
                        {(((liveTotal.currentA * (liveTotal.vt_an || 230) + liveTotal.currentB * (liveTotal.vt_bn || 230) + liveTotal.currentC * (liveTotal.vt_cn || 230))) / 1000).toFixed(2)}
                      </b>
                      <span className="text-[8.5px] text-purple-600/80 font-medium">กิโลโวลต์-แอมป์</span>
                    </div>

                    {/* %UF */}
                    <div className={`p-2.5 rounded-xl border shadow-2xs text-center transition-colors ${
                      liveStatus.pctLoad > 80 
                        ? 'bg-rose-50/70 border-rose-200' 
                        : 'bg-emerald-50/50 border-emerald-100'
                    }`}>
                      <span className={`font-bold block text-[10px] ${
                        liveStatus.pctLoad > 80 ? 'text-rose-700' : 'text-emerald-800'
                      }`}>
                        %UF (% โหลด)
                      </span>
                      <b className={`text-xs sm:text-sm font-mono font-bold mt-0.5 block ${
                        liveStatus.pctLoad > 80 ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {liveStatus.pctLoad.toFixed(1)}%
                      </b>
                      <span className={`text-[8.5px] font-semibold ${
                        liveStatus.pctLoad > 80 ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {liveStatus.pctLoad > 80 ? 'เกินพิกัด (>80%)' : 'ปกติ (≤80%)'}
                      </span>
                    </div>

                    {/* %Unbalance */}
                    <div className={`p-2.5 rounded-xl border shadow-2xs text-center transition-colors ${
                      liveStatus.pctUnbalance > 30 
                        ? 'bg-rose-50/70 border-rose-200' 
                        : 'bg-slate-50/70 border-slate-200/70'
                    }`}>
                      <span className={`font-bold block text-[10px] ${
                        liveStatus.pctUnbalance > 30 ? 'text-rose-700' : 'text-slate-700'
                      }`}>
                        %Unbalance
                      </span>
                      <b className={`text-xs sm:text-sm font-mono font-bold mt-0.5 block ${
                        liveStatus.pctUnbalance > 30 ? 'text-rose-600' : 'text-slate-800'
                      }`}>
                        {liveStatus.pctUnbalance.toFixed(1)}%
                      </b>
                      <span className={`text-[8.5px] font-semibold ${
                        liveStatus.pctUnbalance > 30 ? 'text-rose-600' : 'text-slate-500'
                      }`}>
                        {liveStatus.pctUnbalance > 30 ? 'ไม่สมดุล (>30%)' : 'สมดุลดี (≤30%)'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {liveStatus && liveStatus.pctLoad > 80 && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl text-rose-800 flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                    <span className="font-semibold leading-tight text-[11px] sm:text-xs">
                      โหลดเกินพิกัดตามเกณฑ์ กฟภ. (&gt;80%)! เสี่ยงต่อหม้อแปลงชำรุดเสียหาย
                    </span>
                  </div>
                )}
                {liveStatus && liveStatus.isHarmonicRisk && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800 flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#f39c12]" />
                    <span className="font-semibold leading-tight text-[11px] sm:text-xs">
                      เฝ้าระวังความเสี่ยงลักใช้ไฟ / ขุดบิตคอยน์! พบกระแส N สูงผิดปกติ
                    </span>
                  </div>
                )}
                {(liveTotal.vt_an > 253 || liveTotal.vt_bn > 253 || liveTotal.vt_cn > 253) && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800 flex items-center gap-2 text-xs">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-[#f39c12]" />
                    <span className="font-semibold leading-tight text-[11px] sm:text-xs">
                      แจ้งเตือนไฟเกิน! พบแรงดันสูงผิดปกติ (&gt;253V) ควรตรวจสอบการปรับแท็บ (Tap)
                    </span>
                  </div>
                )}
              </div>

              {/* === Section 6: รูปถ่ายหน้างาน / อัปโหลด (อุปกรณ์เสริม) === */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-3.5 bg-[#741b77] rounded-full" />
                    <span className="font-bold text-xs text-slate-800 tracking-tight">ถ่ายรูปหน้างาน / อัปโหลด (อุปกรณ์เสริม)</span>
                  </div>
                </div>
                <label className="border-2 border-dashed border-slate-200 hover:border-purple-400 bg-slate-50/50 hover:bg-purple-50/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center">
                  <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-[#741b77]">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      แตะเพื่อเปิดกล้องถ่ายรูป หรือเลือกรูปจากคลังภาพ
                    </span>
                    <span className="text-[10px] text-slate-400">รองรับไฟล์ JPG, PNG</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {/* Photo Thumbnails */}
                {uploadedPhotos.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto py-1">
                    {uploadedPhotos.map((photo, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 w-4 h-4 bg-black/60 rounded-full text-white flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* === Section 7: หมายเหตุ (รวม) & บันทึกข้อมูล === */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1 text-[11px]">
                    หมายเหตุ (รวม)
                  </label>
                  <input
                    type="text"
                    value={globalNote}
                    onChange={e => setGlobalNote(e.target.value)}
                    placeholder="หมายเหตุรวมทั้งหมด..."
                    className="w-full bg-slate-50/70 hover:bg-white border border-slate-200/80 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10"
                  />
                </div>

                {/* Offline Storage Status Indicator */}
                {offlineCount > 0 && (
                  <div className="flex items-center justify-between p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-800 text-[11px] font-medium">
                    <span className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-amber-600" />
                      <span>มีข้อมูลรอ Sync ในเครื่อง: <b>{offlineCount} รายการ</b></span>
                    </span>
                    <button
                      type="button"
                      onClick={syncOfflineQueue}
                      disabled={syncingOffline}
                      className="text-[10px] text-amber-900 bg-amber-200/90 hover:bg-amber-300 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingOffline ? 'animate-spin' : ''}`} />
                      <span>{syncingOffline ? 'กำลังซิงค์...' : 'กด Sync ทันที'}</span>
                    </button>
                  </div>
                )}

                {saveMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs text-center font-medium animate-in fade-in">
                    {saveMessage}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSaveMeasurement}
                  disabled={saving}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#741b77] to-[#8e2488] hover:from-[#58145a] hover:to-[#741b77] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-60 select-none"
                >
                  <Save className="w-4 h-4 text-[#f39c12]" />
                  <span>{saving ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลและตรวจสอบ'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
