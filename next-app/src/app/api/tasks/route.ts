import { NextRequest, NextResponse } from 'next/server';
import { CreateTaskInputSchema, CancelTaskInputSchema, getErrorMessage } from '@/lib/domain/types';
import { createTask, createBatchTasks, cancelTask } from '@/lib/adapters/google-sheets';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tasks
 * Orders re-inspection task(s) for transformer(s) (adds to Task Data in Google Sheets)
 * Supports single peaNo or batch peaNos
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = CreateTaskInputSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || 'ข้อมูลสั่งตรวจซ้ำไม่ถูกต้อง',
          issues: parseResult.error.issues,
        },
        { status: 400 }
      );
    }

    if (parseResult.data.peaNos && parseResult.data.peaNos.length > 0) {
      const result = await createBatchTasks(parseResult.data.peaNos, parseResult.data.assigner);
      return NextResponse.json({
        success: true,
        message: result.message,
        data: result,
      });
    }

    const result = await createTask({
      peaNo: parseResult.data.peaNo!,
      assigner: parseResult.data.assigner,
      note: parseResult.data.note,
    });
    return NextResponse.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error: unknown) {
    console.error('[API /api/tasks POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'เกิดข้อผิดพลาดในการบันทึกคำสั่งตรวจซ้ำ',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks
 * Cancels a pending re-inspection task for a transformer
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const peaNoParam = searchParams.get('peaNo');

    let peaNo = peaNoParam;
    if (!peaNo) {
      try {
        const body = await req.json();
        peaNo = body.peaNo;
      } catch {
        // Body optional if query param provided
      }
    }

    const parseResult = CancelTaskInputSchema.safeParse({ peaNo });
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error.issues[0]?.message || 'กรุณาระบุรหัส PEANO หม้อแปลง',
        },
        { status: 400 }
      );
    }

    const result = await cancelTask(parseResult.data.peaNo);
    return NextResponse.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error: unknown) {
    console.error('[API /api/tasks DELETE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'เกิดข้อผิดพลาดในการยกเลิกคำสั่งตรวจซ้ำ',
      },
      { status: 500 }
    );
  }
}
