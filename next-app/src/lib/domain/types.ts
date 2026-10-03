import { z } from 'zod';

/**
 * PEA Transformer Domain Types
 * Derived from GLOSSARY.md and engineering specifications
 */

export const TransformerMasterSchema = z.object({
  peaNo: z.string().min(1),
  system: z.enum(['1', '3']),
  kva: z.number().positive(),
  brand: z.string().default(''),
  location: z.string().default(''),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
});
export type TransformerMaster = z.infer<typeof TransformerMasterSchema>;

export const FeederRecordSchema = z.object({
  name: z.string(), // e.g. "F1", "F2", "F3", "รวม"
  currentA: z.number().default(0),
  currentB: z.number().default(0),
  currentC: z.number().default(0),
  currentN: z.number().default(0),
  note: z.string().default(''),
  cableSize: z.string().default(''),
  // Transformer secondary terminal voltage
  vt_ab: z.number().default(0),
  vt_bc: z.number().default(0),
  vt_ca: z.number().default(0),
  vt_an: z.number().default(0),
  vt_bn: z.number().default(0),
  vt_cn: z.number().default(0),
  // Feeder line end voltage
  ve_ab: z.number().default(0),
  ve_bc: z.number().default(0),
  ve_ca: z.number().default(0),
  ve_an: z.number().default(0),
  ve_bn: z.number().default(0),
  ve_cn: z.number().default(0),
});
export type FeederRecord = z.infer<typeof FeederRecordSchema>;

export const MeasurementSessionSchema = z.object({
  peaNo: z.string(),
  date: z.string(), // "DD/MM/YYYY"
  time: z.string(), // "HH:MM:SS"
  tap: z.string().default('3'),
  imageUrls: z.array(z.string()).default([]),
  feeders: z.array(FeederRecordSchema),
  total: FeederRecordSchema,
});
export type MeasurementSession = z.infer<typeof MeasurementSessionSchema>;

export interface EngineeringStatus {
  iMax: number;          // Max rated current = kVA * 1000 / (sqrt(3) * 400)
  maxCurrent: number;    // max(Ia, Ib, Ic)
  avgCurrent: number;    // (Ia + Ib + Ic) / 3
  pctLoad: number;       // (maxCurrent / iMax) * 100
  pctUnbalance: number;  // (maxDeviation / avgCurrent) * 100
  loadStatus: 'NORMAL' | 'WARNING' | 'OVERLOAD'; // <=70% (ปกติ), 70-80% (เฝ้าระวัง), >80% (โหลดเกินพิกัดตามเกณฑ์ กฟภ.)
  unbalanceStatus: 'GOOD' | 'WARNING' | 'CRITICAL'; // <=20%, 20-30%, >30%
  // Harmonic / Bitcoin mining risk
  nTheoretical: number;
  harmonicCurrent: number;
  isHarmonicRisk: boolean;
  // Undervoltage detection
  isUndervoltage: boolean;
  undervoltagePhases: ('A' | 'B' | 'C')[];
  minVoltage: number;
}

export type MapMarkerColor = 'red' | 'orange' | 'done';

export interface TransformerWithStatus extends TransformerMaster {
  statusColor: MapMarkerColor;
  latestSession?: MeasurementSession;
  historySessions?: MeasurementSession[];
  engineeringStatus?: EngineeringStatus;
  pendingTask?: {
    orderDate: string;
    assigner: string;
  };
}

/**
 * Matt Pocock Strict Boundary Schemas (Parse, Don't Validate)
 */
export const RegisterTransformerInputSchema = z.object({
  peaNo: z.string().trim().min(1, 'กรุณาระบุรหัส PEANO หม้อแปลง'),
  system: z.enum(['1', '3']),
  kva: z.number().positive('ค่าพิกัด kVA ต้องมากกว่า 0'),
  brand: z.string().trim().optional().default(''),
  location: z.string().trim().optional().default(''),
  lat: z.number().nullable().optional().default(null),
  lng: z.number().nullable().optional().default(null),
});
export type RegisterTransformerInput = z.infer<typeof RegisterTransformerInputSchema>;

export const DeleteTransformerInputSchema = z.object({
  peaNo: z.string().trim().min(1, 'กรุณาระบุรหัส PEANO หม้อแปลงที่ต้องการลบ'),
});
export type DeleteTransformerInput = z.infer<typeof DeleteTransformerInputSchema>;

export const FeederInputItemSchema = z.object({
  name: z.string(),
  currentA: z.number().default(0),
  currentB: z.number().default(0),
  currentC: z.number().default(0),
  currentN: z.number().default(0),
  note: z.string().optional().default(''),
  cableSize: z.string().optional().default(''),
  vt_ab: z.number().optional().default(0),
  vt_bc: z.number().optional().default(0),
  vt_ca: z.number().optional().default(0),
  vt_an: z.number().optional().default(0),
  vt_bn: z.number().optional().default(0),
  vt_cn: z.number().optional().default(0),
  ve_ab: z.number().optional().default(0),
  ve_bc: z.number().optional().default(0),
  ve_ca: z.number().optional().default(0),
  ve_an: z.number().optional().default(0),
  ve_bn: z.number().optional().default(0),
  ve_cn: z.number().optional().default(0),
});
export type FeederInputItem = z.infer<typeof FeederInputItemSchema>;

export const UpdateRecordSessionInputSchema = z.object({
  peaNo: z.string().trim().min(1, 'กรุณาระบุรหัส PEANO หม้อแปลง'),
  originalDate: z.string().min(1, 'กรุณาระบุวันที่'),
  originalTime: z.string().min(1, 'กรุณาระบุเวลา'),
  tap: z.string().optional().default('3'),
  feeders: z.array(FeederInputItemSchema).min(1, 'ต้องมีข้อมูลฟีดเดอร์อย่างน้อย 1 รายการ'),
});
export type UpdateRecordSessionInput = z.infer<typeof UpdateRecordSessionInputSchema>;

export const TotalInputItemSchema = z.object({
  name: z.string().optional().default('รวม'),
  currentA: z.number().default(0),
  currentB: z.number().default(0),
  currentC: z.number().default(0),
  currentN: z.number().default(0),
  note: z.string().optional().default(''),
  cableSize: z.string().optional(),
  vt_ab: z.number().optional(),
  vt_bc: z.number().optional(),
  vt_ca: z.number().optional(),
  vt_an: z.number().optional(),
  vt_bn: z.number().optional(),
  vt_cn: z.number().optional(),
  ve_ab: z.number().optional(),
  ve_bc: z.number().optional(),
  ve_ca: z.number().optional(),
  ve_an: z.number().optional(),
  ve_bn: z.number().optional(),
  ve_cn: z.number().optional(),
});
export type TotalInputItem = z.infer<typeof TotalInputItemSchema>;

export const CreateRecordSessionInputSchema = z.object({
  action: z.string().optional(),
  peaNo: z.string().trim().min(1, 'กรุณาระบุรหัส PEANO หม้อแปลง'),
  date: z.string().min(1, 'กรุณาระบุวันที่'),
  time: z.string().min(1, 'กรุณาระบุเวลา'),
  tap: z.string().optional().default('3'),
  mode: z.string().optional().default('full'),
  feeders: z.array(FeederInputItemSchema).min(1, 'ต้องมีข้อมูลฟีดเดอร์อย่างน้อย 1 รายการ'),
  total: TotalInputItemSchema.optional(),
  globalNote: z.string().optional().default(''),
  images: z.array(z.string()).optional().default([]),
});
export type CreateRecordSessionInput = z.infer<typeof CreateRecordSessionInputSchema>;

export const DeleteRecordSessionInputSchema = z.object({
  peaNo: z.string().trim().min(1, 'กรุณาระบุรหัส PEANO หม้อแปลง'),
  date: z.string().min(1, 'กรุณาระบุวันที่รอบตรวจวัดที่ต้องการลบ'),
  time: z.string().min(1, 'กรุณาระบุเวลารอบตรวจวัดที่ต้องการลบ'),
});
export type DeleteRecordSessionInput = z.infer<typeof DeleteRecordSessionInputSchema>;

export const AiAnalyzeInputSchema = z.object({
  peaNo: z.string().trim().optional(),
  transformer: z.record(z.string(), z.unknown()).optional(),
}).refine((data) => Boolean(data.peaNo || data.transformer), {
  message: 'กรุณาระบุ peaNo หรือข้อมูล transformer',
});
export type AiAnalyzeInput = z.infer<typeof AiAnalyzeInputSchema>;

export const DriveImageQuerySchema = z.object({
  id: z.string().regex(/^[-\w]{25,}$/, 'Google Drive File ID ไม่ถูกต้อง'),
});
export type DriveImageQuery = z.infer<typeof DriveImageQuerySchema>;

export const CreateTaskInputSchema = z.object({
  peaNo: z.string().trim().min(1, 'กรุณาระบุรหัส PEANO หม้อแปลง'),
  assigner: z.string().optional().default('ผู้ดูแลระบบ (Admin)'),
  note: z.string().optional().default(''),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const CancelTaskInputSchema = z.object({
  peaNo: z.string().trim().min(1, 'กรุณาระบุรหัส PEANO หม้อแปลง'),
});
export type CancelTaskInput = z.infer<typeof CancelTaskInputSchema>;

/**
 * Matt Pocock Total TypeScript Standards
 */
export type SheetCellValue = string | number | boolean | null;
export type SheetRow = SheetCellValue[];

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error && typeof (error as Record<string, unknown>).message === 'string') {
    return (error as Record<string, unknown>).message as string;
  }
  return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
}

export type OfflineRecordItem = CreateRecordSessionInput & { timestamp?: number };

