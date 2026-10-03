'use client';

import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  X,
  Zap,
  MapPin,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Building2,
  Tag,
  Hash,
  Activity,
  Layers,
} from 'lucide-react';
import { TransformerWithStatus, getErrorMessage } from '@/lib/domain/types';

interface RegisterTransformerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPeaNo: string) => void;
  existingTransformers: TransformerWithStatus[];
}

const COMMON_KVA_PRESETS = [30, 50, 100, 160, 250, 315, 400, 500];

const COMMON_BRANDS = [
  'เอกรัฐ (Ekarat)',
  'ถิรไทย (Tirathai)',
  'QTC',
  'เจริญชัย (Charoenchai)',
  'บางกอกอิเล็กทริก (Bangkok Electric)',
  'สหมิตร (Sahamit)',
  'หม้อแปลง กฟภ.',
];

export const RegisterTransformerModal: React.FC<RegisterTransformerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingTransformers,
}) => {
  const [peaNo, setPeaNo] = useState('');
  const [system, setSystem] = useState<'1' | '3'>('3');
  const [kva, setKva] = useState<string>('50');
  const [brand, setBrand] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [gpsSuccess, setGpsSuccess] = useState(false);

  // Check duplicate PEA NO
  const isDuplicatePea = useMemo(() => {
    const clean = peaNo.trim().toLowerCase();
    if (!clean) return false;
    return existingTransformers.some(
      (t) => t.peaNo.trim().toLowerCase() === clean
    );
  }, [peaNo, existingTransformers]);

  // Real-time IMAX Calculation
  const calculatedIMax = useMemo(() => {
    const kvaNum = parseFloat(kva);
    if (isNaN(kvaNum) || kvaNum <= 0) return 0;
    return system === '3'
      ? (kvaNum * 1000) / (Math.sqrt(3) * 400)
      : (kvaNum * 1000) / 230;
  }, [kva, system]);

  if (!isOpen) return null;

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS');
      return;
    }

    setGpsLoading(true);
    setGpsSuccess(false);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
        setGpsSuccess(true);
        setTimeout(() => setGpsSuccess(false), 3500);
      },
      (err) => {
        setGpsLoading(false);
        setErrorMsg(`ไม่สามารถดึงพิกัด GPS ได้: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPea = peaNo.trim();

    if (!cleanPea) {
      setErrorMsg('กรุณากรอกรหัส PEANO หม้อแปลง');
      return;
    }

    if (isDuplicatePea) {
      setErrorMsg(`รหัส PEA ${cleanPea} มีอยู่ในระบบแล้ว ไม่สามารถลงทะเบียนซ้ำได้`);
      return;
    }

    const kvaNum = parseFloat(kva);
    if (isNaN(kvaNum) || kvaNum <= 0) {
      setErrorMsg('กรุณาระบุขนาดพิกัด kVA ให้ถูกต้อง (ค่าต้องมากกว่า 0)');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/transformers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peaNo: cleanPea,
          system,
          kva: kvaNum,
          brand: brand.trim(),
          location: location.trim(),
          lat: lat ? parseFloat(lat) : null,
          lng: lng ? parseFloat(lng) : null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'เกิดข้อผิดพลาดในการลงทะเบียนหม้อแปลง');
      }

      setSuccessMsg(`🎉 ลงทะเบียนหม้อแปลง ${cleanPea} สำเร็จเรียบร้อยแล้ว!`);
      setTimeout(() => {
        onSuccess(cleanPea);
        onClose();
        // Reset form
        setPeaNo('');
        setKva('50');
        setBrand('');
        setLocation('');
        setLat('');
        setLng('');
        setSuccessMsg(null);
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header - Sleek Minimalist */}
        <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-[#741b77] shadow-2xs flex-shrink-0">
              <PlusCircle className="w-5 h-5 text-[#741b77]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
                  ลงทะเบียนหม้อแปลงใหม่
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-[#741b77] border border-purple-200/80 font-mono">
                  MasterData
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal truncate mt-0.5">
                เพิ่มข้อมูลหม้อแปลงเข้าสู่ฐานข้อมูลหลักสำหรับการตรวจวัดโหลด
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Balanced Vertical Rhythm & Generous Breathing Space */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 md:p-8 overflow-y-auto flex-1 flex flex-col gap-[18px] text-slate-700 text-xs md:text-sm">
            
            {/* Feedback Notifications */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200/90 rounded-2xl text-rose-800 text-xs flex items-start gap-2.5 shadow-2xs animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed font-medium">{errorMsg}</div>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200/90 rounded-2xl text-emerald-800 text-xs flex items-center gap-2.5 shadow-2xs animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="flex-1 font-semibold">{successMsg}</div>
              </div>
            )}

            {/* Field 1: PEANO Transformer Code */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[#741b77]" />
                  <span>PEANO หม้อแปลง (รหัส กฟภ.) <strong className="text-rose-500">*</strong></span>
                </label>
                {isDuplicatePea && (
                  <span className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>รหัสนี้มีอยู่ในระบบแล้ว</span>
                  </span>
                )}
                {!isDuplicatePea && peaNo.trim() && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>รหัสใช้งานได้</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="เช่น 26-008253 หรือ 59-5554"
                  value={peaNo}
                  onChange={(e) => setPeaNo(e.target.value)}
                  className={`w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border rounded-xl px-4 py-2.5 text-xs md:text-sm font-mono font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 shadow-2xs transition-all ${
                    isDuplicatePea
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10'
                      : 'border-slate-200 focus:border-[#741b77] focus:ring-purple-600/10'
                  }`}
                />
              </div>
            </div>

            {/* Field 2: Phase System (Modern iOS-Style Segmented Control) */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#f39c12]" />
                  <span>ระบบไฟฟ้า (Phase System) <strong className="text-rose-500">*</strong></span>
                </span>
              </label>
              
              <div className="grid grid-cols-2 p-1.5 rounded-xl bg-slate-100/90 border border-slate-200/70 gap-1.5 select-none">
                <button
                  type="button"
                  onClick={() => setSystem('3')}
                  className={`py-2 px-3 rounded-lg text-xs md:text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 ${
                    system === '3'
                      ? 'bg-white text-[#741b77] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#741b77]" />
                  <span>3 เฟส (400/230V)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSystem('1')}
                  className={`py-2 px-3 rounded-lg text-xs md:text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 ${
                    system === '1'
                      ? 'bg-white text-[#741b77] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${system === '1' ? 'bg-[#741b77]' : 'bg-slate-300'}`} />
                  <span>1 เฟส (460/230V)</span>
                </button>
              </div>
            </div>

            {/* Field 3: kVA Rating + Live IMAX Calculation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <span>ค่าพิกัด kVA หม้อแปลง <strong className="text-rose-500">*</strong></span>
                </label>
                {calculatedIMax > 0 && (
                  <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-purple-50 text-[#741b77] border border-purple-200/70 shadow-2xs">
                    IMAX: {calculatedIMax.toFixed(1)} A
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="number"
                  required
                  step="1"
                  min="5"
                  max="5000"
                  placeholder="เช่น 50, 100, 160"
                  value={kva}
                  onChange={(e) => setKva(e.target.value)}
                  className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl pl-4 pr-14 py-2.5 text-xs md:text-sm font-mono font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#741b77] focus:ring-4 focus:ring-purple-600/10 shadow-2xs transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                  kVA
                </span>
              </div>

              {/* Minimal Quick Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-xs text-slate-400 font-medium mr-1">พิกัดด่วน:</span>
                {COMMON_KVA_PRESETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setKva(String(val))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all duration-100 active:scale-95 ${
                      kva === String(val)
                        ? 'bg-[#741b77] text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 4: Brand */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-500" />
                <span>ยี่ห้อของหม้อแปลง (Brand)</span>
              </label>
              <input
                type="text"
                list="brands-list"
                placeholder="เช่น เอกรัฐ, ถิรไทย, QTC..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#741b77] focus:ring-4 focus:ring-purple-600/10 shadow-2xs transition-all"
              />
              <datalist id="brands-list">
                {COMMON_BRANDS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            {/* Field 5: Location */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                <span>สถานที่ติดตั้ง (Location)</span>
              </label>
              <input
                type="text"
                placeholder="เช่น ข้างตึกแถวรัตนชัยธานี, หน้าวัดป่าแดง ม.3"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#741b77] focus:ring-4 focus:ring-purple-600/10 shadow-2xs transition-all"
              />
            </div>

            {/* Field 6: GPS Coordinates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>พิกัดภูมิศาสตร์ (GPS Coordinates)</span>
                </label>

                <button
                  type="button"
                  onClick={handleGetGps}
                  disabled={gpsLoading}
                  className="px-3 py-1.5 rounded-xl bg-purple-50/90 hover:bg-purple-100 text-[#741b77] border border-purple-200/80 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 disabled:opacity-60"
                  title="อ่านพิกัด GPS ปัจจุบันจากอุปกรณ์"
                >
                  {gpsLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#741b77]" />
                      <span>กำลังดึงพิกัด...</span>
                    </>
                  ) : gpsSuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">ดึงพิกัดแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-3.5 h-3.5 text-[#741b77]" />
                      <span>ดึงพิกัดปัจจุบัน (GPS)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude (เช่น 19.1678)"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-mono font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#741b77] focus:ring-4 focus:ring-purple-600/10 shadow-2xs transition-all"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude (เช่น 99.8975)"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-mono font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#741b77] focus:ring-4 focus:ring-purple-600/10 shadow-2xs transition-all"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Sticky Modal Footer - Always in View */}
          <div className="px-6 md:px-8 py-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
            <span className="text-xs text-slate-400 hidden sm:inline">
              * จำเป็นต้องระบุรหัส PEANO และพิกัด kVA
            </span>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs md:text-sm font-semibold transition-all active:scale-95 disabled:opacity-60 shadow-2xs whitespace-nowrap"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={loading || isDuplicatePea || !peaNo.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#741b77] hover:bg-[#58145a] text-white text-xs md:text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>กำลังบันทึกข้อมูล...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 text-emerald-300" />
                    <span>บันทึกข้อมูลหม้อแปลง</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
