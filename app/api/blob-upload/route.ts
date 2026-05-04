/**
 * POST /api/blob-upload
 * Genera token para que el cliente suba archivos directamente a Vercel Blob.
 * Esto evita el límite de 4.5MB de las funciones serverless (Hobby plan).
 */

import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          'audio/mpeg', 'audio/mp4', 'audio/mp3', 'audio/m4a', 'audio/wav',
          'audio/webm', 'audio/ogg', 'audio/flac', 'audio/x-m4a',
          'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
          'video/x-matroska', 'video/mpeg', 'application/octet-stream',
        ],
        maximumSizeInBytes: 25 * 1024 * 1024, // 25MB
        tokenPayload: session.user?.email ?? '',
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('[VoiceMeet] Blob upload completed:', blob.pathname);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
