import { NextRequest, NextResponse } from 'next/server';
import {
  getTransformersWithStatus,
  registerNewTransformer,
  deleteTransformer,
} from '@/lib/adapters/google-sheets';
import {
  RegisterTransformerInputSchema,
  DeleteTransformerInputSchema,
  getErrorMessage,
} from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getTransformersWithStatus();
    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error: unknown) {
    console.error('Error in /api/transformers:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = RegisterTransformerInputSchema.safeParse(rawBody);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      );
    }

    const result = await registerNewTransformer(parsed.data);

    return NextResponse.json({
      success: true,
      message: result.message,
      peaNo: parsed.data.peaNo,
    });
  } catch (error: unknown) {
    console.error('Error in POST /api/transformers:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'เกิดข้อผิดพลาดในการลงทะเบียนหม้อแปลง',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let peaNo = searchParams.get('peaNo');

    if (!peaNo) {
      try {
        const body = await req.json();
        peaNo = body?.peaNo;
      } catch {
        // Ignored if body is empty or not JSON
      }
    }

    const parsed = DeleteTransformerInputSchema.safeParse({ peaNo });
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 400 }
      );
    }

    const result = await deleteTransformer(parsed.data.peaNo);

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/transformers:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'เกิดข้อผิดพลาดในการลบข้อมูลหม้อแปลง',
      },
      { status: 500 }
    );
  }
}
