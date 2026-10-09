import { NextResponse } from 'next/server';
import {
  createMeterViolation,
  deleteMeterViolation,
  updateMeterViolationStatus,
  getTransformersWithStatus,
} from '@/lib/adapters/google-sheets';
import {
  CreateViolationInputSchema,
  DeleteViolationInputSchema,
  UpdateViolationStatusInputSchema,
  getErrorMessage,
} from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const transformerPeaNo = (searchParams.get('transformerPeaNo') || searchParams.get('peaNo') || '').trim();

    const transformers = await getTransformersWithStatus();

    if (transformerPeaNo) {
      const target = transformers.find(
        (t) => t.peaNo.toLowerCase() === transformerPeaNo.toLowerCase()
      );
      return NextResponse.json({
        success: true,
        data: target?.violations || [],
      });
    }

    // Return all violations across all transformers
    const allViolations = transformers.flatMap((t) => t.violations || []);
    return NextResponse.json({
      success: true,
      data: allViolations,
      totalCount: allViolations.length,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/violations:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'เกิดข้อผิดพลาดในการดึงข้อมูลการละเมิดมิเตอร์',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parsed = CreateViolationInputSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const result = await createMeterViolation(parsed.data);

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.violation,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/violations:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'เกิดข้อผิดพลาดในการบันทึกการละเมิดมิเตอร์',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const rawBody = await req.json();
    const parsed = UpdateViolationStatusInputSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const result = await updateMeterViolationStatus(parsed.data);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error('Error in PATCH /api/violations:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'เกิดข้อผิดพลาดในการอัปเดตสถานะการละเมิด',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const transformerPeaNo = searchParams.get('transformerPeaNo') || searchParams.get('peaNo') || '';
    const meterPeaNo = searchParams.get('meterPeaNo') || '';
    const detectedDate = searchParams.get('detectedDate') || undefined;

    const parsed = DeleteViolationInputSchema.safeParse({
      transformerPeaNo,
      meterPeaNo,
      detectedDate,
    });

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const result = await deleteMeterViolation(parsed.data);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.message }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/violations:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'เกิดข้อผิดพลาดในการลบรายการการละเมิดมิเตอร์',
      },
      { status: 500 }
    );
  }
}
