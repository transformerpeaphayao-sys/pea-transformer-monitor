import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { DriveImageQuerySchema } from '@/lib/domain/types';
import { getGoogleAuth } from '@/lib/adapters/google-sheets';

let driveClient: ReturnType<typeof google.drive> | null = null;

function getDriveClient() {
  if (driveClient) return driveClient;
  const auth = getGoogleAuth(['https://www.googleapis.com/auth/drive']);
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parseResult = DriveImageQuerySchema.safeParse({ id: searchParams.get('id') });

    if (!parseResult.success) {
      return new NextResponse(
        parseResult.error.errors[0]?.message || 'Google Drive File ID ไม่ถูกต้อง',
        { status: 400 }
      );
    }

    const { id: fileId } = parseResult.data;

    const drive = getDriveClient();

    // Fetch the file binary content directly via Google Drive API
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(res.data as ArrayBuffer);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: unknown) {
    console.error('Error in /api/drive-image:', error);
    return new NextResponse('Failed to load image from Drive', { status: 500 });
  }
}
