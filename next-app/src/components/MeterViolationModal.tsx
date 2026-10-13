'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Check,
  Settings2,
  Plus,
  Pencil,
  Save,
} from 'lucide-react';
import { TransformerWithStatus, MeterViolation, getErrorMessage } from '@/lib/domain/types';

interface MeterViolationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transformer: TransformerWithStatus;
  initialAuditType?: 'VIOLATION' | 'CLEARED';
  editingViolation?: MeterViolation | null;
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

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
const THAI_DAY_HEADERS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function parseDateForCalendar(dateStr: string): { year: number; month: number; day: number } {
  const now = new Date();
  if (!dateStr || !dateStr.trim()) {
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }
  const clean = dateStr.trim();
  if (clean.includes('/')) {
    const parts = clean.split('/').map((p) => parseInt(p, 10));
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      let y = parts[2];
      if (y > 2400) y -= 543;
      const m = Math.max(0, Math.min(11, parts[1] - 1));
      const d = Math.max(1, Math.min(31, parts[0]));
      return { year: y, month: m, day: d };
    }
  }
  if (clean.includes('-')) {
    const parts = clean.split('-').map((p) => parseInt(p, 10));
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      let y = parts[0];
      if (y > 2400) y -= 543;
      const m = Math.max(0, Math.min(11, parts[1] - 1));
      const d = Math.max(1, Math.min(31, parts[2]));
      return { year: y, month: m, day: d };
    }
  }
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

export const MeterViolationModal: React.FC<MeterViolationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transformer,
  initialAuditType = 'VIOLATION',
  editingViolation = null,
}) => {
  // Format today's date DD/MM/YYYY
  const now = new Date();
  const defaultDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [auditMode, setAuditMode] = useState<'VIOLATION' | 'CLEARED'>(
    editingViolation ? (editingViolation.status === 'CLEARED' ? 'CLEARED' : 'VIOLATION') : initialAuditType
  );
  const [meterPeaNo, setMeterPeaNo] = useState(
    editingViolation
      ? editingViolation.meterPeaNo
      : initialAuditType === 'CLEARED'
      ? 'ตรวจสอบมิเตอร์ไม่พบการละเมิด'
      : ''
  );
  const [consumerName, setConsumerName] = useState(
    editingViolation
      ? editingViolation.consumerName || ''
      : initialAuditType === 'CLEARED'
      ? 'ผู้ใช้ไฟทุกรายที่เกาะหม้อแปลง'
      : ''
  );
  const [location, setLocation] = useState(
    editingViolation?.location || transformer.location || ''
  );
  const [violationTypes, setViolationTypes] = useState<string[]>(VIOLATION_TYPES);
  const [isManagingTypes, setIsManagingTypes] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newTypeInput, setNewTypeInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calendar State & Handlers
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calendarYear, setCalendarYear] = useState<number>(() => {
    const initialParsed = parseDateForCalendar(editingViolation?.detectedDate || defaultDate);
    return initialParsed.year;
  });
  const [calendarMonth, setCalendarMonth] = useState<number>(() => {
    const initialParsed = parseDateForCalendar(editingViolation?.detectedDate || defaultDate);
    return initialParsed.month;
  });

  const [violationType, setViolationType] = useState(
    editingViolation
      ? editingViolation.violationType
      : initialAuditType === 'CLEARED'
      ? 'ปกติ ไม่พบการกระทำผิดหรือลักใช้ไฟ'
      : VIOLATION_TYPES[0]
  );
  const [detectedDate, setDetectedDate] = useState(editingViolation?.detectedDate || defaultDate);
  const [detectedTime, setDetectedTime] = useState(editingViolation?.detectedTime || defaultTime);
  const [inspectorName, setInspectorName] = useState(editingViolation?.inspectorName || '');
  const [status, setStatus] = useState<'INVESTIGATING' | 'LEGAL_ACTION' | 'RESOLVED' | 'PENDING' | 'CLEARED'>(
    editingViolation?.status || (initialAuditType === 'CLEARED' ? 'CLEARED' : 'INVESTIGATING')
  );

  const calendarGridDays = useMemo(() => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(calendarYear, calendarMonth, 1).getDay();
    const days: Array<{
      day: number;
      year: number;
      month: number;
      isCurrentMonth: boolean;
    }> = [];

    // Prev month padding
    const prevMonthDays = new Date(calendarYear, calendarMonth, 0).getDate();
    const prevMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
    const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      days.push({ day: d, year: prevYear, month: prevMonth, isCurrentMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, year: calendarYear, month: calendarMonth, isCurrentMonth: true });
    }

    // Next month padding
    const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
    const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      days.push({ day: d, year: nextYear, month: nextMonth, isCurrentMonth: false });
    }

    return days;
  }, [calendarYear, calendarMonth]);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((prev) => prev - 1);
    } else {
      setCalendarMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((prev) => prev + 1);
    } else {
      setCalendarMonth((prev) => prev + 1);
    }
  };

  const toggleCalendar = () => {
    if (!isCalendarOpen) {
      const parsed = parseDateForCalendar(detectedDate);
      setCalendarYear(parsed.year);
      setCalendarMonth(parsed.month);
    }
    setIsCalendarOpen(!isCalendarOpen);
  };

  const handleSelectCalendarDate = (year: number, month: number, day: number) => {
    const dd = String(day).padStart(2, '0');
    const mm = String(month + 1).padStart(2, '0');
    setDetectedDate(`${dd}/${mm}/${year}`);
    setIsCalendarOpen(false);
  };

  const handleSelectToday = () => {
    const t = new Date();
    const dd = String(t.getDate()).padStart(2, '0');
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const yy = t.getFullYear();
    setDetectedDate(`${dd}/${mm}/${yy}`);
    setCalendarYear(yy);
    setCalendarMonth(t.getMonth());
    setIsCalendarOpen(false);
  };
  const [remark, setRemark] = useState(
    editingViolation
      ? editingViolation.remark || ''
      : initialAuditType === 'CLEARED'
      ? 'ลงพื้นที่ตรวจสอบมิเตอร์ของผู้ใช้ไฟทุกรายแล้ว สภาพสมบูรณ์ กลไกและซีลปกติ ไม่พบการดัดแปลงหรือลักใช้ไฟ (โหลดสูงจากพฤติกรรมผู้ใช้ไฟจริง)'
      : ''
  );
  const [images, setImages] = useState<string[]>(editingViolation?.imageUrls || []);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (editingViolation) {
      const isCl = editingViolation.status === 'CLEARED';
      setAuditMode(isCl ? 'CLEARED' : 'VIOLATION');
      setMeterPeaNo(editingViolation.meterPeaNo);
      setConsumerName(editingViolation.consumerName || '');
      setLocation(editingViolation.location || transformer.location || '');
      setViolationType(editingViolation.violationType);
      setDetectedDate(editingViolation.detectedDate);
      const parsed = parseDateForCalendar(editingViolation.detectedDate);
      setCalendarYear(parsed.year);
      setCalendarMonth(parsed.month);
      setDetectedTime(editingViolation.detectedTime || defaultTime);
      setInspectorName(editingViolation.inspectorName || '');
      setStatus(editingViolation.status);
      setRemark(editingViolation.remark || '');
      setImages(editingViolation.imageUrls || []);
    } else {
      setAuditMode(initialAuditType);
      setMeterPeaNo(initialAuditType === 'CLEARED' ? 'ตรวจสอบมิเตอร์ไม่พบการละเมิด' : '');
      setConsumerName(initialAuditType === 'CLEARED' ? 'ผู้ใช้ไฟทุกรายที่เกาะหม้อแปลง' : '');
      setLocation(transformer.location || '');
      setViolationType(
        initialAuditType === 'CLEARED'
          ? 'ปกติ ไม่พบการกระทำผิดหรือลักใช้ไฟ'
          : (violationTypes[0] || VIOLATION_TYPES[0])
      );
      setDetectedDate(defaultDate);
      const parsedDef = parseDateForCalendar(defaultDate);
      setCalendarYear(parsedDef.year);
      setCalendarMonth(parsedDef.month);
      setDetectedTime(defaultTime);
      setInspectorName('');
      setStatus(initialAuditType === 'CLEARED' ? 'CLEARED' : 'INVESTIGATING');
      setRemark(
        initialAuditType === 'CLEARED'
          ? 'ลงพื้นที่ตรวจสอบมิเตอร์ของผู้ใช้ไฟทุกรายแล้ว สภาพสมบูรณ์ กลไกและซีลปกติ ไม่พบการดัดแปลงหรือลักใช้ไฟ (โหลดสูงจากพฤติกรรมผู้ใช้ไฟจริง)'
          : ''
      );
      setImages([]);
    }
  }, [editingViolation, initialAuditType, transformer.location]);

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
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsCalendarOpen(false);
      }
    }
    if (isDropdownOpen || isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen, isCalendarOpen]);

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
    const isEditing = Boolean(editingViolation);
    try {
      const res = await fetch('/api/violations', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transformerPeaNo: transformer.peaNo,
          meterPeaNo: cleanMeter,
          originalMeterPeaNo: editingViolation?.meterPeaNo,
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
          (isEditing
            ? `แก้ไขข้อมูลการตรวจมิเตอร์ ${cleanMeter} เรียบร้อยแล้ว`
            : auditMode === 'CLEARED'
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
    <div className="fixed inset-0 z-[10000] bg-slate-900/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200/80 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] max-w-xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden mt-auto sm:my-auto transition-all">
        {/* Ultra-thin Minimal Accent Line */}
        <div
          className={`h-1 w-full shrink-0 transition-colors duration-300 ${
            editingViolation
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
              : auditMode === 'CLEARED'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
              : 'bg-gradient-to-r from-rose-500 to-red-600'
          }`}
        />

        {/* Minimal Modal Header — Zero Truncation Layout */}
        <div className="px-4 sm:px-6 pt-3.5 pb-3 bg-white flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors mt-0.5 ${
                editingViolation
                  ? 'bg-blue-50/80 border-blue-200/70 text-blue-600'
                  : auditMode === 'CLEARED'
                  ? 'bg-emerald-50/80 border-emerald-200/70 text-emerald-600'
                  : 'bg-rose-50/80 border-rose-200/70 text-rose-600'
              }`}
            >
              {editingViolation ? (
                <Pencil className="w-4 h-4 text-blue-600" />
              ) : auditMode === 'CLEARED' ? (
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
              ) : (
                <AlertOctagon className="w-4.5 h-4.5 text-rose-600" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {/* Top Meta Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border tabular-nums tracking-tight ${
                    editingViolation
                      ? 'bg-blue-50/90 text-blue-700 border-blue-200/80'
                      : auditMode === 'CLEARED'
                      ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80'
                      : 'bg-rose-50/90 text-rose-700 border-rose-200/80'
                  }`}
                >
                  PEA {transformer.peaNo}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 tabular-nums">
                  {transformer.kva} kVA • {transformer.system}P
                </span>
                {editingViolation && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-600 truncate max-w-[140px]">
                    มิเตอร์: {editingViolation.meterPeaNo}
                  </span>
                )}
              </div>

              {/* Main Title */}
              <h3 className="text-[15px] sm:text-base font-bold text-slate-900 tracking-tight leading-snug">
                {editingViolation
                  ? 'แก้ไขข้อมูลการตรวจสอบมิเตอร์'
                  : auditMode === 'CLEARED'
                  ? 'บันทึกผลตรวจสอบมิเตอร์ (ปกติ)'
                  : 'บันทึกตรวจพบการละเมิดมิเตอร์'}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0 active:scale-95"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sleek Single-Line Segmented Mode Switcher */}
        <div className="px-4 sm:px-6 pb-3 bg-white border-b border-slate-100 shrink-0">
          <div className="p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => handleSwitchMode('VIOLATION')}
              className={`h-8.5 px-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all select-none whitespace-nowrap ${
                auditMode === 'VIOLATION'
                  ? 'bg-white text-rose-600 font-bold shadow-2xs ring-1 ring-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <AlertOctagon className={`w-3.5 h-3.5 shrink-0 ${auditMode === 'VIOLATION' ? 'text-rose-600' : 'text-slate-400'}`} />
              <span className="sm:hidden">พบการละเมิด</span>
              <span className="hidden sm:inline">บันทึกตรวจพบการละเมิด</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('CLEARED')}
              className={`h-8.5 px-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all select-none whitespace-nowrap ${
                auditMode === 'CLEARED'
                  ? 'bg-white text-emerald-700 font-bold shadow-2xs ring-1 ring-slate-200/80'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${auditMode === 'CLEARED' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="sm:hidden">ปกติ (ไม่พบละเมิด)</span>
              <span className="hidden sm:inline">ตรวจสอบแล้ว - ไม่พบละเมิด (ปกติ)</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50/90 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* Section 1: ข้อมูลมิเตอร์และผลการตรวจ / ประเภทการละเมิด */}
          <div
            className={`p-3.5 rounded-2xl border space-y-3 transition-colors ${
              auditMode === 'CLEARED'
                ? 'bg-emerald-50/25 border-emerald-100/90'
                : 'bg-rose-50/20 border-rose-100/80'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    {auditMode === 'CLEARED' ? 'ขอบเขต / มิเตอร์ที่ตรวจ' : 'รหัส PEA มิเตอร์'}{' '}
                    <span className={auditMode === 'CLEARED' ? 'text-emerald-500' : 'text-rose-500'}>*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {auditMode === 'CLEARED' ? 'ระบุเลขหรือตรวจทั้งหมด' : 'หมายเลขมิเตอร์ PEA'}
                  </span>
                </div>
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
                    className={`w-full h-10 px-3.5 rounded-xl bg-white border border-slate-200/90 font-mono text-xs text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:outline-none transition-all font-semibold shadow-2xs ${
                      auditMode === 'CLEARED'
                        ? 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                        : 'focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
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
                      className="text-[10.5px] font-semibold text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1"
                      title="จัดการตัวเลือก (เพิ่ม/ลบข้อความ)"
                    >
                      <Settings2 className="w-3 h-3" />
                      <span>{isManagingTypes ? 'ปิดจัดการ' : 'จัดการตัวเลือก'}</span>
                    </button>
                  )}
                </div>

                {auditMode === 'CLEARED' ? (
                  <input
                    type="text"
                    value={violationType}
                    onChange={(e) => setViolationType(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-white border border-slate-200/90 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all shadow-2xs"
                    placeholder="เช่น ปกติ ไม่พบการกระทำผิดหรือลักใช้ไฟ"
                  />
                ) : (
                  <>
                    {/* กล่องจัดการตัวเลือก เพิ่ม / ลบ */}
                    {isManagingTypes && (
                      <div className="mb-2.5 p-3 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                            <Settings2 className="w-3.5 h-3.5 text-rose-500" />
                            <span>จัดการตัวเลือก</span>
                            <span className="text-slate-400 font-normal">({violationTypes.length})</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleResetViolationTypes}
                            className="text-[10.5px] text-slate-400 hover:text-rose-600 underline transition-colors"
                          >
                            คืนค่าเริ่มต้น
                          </button>
                        </div>

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
                            placeholder="เพิ่มประเภทใหม่..."
                            className="flex-1 h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-rose-500"
                          />
                          <button
                            type="button"
                            onClick={handleAddViolationType}
                            className="px-3 h-8 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all shrink-0 flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>เพิ่ม</span>
                          </button>
                        </div>

                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                          {violationTypes.map((type) => (
                            <div
                              key={type}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50/80 border border-slate-200/70 text-[11px] text-slate-700"
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
                        className={`w-full h-10 px-3.5 rounded-xl bg-white border text-xs font-semibold text-slate-800 flex items-center justify-between transition-all shadow-2xs text-left group ${
                          isDropdownOpen
                            ? 'border-rose-500 ring-2 ring-rose-500/15'
                            : 'border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span className="truncate font-semibold text-slate-800">
                            {violationType || 'เลือกประเภทการละเมิด'}
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                            isDropdownOpen ? 'rotate-180 text-rose-500' : 'group-hover:text-slate-600'
                          }`}
                        />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute z-50 left-0 right-0 mt-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-150">
                          <div className="max-h-52 overflow-y-auto space-y-0.5 custom-scrollbar">
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
                            <span>จัดการตัวเลือก (+เพิ่ม / ลบ)...</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: ผู้ใช้ไฟ และ สถานที่ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                ชื่อผู้ใช้ไฟ / ผู้ครอบครองสถานที่
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="เช่น บจก. นิวเทค / นายสมชาย..."
                  value={consumerName}
                  onChange={(e) => setConsumerName(e.target.value)}
                  className="w-full h-10 pl-8.5 pr-3.5 rounded-xl bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                สถานที่ / จุดติดตั้งมิเตอร์
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="เช่น อาคารพาณิชย์ 3 ชั้น ตรงข้ามปั๊ม..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-10 pl-8.5 pr-3.5 rounded-xl bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 3: วันที่ เวลา (คู่กันบนมือถือ) และ ผู้ตรวจพบ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {/* Field: วันที่ตรวจพบ with Interactive Calendar Popover */}
            <div className="relative" ref={calendarRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-600">
                  วันที่ตรวจพบ <span className="text-rose-500 font-normal">*</span>
                </label>
                <button
                  type="button"
                  onClick={toggleCalendar}
                  className="text-[10.5px] font-semibold text-[#741b77] hover:text-[#58145a] flex items-center gap-0.5 hover:underline cursor-pointer"
                  title="คลิกเพื่อเปิดปฏิทินเลือกวันที่"
                >
                  <span>{isCalendarOpen ? 'ซ่อน' : 'ปฏิทิน'}</span>
                </button>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={toggleCalendar}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#741b77] p-0.5 rounded transition-colors cursor-pointer"
                  title="คลิกเปิดปฏิทิน"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  value={detectedDate}
                  onChange={(e) => setDetectedDate(e.target.value)}
                  onClick={() => {
                    if (!isCalendarOpen) toggleCalendar();
                  }}
                  className={`w-full h-10 pl-8 pr-7 rounded-xl bg-slate-50/60 hover:bg-slate-50 focus:bg-white border text-xs font-mono text-slate-800 focus:outline-none transition-all cursor-pointer ${
                    isCalendarOpen
                      ? 'border-[#741b77] ring-2 ring-purple-600/10 bg-white'
                      : 'border-slate-200/80 focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10'
                  }`}
                  placeholder="DD/MM/YYYY"
                />
                <button
                  type="button"
                  onClick={toggleCalendar}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                  title="เปิด/ปิด ปฏิทิน"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isCalendarOpen ? 'rotate-180 text-[#741b77]' : ''}`} />
                </button>
              </div>

              {/* Minimalist Floating Calendar Popover */}
              {isCalendarOpen && (
                <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150 select-none">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="เดือนก่อนหน้า"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="text-center">
                      <span className="text-xs font-bold text-slate-800 tracking-tight">
                        {THAI_MONTHS[calendarMonth]} {calendarYear + 543}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1 font-normal">
                        ({calendarYear})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="เดือนถัดไป"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {THAI_DAY_HEADERS.map((d) => (
                      <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-0.5">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarGridDays.map((cell, idx) => {
                      const parsedCur = parseDateForCalendar(detectedDate);
                      const isSelected =
                        parsedCur.year === cell.year &&
                        parsedCur.month === cell.month &&
                        parsedCur.day === cell.day;
                      const today = new Date();
                      const isToday =
                        cell.year === today.getFullYear() &&
                        cell.month === today.getMonth() &&
                        cell.day === today.getDate();

                      return (
                        <button
                          key={`${cell.year}_${cell.month}_${cell.day}_${idx}`}
                          type="button"
                          onClick={() => handleSelectCalendarDate(cell.year, cell.month, cell.day)}
                          className={`relative flex items-center justify-center h-8 rounded-xl text-xs font-mono transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-[#741b77] text-white font-bold shadow-xs scale-105 z-10'
                              : cell.isCurrentMonth
                              ? isToday
                                ? 'bg-purple-50 text-[#741b77] font-bold ring-1 ring-[#741b77]/40 hover:bg-purple-100'
                                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                              : 'text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span>{cell.day}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-xs px-1">
                    <button
                      type="button"
                      onClick={handleSelectToday}
                      className="text-[#741b77] hover:text-[#58145a] font-bold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>วันนี้ ({new Date().getDate()}/{new Date().getMonth() + 1})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(false)}
                      className="text-slate-400 hover:text-slate-600 font-medium text-[11px] cursor-pointer"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Field: เวลาที่ตรวจพบ */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold text-slate-600">
                  เวลาที่ตรวจพบ
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setDetectedTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
                  }}
                  className="text-[10.5px] font-semibold text-[#741b77] hover:text-[#58145a] flex items-center gap-0.5 hover:underline cursor-pointer"
                  title="ใส่เวลาปัจจุบัน"
                >
                  <span>ตอนนี้</span>
                </button>
              </div>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={detectedTime}
                  onChange={(e) => setDetectedTime(e.target.value)}
                  className="w-full h-10 pl-8.5 pr-3 rounded-xl bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200/80 text-xs font-mono text-slate-800 focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 transition-all"
                  placeholder="HH:mm"
                />
              </div>
            </div>

            {/* Field: ผู้ตรวจพบ / ช่างเทคนิค */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                ผู้ตรวจพบ / ช่างเทคนิค
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full h-10 pl-8.5 pr-3.5 rounded-xl bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 transition-all"
                  placeholder="ระบุชื่อ-นามสกุล ช่างผู้ตรวจ"
                />
              </div>
            </div>
          </div>

          {/* Section 4: สถานะการดำเนินการ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
              สถานะดำเนินการ
            </label>
            {auditMode === 'CLEARED' ? (
              <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100/90 flex items-center justify-center shrink-0 text-emerald-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-emerald-950 truncate">
                      ตรวจสอบแล้ว • ไม่พบการละเมิด (CLEARED)
                    </div>
                    <p className="text-[10.5px] text-emerald-700/90 truncate">
                      ติดป้ายกำกับหม้อแปลงว่าตรวจมิเตอร์แล้ว โหลดสูงจากการใช้งานตามปกติ
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shrink-0">
                  พ้นข้อสงสัย
                </span>
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
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? opt.id === 'LEGAL_ACTION'
                            ? 'bg-rose-50/80 border-rose-300 text-rose-900 ring-1 ring-rose-500/20'
                            : opt.id === 'RESOLVED'
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 ring-1 ring-emerald-500/20'
                            : opt.id === 'PENDING'
                            ? 'bg-purple-50/80 border-purple-300 text-purple-900 ring-1 ring-purple-500/20'
                            : 'bg-amber-50/80 border-amber-300 text-amber-900 ring-1 ring-amber-500/20'
                          : 'bg-slate-50/50 hover:bg-slate-50 border-slate-200/80 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11.5px] font-bold leading-tight truncate">{opt.label}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug truncate">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 5: รายละเอียด / หมายเหตุ */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
              รายละเอียด / หมายเหตุพฤติการณ์
            </label>
            <textarea
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="ระบุพฤติการณ์ เช่น ต่อสายไฟข้ามมิเตอร์, วัดกระแสด้านโหลดได้ 45A แต่มิเตอร์ไม่หมุน..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200/80 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#741b77] focus:ring-2 focus:ring-purple-600/10 transition-all resize-none leading-relaxed"
            />
          </div>

          {/* Section 6: แนบรูปถ่ายหลักฐาน */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-400" />
                <span>รูปถ่ายหลักฐานหน้างาน</span>
                <span className="text-slate-400 font-normal">({images.length} รูป)</span>
              </label>

              <label className="cursor-pointer text-[11px] font-bold text-[#741b77] hover:text-purple-700 hover:underline flex items-center gap-1">
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
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2.5 bg-slate-50/60 rounded-xl border border-slate-200/80">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200/90 group bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`หลักฐานที่ ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
                      title="ลบรูปนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2.5 py-3 px-4 border border-dashed border-slate-200 hover:border-[#741b77]/50 bg-slate-50/40 hover:bg-slate-50/80 rounded-xl cursor-pointer transition-all">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-xs font-semibold text-slate-700 truncate">แตะเพื่อถ่ายภาพหรือแนบรูปหลักฐาน</div>
                  <div className="text-[10.5px] text-slate-400 truncate">ภาพสภาพมิเตอร์, จุดต่อตรง, การวัดกระแส</div>
                </div>
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

        {/* Minimal Sticky Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-between gap-2.5 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-10 px-4 rounded-xl border border-slate-200/90 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors active:scale-95 shrink-0"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 sm:flex-initial h-10 px-5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs hover:shadow transition-all active:scale-[0.99] disabled:opacity-60 ${
              editingViolation
                ? 'bg-blue-600 hover:bg-blue-700'
                : auditMode === 'CLEARED'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : editingViolation ? (
              <>
                <Save className="w-4 h-4 text-white" />
                <span>บันทึกการแก้ไขข้อมูล</span>
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
