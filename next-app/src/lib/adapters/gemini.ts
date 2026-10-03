import { GoogleGenerativeAI } from '@google/generative-ai';
import { TransformerWithStatus, MeasurementSession, getErrorMessage } from '../domain/types';
import {
  calculateIMax,
  calculateVectorNeutral,
  safeFloat,
} from '../domain/calculations';

const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-pro-latest',
];

export async function analyzeTransformerWithAI(
  transformer: TransformerWithStatus,
  apiKey?: string
): Promise<string> {
  const rawKey = apiKey || process.env.GEMINI_API_KEY || '';
  const key = rawKey.replace(/^["']|["']$/g, '').trim();
  if (!key) {
    throw new Error('ไม่พบ GEMINI_API_KEY ในการตั้งค่าระบบ');
  }

  const genAI = new GoogleGenerativeAI(key);

  const { peaNo, kva, location, brand, system } = transformer;
  const iMax = calculateIMax(kva, (system as '1' | '3') || '3');

  // Extract all measurement sessions from history (or fallback to latestSession)
  const sessions: MeasurementSession[] =
    transformer.historySessions && transformer.historySessions.length > 0
      ? transformer.historySessions
      : transformer.latestSession
      ? [transformer.latestSession]
      : [];

  // Sort sessions chronologically (oldest to newest) for progressive trend analysis
  const sortedSessions = [...sessions].reverse();

  // Format every session with all its feeders and calculated engineering parameters
  const sessionsFormattedText = sortedSessions.length === 0
    ? 'ไม่มีข้อมูลประวัติการบันทึกโหลดในระบบ'
    : sortedSessions.map((s, idx) => {
        const sessionNum = idx + 1;
        const isLatest = idx === sortedSessions.length - 1;

        // Session Totals
        const totIa = safeFloat(s.total?.currentA);
        const totIb = safeFloat(s.total?.currentB);
        const totIc = safeFloat(s.total?.currentC);
        const totIn = safeFloat(s.total?.currentN);
        const inCalc = calculateVectorNeutral(totIa, totIb, totIc);
        const harmonic = totIn - inCalc;

        const van = safeFloat(s.total?.vt_an) > 0 ? safeFloat(s.total?.vt_an) : 230;
        const vbn = safeFloat(s.total?.vt_bn) > 0 ? safeFloat(s.total?.vt_bn) : 230;
        const vcn = safeFloat(s.total?.vt_cn) > 0 ? safeFloat(s.total?.vt_cn) : 230;
        const totKva = (totIa * van + totIb * vbn + totIc * vcn) / 1000;
        const pctUf = kva > 0 ? (totKva / kva) * 100 : 0;

        const avgI = (totIa + totIb + totIc) / 3;
        const maxDev = avgI > 0 ? Math.max(Math.abs(totIa - avgI), Math.abs(totIb - avgI), Math.abs(totIc - avgI)) : 0;
        const pctUnb = avgI > 0 ? (maxDev / avgI) * 100 : 0;

        // Feeder details
        const feedersText = s.feeders.map(f => {
          const fIa = safeFloat(f.currentA);
          const fIb = safeFloat(f.currentB);
          const fIc = safeFloat(f.currentC);
          const fIn = safeFloat(f.currentN);
          const fInCalc = calculateVectorNeutral(fIa, fIb, fIc);
          const fHarmonic = fIn - fInCalc;

          const fVan = safeFloat(f.vt_an) > 0 ? safeFloat(f.vt_an) : 230;
          const fVbn = safeFloat(f.vt_bn) > 0 ? safeFloat(f.vt_bn) : 230;
          const fVcn = safeFloat(f.vt_cn) > 0 ? safeFloat(f.vt_cn) : 230;
          const fKva = (fIa * fVan + fIb * fVbn + fIc * fVcn) / 1000;
          const fUf = kva > 0 ? (fKva / kva) * 100 : 0;

          const fAvgI = (fIa + fIb + fIc) / 3;
          const fMaxDev = fAvgI > 0 ? Math.max(Math.abs(fIa - fAvgI), Math.abs(fIb - fAvgI), Math.abs(fIc - fAvgI)) : 0;
          const fUnb = fAvgI > 0 ? (fMaxDev / fAvgI) * 100 : 0;

          const vtParts: string[] = [];
          if (f.vt_ab) vtParts.push(`A-B=${f.vt_ab}V`);
          if (f.vt_bc) vtParts.push(`B-C=${f.vt_bc}V`);
          if (f.vt_ca) vtParts.push(`C-A=${f.vt_ca}V`);
          if (f.vt_an) vtParts.push(`A-N=${f.vt_an}V`);
          if (f.vt_bn) vtParts.push(`B-N=${f.vt_bn}V`);
          if (f.vt_cn) vtParts.push(`C-N=${f.vt_cn}V`);
          const vtStr = vtParts.length > 0 ? `แรงดันใต้หม้อแปลง Vt: [${vtParts.join(', ')}]` : 'แรงดันใต้หม้อแปลง: ไม่ได้วัด';

          const veParts: string[] = [];
          if (f.ve_ab) veParts.push(`A-B=${f.ve_ab}V`);
          if (f.ve_bc) veParts.push(`B-C=${f.ve_bc}V`);
          if (f.ve_ca) veParts.push(`C-A=${f.ve_ca}V`);
          if (f.ve_an) veParts.push(`A-N=${f.ve_an}V`);
          if (f.ve_bn) veParts.push(`B-N=${f.ve_bn}V`);
          if (f.ve_cn) veParts.push(`C-N=${f.ve_cn}V`);
          const veStr = veParts.length > 0 ? `แรงดันปลายสาย Ve: [${veParts.join(', ')}]` : 'แรงดันปลายสาย: ไม่ได้วัด';

          const cableStr = f.cableSize ? `ขนาดสาย: ${f.cableSize} ตร.มม.` : '';
          const noteStr = f.note ? `หมายเหตุ: "${f.note}"` : '';

          return `  * ฟีดเดอร์ ${f.name}: กระแส [เฟส A = ${fIa.toFixed(1)} A, B = ${fIb.toFixed(1)} A, C = ${fIc.toFixed(1)} A, N = ${fIn.toFixed(1)} A], นิวตรอนคำนวณ = ${fInCalc.toFixed(2)} A, Harmonicแฝง = ${fHarmonic.toFixed(2)} A | โหลด = ${fKva.toFixed(2)} kVA (%UF = ${fUf.toFixed(1)}%), %Unbalance = ${fUnb.toFixed(1)}% | ${cableStr} | ${vtStr} | ${veStr} | ${noteStr}`;
        }).join('\n');

        return `
[รอบตรวจวัดที่ ${sessionNum}${isLatest ? ' (รอบล่าสุด)' : ''}: วันที่ ${s.date} เวลา ${s.time} น. | แท็ปหม้อแปลง: Tap ${s.tap || '3'}]
- สรุปผลรวมหม้อแปลง (Total Session Summary):
  * กระแสไฟฟ้ารวม 3 เฟส: A = ${totIa.toFixed(2)} A, B = ${totIb.toFixed(2)} A, C = ${totIc.toFixed(2)} A, N (วัด) = ${totIn.toFixed(2)} A
  * กระแสนิวทรัลตามทฤษฎี (Vector Neutral In_calc): ${inCalc.toFixed(2)} A
  * กระแสฮาร์มอนิกแฝง (In - In_calc): ${harmonic.toFixed(2)} A
  * โหลดรวม (Total kVA): ${totKva.toFixed(2)} kVA จากพิกัด ${kva} kVA
  * เปอร์เซ็นต์การใช้งานโหลด (%UF): ${pctUf.toFixed(2)}% (เกณฑ์ กฟภ.: ปกติ ≤80%, โหลดเกินพิกัด >80%, วิกฤต >100%)
  * เปอร์เซ็นต์ความไม่สมดุล (%Unbalance): ${pctUnb.toFixed(2)}% (เกณฑ์ กฟภ.: ปกติ ≤20%, เฝ้าระวัง 20-30%, วิกฤต >30%)
- รายละเอียดรายฟีดเดอร์ในรอบนี้ (${s.feeders.length} ฟีดเดอร์):
${feedersText || '  (ไม่มีข้อมูลรายฟีดเดอร์ย่อย)'}
`;
      }).join('\n---\n');

  const prompt = `
คุณคือวิศวกรไฟฟ้าผู้เชี่ยวชาญระดับสูงของการไฟฟ้าส่วนภูมิภาค (PEA) ด้านระบบจำหน่ายและวิศวกรรมหม้อแปลง (Distribution Transformer Engineering Specialist)
กรุณาวิเคราะห์ "ตารางประวัติบันทึกข้อมูลโหลด" (Measurement History Sessions) ของหม้อแปลงลูกนี้อย่างละเอียดรอบด้าน โดยอ้างอิงข้อมูลประวัติการตรวจวัดทั้งหมดทุกรอบที่บันทึกไว้:

[ข้อมูลหม้อแปลง]
- หมายเลข PEA: ${peaNo}
- พิกัดกำลัง: ${kva} kVA, ระบบ: ${system} เฟส
- พิกัดกระแสสูงสุด (I_max): ${iMax.toFixed(2)} A
- ยี่ห้อ: ${brand || 'ไม่ระบุ'}
- สถานที่ติดตั้ง: ${location || 'ไม่ระบุ'}
- จำนวนรอบตรวจวัดในประวัติ: ${sortedSessions.length} รอบ

[ตารางประวัติบันทึกข้อมูลโหลดทั้งหมด ทุกรอบที่วัด]
${sessionsFormattedText}

กรุณาวิเคราะห์เชิงลึกและจัดทำรายงานทางวิศวกรรมไฟฟ้าตามมาตรฐาน กฟภ. (PEA Standards) อย่างเป็นระเบียบ สวยงาม ครบถ้วน โดยจัดโครงสร้างรายงานเป็น 6 หัวข้อดังนี้:

## 1. 📊 สรุปภาพรวมและประวัติการตรวจวัด (Executive Summary)
- สรุปสถานะสุขภาพหม้อแปลงโดยรวมจากทุกรอบตรวจวัดที่บันทึก
- กำหนดระดับสถานะความเร่งด่วน: [🟢 ปกติ] / [🟡 เฝ้าระวัง] / [🟠 เร่งด่วน] / [🔴 วิกฤต] พร้อมเหตุผลประกอบสั้นๆ ชัดเจน

## 2. 📈 การวิเคราะห์การจ่ายโหลดและแนวโน้ม (%UF & Load Trend Analysis)
- เปรียบเทียบการจ่ายโหลด (%UF และ kVA) ในแต่ละรอบการตรวจวัด วิเคราะห์แนวโน้มว่าโหลดเพิ่มขึ้น คงที่ หรือลดลง
- วิเคราะห์การกระจายโหลดตามฟีดเดอร์ (Feeder Load Distribution) ฟีดเดอร์ใดจ่ายโหลดหลัก และขนาดสายไฟเพียงพอหรือไม่
- ประเมินความเสี่ยงโหลดเกินพิกัด (Overload Risk) เทียบเกณฑ์ PEA (ปกติ <=80%, โหลดเกินพิกัด >80%, วิกฤต >100%)

## 3. ⚖️ การวิเคราะห์ความไม่สมดุลของกระแสเฟสและสายนิวทรัล (%Unbalance & Neutral Current)
- ประเมิน %Unbalance ในแต่ละรอบตามเกณฑ์ กฟภ. (ปกติ <=20%, เฝ้าระวัง 20-30%, วิกฤต >30%)
- ระบุเฟสที่จ่ายกระแสสูงสุด (Max Phase) และเฟสที่จ่ายกระแสต่ำสุด (Min Phase)
- วิเคราะห์กระแสที่ไหลในสายนิวทรัล (IN) และความเสี่ยงต่อการเกิดความร้อนสะสมหรือสายนิวทรัลขาด/ไหม้

## 4. ⚡ การวิเคราะห์กระแสฮาร์มอนิกแฝงและความเสี่ยงผิดปกติ (Harmonics & Irregularities Detection)
- วิเคราะห์ค่ากระแสฮาร์มอนิกแฝง (IN_วัด - IN_คำนวณ) ในแต่ละรอบ (เกณฑ์เฝ้าระวัง >15A, วิกฤต >25A)
- ประเมินความเสี่ยงต่อการใช้งานโหลดไม่เป็นเชิงเส้น (Non-linear load), อุปกรณ์ Switching, ความเสี่ยงการลักใช้ไฟฟ้า หรือการต่อเครื่องขุด Cryptocurrency

## 5. 🔌 การวิเคราะห์ระดับแรงดันและแรงดันตกปลายสาย (Voltage Profile & Voltage Drop)
- ตรวจสอบระดับแรงดันต้นทางใต้หม้อแปลงและแรงดันปลายสายว่าอยู่ในพิกัดมาตรฐาน PEA (220V/380V ± 5-10% หรือ 207-253V L-N) หรือไม่
- หากมีข้อมูลแรงดันตกปลายสาย ให้ระบุเฟสและฟีดเดอร์ที่มีปัญหาแรงดันตก
- ประเมินความเหมาะสมของตำแหน่งแท็ปหม้อแปลง (Tap Position)

## 6. 🛠️ แผนปฏิบัติการและข้อเสนอแนะเชิงวิศวกรรม (Actionable Engineering Recommendations)
- **แผนการเกลี่ยโหลดระหว่างเฟส (Phase Balancing Action Plan):** ระบุคำแนะนำชัดเจนว่าควรย้ายโหลดประมาณกี่แอมป์ (A) จากเฟสใดไปยังเฟสใด เพื่อให้ %Unbalance ลดลงมาต่ำกว่า 20%
- **มาตรการปรับปรุงระบบ:** การปรับตั้งแท็ป, การตรวจสอบจุดต่อขั้วหลวม, หรือการปรับปรุงขนาดสาย/ฟีดเดอร์
- **กำหนดการตรวจวัดซ้ำ:** กำหนดรอบระยะเวลาที่ควรเข้าตรวจวัดซ้ำ (เช่น ทันที, 1 เดือน, 3 เดือน, 6 เดือน)

เขียนด้วยภาษาไทยเชิงวิชาการสำหรับวิศวกรและช่างไฟฟ้า มีการใช้ตัวหนา **เน้นย้ำจุดสำคัญ** จัดเป็น Bullet points และตารางสรุปที่อ่านง่าย ชัดเจน ตรงประเด็น
`;

  let lastErrorMessage = '';
  for (const modelName of FALLBACK_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) return text;
      } catch (err: unknown) {
        lastErrorMessage = getErrorMessage(err);
        const isTransient = /503|429|overload|resource_exhausted|unavailable/i.test(lastErrorMessage);
        if (isTransient && attempt === 1) {
          await new Promise((res) => setTimeout(res, 1500));
          continue;
        }
        console.warn(`Model ${modelName} failed (attempt ${attempt}):`, lastErrorMessage);
        break;
      }
    }
  }

  throw new Error(`AI Analysis failed across all models: ${lastErrorMessage}`);
}

