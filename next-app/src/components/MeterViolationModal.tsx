'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  AlertOctagon,
  Camera,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Clock,
  User,
  MapPin,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Zap,
  ChevronDown,
  Check,
  Settings2,
  Plus,
} from 'lucide-react';
import { TransformerWithStatus, getErrorMessage } from '@/lib/domain/types';

interface MeterViolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transformer: TransformerWithStatus;
  initialAuditType?: 'VIOLATION' | 'CLEARED';
}

const VIOLATION_TYPES = [
  'ต่อตรง (Bypass / ไม่ผ่านมิเตอร์)',
  'ดัดแปลงกลไก / สับเปลี่ยนเฟสมิเตอร์',
  'เหมืองขุดบิตคอยน์ / คริปโตเคอเรนซี',
  'ตัดวงจร CT / VT หรือดัดแปลงวงจรทุติยภูมิ',
  'พ่วงไฟข้ามแปลง / ใช้ไฟผิดประเภท',
  'อื่นๆ (ระบุในหมายเหตุ)',
];

const STATUS_OPTIONS: { id: 'INVESTIGATING' | 'LEGAL_ACTION' | 'RESOLVED' | 'PENDING' | 'CLEARED'; label: string; desc: string }[] = [
  { id: 'INVESTIGATING', label: 'กำลังตรวจสอบ', desc: 'รวบรวมหลักฐานหน้างาน' },
  { id: 'LEGAL_ACTION', label: 'ส่งฝ่ายกฎหมาย/ดำเนินคดี', desc: 'ส่งนิติกร/สายตรวจมิเตอร์' },
  { id: 'RESOLVED', label: 'เปรียบเทียบปรับแล้ว', desc: 'ชำระค่าปรับ/เยียวยาค่าเสียหายแล้ว' },
  { id: 'PENDING', label: 'รอตรวจซ้ำ', desc: 'รอนัดหมายเข้าตรวจซ้ำ' },
  { id: 'CLEARED', label: 'ไม่พบการละเมิด (ปกติ)', desc: 'ตรวจสอบมิเตอร์ครบแล้ว ไม่พบการลักใช้ไฟ' },
];

export const MeterViolationModal: React.FC<MeterViolationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transformer,
  initialAuditType = 'VIOLATION',
}) => {
  // Format today's date DD/MM/YYYY
  const now = new Date();
  const defaultDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [auditMode, setAuditMode] = useState<'VIOLATION' | 'CLEARED'>(initialAuditType);
  const [meterPeaNo, setMeterPeaNo] = useState(
    initialAuditType === 'CLEARED' ? 'ตรวจสอบมิเตอร์ไม่พบการละเมิด' : ''
  );
  const [consumerName, setConsumerName] = useState(
    initialAuditType === 'CLEARED' ? 'ผู้ใช้ไฟทุกรายที่เกาะหม้อแปลง' : ''
  );
  const [location, setLocation] = useState(transformer.location || '');
  const [violationTypes, setViolationTypes] = useState<string[]>(VIOLATION_TYPES);
  const [isManagingTypes, setIsManagingTypes] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [violationType, setViolationType] = useState(
    initialAuditType === 'CLEARED'
      ? 'ปกติ ไม่พบการกระทำผิดหรือลักใช้ไฟ'
      : VIOLATION_TYPES[0]
  );
  const [detectedDate, setDetectedDate] = useState(defaultDate);
  const [detectedTime, setDetectedTime] = useState(defaultTime);
  const [inspectorName, setInspectorName] = useState('');
  const [status, setStatus] = useState<'INVESTIGATING' | 'LEGAL_ACTION' | 'RESOLVED' | 'PENDING' | 'CLEARED'>(
    initialAuditType === 'CLEARED' ? 'CLEARED' : 'INVESTIGATING'
  );
  const [remark, setRemark] = useState(
    initialAuditType === 'CLEARED'
      ? 'ลงพื้นที่ตรวจสอบมิเตอร์ของผู้ใช้ไฟทุกรายแล้ว สภาพสมบูรณ์ กลไกและซีลปกติ ไม่พบการดัดแปลงหรือลักใช้ไฟ (โหลดสูงจากพฤติกรรมผู้ใช้ไฟจริง)'
      : ''
  );
  const [images, setImages] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pea_violation_types');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setViolationTypes(parsed);
            if (initialAuditType !== 'CLEARED') {
              setViolationType(parsed[0]);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to parse pea_violation_types from localStorage', err);
      }
    }
  }, [initialAuditType]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const handleAddViolationType = () => {
    const trimmed = newTypeInput.trim();
    if (!trimmed) return;
    if (violationTypes.includes(trimmed)) {
      alert('มีประเภทนี้อยู่ในรายการแล้ว');
      return;
    }
    const updated = [...violationTypes, trimmed];
    setViolationTypes(updated);
    setViolationType(trimmed);
    setNewTypeInput('');
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pea_violation_types', JSON.stringify(updated));
      } catch {}
    }
  };

  const handleRemoveViolationType = (typeToRemove: string) => {
    if (violationTypes.length <= 1) {
      alert('ต้องมีตัวเลือกประเภทการละเมิดอย่างน้อย 1 รายการ');
      return;
    }
    const updated = violationTypes.filter((t) => t !== typeToRemove);
    setViolationTypes(updated);
    if (violationType === typeToRemove) {
      setViolationType(updated[0]);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('pea_violation_types', JSON.stringify(updated));
      } catch {}
    }
  };

  const handleResetViolationTypes = () => {
    if (window.confirm('ต้องการคืนค่าตัวเลือกประเภทการละเมิดเริ่มต้นทั้งหมดหรือไม่?')) {
      setViolationTypes(VIOLATION_TYPES);
      setViolationType(VIOLATION_TYPES[0]);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('pea_violation_types');
        } catch {}
      }
    }
  };

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setImages((prev) => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSwitchMode = (mode: 'VIOLATION' | 'CLEARED') => {
    setAuditMode(mode);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (mode === 'CLEARED') {
      if (!meterPeaNo || meterPeaNo === '' || meterPeaNo === 'ตรวจสอบมิเตอร์ครบทุกตัว (ไม่พบละเมิด)') {
        setMeterPeaNo('ตรวจสอบมิเตอร์ไม่พบการละเมิด');
      }
      if (!consumerName || consumerName === '') {
        setConsumerName('ผู้ใช้ไฟทุกรายที่เกาะหม้อแปลง');
      }
      setViolationType('ปกติ ไม่พบการกระทำผิดหรือลักใช้ไฟ');
      setStatus('CLEARED');
      if (!remark || remark === '') {
        setRemark('ลงพื้นที่ตรวจสอบมิเตอร์ของผู้ใช้ไฟทุกรายแล้ว สภาพสมบูรณ์ กลไกและซีลปกติ ไม่พบการดัดแปลงหรือลักใช้ไฟ (โหลดสูงจากพฤติกรรมผู้ใช้ไฟจริง)');
      }
    } else {
      if (
        meterPeaNo === 'ตรวจสอบมิเตอร์ไม่พบการละเมิด' ||
        meterPeaNo === 'ตรวจสอบมิเตอร์ครบทุกตัว (ไม่พบละเมิด)'
      ) {
        setMeterPeaNo('');
      }
      if (consumerName === 'ผู้ใช้ไฟทุกรายที่เกาะหม้อแปลง') {
        setConsumerName('');
      }
      setViolationType(violationTypes[0] || VIOLATION_TYPES[0]);
      setStatus('INVESTIGATING');
      if (remark.includes('ลงพื้นที่ตรวจสอบมิเตอร์ของผู้ใช้ไฟทุกรายแล้ว')) {
        setRemark('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanMeter = meterPeaNo.trim();
    if (!cleanMeter) {
      setErrorMsg(auditMode === 'CLEARED' ? 'กรุณาระบุข้อความหรือรหัสมิเตอร์ที่ตรวจ' : 'กรุณาระบุรหัส PEA มิเตอร์ที่พบการละเมิด');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/violations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transformerPeaNo: transformer.peaNo,
          meterPeaNo: cleanMeter,
          consumerName: consumerName.trim(),
          location: location.trim(),
          violationType,
          detectedDate: detectedDate.trim(),
          detectedTime: detectedTime.trim(),
          inspectorName: inspectorName.trim(),
          status,
          remark: remark.trim(),
          images,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }

      setSuccessMsg(
        data.message ||
          (auditMode === 'CLEARED'
            ? 'บันทึกผลตรวจสอบมิเตอร์: ปกติ (ไม่พบละเมิด) เรียบร้อยแล้ว'
            : `บันทึกข้อมูลการละเมิดมิเตอร์ ${cleanMeter} เรียบร้อยแล้ว`)
      );
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      console.error('Error recording meter audit:', err);
      setErrorMsg(getErrorMessage(err) || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/90 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto transition-all">
        {/* Minimal Hairline Accent Bar */}
        <div
          className={`h-1 w-full transition-colors duration-200 ${
            auditMode === 'CLEARED'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
              : 'bg-gradient-to-r from-rose-500 to-red-600'
          }`}
        />

        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs transition-colors ${
                auditMode === 'CLEARED'
                  ? 'bg-emerald-50 border-emerald-200/80 text-emerald-600'
                  : 'bg-rose-50 border-rose-200/80 text-rose-600'
              }`}
            >
              {auditMode === 'CLEARED' ? (
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
              ) : (
                <AlertOctagon className="w-4.5 h-4.5 text-rose-600" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-tight truncate">
                  {auditMode === 'CLEARED'
                    ? 'บันทึกผลตรวจสอบมิเตอร์: ปกติ (Cleared)'
                    : 'บันทึกตรวจพบการละเมิดมิเตอร์'}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-mono font-bold border tabular-nums shrink-0 ${
                    auditMode === 'CLEARED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  PEA {transformer.peaNo}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none mt-1 truncate">
                หม้อแปลง {transformer.kva} kVA ({transformer.system}P) •{' '}
                {auditMode === 'CLEARED'
                  ? 'ยืนยันผลการลงพื้นที่ตรวจสอบมิเตอร์แล้วพ้นข้อสงสัย'
                  : 'บันทึกการลักใช้ไฟ/ดัดแปลงมิเตอร์เพื่อดำเนินคดี'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Segmented Mode Switcher */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50/70 border-b border-slate-100">
          <div className="p-1 bg-slate-200/60 rounded-xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSwitchMode('VIOLATION')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none ${
                auditMode === 'VIOLATION'
                  ? 'bg-white text-rose-700 shadow-2xs font-bold border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>บันทึกตรวจพบการละเมิด</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('CLEARED')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none ${
                auditMode === 'CLEARED'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>ตรวจสอบแล้ว - ไม่พบละเมิด (ปกติ)</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: ข้อมูลมิเตอร์และประเภทความผิด */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {auditMode === 'CLEARED' ? 'ขอบเขต / มิเตอร์ที่ตรวจ' : 'รหัส PEA มิเตอร์'}{' '}
                <span className={auditMode === 'CLEARED' ? 'text-emerald-500' : 'text-rose-500'}>*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder={
                    auditMode === 'CLEARED'
                      ? 'เช่น ตรวจสอบมิเตอร์ไม่พบการละเมิด'
                      : 'เช่น 52-098765 หรือ 0200...'
                  }
                  value={meterPeaNo}
                  onChange={(e) => setMeterPeaNo(e.target.value)}
                  className={`w-full h-10 px-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200/90 font-mono text-xs md:text-sm text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all font-semibold shadow-2xs ${
                    auditMode === 'CLEARED'
                      ? 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10'
                      : 'focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10'
                  }`}
                />
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1">
                {auditMode === 'CLEARED'
                  ? 'บันทึกว่าตรวจมิเตอร์ทั้งหมดของหม้อแปลง หรือระบุเลขมิเตอร์เฉพาะเจาะจง'
                  : 'หมายเลขทรัพย์สินมิเตอร์ PEA ที่ตรวจพบการกระทำผิด'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  {auditMode === 'CLEARED' ? 'ผลการตรวจสอบ' : 'ประเภทการละเมิด'}{' '}
                  <span className={auditMode === 'CLEARED' ? 'text-emerald-500' : 'text-rose-500'}>*</span>
                </label>
                {auditMode !== 'CLEARED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManagingTypes((prev) => !prev);
                      setIsDropdownOpen(false);
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1"
                    title="จัดการตัวเลือก (เพิ่ม/ลบข้อความ)"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>{isManagingTypes ? '✕ ปิดจัดการ' : 'จัดการตัวเลือก (+เพิ่ม/ลบ)'}</span>
                  </button>
                )}
              </div>

              {auditMode === 'CLEARED' ? (
                <input
                  type="text"
                  value={violationType}
                  onChange={(e) => setViolationType(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200/90 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-all shadow-2xs"
                  placeholder="เช่น ปกติ ไม่พบการกระทำผิดหรือลักใช้ไฟ"
                />
              ) : (
                <>
                  {/* กล่องจัดการตัวเลือก เพิ่ม / ลบ */}
                  {isManagingTypes && (
                    <div className="mb-2.5 p-3 rounded-xl bg-slate-50/95 border border-slate-200/90 shadow-2xs space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <Settings2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>จัดการรายการตัวเลือก</span>
                          <span className="text-slate-400 font-normal">({violationTypes.length} รายการ)</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleResetViolationTypes}
                          className="text-[10.5px] text-slate-400 hover:text-rose-600 underline transition-colors"
                        >
                          คืนค่าเริ่มต้น
                        </button>
                      </div>

                      {/* ช่องกรอกข้อความใหม่เพื่อเพิ่ม */}
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newTypeInput}
                          onChange={(e) => setNewTypeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddViolationType();
                            }
                          }}
                          placeholder="พิมพ์ข้อความประเภทใหม่ แล้วกดเพิ่ม..."
                          className="flex-1 h-8 px-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20"
                        />
                        <button
                          type="button"
                          onClick={handleAddViolationType}
                          className="px-3 h-8 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all shadow-2xs shrink-0 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>เพิ่ม</span>
                        </button>
                      </div>

                      {/* รายการตัวเลือกปัจจุบัน พร้อมปุ่มลบ */}
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                        {violationTypes.map((type) => (
                          <div
                            key={type}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80 text-[11px] text-slate-700 hover:border-slate-300 transition-colors"
                          >
                            <span className="truncate pr-2 font-medium">{type}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveViolationType(type)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors shrink-0"
                              title={`ลบ "${type}"`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Minimal Custom Dropdown Component */}
                  <div ref={dropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen((prev) => !prev)}
                      className={`w-full h-10 px-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 focus:bg-white border text-xs font-semibold text-slate-800 flex items-center justify-between transition-all shadow-2xs text-left group ${
                        isDropdownOpen
                          ? 'border-rose-500 ring-2 ring-rose-500/10 bg-white'
                          : 'border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="truncate font-medium text-slate-800">
                          {violationType || 'เลือกประเภทการละเมิด'}
                        </span>
                      </div>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isDropdownOpen ? 'rotate-180 text-rose-500' : 'group-hover:text-slate-600'
                        }`}
                      />
                    </button>

                    {/* Popover Menu */}
                    {isDropdownOpen && (
                      <div className="absolute z-50 left-0 right-0 mt-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-900/10 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-150">
                        <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
                          {violationTypes.map((type) => {
                            const isSelected = violationType === type;
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => {
                                  setViolationType(type);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg text-left transition-all ${
                                  isSelected
                                    ? 'bg-rose-50 text-rose-900 font-bold'
                                    : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                }`}
                              >
                                <span className="truncate pr-2">{type}</span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-rose-600 shrink-0 stroke-[2.5]" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="h-px bg-slate-100 my-1 mx-1" />

                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setIsManagingTypes(true);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50/80 rounded-lg text-left transition-colors"
                        >
                          <Settings2 className="w-3.5 h-3.5 shrink-0" />
                          <span>จัดการตัวเลือก (เพิ่ม / ลบ)...</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
              <p className="text-[10.5px] text-slate-400 mt-1">
                {auditMode === 'CLEARED'
                  ? 'ระบุสรุปผลการตรวจสอบมิเตอร์หน้างาน'
                  : 'ระบุลักษณะและพฤติการณ์ความผิดที่ตรวจพบ หรือกดจัดการตัวเลือกเพื่อเพิ่ม/ลบข้อความ'}
              </p>
            </div>
          </div>

          {/* Section 2: ผู้ใช้ไฟ และ สถานที่ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ชื่อผู้ใช้ไฟ / ผู้ครอบครองสถานที่
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="เช่น บจก. นิวเทค / นายสมชาย..."
                  value={consumerName}
                  onChange={(e) => setConsumerName(e.target.value)}
                  className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200/90 text-xs text-slate-800 focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                สถานที่ / จุดติดตั้งมิเตอร์
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="เช่น อาคารพาณิชย์ 3 ชั้น ตรงข้ามปั๊ม..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200/90 text-xs text-slate-800 focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 transition-all shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: วันที่ เวลา และ ผู้ตรวจพบ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                วันที่ตรวจพบ
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={detectedDate}
                  onChange={(e) => setDetectedDate(e.target.value)}
                  className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200/90 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 transition-all shadow-2xs"
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                เวลาที่ตรวจพบ
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={detectedTime}
                  onChange={(e) => setDetectedTime(e.target.value)}
                  className="w-full h-10 pl-9 pr-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200/90 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 transition-all shadow-2xs"
                  placeholder="HH:mm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ผู้ตรวจพบ / ช่างเทคนิค
              </label>
              <input
                type="text"
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200/90 text-xs text-slate-800 focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 transition-all shadow-2xs"
                placeholder="ชื่อ-นามสกุล ช่าง"
              />
            </div>
          </div>

          {/* Section 4: สถานะการดำเนินการ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              สถานะดำเนินการ
            </label>
            {auditMode === 'CLEARED' ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-950 flex items-start gap-3 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-bold border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <span>สถานะ: ตรวจสอบแล้ว - ไม่พบการละเมิด (CLEARED)</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white">
                      พ้นข้อสงสัย
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/90 mt-1 leading-relaxed">
                    ระบบจะบันทึกสถานะและติดป้ายเตือน{' '}
                    <strong className="font-bold underline decoration-emerald-400">
                      🛡️ ตรวจแล้ว-ไม่พบละเมิด
                    </strong>{' '}
                    ให้กับหม้อแปลงลูกนี้ ช่วยแยกออกจากหม้อแปลงวัดโหลดทั่วไป และยืนยันว่ากระแสโหลดสูงเกิดจากผู้ใช้ไฟใช้งานจริงตามปกติ
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STATUS_OPTIONS.filter((opt) => opt.id !== 'CLEARED').map((opt) => {
                  const isSelected = status === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setStatus(opt.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer shadow-2xs ${
                        isSelected
                          ? opt.id === 'LEGAL_ACTION'
                            ? 'bg-rose-50/90 border-rose-300 text-rose-800 ring-2 ring-rose-500/20'
                            : opt.id === 'RESOLVED'
                            ? 'bg-emerald-50/90 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/20'
                            : opt.id === 'PENDING'
                            ? 'bg-purple-50/90 border-purple-300 text-purple-800 ring-2 ring-purple-500/20'
                            : 'bg-amber-50/90 border-amber-300 text-amber-800 ring-2 ring-amber-500/20'
                          : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-600'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug truncate">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 5: รายละเอียด / หมายเหตุ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              รายละเอียด / หมายเหตุพฤติการณ์
            </label>
            <textarea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="ระบุพฤติการณ์ เช่น มีการต่อสายไฟข้ามมิเตอร์เข้าตู้ควบคุมเหมืองคริปโต, วัดกระแสด้านโหลดได้ 45A แต่มิเตอร์ไม่หมุน..."
              className="w-full p-3 rounded-xl bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200/90 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 transition-all shadow-2xs"
            />
          </div>

          {/* Section 6: แนบรูปถ่ายหลักฐาน */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-slate-500" />
                <span>รูปถ่ายหลักฐานหน้างาน</span>
                <span className="text-slate-400 font-normal">({images.length} รูป)</span>
              </label>

              <label className="cursor-pointer text-xs font-bold text-[#741b77] hover:text-purple-700 hover:underline flex items-center gap-1">
                <span>+ เพิ่มรูปถ่าย</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50/60 rounded-2xl border border-slate-200/80">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200/90 group bg-slate-100 shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`หลักฐานที่ ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-xs"
                      title="ลบรูปนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-3.5 border border-dashed border-slate-300 hover:border-[#741b77] bg-slate-50/40 hover:bg-slate-50/80 rounded-2xl cursor-pointer transition-all">
                <Camera className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-600">กดที่นี่เพื่อถ่ายภาพหรือแนบรูปถ่ายหลักฐาน</span>
                <span className="text-[11px] text-slate-400">ภาพจุดต่อตรง, สภาพมิเตอร์, การวัดกระแส</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-2xs active:scale-95"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !meterPeaNo.trim()}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-xs hover:shadow transition-all active:scale-95 disabled:opacity-50 ${
              auditMode === 'CLEARED'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : auditMode === 'CLEARED' ? (
              <>
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>บันทึกผลตรวจ: ปกติ (ไม่พบละเมิด)</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>บันทึกตรวจพบการละเมิด</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
