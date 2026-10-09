import { describe, it, expect } from 'vitest';
import {
  CreateViolationInputSchema,
  DeleteViolationInputSchema,
  UpdateViolationStatusInputSchema,
  MeterViolationSchema,
} from './types';

describe('Meter Violations Schema Validation', () => {
  it('validates a valid CreateViolationInput', () => {
    const input = {
      transformerPeaNo: '51-014140',
      meterPeaNo: '52-098765',
      consumerName: 'สมชาย ค้าขาย',
      location: 'หน้าตลาดสด',
      violationType: 'ต่อตรง (Bypass)',
      detectedDate: '09/10/2026',
      detectedTime: '14:30',
      inspectorName: 'ช่างทดสอบ',
      status: 'INVESTIGATING',
      remark: 'พบคลิปหนีบต่อตรงไม่ผ่านมิเตอร์',
      images: ['https://drive.google.com/test.jpg'],
    };

    const parsed = CreateViolationInputSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.transformerPeaNo).toBe('51-014140');
      expect(parsed.data.meterPeaNo).toBe('52-098765');
      expect(parsed.data.status).toBe('INVESTIGATING');
    }
  });

  it('rejects CreateViolationInput when required fields are missing', () => {
    const invalidInput = {
      transformerPeaNo: '',
      meterPeaNo: '',
      violationType: '',
      detectedDate: '',
    };

    const parsed = CreateViolationInputSchema.safeParse(invalidInput);
    expect(parsed.success).toBe(false);
  });

  it('validates DeleteViolationInputSchema', () => {
    const valid = DeleteViolationInputSchema.safeParse({
      transformerPeaNo: '51-014140',
      meterPeaNo: '52-098765',
    });
    expect(valid.success).toBe(true);

    const invalid = DeleteViolationInputSchema.safeParse({
      transformerPeaNo: '',
      meterPeaNo: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates UpdateViolationStatusInputSchema', () => {
    const valid = UpdateViolationStatusInputSchema.safeParse({
      transformerPeaNo: '51-014140',
      meterPeaNo: '52-098765',
      status: 'LEGAL_ACTION',
    });
    expect(valid.success).toBe(true);

    const invalid = UpdateViolationStatusInputSchema.safeParse({
      transformerPeaNo: '51-014140',
      meterPeaNo: '52-098765',
      status: 'INVALID_STATUS',
    });
    expect(invalid.success).toBe(false);

    const cleared = UpdateViolationStatusInputSchema.safeParse({
      transformerPeaNo: '51-014140',
      meterPeaNo: '52-098765',
      status: 'CLEARED',
    });
    expect(cleared.success).toBe(true);
  });

  it('validates CreateViolationInputSchema with CLEARED status', () => {
    const clearedInput = {
      transformerPeaNo: '51-014140',
      meterPeaNo: 'ตรวจสอบมิเตอร์ไม่พบการละเมิด',
      violationType: 'ปกติ ไม่พบการกระทำผิดหรือลักใช้ไฟ',
      detectedDate: '09/10/2026',
      status: 'CLEARED',
      remark: 'ลงพื้นที่ตรวจมิเตอร์ทุกรายแล้ว สภาพสมบูรณ์ กลไกและซีลปกติ',
    };

    const parsed = CreateViolationInputSchema.safeParse(clearedInput);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('CLEARED');
    }
  });

  it('validates MeterViolationSchema with defaults', () => {
    const item = {
      transformerPeaNo: '51-014140',
      meterPeaNo: '52-098765',
      violationType: 'เหมืองขุดบิตคอยน์',
      detectedDate: '09/10/2026',
    };
    const parsed = MeterViolationSchema.safeParse(item);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.status).toBe('INVESTIGATING');
      expect(parsed.data.consumerName).toBeUndefined();
      expect(parsed.data.imageUrls).toBeUndefined();
    }
  });
});
