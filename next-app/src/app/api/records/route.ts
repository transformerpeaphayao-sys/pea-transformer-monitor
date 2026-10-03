import { NextResponse } from 'next/server';
import { updateRecordSession, createRecordSession, deleteRecordSession } from '@/lib/adapters/google-sheets';
import {
  UpdateRecordSessionInputSchema,
  CreateRecordSessionInputSchema,
  DeleteRecordSessionInputSchema,
  getErrorMessage,
} from '@/lib/domain/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();

    // If 'originalDate' is provided, it's an update to an existing session from Backoffice
    if (rawBody.originalDate && rawBody.originalTime) {
      const parsed = UpdateRecordSessionInputSchema.safeParse(rawBody);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
        return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
      }
      const result = await updateRecordSession(parsed.data);
      return NextResponse.json({
        success: true,
        message: result.message || 'บันทึกข้อมูลเรียบร้อยแล้ว',
      });
    }

    // Otherwise, it's a new field measurement session
    const parsed = CreateRecordSessionInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const result = await createRecordSession(parsed.data);
    return NextResponse.json({
      success: true,
      message: result.message || 'บันทึกข้อมูลเรียบร้อยแล้ว',
      rowsAdded: result.rowsAdded,
    });
  } catch (error: unknown) {
    console.error('Error in /api/records POST:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const qPea = searchParams.get('peaNo') || '';
    const qDate = searchParams.get('date') || '';
    const qTime = searchParams.get('time') || '';

    let bodyData: Record<string, unknown> = {};
    if (!qPea || !qDate || !qTime) {
      try {
        const json = await req.json();
        if (json && typeof json === 'object') {
          bodyData = json as Record<string, unknown>;
        }
      } catch {
        // Query param only
      }
    }

    const inputData = {
      peaNo: qPea || (typeof bodyData.peaNo === 'string' ? bodyData.peaNo : ''),
      date: qDate || (typeof bodyData.date === 'string' ? bodyData.date : ''),
      time: qTime || (typeof bodyData.time === 'string' ? bodyData.time : ''),
    };

    const parsed = DeleteRecordSessionInputSchema.safeParse(inputData);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const result = await deleteRecordSession(parsed.data);
    return NextResponse.json({
      success: true,
      message: result.message,
      deletedRowsCount: result.deletedRowsCount,
      deletedPhotosCount: result.deletedPhotosCount,
    });
  } catch (error: unknown) {
    console.error('Error in /api/records DELETE:', error);
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error) || 'เกิดข้อผิดพลาดในการลบข้อมูลรอบตรวจวัด',
      },
      { status: 500 }
    );
  }
}
