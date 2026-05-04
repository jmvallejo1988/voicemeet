/**
 * POST /api/transcribe-upload
 * Recibe { blobUrl, filename } — el archivo ya fue subido a Vercel Blob
 * por el cliente directamente. Aquí descargamos, transcribimos y generamos resumen.
 * Borra el blob temporal al terminar.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettings } from '@/lib/storage';
import { transcribeAudio, summarizeText } from '@/lib/openrouter';
import { del } from '@vercel/blob';

export const maxDuration = 120;

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? 'mp4';
}

function mapToGroqFormat(ext: string): 'mp4' | 'webm' | 'wav' | 'ogg' | 'm4a' {
  const map: Record<string, 'mp4' | 'webm' | 'wav' | 'ogg' | 'm4a'> = {
    mp4: 'mp4', mov: 'mp4', avi: 'mp4', mkv: 'mp4', mpeg: 'mp4', mpga: 'mp4',
    webm: 'webm', wav: 'wav', ogg: 'ogg',
    m4a: 'm4a', mp3: 'm4a', flac: 'm4a',
  };
  return map[ext] ?? 'mp4';
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getSettings(session.user.email);

  let blobUrl: string;
  let filename: string;

  try {
    const body = await req.json();
    blobUrl   = body.blobUrl;
    filename  = body.filename ?? 'audio.mp4';
  } catch {
    return NextResponse.json({ error: 'Body inválido — se esperaba { blobUrl, filename }' }, { status: 400 });
  }

  if (!blobUrl) {
    return NextResponse.json({ error: 'Falta blobUrl.' }, { status: 400 });
  }

  try {
    // Descargar desde Vercel Blob
    const audioRes = await fetch(blobUrl);
    if (!audioRes.ok) {
      return NextResponse.json({ error: `No se pudo descargar el archivo: ${audioRes.status}` }, { status: 500 });
    }
    const buffer = Buffer.from(await audioRes.arrayBuffer());
    const ext    = getExtension(filename);
    const format = mapToGroqFormat(ext);

    // Transcribir con Groq
    let transcript = '';
    if (settings.groqKey) {
      try {
        transcript = await transcribeAudio(buffer, settings.groqKey, format);
      } catch (e) {
        console.warn('[transcribe-upload] Groq error:', e);
      }
    }

    // Generar resumen
    const result = await summarizeText(
      transcript || `Archivo: ${filename}`,
      settings.openrouterKey,
      'recording'
    );

    // Borrar blob temporal
    try { await del(blobUrl); } catch {}

    return NextResponse.json({
      filename,
      transcript,
      summary:    result.summary,
      keyPoints:  result.keyPoints,
      tasks:      result.tasks,
      noGroqKey:  !settings.groqKey,
    });

  } catch (err) {
    console.error('[transcribe-upload] Error:', err);
    // Intentar borrar blob aunque haya error
    try { await del(blobUrl); } catch {}
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
