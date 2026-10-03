import { EngineeringStatus, FeederRecord } from './types';

/**
 * Pure engineering calculations module for PEA Transformer Load Monitoring
 * Deep module: Small interface, pure physics calculations, zero side-effects.
 */

export function safeFloat(val: unknown, defaultValue: number = 0.0): number {
  if (val === null || val === undefined || val === '') return defaultValue;
  if (typeof val === 'number') return isNaN(val) ? defaultValue : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    const match = cleaned.match(/[-+]?\d*\.?\d+/);
    if (!match) return defaultValue;
    const num = parseFloat(match[0]);
    return isNaN(num) ? defaultValue : num;
  }
  return defaultValue;
}

/**
 * Calculates rated maximum current for a 3-phase 400V transformer
 * I_max = (kVA * 1000) / (sqrt(3) * 400)
 */
export function calculateIMax(kva: number, system: '1' | '3' = '3'): number {
  const safeKva = Math.max(0, safeFloat(kva));
  if (safeKva === 0) return 0;
  if (system === '1') {
    return (safeKva * 1000) / 230;
  }
  return (safeKva * 1000) / (Math.sqrt(3) * 400);
}

/**
 * Theoretical vector neutral current for 3-phase 4-wire linear load:
 * In_theory = sqrt(Ia^2 + Ib^2 + Ic^2 - Ia*Ib - Ib*Ic - Ic*Ia)
 */
export function calculateVectorNeutral(ia: number, ib: number, ic: number): number {
  const a = safeFloat(ia);
  const b = safeFloat(ib);
  const c = safeFloat(ic);
  const radicand = (a * a) + (b * b) + (c * c) - (a * b) - (b * c) - (c * a);
  return Math.sqrt(Math.max(0, radicand));
}

/**
 * Evaluates 3rd-harmonic / Crypto-mining load risk from excess neutral current
 * Returns: { isRisk, nTheory, harmonicCurrent }
 */
export function detectHarmonicRisk(
  ia: number,
  ib: number,
  ic: number,
  inMeasured: number,
  thresholdDiff: number = 15.0
): { isRisk: boolean; nTheory: number; harmonicCurrent: number } {
  const nTheory = calculateVectorNeutral(ia, ib, ic);
  const measured = safeFloat(inMeasured);
  const harmonicCurrent = Math.max(0, measured - nTheory);
  const isRisk = harmonicCurrent > thresholdDiff && measured > (nTheory * 1.30);
  return { isRisk, nTheory, harmonicCurrent };
}

/**
 * Checks for secondary line-to-neutral undervoltage below threshold (standard: 207V)
 * Note: ignores 0V unmeasured values (<= 10V)
 */
export function detectUndervoltage(
  van: number,
  vbn: number,
  vcn: number,
  threshold: number = 207.0
): { isUndervoltage: boolean; phases: ('A' | 'B' | 'C')[]; minVoltage: number } {
  const an = safeFloat(van);
  const bn = safeFloat(vbn);
  const cn = safeFloat(vcn);
  const phases: ('A' | 'B' | 'C')[] = [];
  let minV = Infinity;

  if (an > 10 && an < threshold) {
    phases.push('A');
    minV = Math.min(minV, an);
  }
  if (bn > 10 && bn < threshold) {
    phases.push('B');
    minV = Math.min(minV, bn);
  }
  if (cn > 10 && cn < threshold) {
    phases.push('C');
    minV = Math.min(minV, cn);
  }

  return {
    isUndervoltage: phases.length > 0,
    phases,
    minVoltage: phases.length > 0 ? minV : 0,
  };
}

/**
 * Calculates complete engineering status (%UF, %Unbalance, Harmonic, Undervoltage)
 */
export function calculateEngineeringStatus(
  totalFeeder: FeederRecord,
  kva: number,
  system: '1' | '3' = '3'
): EngineeringStatus {
  const ia = safeFloat(totalFeeder.currentA);
  const ib = safeFloat(totalFeeder.currentB);
  const ic = safeFloat(totalFeeder.currentC);
  const inVal = safeFloat(totalFeeder.currentN);

  const iMax = calculateIMax(kva, system);
  const maxCurrent = Math.max(ia, ib, ic);
  const avgCurrent = (ia + ib + ic) / 3;

  const pctLoad = iMax > 0 ? (maxCurrent / iMax) * 100 : 0;
  
  let pctUnbalance = 0;
  if (avgCurrent > 0) {
    const maxDev = Math.max(
      Math.abs(ia - avgCurrent),
      Math.abs(ib - avgCurrent),
      Math.abs(ic - avgCurrent)
    );
    pctUnbalance = (maxDev / avgCurrent) * 100;
  }

  // PEA Standard: %UF > 80% is considered OVERLOAD (โหลดเกินพิกัดตามเกณฑ์ กฟภ.)
  const loadStatus: EngineeringStatus['loadStatus'] = 
    pctLoad > 80 ? 'OVERLOAD' : pctLoad > 70 ? 'WARNING' : 'NORMAL';

  const unbalanceStatus: EngineeringStatus['unbalanceStatus'] =
    pctUnbalance > 30 ? 'CRITICAL' : pctUnbalance > 20 ? 'WARNING' : 'GOOD';

  const { isRisk, nTheory, harmonicCurrent } = detectHarmonicRisk(ia, ib, ic, inVal);

  // Check undervoltage from line end (ve) or terminal (vt)
  const van = totalFeeder.ve_an > 0 ? totalFeeder.ve_an : totalFeeder.vt_an;
  const vbn = totalFeeder.ve_bn > 0 ? totalFeeder.ve_bn : totalFeeder.vt_bn;
  const vcn = totalFeeder.ve_cn > 0 ? totalFeeder.ve_cn : totalFeeder.vt_cn;
  const { isUndervoltage, phases, minVoltage } = detectUndervoltage(van, vbn, vcn);

  return {
    iMax,
    maxCurrent,
    avgCurrent,
    pctLoad,
    pctUnbalance,
    loadStatus,
    unbalanceStatus,
    nTheoretical: nTheory,
    harmonicCurrent,
    isHarmonicRisk: isRisk,
    isUndervoltage,
    undervoltagePhases: phases,
    minVoltage,
  };
}

/**
 * Extracts Google Drive file ID from standard drive URLs
 */
export function getDriveFileId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:\/d\/|id=)([-\w]{25,})/);
  return match ? match[1] : null;
}

/**
 * Recursively scans strings, arrays, or row structures to extract all unique Google Drive file IDs.
 */
export function extractDriveFileIds(input: unknown): string[] {
  const ids = new Set<string>();
  const regex = /(?:\/d\/|id=)([-\w]{25,})/g;

  function scan(val: unknown) {
    if (val === null || val === undefined) return;
    if (Array.isArray(val)) {
      for (const item of val) scan(item);
    } else if (typeof val === 'object') {
      for (const prop of Object.values(val as Record<string, unknown>)) {
        scan(prop);
      }
    } else if (typeof val === 'string') {
      const matches = val.matchAll(regex);
      for (const m of matches) {
        if (m[1]) ids.add(m[1]);
      }
    }
  }

  scan(input);
  return Array.from(ids);
}

/**
 * Converts Google Drive URL to a direct displayable thumbnail image URL
 */
export function getDriveThumbnailUrl(url: string, size: number = 400): string {
  if (!url) return '';
  const fileId = getDriveFileId(url);
  if (fileId) {
    return `/api/drive-image?id=${fileId}`;
  }
  return url;
}

/**
 * Computes Feeder Status based on load & unbalance thresholds from legacy system:
 * - Overload: > 100%
 * - ใกล้เกินพิกัด: > 80%
 * - Unbalance (วิกฤต): > 30%
 * - Unbalance: > 20%
 * - ปกติ: <= 20% & <= 80%
 */
export function computeFeederStatus(
  a: number,
  b: number,
  c: number,
  kva: number,
  system: '1' | '3' = '3'
): { text: string; type: 'critical' | 'warning' | 'normal' | 'none' } {
  try {
    const aVal = safeFloat(a);
    const bVal = safeFloat(b);
    const cVal = safeFloat(c);

    if (aVal === 0 && bVal === 0 && cVal === 0) {
      return { text: '—', type: 'none' };
    }

    const iMax = calculateIMax(kva, system);
    const maxI = Math.max(aVal, bVal, cVal);
    const pctLoad = iMax > 0 ? (maxI / iMax) * 100 : 0;

    const avgI = (aVal + bVal + cVal) / 3;
    let pctUnb = 0;
    if (avgI > 0) {
      const maxDev = Math.max(
        Math.abs(aVal - avgI),
        Math.abs(bVal - avgI),
        Math.abs(cVal - avgI)
      );
      pctUnb = (maxDev / avgI) * 100;
    }

    const alerts: string[] = [];
    if (pctLoad > 100) alerts.push('Overload (>100%)');
    else if (pctLoad > 80) alerts.push('Overload (>80%)');
    else if (pctLoad > 70) alerts.push('ใกล้เต็มพิกัด');

    if (pctUnb > 30) alerts.push('Unbalance (วิกฤต)');
    else if (pctUnb > 20) alerts.push('Unbalance');

    if (alerts.length > 0) {
      const isCritical = alerts.some(x => x.includes('Overload') || x.includes('วิกฤต'));
      return {
        text: alerts.join(', '),
        type: isCritical ? 'critical' : 'warning',
      };
    }

    return { text: 'ปกติ', type: 'normal' };
  } catch {
    return { text: 'คำนวณไม่ได้', type: 'none' };
  }
}

