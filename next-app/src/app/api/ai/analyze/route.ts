import { NextRequest, NextResponse } from 'next/server';
import { analyzeTransformerWithAI } from '@/lib/adapters/gemini';
import { getTransformersWithStatus } from '@/lib/adapters/google-sheets';
import { TransformerWithStatus, AiAnalyzeInputSchema, getErrorMessage } from '@/lib/domain/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = AiAnalyzeInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error.errors[0]?.message || 'ข้อมูลไม่ถูกต้อง' },
        { status: 400 }
      );
    }

    let transformer = parseResult.data.transformer as TransformerWithStatus | undefined;

    if (!transformer && parseResult.data.peaNo) {
      const all = await getTransformersWithStatus();
      transformer = all.find((t) => t.peaNo === parseResult.data.peaNo) as TransformerWithStatus | undefined;
    }

    if (!transformer || !transformer.peaNo) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลหม้อแปลงในระบบ' },
        { status: 404 }
      );
    }

    const report = await analyzeTransformerWithAI(transformer);

    return NextResponse.json({
      success: true,
      peaNo: transformer.peaNo,
      report,
    });
  } catch (error: unknown) {
    console.error('Error in /api/ai/analyze:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
