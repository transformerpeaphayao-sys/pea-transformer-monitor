import { google, sheets_v4 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import {
  TransformerMaster,
  MeasurementSession,
  FeederRecord,
  MapMarkerColor,
  TransformerWithStatus,
  UpdateRecordSessionInput,
  CreateRecordSessionInput,
  DeleteRecordSessionInput,
  CreateTaskInput,
  CancelTaskInput,
  MeterViolation,
  CreateViolationInput,
  DeleteViolationInput,
  UpdateViolationStatusInput,
  UpdateViolationInput,
  SheetRow,
  getErrorMessage,
} from '../domain/types';
import { calculateEngineeringStatus, safeFloat, extractDriveFileIds } from '../domain/calculations';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];

export function getGoogleAuth(scopes: string[] = SCOPES) {
  // 1. Check for GCP_SERVICE_ACCOUNT or aliases (JSON string or base64)
  const rawCreds =
    process.env.GCP_SERVICE_ACCOUNT ||
    process.env.gcp_service_account ||
    process.env.GOOGLE_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    process.env.SERVICE_ACCOUNT ||
    process.env.service_account ||
    process.env.CREDENTIALS_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (rawCreds) {
    let credString = rawCreds.trim();
    // Strip wrapping quotes if user pasted with extra quotes
    if (
      (credString.startsWith('"') && credString.endsWith('"')) ||
      (credString.startsWith("'") && credString.endsWith("'"))
    ) {
      credString = credString.slice(1, -1).trim();
    }

    // Decode base64 if applicable
    if (!credString.startsWith('{') && !credString.includes('-----BEGIN')) {
      try {
        const decoded = Buffer.from(credString, 'base64').toString('utf8');
        if (decoded.trim().startsWith('{')) {
          credString = decoded.trim();
        }
      } catch {}
    }

    if (credString.startsWith('{')) {
      try {
        const parsed = JSON.parse(credString);
        if (parsed.private_key) {
          parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
        }
        return new google.auth.GoogleAuth({
          credentials: parsed,
          scopes,
        });
      } catch (e) {
        console.error('Failed to parse Google Service Account JSON:', e);
        throw new Error(`รูปแบบตัวแปร GCP_SERVICE_ACCOUNT ใน Vercel ไม่ถูกต้อง (${getErrorMessage(e)})`);
      }
    }
  }

  // 2. Local credentials.json file fallback
  const credPath = path.resolve(process.cwd(), 'credentials.json');
  if (fs.existsSync(credPath)) {
    return new google.auth.GoogleAuth({
      keyFile: credPath,
      scopes,
    });
  }

  // 3. Fallback: file path in GOOGLE_APPLICATION_CREDENTIALS
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes,
    });
  }

  throw new Error('ไม่พบการตั้งค่าตัวแปร GCP_SERVICE_ACCOUNT ในระบบ (กรุณาไปที่ Vercel: Settings > Environment Variables เพื่อเพิ่มตัวแปร GCP_SERVICE_ACCOUNT แล้วกด Redeploy)');
}

function getAuth() {
  return getGoogleAuth(SCOPES);
}

const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'วัดโหลดหม้อแปลง ตามแผนงาน';

let cachedSpreadsheetId: string | null = null;

async function getSpreadsheetId(sheets: ReturnType<typeof google.sheets>, drive: ReturnType<typeof google.drive>): Promise<string> {
  if (cachedSpreadsheetId) return cachedSpreadsheetId;
  const res = await drive.files.list({
    q: `name = '${SHEET_NAME}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  if (res.data.files && res.data.files.length > 0) {
    cachedSpreadsheetId = res.data.files[0].id!;
    return cachedSpreadsheetId;
  }
  throw new Error(`Spreadsheet '${SHEET_NAME}' not found in Google Drive`);
}

/**
 * Fetches all transformers with their status (Red, Orange, Done)
 * and latest measurement session
 */
export async function getTransformersWithStatus(): Promise<TransformerWithStatus[]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = await getSpreadsheetId(sheets, drive);

  // Read MasterData, Record Data, Task Data, and Violations concurrently
  const [masterRes, recordRes, taskRes, violationRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: 'MasterData!A1:Z' }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: 'Record Data!A1:Z' }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: 'Task Data!A1:Z' }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: 'Violations!A1:Z' }).catch(() => ({ data: { values: [] } })),
  ]);

  const masterRows = masterRes.data.values || [];
  const recordRows = recordRes.data.values || [];
  const taskRows = taskRes.data.values || [];
  const violationRows = violationRes.data.values || [];

  if (masterRows.length <= 1) return [];

  const masterHeaders = masterRows[0].map(h => String(h).trim());
  const peaIdx = masterHeaders.indexOf('PEANO หม้อแปลง');
  const sysIdx = masterHeaders.indexOf('ระบบ');
  const kvaIdx = masterHeaders.indexOf('ค่าพิกัด kVA หม้อแปลง');
  const brandIdx = masterHeaders.indexOf('ยี่ห้อของหม้อแปลง');
  const locIdx = masterHeaders.indexOf('สถานที่');
  const latIdx = masterHeaders.indexOf('LATITUDE');
  const lngIdx = masterHeaders.indexOf('LONGITUDE');

  // Parse MasterData
  const transformers: Map<string, TransformerMaster> = new Map();
  for (let i = 1; i < masterRows.length; i++) {
    const row = masterRows[i];
    const peaNo = String(row[peaIdx] || '').trim();
    if (!peaNo) continue;

    const latVal = safeFloat(row[latIdx], NaN);
    const lngVal = safeFloat(row[lngIdx], NaN);

    transformers.set(peaNo, {
      peaNo,
      system: String(row[sysIdx] || '3').trim() === '1' ? '1' : '3',
      kva: safeFloat(row[kvaIdx], 100),
      brand: String(row[brandIdx] || '').trim(),
      location: String(row[locIdx] || '').trim(),
      lat: isNaN(latVal) ? null : latVal,
      lng: isNaN(lngVal) ? null : lngVal,
    });
  }

  // Parse Task Data for Pending tasks
  const pendingTasks: Map<string, { orderDate: string; assigner: string }> = new Map();
  if (taskRows.length > 1) {
    const taskHeaders = taskRows[0].map(h => String(h).trim());
    const tPeaIdx = taskHeaders.indexOf('PEA NO') !== -1
      ? taskHeaders.indexOf('PEA NO')
      : taskHeaders.indexOf('PEANO') !== -1
      ? taskHeaders.indexOf('PEANO')
      : 0;
    const tStatusIdx = taskHeaders.indexOf('Status') !== -1
      ? taskHeaders.indexOf('Status')
      : taskHeaders.indexOf('สถานะ') !== -1
      ? taskHeaders.indexOf('สถานะ')
      : 1;
    const tDateIdx = taskHeaders.indexOf('Date') !== -1
      ? taskHeaders.indexOf('Date')
      : taskHeaders.indexOf('วันที่สั่งงาน') !== -1
      ? taskHeaders.indexOf('วันที่สั่งงาน')
      : 2;
    const tAssignIdx = taskHeaders.indexOf('ผู้สั่งงาน') !== -1
      ? taskHeaders.indexOf('ผู้สั่งงาน')
      : taskHeaders.indexOf('Assigner');

    for (let i = 1; i < taskRows.length; i++) {
      const row = taskRows[i];
      const pea = String(row[tPeaIdx] || '').trim();
      const status = String(row[tStatusIdx] || '').trim().toLowerCase();
      if (pea && (status === 'pending' || status === 'สั่งตรวจซ้ำ')) {
        pendingTasks.set(pea, {
          orderDate: String(row[tDateIdx] || ''),
          assigner: String(row[tAssignIdx] || ''),
        });
      }
    }
  }

  // Parse Record Data for latest sessions
  const latestSessions: Map<string, MeasurementSession> = new Map();
  const historySessionsMap: Map<string, MeasurementSession[]> = new Map();
  if (recordRows.length > 1) {
    const recHeaders = recordRows[0].map(h => String(h).trim());
    const rDateIdx = recHeaders.indexOf('วันที่');
    const rTimeIdx = recHeaders.indexOf('เวลา');
    const rPeaIdx = recHeaders.indexOf('PEA NO');
    const rTapIdx = recHeaders.indexOf('แท็ป');
    
    // Resolve Feeder column with priority: 'ฟีดเดอร์' -> 'ฟิดเดอร์' -> 'Feeder'
    let rFeederIdx = recHeaders.indexOf('ฟีดเดอร์');
    if (rFeederIdx === -1) rFeederIdx = recHeaders.indexOf('ฟิดเดอร์');
    if (rFeederIdx === -1) rFeederIdx = recHeaders.indexOf('Feeder');
    if (rFeederIdx === -1) rFeederIdx = 3;

    const rCableIdx = recHeaders.findIndex(h => h.includes('ขนาดสาย'));
    const rAIdx = recHeaders.indexOf('กระแส A') !== -1 ? recHeaders.indexOf('กระแส A') : 4;
    const rBIdx = recHeaders.indexOf('กระแส B') !== -1 ? recHeaders.indexOf('กระแส B') : 5;
    const rCIdx = recHeaders.indexOf('กระแส C') !== -1 ? recHeaders.indexOf('กระแส C') : 6;
    const rNIdx = recHeaders.indexOf('กระแส N') !== -1 ? recHeaders.indexOf('กระแส N') : 7;
    const rNoteIdx = recHeaders.findIndex(h => h.includes('หมายเหตุ'));
    const rImgIdx = recHeaders.findIndex(h => h.includes('รูปถ่าย') || h.includes('รูปภาพ'));

    // Group rows by PEA and session (date + time)
    const sessionsByPea: Map<string, Map<string, FeederRecord[]>> = new Map();
    const sessionMeta: Map<string, { tap: string; imgUrl: string }> = new Map();

    for (let i = 1; i < recordRows.length; i++) {
      const row = recordRows[i];
      const pea = String(row[rPeaIdx] || '').trim();
      const date = String(row[rDateIdx] || '').trim();
      const time = String(row[rTimeIdx] || '').trim();
      const feederName = String(row[rFeederIdx] || '').trim();

      if (!pea || !date) continue;
      const sessKey = `${pea}__${date}__${time}`;

      if (!sessionsByPea.has(pea)) sessionsByPea.set(pea, new Map());
      const peaMap = sessionsByPea.get(pea)!;
      if (!peaMap.has(sessKey)) peaMap.set(sessKey, []);

      const feeder: FeederRecord = {
        name: feederName,
        currentA: safeFloat(row[rAIdx]),
        currentB: safeFloat(row[rBIdx]),
        currentC: safeFloat(row[rCIdx]),
        currentN: safeFloat(row[rNIdx]),
        note: rNoteIdx !== -1 ? String(row[rNoteIdx] || '').trim() : '',
        cableSize: rCableIdx !== -1 ? String(row[rCableIdx] || '').trim() : '',
        vt_ab: safeFloat(row[12]), vt_bc: safeFloat(row[13]), vt_ca: safeFloat(row[14]),
        vt_an: safeFloat(row[15]), vt_bn: safeFloat(row[16]), vt_cn: safeFloat(row[17]),
        ve_ab: safeFloat(row[18]), ve_bc: safeFloat(row[19]), ve_ca: safeFloat(row[20]),
        ve_an: safeFloat(row[21]), ve_bn: safeFloat(row[22]), ve_cn: safeFloat(row[23]),
      };
      peaMap.get(sessKey)!.push(feeder);

      const curImg = rImgIdx !== -1 ? String(row[rImgIdx] || '').trim() : '';
      const curTap = rTapIdx !== -1 ? String(row[rTapIdx] || '').trim() : '';

      if (!sessionMeta.has(sessKey)) {
        sessionMeta.set(sessKey, {
          tap: curTap || '3',
          imgUrl: curImg,
        });
      } else {
        const meta = sessionMeta.get(sessKey)!;
        if (!meta.imgUrl && curImg) {
          meta.imgUrl = curImg;
        } else if (curImg && !meta.imgUrl.includes(curImg)) {
          meta.imgUrl += `, ${curImg}`;
        }
        if (!meta.tap && curTap) {
          meta.tap = curTap;
        }
      }
    }

    // Determine all historical sessions and the latest session for each PEA
    for (const [pea, sessMap] of sessionsByPea.entries()) {
      const sortedSessKeys = Array.from(sessMap.keys());
      const allSessions: MeasurementSession[] = [];

      for (const sessKey of sortedSessKeys) {
        const feeders = sessMap.get(sessKey)!;
        const meta = sessionMeta.get(sessKey) || { tap: '3', imgUrl: '' };
        const [_, date, time] = sessKey.split('__');

        // Find total feeder or sum feeders
        const totalFeeder = feeders.find(f => f.name.replace(/\s+/g, '') === 'รวม') || {
          name: 'รวม',
          currentA: feeders.reduce((sum, f) => sum + f.currentA, 0),
          currentB: feeders.reduce((sum, f) => sum + f.currentB, 0),
          currentC: feeders.reduce((sum, f) => sum + f.currentC, 0),
          currentN: feeders.reduce((sum, f) => sum + f.currentN, 0),
          note: '', cableSize: '',
          vt_ab: 0, vt_bc: 0, vt_ca: 0, vt_an: 0, vt_bn: 0, vt_cn: 0,
          ve_ab: 0, ve_bc: 0, ve_ca: 0, ve_an: 0, ve_bn: 0, ve_cn: 0,
        };

        const imageUrls = meta.imgUrl ? meta.imgUrl.split(',').map(s => s.trim()).filter(Boolean) : [];

        allSessions.push({
          peaNo: pea,
          date,
          time,
          tap: meta.tap,
          imageUrls,
          feeders: feeders.filter(f => f.name.replace(/\s+/g, '') !== 'รวม'),
          total: totalFeeder,
        });
      }

      // Reverse so newest session is first
      allSessions.reverse();
      historySessionsMap.set(pea, allSessions);
      if (allSessions.length > 0) {
        latestSessions.set(pea, allSessions[0]);
      }
    }
  }

  // Parse Violations
  const violationsMap: Map<string, MeterViolation[]> = new Map();
  if (violationRows.length > 1) {
    const vHeaders = (violationRows[0] || []).map(h => String(h).trim());
    const vPeaIdx = vHeaders.indexOf('PEANO หม้อแปลง') !== -1 ? vHeaders.indexOf('PEANO หม้อแปลง') : 0;
    const vMeterIdx = vHeaders.indexOf('PEA NO มิเตอร์') !== -1 ? vHeaders.indexOf('PEA NO มิเตอร์') : 1;
    const vConsumerIdx = vHeaders.indexOf('ชื่อผู้ใช้ไฟ/สถานที่') !== -1 ? vHeaders.indexOf('ชื่อผู้ใช้ไฟ/สถานที่') : 2;
    const vTypeIdx = vHeaders.indexOf('ประเภทการละเมิด') !== -1 ? vHeaders.indexOf('ประเภทการละเมิด') : 3;
    const vDateIdx = vHeaders.indexOf('วันที่ตรวจพบ') !== -1 ? vHeaders.indexOf('วันที่ตรวจพบ') : 4;
    const vTimeIdx = vHeaders.indexOf('เวลา') !== -1 ? vHeaders.indexOf('เวลา') : 5;
    const vInspectorIdx = vHeaders.indexOf('ผู้ตรวจพบ') !== -1 ? vHeaders.indexOf('ผู้ตรวจพบ') : 6;
    const vStatusIdx = vHeaders.indexOf('สถานะ') !== -1 ? vHeaders.indexOf('สถานะ') : 7;
    const vRemarkIdx = vHeaders.indexOf('หมายเหตุ/รายละเอียด') !== -1 ? vHeaders.indexOf('หมายเหตุ/รายละเอียด') : 8;
    const vImgIdx = vHeaders.indexOf('รูปถ่ายหลักฐาน') !== -1 ? vHeaders.indexOf('รูปถ่ายหลักฐาน') : 9;
    const vCreatedIdx = vHeaders.indexOf('Timestamp') !== -1 ? vHeaders.indexOf('Timestamp') : 10;

    for (let i = 1; i < violationRows.length; i++) {
      const row = violationRows[i];
      const pea = String(row[vPeaIdx] || '').trim();
      const meter = String(row[vMeterIdx] || '').trim();
      if (!pea || !meter) continue;

      const rawImgs = String(row[vImgIdx] || '').trim();
      const imageUrls = rawImgs ? rawImgs.split(',').map(s => s.trim()).filter(Boolean) : [];

      const rawStatus = String(row[vStatusIdx] || 'INVESTIGATING').trim().toUpperCase();
      const status: MeterViolation['status'] =
        rawStatus === 'RESOLVED' || rawStatus === 'LEGAL_ACTION' || rawStatus === 'PENDING' || rawStatus === 'CLEARED' || rawStatus.includes('ไม่พบ') || rawStatus.includes('ปกติ')
          ? (rawStatus.includes('ไม่พบ') || rawStatus.includes('ปกติ') || rawStatus === 'CLEARED' ? 'CLEARED' : (rawStatus as MeterViolation['status']))
          : 'INVESTIGATING';

      const vItem: MeterViolation = {
        transformerPeaNo: pea,
        meterPeaNo: meter,
        consumerName: String(row[vConsumerIdx] || '').trim(),
        location: '',
        violationType: String(row[vTypeIdx] || 'ไม่ระบุ').trim(),
        detectedDate: String(row[vDateIdx] || '').trim(),
        detectedTime: String(row[vTimeIdx] || '').trim(),
        inspectorName: String(row[vInspectorIdx] || '').trim(),
        status,
        remark: String(row[vRemarkIdx] || '').trim(),
        imageUrls,
        createdAt: String(row[vCreatedIdx] || '').trim(),
      };

      if (!violationsMap.has(pea)) {
        violationsMap.set(pea, []);
      }
      violationsMap.get(pea)!.push(vItem);
    }
  }

  // Combine into final list
  const results: TransformerWithStatus[] = [];
  for (const [peaNo, t] of transformers.entries()) {
    const hasRecord = latestSessions.has(peaNo);
    const hasPendingTask = pendingTasks.has(peaNo);

    let statusColor: MapMarkerColor = 'red';
    if (hasPendingTask) {
      statusColor = 'orange';
    } else if (hasRecord) {
      statusColor = 'done';
    }

    const latest = latestSessions.get(peaNo);
    let engStatus = undefined;
    if (latest) {
      engStatus = calculateEngineeringStatus(latest.total, t.kva, t.system);
    }

    const vList = violationsMap.get(peaNo) || [];
    const hasViolation = vList.some(v => v.status !== 'CLEARED');
    const clearedList = vList.filter(v => v.status === 'CLEARED');
    const isAuditCleared = !hasViolation && clearedList.length > 0;
    const latestAuditClearedDate = isAuditCleared ? clearedList[0]?.detectedDate : undefined;

    results.push({
      ...t,
      statusColor,
      latestSession: latest,
      historySessions: historySessionsMap.get(peaNo) || [],
      engineeringStatus: engStatus,
      pendingTask: pendingTasks.get(peaNo),
      violations: vList,
      isAuditCleared,
      latestAuditClearedDate,
    });
  }

  return results;
}

export async function updateRecordSession(input: UpdateRecordSessionInput): Promise<{ success: boolean; message?: string }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = await getSpreadsheetId(sheets, drive);

  // 1. Fetch current Record Data to locate the rows
  const recordRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Record Data!A1:Z',
  });

  const rows = recordRes.data.values || [];
  if (rows.length <= 1) {
    throw new Error('Record Data sheet is empty');
  }

  const headers = rows[0].map(h => String(h).trim());
  const rDateIdx = headers.indexOf('วันที่');
  const rTimeIdx = headers.indexOf('เวลา');
  const rPeaIdx = headers.indexOf('PEA NO');
  let rFeederIdx = headers.indexOf('ฟีดเดอร์');
  if (rFeederIdx === -1) rFeederIdx = headers.indexOf('ฟิดเดอร์');
  if (rFeederIdx === -1) rFeederIdx = headers.indexOf('Feeder');
  if (rFeederIdx === -1) rFeederIdx = 3;

  const rNoteIdx = headers.findIndex(h => h.includes('หมายเหตุ'));
  const rImgIdx = headers.findIndex(h => h.includes('รูปถ่าย') || h.includes('รูปภาพ'));
  const rTapIdx = headers.indexOf('แท็ป');
  const rCableIdx = headers.findIndex(h => h.includes('ขนาดสาย'));

  // Find all row indices (0-indexed in array)
  const matchedRowIndices: number[] = [];
  let existingImgUrl = '';
  let existingTap = input.tap || '3';
  let existingCable = '';

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const pea = String(row[rPeaIdx] || '').trim();
    const date = String(row[rDateIdx] || '').trim();
    const time = String(row[rTimeIdx] || '').trim();

    if (pea === input.peaNo.trim() && date === input.originalDate.trim() && time === input.originalTime.trim()) {
      matchedRowIndices.push(i);
      if (!existingImgUrl && rImgIdx !== -1 && row[rImgIdx]) {
        existingImgUrl = String(row[rImgIdx]).trim();
      }
      if (rTapIdx !== -1 && row[rTapIdx]) {
        existingTap = String(row[rTapIdx]).trim();
      }
      if (rCableIdx !== -1 && row[rCableIdx]) {
        existingCable = String(row[rCableIdx]).trim();
      }
    }
  }

  if (matchedRowIndices.length === 0) {
    throw new Error(`Record session for PEA ${input.peaNo} at ${input.originalDate} ${input.originalTime} not found`);
  }

  // Calculate totals
  const totalA = input.feeders.reduce((sum, f) => sum + (Number(f.currentA) || 0), 0);
  const totalB = input.feeders.reduce((sum, f) => sum + (Number(f.currentB) || 0), 0);
  const totalC = input.feeders.reduce((sum, f) => sum + (Number(f.currentC) || 0), 0);
  const totalN = input.feeders.reduce((sum, f) => sum + (Number(f.currentN) || 0), 0);
  const combinedNote = input.feeders.map(f => f.note?.trim()).filter(Boolean).join(' / ');

  // Build rows to write
  const newRows: SheetRow[] = [];
  for (const f of input.feeders) {
    newRows.push([
      input.originalDate,
      input.originalTime,
      input.peaNo,
      f.name,
      Number(f.currentA) || 0,
      Number(f.currentB) || 0,
      Number(f.currentC) || 0,
      Number(f.currentN) || 0,
      f.note || '',
      existingImgUrl,
      existingTap,
      f.cableSize || existingCable,
      Number(f.vt_ab) || 0, Number(f.vt_bc) || 0, Number(f.vt_ca) || 0,
      Number(f.vt_an) || 0, Number(f.vt_bn) || 0, Number(f.vt_cn) || 0,
      Number(f.ve_ab) || 0, Number(f.ve_bc) || 0, Number(f.ve_ca) || 0,
      Number(f.ve_an) || 0, Number(f.ve_bn) || 0, Number(f.ve_cn) || 0,
    ]);
  }

  // Summary row ("รวม")
  newRows.push([
    input.originalDate,
    input.originalTime,
    input.peaNo,
    'รวม',
    totalA,
    totalB,
    totalC,
    totalN,
    combinedNote,
    existingImgUrl,
    existingTap,
    existingCable,
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0,
  ]);

  // Check if matchedRowIndices are contiguous
  const isContiguous = matchedRowIndices.every((val, idx, arr) => idx === 0 || val === arr[idx - 1] + 1);

  if (isContiguous && matchedRowIndices.length === newRows.length) {
    // Exact contiguous match: update directly via values.update
    const startRow = matchedRowIndices[0] + 1; // 1-indexed
    const endRow = matchedRowIndices[matchedRowIndices.length - 1] + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Record Data!A${startRow}:X${endRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newRows,
      },
    });
  } else {
    // If row count changed or non-contiguous:
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const recordSheet = sheetMeta.data.sheets?.find(s => s.properties?.title === 'Record Data');
    const sheetId = recordSheet?.properties?.sheetId || 0;

    const deleteRequests = matchedRowIndices
      .sort((a, b) => b - a)
      .map(idx => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: idx,
            endIndex: idx + 1,
          },
        },
      }));

    if (deleteRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: deleteRequests,
        },
      });
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Record Data!A:X',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newRows,
      },
    });
  }

  return { success: true, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' };
}

function formatDateToThaiSheet(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr.trim();
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    // YYYY-MM-DD -> DD/MM/YYYY
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr.trim();
}

function formatTimeToSheet(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.trim().split(':');
  if (parts.length === 2) {
    return `${parts[0]}:${parts[1]}:00`;
  }
  return timeStr.trim();
}

export async function uploadImageToDrive(
  base64Data: string,
  fileName: string,
  folderId?: string
): Promise<string | null> {
  const targetFolderId =
    folderId ||
    process.env.GOOGLE_DRIVE_FOLDER_ID?.replace(/^["']|["']$/g, '').trim() ||
    '16V2W7GAIXSCXlQRIBtKhIoc3K1vVirQC';

  const gasUrl =
    process.env.GAS_WEB_APP_URL?.replace(/^["']|["']$/g, '').trim() ||
    'https://script.google.com/macros/s/AKfycbwZosknXasxuMV0nyo7-ua0avTv8TMdM-AF-GFQsyMLCruKRaLTRtgRKzc6an48BrMw/exec';

  const pureBase64 = base64Data.replace(/^data:image\/[a-zA-Z]+;base64,/, '').trim();

  const payload = JSON.stringify({
    action: 'upload',
    fileName,
    mimeType: 'image/jpeg',
    fileData: pureBase64,
    folderId: targetFolderId,
    folder_id: targetFolderId,
    folderID: targetFolderId,
    id: targetFolderId,
  });

  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload)),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: payload,
      redirect: 'manual',
      signal: AbortSignal.timeout(60000),
    });

    const location = res.headers.get('location');
    if (location) {
      const res2 = await fetch(location, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        signal: AbortSignal.timeout(30000),
      });
      const text = (await res2.text()).trim();
      if (text.startsWith('http')) {
        return text;
      }
    } else if (res.ok) {
      const text = (await res.text()).trim();
      if (text.startsWith('http')) {
        return text;
      }
    }
  } catch (err) {
    console.error(`[uploadImageToDrive] Error uploading ${fileName}:`, err);
  }

  return null;
}

export async function createRecordSession(
  input: CreateRecordSessionInput
): Promise<{ success: boolean; message: string; rowsAdded: number }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = await getSpreadsheetId(sheets, drive);

  // 1. Process and upload any photos to Google Drive in parallel (Promise.all)
  let imgUrlString = '';
  if (input.images && input.images.length > 0) {
    const uploadPromises = input.images.map(async (img, i) => {
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img;
      } else if (img.startsWith('data:image') || img.length > 100) {
        const cleanDate = input.date.replace(/[-/]/g, '');
        const cleanTime = input.time.replace(/[:]/g, '');
        const fileName = `${input.peaNo}_${cleanDate}_${cleanTime}_${i + 1}.jpg`;
        return await uploadImageToDrive(img, fileName);
      }
      return null;
    });

    const results = await Promise.all(uploadPromises);
    const validUrls = results.filter((url): url is string => Boolean(url && url.startsWith('http')));
    imgUrlString = validUrls.join(', ');
  }

  // 2. Format Date and Time
  const formattedDate = formatDateToThaiSheet(input.date);
  const formattedTime = formatTimeToSheet(input.time);

  // 3. Compute Totals
  const totA = input.total ? safeFloat(input.total.currentA) : input.feeders.reduce((s, f) => s + safeFloat(f.currentA), 0);
  const totB = input.total ? safeFloat(input.total.currentB) : input.feeders.reduce((s, f) => s + safeFloat(f.currentB), 0);
  const totC = input.total ? safeFloat(input.total.currentC) : input.feeders.reduce((s, f) => s + safeFloat(f.currentC), 0);
  const totN = input.total ? safeFloat(input.total.currentN) : input.feeders.reduce((s, f) => s + safeFloat(f.currentN), 0);
  const totNote = input.globalNote || input.total?.note || '';

  // 4. Build 24-column rows
  const rowsToInsert: SheetRow[] = [];
  for (const f of input.feeders) {
    rowsToInsert.push([
      formattedDate,
      formattedTime,
      input.peaNo,
      f.name,
      safeFloat(f.currentA),
      safeFloat(f.currentB),
      safeFloat(f.currentC),
      safeFloat(f.currentN),
      f.note || '',
      imgUrlString,
      input.tap || '3',
      f.cableSize || '',
      safeFloat(f.vt_ab), safeFloat(f.vt_bc), safeFloat(f.vt_ca),
      safeFloat(f.vt_an), safeFloat(f.vt_bn), safeFloat(f.vt_cn),
      safeFloat(f.ve_ab), safeFloat(f.ve_bc), safeFloat(f.ve_ca),
      safeFloat(f.ve_an), safeFloat(f.ve_bn), safeFloat(f.ve_cn),
    ]);
  }

  // Append summary row ("รวม")
  rowsToInsert.push([
    formattedDate,
    formattedTime,
    input.peaNo,
    'รวม',
    totA,
    totB,
    totC,
    totN,
    totNote,
    imgUrlString,
    input.tap || '3',
    '',
    0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0,
  ]);

  // 5. Append to Record Data
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Record Data!A:X',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rowsToInsert,
    },
  });

  // 6. Update Task Data if there was a pending task for this PEA NO
  try {
    const taskRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Task Data!A1:Z',
    });
    const taskRows = taskRes.data.values || [];
    if (taskRows.length > 1) {
      const taskHeaders = taskRows[0].map(h => String(h).trim());
      const tPeaIdx = taskHeaders.indexOf('PEA NO') !== -1
        ? taskHeaders.indexOf('PEA NO')
        : taskHeaders.indexOf('PEANO') !== -1
        ? taskHeaders.indexOf('PEANO')
        : 0;
      const tStatusIdx = taskHeaders.indexOf('Status') !== -1
        ? taskHeaders.indexOf('Status')
        : taskHeaders.indexOf('สถานะ');
      if (tPeaIdx !== -1 && tStatusIdx !== -1) {
        for (let i = 1; i < taskRows.length; i++) {
          const row = taskRows[i];
          const pea = String(row[tPeaIdx] || '').trim();
          const status = String(row[tStatusIdx] || '').trim().toLowerCase();
          if (pea === input.peaNo.trim() && (status === 'pending' || status === 'สั่งตรวจซ้ำ')) {
            const colLetter = String.fromCharCode(65 + tStatusIdx);
            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: `Task Data!${colLetter}${i + 1}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [['Done']],
              },
            });
          }
        }
      }
    }
  } catch (taskErr) {
    console.warn('[createRecordSession] Could not update Task Data status:', taskErr);
  }

  return {
    success: true,
    message: `บันทึกข้อมูลหม้อแปลง PEA ${input.peaNo} ลง Google Sheets สำเร็จ (${rowsToInsert.length} แถว)`,
    rowsAdded: rowsToInsert.length,
  };
}

export interface DeleteRecordSessionResult {
  success: boolean;
  message: string;
  deletedRowsCount: number;
  deletedPhotosCount: number;
  deletedPhotoIds: string[];
}

/**
 * Deletes all rows belonging to a specific measurement session (peaNo, date, time)
 * from Record Data and deletes all associated photos from Google Drive.
 */
export async function deleteRecordSession(
  input: DeleteRecordSessionInput
): Promise<DeleteRecordSessionResult> {
  const targetPea = input.peaNo.trim().toLowerCase();
  const inputDate = input.date.trim();
  const inputTime = input.time.trim();

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = await getSpreadsheetId(sheets, drive);

  // 1. Fetch current Record Data to locate matching rows
  const recordRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Record Data!A1:Z',
  });

  const rows = recordRes.data.values || [];
  if (rows.length <= 1) {
    throw new Error('ไม่พบข้อมูลในชีต Record Data');
  }

  const headers = rows[0].map(h => String(h).trim());
  const rDateIdx = headers.indexOf('วันที่') !== -1 ? headers.indexOf('วันที่') : 0;
  const rTimeIdx = headers.indexOf('เวลา') !== -1 ? headers.indexOf('เวลา') : 1;
  const rPeaIdx = headers.indexOf('PEA NO') !== -1 ? headers.indexOf('PEA NO') : 2;

  // Build helper date & time variations for robust matching
  const dateVariations = new Set([
    inputDate,
    formatDateToThaiSheet(inputDate),
  ]);
  if (inputDate.includes('-')) {
    const parts = inputDate.split('-');
    if (parts.length === 3) dateVariations.add(`${parts[2]}/${parts[1]}/${parts[0]}`);
  } else if (inputDate.includes('/')) {
    const parts = inputDate.split('/');
    if (parts.length === 3) dateVariations.add(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }

  const timeVariations = new Set([
    inputTime,
    formatTimeToSheet(inputTime),
  ]);
  const timeParts = inputTime.split(':');
  if (timeParts.length === 2) {
    timeVariations.add(`${timeParts[0]}:${timeParts[1]}:00`);
  } else if (timeParts.length === 3 && timeParts[2] === '00') {
    timeVariations.add(`${timeParts[0]}:${timeParts[1]}`);
  }

  const matchedRowIndices: number[] = [];
  const matchedRows: SheetRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const pea = String(row[rPeaIdx] || '').trim().toLowerCase();
    const rowDate = String(row[rDateIdx] || '').trim();
    const rowTime = String(row[rTimeIdx] || '').trim();

    const dateMatches = dateVariations.has(rowDate) || rowDate.startsWith(inputDate) || inputDate.startsWith(rowDate);
    const timeMatches = timeVariations.has(rowTime) || rowTime.startsWith(inputTime.slice(0, 5));

    if (pea === targetPea && dateMatches && timeMatches) {
      matchedRowIndices.push(i);
      matchedRows.push(row);
    }
  }

  if (matchedRowIndices.length === 0) {
    throw new Error(`ไม่พบข้อมูลรอบตรวจวัดวันที่ ${input.date} เวลา ${input.time} ของหม้อแปลง PEA ${input.peaNo}`);
  }

  // 2. Extract and delete all Drive photos belonging to this session
  const driveFileIds = extractDriveFileIds(matchedRows);
  let deletedPhotosCount = 0;
  if (driveFileIds.length > 0) {
    const batchRes = await deleteImagesBatch(driveFileIds, drive);
    deletedPhotosCount = batchRes.filter(p => p.success).length;
  }

  // 3. Delete rows from Record Data sheet (from highest index to lowest)
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const recordSheet = sheetMeta.data.sheets?.find(s => s.properties?.title === 'Record Data');
  const sheetId = recordSheet?.properties?.sheetId || 0;

  const deleteRequests = matchedRowIndices
    .sort((a, b) => b - a)
    .map(idx => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex: idx,
          endIndex: idx + 1,
        },
      },
    }));

  if (deleteRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: deleteRequests,
      },
    });
  }

  return {
    success: true,
    message: `ลบข้อมูลรอบตรวจวัดวันที่ ${input.date} ${input.time} ของหม้อแปลง PEA ${input.peaNo} สำเร็จ (ลบ ${matchedRowIndices.length} แถว และรูปภาพ ${deletedPhotosCount}/${driveFileIds.length} รูป)`,
    deletedRowsCount: matchedRowIndices.length,
    deletedPhotosCount,
    deletedPhotoIds: driveFileIds,
  };
}

export interface RegisterTransformerInput {
  peaNo: string;
  system: '1' | '3';
  kva: number;
  brand?: string;
  location?: string;
  lat?: number | null;
  lng?: number | null;
}

/**
 * Registers a new transformer by appending it to MasterData in Google Sheets.
 */
export async function registerNewTransformer(
  input: RegisterTransformerInput
): Promise<{ success: boolean; message: string }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = await getSpreadsheetId(sheets, drive);

  // 1. Fetch current MasterData to check headers & duplicates
  const masterRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'MasterData!A1:Z',
  });
  const rows = masterRes.data.values || [];
  if (rows.length === 0) {
    throw new Error('ไม่พบข้อมูลชีต MasterData');
  }

  const headers = rows[0].map((h) => String(h).trim());
  const peaIdx = headers.indexOf('PEANO หม้อแปลง');
  if (peaIdx === -1) {
    throw new Error('ไม่พบคอลัมน์ PEANO หม้อแปลง ในชีต MasterData');
  }

  // Check duplicate PEA NO
  const cleanPeaNo = input.peaNo.trim();
  for (let i = 1; i < rows.length; i++) {
    const existing = String(rows[i][peaIdx] || '').trim();
    if (existing.toLowerCase() === cleanPeaNo.toLowerCase()) {
      throw new Error(`มีรหัส PEA ${cleanPeaNo} อยู่ในระบบแล้ว ไม่สามารถลงทะเบียนซ้ำได้`);
    }
  }

  // Build new row matching headers order exactly
  const newRow: (string | number)[] = headers.map((header) => {
    const h = header.trim();
    if (h === 'PEANO หม้อแปลง') return cleanPeaNo;
    if (h === 'ระบบ' || h === 'ระบบเฟส') return input.system === '1' ? '1' : '3';
    if (h === 'ค่าพิกัด kVA หม้อแปลง') return input.kva;
    if (h === 'ยี่ห้อของหม้อแปลง') return input.brand ? input.brand.trim() : '';
    if (h === 'สถานที่') return input.location ? input.location.trim() : '';
    if (h === 'LATITUDE') return input.lat != null && !isNaN(input.lat) ? input.lat : '';
    if (h === 'LONGITUDE') return input.lng != null && !isNaN(input.lng) ? input.lng : '';
    return '';
  });

  // Append new row to MasterData
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'MasterData!A:Z',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newRow],
    },
  });

  return {
    success: true,
    message: `ลงทะเบียนหม้อแปลง ${cleanPeaNo} สำเร็จเรียบร้อยแล้ว`,
  };
}

/**
 * Deletes a single image file from Google Drive.
 * Uses both Google Apps Script Web App (gas_web_app_url) and Google Drive API v3.
 */
export async function deleteImageFromDrive(
  fileId: string,
  drive?: ReturnType<typeof google.drive>
): Promise<{ success: boolean; method: string }> {
  if (!fileId) return { success: false, method: 'none' };

  let gasSuccess = false;
  const gasUrl =
    process.env.GAS_WEB_APP_URL ||
    'https://script.google.com/macros/s/AKfycbwZosknXasxuMV0nyo7-ua0avTv8TMdM-AF-GFQsyMLCruKRaLTRtgRKzc6an48BrMw/exec';

  if (gasUrl) {
    try {
      const res = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', fileId }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) {
        gasSuccess = true;
      }
    } catch (err) {
      console.warn(`[deleteImageFromDrive] GAS Web App delete failed for ${fileId}:`, err);
    }
  }

  let driveSuccess = false;
  try {
    const driveClient = drive || google.drive({ version: 'v3', auth: getAuth() });
    await driveClient.files.delete({ fileId });
    driveSuccess = true;
  } catch (err: unknown) {
    // 404 means it's already deleted or doesn't exist
    const errCode = (err && typeof err === 'object' && ('code' in err || 'status' in err))
      ? Number((err as { code?: number; status?: number }).code ?? (err as { code?: number; status?: number }).status)
      : 0;
    if (errCode === 404) {
      driveSuccess = true;
    } else {
      console.warn(`[deleteImageFromDrive] Drive API delete failed for ${fileId}:`, getErrorMessage(err));
    }
  }

  const success = gasSuccess || driveSuccess;
  return {
    success,
    method: gasSuccess && driveSuccess ? 'both' : gasSuccess ? 'gas' : driveSuccess ? 'drive' : 'failed',
  };
}

/**
 * Concurrently deletes images from Google Drive with concurrency pool limit (max 10 workers).
 */
export async function deleteImagesBatch(
  fileIds: string[],
  drive: ReturnType<typeof google.drive>,
  maxWorkers = 10
): Promise<Array<{ fileId: string; success: boolean }>> {
  if (fileIds.length === 0) return [];

  const results: Array<{ fileId: string; success: boolean }> = [];
  const queue = [...fileIds];

  const workers = Array.from({ length: Math.min(maxWorkers, queue.length) }, async () => {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) break;
      const res = await deleteImageFromDrive(id, drive);
      results.push({ fileId: id, success: res.success });
    }
  });

  await Promise.all(workers);
  return results;
}

export interface DeleteTransformerResult {
  success: boolean;
  message: string;
  peaNo: string;
  deletedCounts: {
    master: number;
    records: number;
    tasks: number;
    aiReports: number;
    photos: number;
  };
  deletedPhotoIds: string[];
}

/**
 * Deletes a transformer and all associated data from the system:
 * 1. MasterData rows matching peaNo
 * 2. Record Data rows matching peaNo
 * 3. Task Data rows matching peaNo
 * 4. AI Reports rows matching peaNo
 * 5. All linked photos in Google Drive
 */
export async function deleteTransformer(rawPeaNo: string): Promise<DeleteTransformerResult> {
  const peaNo = String(rawPeaNo || '').trim();
  if (!peaNo) {
    throw new Error('กรุณาระบุรหัส PEANO หม้อแปลงที่ต้องการลบ');
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = await getSpreadsheetId(sheets, drive);

  // 1. Get spreadsheet metadata to locate sheetIds
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const allSheets = meta.data.sheets || [];

  const masterSheet = allSheets.find(s => s.properties?.title === 'MasterData');
  const recordSheet = allSheets.find(s => s.properties?.title === 'Record Data');
  const taskSheet = allSheets.find(s => s.properties?.title === 'Task Data');
  const aiReportSheet = allSheets.find(s => s.properties?.title === 'AI Reports');
  const violationSheet = allSheets.find(s => s.properties?.title === 'Violations');

  // 2. Fetch rows from all worksheets in parallel
  const [masterRes, recordRes, taskRes, aiRes, violationRes] = await Promise.all([
    sheets.spreadsheets.values.get({ spreadsheetId, range: 'MasterData!A1:Z' }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: 'Record Data!A1:Z' }),
    sheets.spreadsheets.values.get({ spreadsheetId, range: 'Task Data!A1:Z' }),
    aiReportSheet
      ? sheets.spreadsheets.values.get({ spreadsheetId, range: 'AI Reports!A1:Z' }).catch(() => ({ data: { values: [] } }))
      : Promise.resolve({ data: { values: [] } }),
    violationSheet
      ? sheets.spreadsheets.values.get({ spreadsheetId, range: 'Violations!A1:Z' }).catch(() => ({ data: { values: [] } }))
      : Promise.resolve({ data: { values: [] } }),
  ]);

  const masterRows = masterRes.data.values || [];
  const recordRows = recordRes.data.values || [];
  const taskRows = taskRes.data.values || [];
  const aiRows = aiRes.data.values || [];
  const violationRows = violationRes.data.values || [];

  const targetPea = peaNo.toLowerCase();
  const isMatch = (val: unknown) => String(val ?? '').trim().toLowerCase() === targetPea;

  // 3. Find matches in MasterData
  const masterHeaders = (masterRows[0] || []).map(h => String(h).trim());
  const masterPeaCol = masterHeaders.indexOf('PEANO หม้อแปลง') !== -1 ? masterHeaders.indexOf('PEANO หม้อแปลง') : 0;
  const masterRowIndicesToDelete: number[] = [];
  for (let i = 1; i < masterRows.length; i++) {
    if (isMatch(masterRows[i][masterPeaCol])) {
      masterRowIndicesToDelete.push(i);
    }
  }

  // 4. Find matches in Record Data and collect rows for Drive photo ID extraction
  const recordHeaders = (recordRows[0] || []).map(h => String(h).trim());
  const recordPeaCol = recordHeaders.indexOf('PEA NO') !== -1 ? recordHeaders.indexOf('PEA NO') : 2;
  const recordRowIndicesToDelete: number[] = [];
  const matchedRecordRows: SheetRow[] = [];
  for (let i = 1; i < recordRows.length; i++) {
    if (isMatch(recordRows[i][recordPeaCol])) {
      recordRowIndicesToDelete.push(i);
      matchedRecordRows.push(recordRows[i]);
    }
  }

  // 5. Find matches in Task Data
  const taskHeaders = (taskRows[0] || []).map(h => String(h).trim());
  const taskPeaCol = taskHeaders.indexOf('PEA NO') !== -1 ? taskHeaders.indexOf('PEA NO') : 0;
  const taskRowIndicesToDelete: number[] = [];
  const matchedTaskRows: SheetRow[] = [];
  for (let i = 1; i < taskRows.length; i++) {
    if (isMatch(taskRows[i][taskPeaCol])) {
      taskRowIndicesToDelete.push(i);
      matchedTaskRows.push(taskRows[i]);
    }
  }

  // 6. Find matches in AI Reports
  const aiHeaders = (aiRows[0] || []).map(h => String(h).trim());
  const aiPeaCol = aiHeaders.indexOf('PEA NO') !== -1 ? aiHeaders.indexOf('PEA NO') : 1;
  const aiRowIndicesToDelete: number[] = [];
  for (let i = 1; i < aiRows.length; i++) {
    if (isMatch(aiRows[i][aiPeaCol])) {
      aiRowIndicesToDelete.push(i);
    }
  }

  // 6.5 Find matches in Violations
  const vHeaders = (violationRows[0] || []).map(h => String(h).trim());
  const vPeaCol = vHeaders.indexOf('PEANO หม้อแปลง') !== -1 ? vHeaders.indexOf('PEANO หม้อแปลง') : 0;
  const violationRowIndicesToDelete: number[] = [];
  const matchedViolationRows: unknown[][] = [];
  for (let i = 1; i < violationRows.length; i++) {
    if (isMatch(violationRows[i][vPeaCol])) {
      violationRowIndicesToDelete.push(i);
      matchedViolationRows.push(violationRows[i]);
    }
  }

  // Check if anything was found
  const totalFound =
    masterRowIndicesToDelete.length +
    recordRowIndicesToDelete.length +
    taskRowIndicesToDelete.length +
    aiRowIndicesToDelete.length +
    violationRowIndicesToDelete.length;

  if (totalFound === 0) {
    return {
      success: true,
      message: `ไม่พบข้อมูลหม้อแปลง PEA ${peaNo} ในระบบ (ไม่มีแถวข้อมูลที่ตรงกัน)`,
      peaNo,
      deletedCounts: { master: 0, records: 0, tasks: 0, aiReports: 0, photos: 0 },
      deletedPhotoIds: [],
    };
  }

  // 7. Extract all Drive photo IDs from matched rows across Record Data, Task Data, and Violations
  const driveFileIds = extractDriveFileIds([...matchedRecordRows, ...matchedTaskRows, ...matchedViolationRows]);

  // 8. Build Google Sheets batch delete requests (descending order per sheet)
  const batchRequests: sheets_v4.Schema$Request[] = [];

  const addDeleteRequestsForSheet = (sheetId: number | null | undefined, indices: number[]) => {
    if (sheetId === undefined || sheetId === null || indices.length === 0) return;
    const sortedDesc = [...indices].sort((a, b) => b - a);
    for (const rowIndex of sortedDesc) {
      batchRequests.push({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      });
    }
  };

  addDeleteRequestsForSheet(masterSheet?.properties?.sheetId, masterRowIndicesToDelete);
  addDeleteRequestsForSheet(recordSheet?.properties?.sheetId, recordRowIndicesToDelete);
  addDeleteRequestsForSheet(taskSheet?.properties?.sheetId, taskRowIndicesToDelete);
  if (aiReportSheet) {
    addDeleteRequestsForSheet(aiReportSheet.properties?.sheetId, aiRowIndicesToDelete);
  }
  if (violationSheet) {
    addDeleteRequestsForSheet(violationSheet.properties?.sheetId, violationRowIndicesToDelete);
  }

  if (batchRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: batchRequests,
      },
    });
  }

  // 9. Concurrently delete all photos from Google Drive (max 10 concurrent workers)
  let deletedPhotosCount = 0;
  if (driveFileIds.length > 0) {
    const photoResults = await deleteImagesBatch(driveFileIds, drive, 10);
    deletedPhotosCount = photoResults.filter(p => p.success).length;
  }

  return {
    success: true,
    message: `ลบข้อมูลหม้อแปลง PEA ${peaNo} เรียบร้อยแล้ว (MasterData: ${masterRowIndicesToDelete.length}, Record Data: ${recordRowIndicesToDelete.length}, Task Data: ${taskRowIndicesToDelete.length}, AI Reports: ${aiRowIndicesToDelete.length}, รูปถ่ายใน Drive: ${deletedPhotosCount}/${driveFileIds.length} รูป)`,
    peaNo,
    deletedCounts: {
      master: masterRowIndicesToDelete.length,
      records: recordRowIndicesToDelete.length,
      tasks: taskRowIndicesToDelete.length,
      aiReports: aiRowIndicesToDelete.length,
      photos: deletedPhotosCount,
    },
    deletedPhotoIds: driveFileIds,
  };
}

/**
 * Creates a new re-inspection task in 'Task Data' sheet.
 * If a Pending task already exists for this peaNo, updates its timestamp.
 * Otherwise appends a new row with Status 'Pending'.
 */
export async function createTask(
  input: CreateTaskInput
): Promise<{ success: boolean; message: string; peaNo: string; orderDate: string }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = await getSpreadsheetId(sheets, drive);

  const cleanPeaNo = input.peaNo.trim();
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const orderDate = new Intl.DateTimeFormat('en-GB', options).format(now).replace(',', '');

  // Fetch current Task Data
  let taskRes;
  try {
    taskRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Task Data!A1:Z',
    });
  } catch (_err: unknown) {
    // If worksheet doesn't exist, create it
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const exists = sheetMeta.data.sheets?.some(s => s.properties?.title === 'Task Data');
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: 'Task Data' },
              },
            },
          ],
        },
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Task Data!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['PEA NO', 'Status', 'Date']],
        },
      });
    }
    taskRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Task Data!A1:Z',
    });
  }

  const rows = taskRes.data.values || [];
  if (rows.length === 0) {
    // Append headers and first row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Task Data!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          ['PEA NO', 'Status', 'Date'],
          [cleanPeaNo, 'Pending', orderDate],
        ],
      },
    });
    return {
      success: true,
      message: `บันทึกคำสั่งตรวจซ้ำหม้อแปลง PEA ${cleanPeaNo} เรียบร้อยแล้ว (หมุดบนแผนที่จะเปลี่ยนเป็นสีส้ม)`,
      peaNo: cleanPeaNo,
      orderDate,
    };
  }

  const headers = rows[0].map(h => String(h).trim());
  const tPeaIdx = headers.indexOf('PEA NO') !== -1
    ? headers.indexOf('PEA NO')
    : headers.indexOf('PEANO') !== -1
    ? headers.indexOf('PEANO')
    : 0;
  const tStatusIdx = headers.indexOf('Status') !== -1
    ? headers.indexOf('Status')
    : headers.indexOf('สถานะ') !== -1
    ? headers.indexOf('สถานะ')
    : 1;
  const tDateIdx = headers.indexOf('Date') !== -1
    ? headers.indexOf('Date')
    : headers.indexOf('วันที่สั่งงาน') !== -1
    ? headers.indexOf('วันที่สั่งงาน')
    : 2;

  // Check if there's already a Pending row for this peaNo
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const pea = String(row[tPeaIdx] || '').trim();
    const status = String(row[tStatusIdx] || '').trim().toLowerCase();
    if (pea === cleanPeaNo && (status === 'pending' || status === 'สั่งตรวจซ้ำ')) {
      // Update date
      const dateColLetter = String.fromCharCode(65 + tDateIdx);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Task Data!${dateColLetter}${i + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[orderDate]],
        },
      });
      return {
        success: true,
        message: `หม้อแปลง PEA ${cleanPeaNo} อยู่ในสถานะสั่งตรวจซ้ำอยู่แล้ว (อัปเดตวัน-เวลาสั่งงานล่าสุดเป็น ${orderDate})`,
        peaNo: cleanPeaNo,
        orderDate,
      };
    }
  }

  // Construct new row matching existing header length
  const newRow: string[] = headers.map(h => {
    const header = h.trim();
    if (header === 'PEA NO' || header === 'PEANO' || header === 'PEANO หม้อแปลง') return cleanPeaNo;
    if (header === 'Status' || header === 'สถานะ') return 'Pending';
    if (header === 'Date' || header === 'วันที่สั่งงาน') return orderDate;
    if (header === 'ผู้สั่งงาน' || header === 'Assigner') return input.assigner || 'ผู้ดูแลระบบ (Admin)';
    return '';
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Task Data!A:Z',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newRow],
    },
  });

  return {
    success: true,
    message: `บันทึกคำสั่งตรวจซ้ำหม้อแปลง PEA ${cleanPeaNo} เรียบร้อยแล้ว (หมุดบนแผนที่จะเปลี่ยนเป็นสีส้ม)`,
    peaNo: cleanPeaNo,
    orderDate,
  };
}

/**
 * Cancels a pending re-inspection task by setting its status to 'Done'
 */
export async function cancelTask(
  peaNo: string
): Promise<{ success: boolean; message: string; peaNo: string }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = await getSpreadsheetId(sheets, drive);

  const cleanPeaNo = peaNo.trim();
  const taskRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Task Data!A1:Z',
  });

  const rows = taskRes.data.values || [];
  if (rows.length <= 1) {
    return {
      success: true,
      message: `ไม่พบรายการสั่งตรวจซ้ำของหม้อแปลง PEA ${cleanPeaNo}`,
      peaNo: cleanPeaNo,
    };
  }

  const headers = rows[0].map(h => String(h).trim());
  const tPeaIdx = headers.indexOf('PEA NO') !== -1
    ? headers.indexOf('PEA NO')
    : headers.indexOf('PEANO') !== -1
    ? headers.indexOf('PEANO')
    : 0;
  const tStatusIdx = headers.indexOf('Status') !== -1
    ? headers.indexOf('Status')
    : headers.indexOf('สถานะ') !== -1
    ? headers.indexOf('สถานะ')
    : 1;

  let cancelledCount = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const pea = String(row[tPeaIdx] || '').trim();
    const status = String(row[tStatusIdx] || '').trim().toLowerCase();
    if (pea === cleanPeaNo && (status === 'pending' || status === 'สั่งตรวจซ้ำ')) {
      const colLetter = String.fromCharCode(65 + tStatusIdx);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Task Data!${colLetter}${i + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['Done']],
        },
      });
      cancelledCount++;
    }
  }

  return {
    success: true,
    message: cancelledCount > 0
      ? `ยกเลิกคำสั่งตรวจซ้ำหม้อแปลง PEA ${cleanPeaNo} สำเร็จ`
      : `ไม่พบรายการสั่งตรวจซ้ำที่ค้างอยู่ของหม้อแปลง PEA ${cleanPeaNo}`,
    peaNo: cleanPeaNo,
  };
}

/**
 * Ensures 'Violations' sheet exists with canonical 11-column header.
 */
async function ensureViolationsSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<void> {
  const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = sheetMeta.data.sheets?.some(s => s.properties?.title === 'Violations');
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: 'Violations' },
            },
          },
        ],
      },
    });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Violations!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          'PEANO หม้อแปลง',
          'PEA NO มิเตอร์',
          'ชื่อผู้ใช้ไฟ/สถานที่',
          'ประเภทการละเมิด',
          'วันที่ตรวจพบ',
          'เวลา',
          'ผู้ตรวจพบ',
          'สถานะ',
          'หมายเหตุ/รายละเอียด',
          'รูปถ่ายหลักฐาน',
          'Timestamp',
        ]],
      },
    });
  }
}

/**
 * Creates a new meter violation record in 'Violations' sheet.
 */
export async function createMeterViolation(
  input: CreateViolationInput
): Promise<{ success: boolean; message: string; violation: MeterViolation }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = await getSpreadsheetId(sheets, drive);

  await ensureViolationsSheet(sheets, spreadsheetId);

  // 1. Upload evidence images to Google Drive if provided
  let imgUrlString = '';
  if (input.images && input.images.length > 0) {
    const uploadPromises = input.images.map(async (img, i) => {
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img;
      } else if (img.startsWith('data:image') || img.length > 100) {
        const cleanDate = (input.detectedDate || '').replace(/[-/]/g, '');
        const cleanTime = (input.detectedTime || '').replace(/[:]/g, '');
        const fileName = `VIOLATION_${input.transformerPeaNo}_${input.meterPeaNo}_${cleanDate}_${cleanTime}_${i + 1}.jpg`;
        return await uploadImageToDrive(img, fileName);
      }
      return null;
    });

    const results = await Promise.all(uploadPromises);
    const validUrls = results.filter((url): url is string => Boolean(url && url.startsWith('http')));
    imgUrlString = validUrls.join(', ');
  }

  const timestamp = new Date().toISOString();
  const newRow: SheetRow = [
    input.transformerPeaNo.trim(),
    input.meterPeaNo.trim(),
    input.consumerName?.trim() || '',
    input.violationType.trim(),
    input.detectedDate.trim(),
    input.detectedTime?.trim() || '',
    input.inspectorName?.trim() || '',
    input.status || 'INVESTIGATING',
    input.remark?.trim() || '',
    imgUrlString,
    timestamp,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Violations!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newRow],
    },
  });

  const violation: MeterViolation = {
    transformerPeaNo: input.transformerPeaNo.trim(),
    meterPeaNo: input.meterPeaNo.trim(),
    consumerName: input.consumerName?.trim() || '',
    location: input.location?.trim() || '',
    violationType: input.violationType.trim(),
    detectedDate: input.detectedDate.trim(),
    detectedTime: input.detectedTime?.trim() || '',
    inspectorName: input.inspectorName?.trim() || '',
    status: input.status || 'INVESTIGATING',
    remark: input.remark?.trim() || '',
    imageUrls: imgUrlString ? imgUrlString.split(',').map(s => s.trim()).filter(Boolean) : [],
    createdAt: timestamp,
  };

  return {
    success: true,
    message: `บันทึกข้อมูลการตรวจพบการละเมิดมิเตอร์ ${input.meterPeaNo} (หม้อแปลง ${input.transformerPeaNo}) เรียบร้อยแล้ว`,
    violation,
  };
}

/**
 * Updates status of an existing meter violation.
 */
export async function updateMeterViolationStatus(
  input: UpdateViolationStatusInput
): Promise<{ success: boolean; message: string }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = await getSpreadsheetId(sheets, drive);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Violations!A1:Z',
  });
  const rows = res.data.values || [];
  if (rows.length <= 1) {
    return { success: false, message: 'ไม่พบตารางข้อมูลการละเมิด' };
  }

  const headers = rows[0].map(h => String(h).trim());
  const peaIdx = headers.indexOf('PEANO หม้อแปลง') !== -1 ? headers.indexOf('PEANO หม้อแปลง') : 0;
  const meterIdx = headers.indexOf('PEA NO มิเตอร์') !== -1 ? headers.indexOf('PEA NO มิเตอร์') : 1;
  const statusIdx = headers.indexOf('สถานะ') !== -1 ? headers.indexOf('สถานะ') : 7;

  const targetPea = input.transformerPeaNo.trim().toLowerCase();
  const targetMeter = input.meterPeaNo.trim().toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const pea = String(row[peaIdx] || '').trim().toLowerCase();
    const meter = String(row[meterIdx] || '').trim().toLowerCase();
    if (pea === targetPea && meter === targetMeter) {
      const colLetter = String.fromCharCode(65 + statusIdx);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Violations!${colLetter}${i + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[input.status]],
        },
      });
      return { success: true, message: `อัปเดตสถานะมิเตอร์ ${input.meterPeaNo} เป็น ${input.status} สำเร็จ` };
    }
  }

  return { success: false, message: `ไม่พบข้อมูลมิเตอร์ ${input.meterPeaNo}` };
}

/**
 * Updates full information of an existing meter violation.
 */
export async function updateMeterViolation(
  input: UpdateViolationInput
): Promise<{ success: boolean; message: string; violation: MeterViolation }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = await getSpreadsheetId(sheets, drive);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Violations!A1:Z',
  });
  const rows = res.data.values || [];
  if (rows.length <= 1) {
    throw new Error('ไม่พบตารางข้อมูลการละเมิด');
  }

  const headers = rows[0].map(h => String(h).trim());
  const peaIdx = headers.indexOf('PEANO หม้อแปลง') !== -1 ? headers.indexOf('PEANO หม้อแปลง') : 0;
  const meterIdx = headers.indexOf('PEA NO มิเตอร์') !== -1 ? headers.indexOf('PEA NO มิเตอร์') : 1;
  const imgIdx = headers.indexOf('รูปถ่ายหลักฐาน') !== -1 ? headers.indexOf('รูปถ่ายหลักฐาน') : 9;

  const targetPea = input.transformerPeaNo.trim().toLowerCase();
  const targetMeter = (input.originalMeterPeaNo || input.meterPeaNo).trim().toLowerCase();

  let targetRowIndex = -1;
  let existingRow: any[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const pea = String(row[peaIdx] || '').trim().toLowerCase();
    const meter = String(row[meterIdx] || '').trim().toLowerCase();
    if (pea === targetPea && meter === targetMeter) {
      targetRowIndex = i + 1; // 1-indexed for Sheets
      existingRow = row;
      break;
    }
  }

  if (targetRowIndex === -1) {
    throw new Error(`ไม่พบข้อมูลมิเตอร์ ${input.originalMeterPeaNo || input.meterPeaNo}`);
  }

  // Handle images: preserve existing valid Drive URLs, and upload any new base64 images
  let finalImgUrls: string[] = [];
  if (input.images && input.images.length > 0) {
    const uploadPromises = input.images.map(async (img, i) => {
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img;
      } else if (img.startsWith('data:image') || img.length > 100) {
        const cleanDate = (input.detectedDate || '').replace(/[-/]/g, '');
        const cleanTime = (input.detectedTime || '').replace(/[:]/g, '');
        const fileName = `VIOLATION_${input.transformerPeaNo}_${input.meterPeaNo}_${cleanDate}_${cleanTime}_edit_${i + 1}.jpg`;
        return await uploadImageToDrive(img, fileName);
      }
      return null;
    });

    const results = await Promise.all(uploadPromises);
    finalImgUrls = results.filter((url): url is string => Boolean(url && url.startsWith('http')));
  } else if (existingRow[imgIdx]) {
    finalImgUrls = String(existingRow[imgIdx]).split(',').map(s => s.trim()).filter(Boolean);
  }

  const imgUrlString = finalImgUrls.join(', ');
  const timestamp = new Date().toISOString();

  const updatedRow: SheetRow = [
    input.transformerPeaNo.trim(),
    input.meterPeaNo.trim(),
    input.consumerName?.trim() || '',
    input.violationType.trim(),
    input.detectedDate.trim(),
    input.detectedTime?.trim() || '',
    input.inspectorName?.trim() || '',
    input.status || 'INVESTIGATING',
    input.remark?.trim() || '',
    imgUrlString,
    timestamp,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Violations!A${targetRowIndex}:K${targetRowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [updatedRow],
    },
  });

  const violation: MeterViolation = {
    transformerPeaNo: input.transformerPeaNo.trim(),
    meterPeaNo: input.meterPeaNo.trim(),
    consumerName: input.consumerName?.trim() || '',
    location: input.location?.trim() || '',
    violationType: input.violationType.trim(),
    detectedDate: input.detectedDate.trim(),
    detectedTime: input.detectedTime?.trim() || '',
    inspectorName: input.inspectorName?.trim() || '',
    status: input.status || 'INVESTIGATING',
    remark: input.remark?.trim() || '',
    imageUrls: finalImgUrls,
    createdAt: timestamp,
  };

  return {
    success: true,
    message: `อัปเดตข้อมูลการตรวจมิเตอร์ ${input.meterPeaNo} สำเร็จ`,
    violation,
  };
}

/**
 * Deletes a meter violation from 'Violations' sheet.
 */
export async function deleteMeterViolation(
  input: DeleteViolationInput
): Promise<{ success: boolean; message: string }> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });
  const spreadsheetId = await getSpreadsheetId(sheets, drive);

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const vSheet = meta.data.sheets?.find(s => s.properties?.title === 'Violations');
  if (vSheet?.properties?.sheetId === undefined) {
    return { success: false, message: 'ไม่พบชีต Violations' };
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Violations!A1:Z',
  });
  const rows = res.data.values || [];
  if (rows.length <= 1) {
    return { success: false, message: 'ไม่มีข้อมูลในชีต Violations' };
  }

  const headers = rows[0].map(h => String(h).trim());
  const peaIdx = headers.indexOf('PEANO หม้อแปลง') !== -1 ? headers.indexOf('PEANO หม้อแปลง') : 0;
  const meterIdx = headers.indexOf('PEA NO มิเตอร์') !== -1 ? headers.indexOf('PEA NO มิเตอร์') : 1;
  const dateIdx = headers.indexOf('วันที่ตรวจพบ') !== -1 ? headers.indexOf('วันที่ตรวจพบ') : 4;
  const imgIdx = headers.indexOf('รูปถ่ายหลักฐาน') !== -1 ? headers.indexOf('รูปถ่ายหลักฐาน') : 9;

  const targetPea = input.transformerPeaNo.trim().toLowerCase();
  const targetMeter = input.meterPeaNo.trim().toLowerCase();
  const targetDate = input.detectedDate?.trim().toLowerCase();

  const matchedIndices: number[] = [];
  const photosToDelete: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const pea = String(row[peaIdx] || '').trim().toLowerCase();
    const meter = String(row[meterIdx] || '').trim().toLowerCase();
    const date = String(row[dateIdx] || '').trim().toLowerCase();

    if (pea === targetPea && meter === targetMeter) {
      if (!targetDate || date === targetDate) {
        matchedIndices.push(i);
        const rawImgs = String(row[imgIdx] || '');
        if (rawImgs) {
          photosToDelete.push(...extractDriveFileIds([row]));
        }
      }
    }
  }

  if (matchedIndices.length === 0) {
    return { success: false, message: `ไม่พบรายการละเมิดของมิเตอร์ ${input.meterPeaNo}` };
  }

  // Delete rows in descending order
  const requests = matchedIndices.sort((a, b) => b - a).map(rowIndex => ({
    deleteDimension: {
      range: {
        sheetId: vSheet.properties!.sheetId!,
        dimension: 'ROWS' as const,
        startIndex: rowIndex,
        endIndex: rowIndex + 1,
      },
    },
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests },
  });

  // Clean up photos from Drive asynchronously
  if (photosToDelete.length > 0) {
    deleteImagesBatch(photosToDelete, drive, 5).catch(err => {
      console.warn('[deleteMeterViolation] Photo deletion warning:', err);
    });
  }

  return {
    success: true,
    message: `ลบรายการละเมิดมิเตอร์ ${input.meterPeaNo} เรียบร้อยแล้ว`,
  };
}


