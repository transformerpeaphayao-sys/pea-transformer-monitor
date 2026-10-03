import { describe, it, expect } from 'vitest';
import {
  safeFloat,
  calculateIMax,
  calculateVectorNeutral,
  detectHarmonicRisk,
  detectUndervoltage,
  calculateEngineeringStatus,
  getDriveFileId,
  extractDriveFileIds,
  getDriveThumbnailUrl,
  computeFeederStatus,
} from './calculations';
import {
  FeederRecord,
  RegisterTransformerInputSchema,
  DeleteTransformerInputSchema,
  UpdateRecordSessionInputSchema,
  CreateRecordSessionInputSchema,
  AiAnalyzeInputSchema,
  DriveImageQuerySchema,
} from './types';

describe('Matt Pocock TDD Seams: PEA Engineering Calculations', () => {
  it('safeFloat: parses formatted numbers, units, negative numbers and invalid values correctly', () => {
    expect(safeFloat('1,250.50 A')).toBe(1250.5);
    expect(safeFloat(' -45.2 V ')).toBe(-45.2);
    expect(safeFloat('')).toBe(0);
    expect(safeFloat(null)).toBe(0);
    expect(safeFloat(undefined)).toBe(0);
    expect(safeFloat(NaN)).toBe(0);
    expect(safeFloat('invalid', 230)).toBe(230);
  });

  it('calculateIMax: matches standard 3-phase 400V transformer rating formulas', () => {
    // 100 kVA -> (100 * 1000) / (sqrt(3) * 400) = 144.337567 A
    const iMax100 = calculateIMax(100, '3');
    expect(iMax100).toBeCloseTo(144.34, 1);

    // 50 kVA -> 72.17 A
    const iMax50 = calculateIMax(50, '3');
    expect(iMax50).toBeCloseTo(72.17, 1);
  });

  it('calculateVectorNeutral: calculates theoretical vector neutral for balanced and unbalanced loads', () => {
    // Balanced 3-phase: 50A, 50A, 50A -> In = 0 A
    expect(calculateVectorNeutral(50, 50, 50)).toBeCloseTo(0, 2);

    // Unbalanced: 40A, 10A, 10A -> In = sqrt(1600+100+100 - 400-100-400) = sqrt(900) = 30 A
    expect(calculateVectorNeutral(40, 10, 10)).toBeCloseTo(30.0, 2);
  });

  it('detectHarmonicRisk: identifies crypto-mining 3rd harmonic load without false positives on zero neutral', () => {
    // Case 1: Unmeasured neutral (N=0A) when phases are unbalanced (40A, 10A, 10A, In_theory=30A)
    // Must NOT flag false positive!
    const unmeasured = detectHarmonicRisk(40, 10, 10, 0);
    expect(unmeasured.isRisk).toBe(false);
    expect(unmeasured.harmonicCurrent).toBe(0);

    // Case 2: Crypto mining load with massive 3rd-harmonic neutral current
    // Ia=50A, Ib=50A, Ic=50A (In_theory = 0A), In_measured = 35A (>15A & >1.3*In_cal)
    const cryptoRisk = detectHarmonicRisk(50, 50, 50, 35);
    expect(cryptoRisk.isRisk).toBe(true);
    expect(cryptoRisk.harmonicCurrent).toBeCloseTo(35.0, 1);
  });

  it('detectUndervoltage: flags line-to-neutral drop below 207V ignoring unmeasured zeros', () => {
    // Normal 230V
    const normal = detectUndervoltage(228, 230, 225);
    expect(normal.isUndervoltage).toBe(false);
    expect(normal.phases).toEqual([]);

    // Zero unmeasured inputs
    const unmeasured = detectUndervoltage(0, 0, 0);
    expect(unmeasured.isUndervoltage).toBe(false);

    // True voltage drop on phase B & C
    const drop = detectUndervoltage(220, 198.5, 204.0);
    expect(drop.isUndervoltage).toBe(true);
    expect(drop.phases).toEqual(['B', 'C']);
    expect(drop.minVoltage).toBe(198.5);
  });

  it('calculateEngineeringStatus: calculates full status for a 100 kVA transformer at 100% load & 50% unbalance', () => {
    const totalFeeder: FeederRecord = {
      name: 'รวม',
      currentA: 144.337567,
      currentB: 72.168783,
      currentC: 72.168783,
      currentN: 10,
      note: 'ทดสอบ',
      cableSize: '95',
      vt_ab: 0, vt_bc: 0, vt_ca: 0, vt_an: 228, vt_bn: 225, vt_cn: 230,
      ve_ab: 0, ve_bc: 0, ve_ca: 0, ve_an: 0, ve_bn: 0, ve_cn: 0,
    };

    const status = calculateEngineeringStatus(totalFeeder, 100, '3');
    expect(status.pctLoad).toBeCloseTo(100.0, 1);
    expect(status.loadStatus).toBe('OVERLOAD'); // >80% is OVERLOAD according to PEA standard
    expect(status.pctUnbalance).toBeCloseTo(50.0, 1);
    expect(status.unbalanceStatus).toBe('CRITICAL');
  });

  it('getDriveThumbnailUrl: extracts file ID and formats direct Google Drive thumbnail URL', () => {
    const driveUrl = 'https://drive.google.com/file/d/17VF7FD1-BmJ2JuKnnF-blssaiw4M5-32/view?usp=drivesdk';
    expect(getDriveFileId(driveUrl)).toBe('17VF7FD1-BmJ2JuKnnF-blssaiw4M5-32');
    expect(getDriveThumbnailUrl(driveUrl, 400)).toBe(
      '/api/drive-image?id=17VF7FD1-BmJ2JuKnnF-blssaiw4M5-32'
    );

    // Non-drive URL passes through untouched
    expect(getDriveThumbnailUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
    expect(getDriveThumbnailUrl('')).toBe('');
  });

  it('extractDriveFileIds: scans strings, arrays, rows, and objects to extract and deduplicate Drive file IDs', () => {
    const singleUrl = 'https://drive.google.com/file/d/16V2W7GAIXSCXlQRIBtKhIoc3K1vVirQC/view';
    expect(extractDriveFileIds(singleUrl)).toEqual(['16V2W7GAIXSCXlQRIBtKhIoc3K1vVirQC']);

    const multipleInOneString = 'https://drive.google.com/file/d/ID_ONE_111111111111111111111/view, https://drive.google.com/open?id=ID_TWO_222222222222222222222';
    expect(extractDriveFileIds(multipleInOneString)).toEqual([
      'ID_ONE_111111111111111111111',
      'ID_TWO_222222222222222222222',
    ]);

    const nestedRows = [
      ['2026-10-01', '12:00', '59-5554', 'https://drive.google.com/file/d/ID_ONE_111111111111111111111/view'],
      ['2026-10-02', '14:00', '59-5554', 'https://drive.google.com/file/d/ID_THREE_333333333333333333333/view'],
      ['Duplicate row with same ID', 'https://drive.google.com/open?id=ID_ONE_111111111111111111111'],
    ];
    const extracted = extractDriveFileIds(nestedRows);
    expect(extracted).toHaveLength(2);
    expect(extracted).toContain('ID_ONE_111111111111111111111');
    expect(extracted).toContain('ID_THREE_333333333333333333333');

    // Handles empty, null, undefined, non-drive values
    expect(extractDriveFileIds([])).toEqual([]);
    expect(extractDriveFileIds(null)).toEqual([]);
    expect(extractDriveFileIds(['non-drive-url', 'http://example.com/test.png', 12345])).toEqual([]);
  });

  it('computeFeederStatus: computes status alerts matching PEA 80% overload thresholds', () => {
    // Normal balanced load
    const normal = computeFeederStatus(20, 20, 20, 100);
    expect(normal.text).toBe('ปกติ');
    expect(normal.type).toBe('normal');

    // Unbalance > 30%
    const unb = computeFeederStatus(16.7, 3.4, 0.0, 50);
    expect(unb.text).toContain('Unbalance (วิกฤต)');
    expect(unb.type).toBe('critical');

    // Overload > 80% (50 kVA 3-phase iMax is ~72.17A, 60A is ~83.1%)
    const ovl80 = computeFeederStatus(60, 60, 60, 50);
    expect(ovl80.text).toContain('Overload (>80%)');
    expect(ovl80.type).toBe('critical');

    // Overload > 100% (50 kVA 3-phase iMax is ~72.17A)
    const ovl100 = computeFeederStatus(80, 80, 80, 50);
    expect(ovl100.text).toContain('Overload (>100%)');
    expect(ovl100.type).toBe('critical');

    // Warning 70-80% (50 kVA 3-phase iMax is ~72.17A, 53A is ~73.4%)
    const warn70 = computeFeederStatus(53, 53, 53, 50);
    expect(warn70.text).toContain('ใกล้เต็มพิกัด');
    expect(warn70.type).toBe('warning');

    // Empty/zero load
    const empty = computeFeederStatus(0, 0, 0, 50);
    expect(empty.text).toBe('—');
    expect(empty.type).toBe('none');
  });
});

describe('Matt Pocock "Parse, Don\'t Validate": Zod Boundary Schemas', () => {
  it('RegisterTransformerInputSchema: validates correct input and rejects invalid kVA or system', () => {
    const valid = RegisterTransformerInputSchema.safeParse({
      peaNo: '59-5554',
      system: '3',
      kva: 100,
      brand: 'Tirathai',
      location: 'หน้าตลาด',
      lat: 13.7563,
      lng: 100.5018,
    });
    expect(valid.success).toBe(true);

    const zeroKva = RegisterTransformerInputSchema.safeParse({
      peaNo: '59-5554',
      system: '3',
      kva: 0,
    });
    expect(zeroKva.success).toBe(false);

    const invalidSystem = RegisterTransformerInputSchema.safeParse({
      peaNo: '59-5554',
      system: '2',
      kva: 50,
    });
    expect(invalidSystem.success).toBe(false);

    const emptyPeaNo = RegisterTransformerInputSchema.safeParse({
      peaNo: '   ',
      system: '3',
      kva: 50,
    });
    expect(emptyPeaNo.success).toBe(false);
  });

  it('DeleteTransformerInputSchema: enforces non-empty PEANO', () => {
    expect(DeleteTransformerInputSchema.safeParse({ peaNo: '59-5554' }).success).toBe(true);
    expect(DeleteTransformerInputSchema.safeParse({ peaNo: '' }).success).toBe(false);
    expect(DeleteTransformerInputSchema.safeParse({ peaNo: '   ' }).success).toBe(false);
  });

  it('UpdateRecordSessionInputSchema: validates session structure and requires at least 1 feeder', () => {
    const valid = UpdateRecordSessionInputSchema.safeParse({
      peaNo: '59-5554',
      originalDate: '2026-10-02',
      originalTime: '14:30',
      feeders: [
        {
          name: 'ฟีดเดอร์ 1',
          currentA: 25.5,
          currentB: 24.0,
          currentC: 26.2,
          currentN: 3.1,
        },
      ],
    });
    expect(valid.success).toBe(true);

    const noFeeders = UpdateRecordSessionInputSchema.safeParse({
      peaNo: '59-5554',
      originalDate: '2026-10-02',
      originalTime: '14:30',
      feeders: [],
    });
    expect(noFeeders.success).toBe(false);
  });

  it('CreateRecordSessionInputSchema: validates new field measurement input structure', () => {
    const valid = CreateRecordSessionInputSchema.safeParse({
      peaNo: '59-5554',
      date: '2026-10-02',
      time: '15:32:00',
      tap: '3',
      feeders: [
        {
          name: 'ฟีดเดอร์ 1',
          currentA: 25.0,
          currentB: 28.0,
          currentC: 20.0,
          currentN: 14.0,
        },
      ],
      images: ['https://drive.google.com/uc?id=test-image-12345'],
    });
    expect(valid.success).toBe(true);

    const emptyFeeders = CreateRecordSessionInputSchema.safeParse({
      peaNo: '59-5554',
      date: '2026-10-02',
      time: '15:32:00',
      feeders: [],
    });
    expect(emptyFeeders.success).toBe(false);
  });

  it('AiAnalyzeInputSchema: requires either peaNo or transformer object', () => {
    expect(AiAnalyzeInputSchema.safeParse({ peaNo: '59-5554' }).success).toBe(true);
    expect(AiAnalyzeInputSchema.safeParse({ transformer: { peaNo: '59-5554' } }).success).toBe(true);
    expect(AiAnalyzeInputSchema.safeParse({}).success).toBe(false);
  });

  it('DriveImageQuerySchema: validates Google Drive 25+ alphanumeric ID format', () => {
    expect(DriveImageQuerySchema.safeParse({ id: '16V2W7GAIXSCXlQRIBtKhIoc3K1vVirQC' }).success).toBe(true);
    expect(DriveImageQuerySchema.safeParse({ id: '123' }).success).toBe(false);
    expect(DriveImageQuerySchema.safeParse({ id: '../../../etc/passwd' }).success).toBe(false);
  });
});

describe('Matt Pocock Defensive Engineering: Boundary Invariants & Zero Division Safety', () => {
  it('calculateIMax: handles 0 kVA, negative kVA, and single phase without throwing', () => {
    expect(calculateIMax(0, '3')).toBe(0);
    expect(calculateIMax(-50, '3')).toBe(0);
    expect(calculateIMax(50, '1')).toBeCloseTo((50 * 1000) / 230, 2);
  });

  it('calculateVectorNeutral: clamps negative radicands to 0', () => {
    expect(calculateVectorNeutral(0, 0, 0)).toBe(0);
    expect(calculateVectorNeutral(100, 100, 100)).toBeCloseTo(0, 4);
  });

  it('calculateEngineeringStatus: avoids division by zero when currents and kVA are 0', () => {
    const zeroFeeder: FeederRecord = {
      name: 'รวม',
      currentA: 0,
      currentB: 0,
      currentC: 0,
      currentN: 0,
      note: '',
      cableSize: '',
      vt_ab: 0, vt_bc: 0, vt_ca: 0, vt_an: 0, vt_bn: 0, vt_cn: 0,
      ve_ab: 0, ve_bc: 0, ve_ca: 0, ve_an: 0, ve_bn: 0, ve_cn: 0,
    };
    const status = calculateEngineeringStatus(zeroFeeder, 0, '3');
    expect(status.pctLoad).toBe(0);
    expect(status.pctUnbalance).toBe(0);
    expect(status.loadStatus).toBe('NORMAL');
    expect(Number.isFinite(status.pctLoad)).toBe(true);
    expect(Number.isFinite(status.pctUnbalance)).toBe(true);
  });
});

