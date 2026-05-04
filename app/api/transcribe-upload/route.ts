/**
 * POST /api/transcribe-upload
 * Recibe un archivo de audio/video, lo transcribe con Groq Whisper
 * y genera resumen con OpenRouter.
 * Max size: 25MB (límite de Groq Whisper)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettings } from '@/lib/storage';
import { transcribeAudio, summarizeText } from '@/lib/openrouter';

export const maxDuration = 120;

// Formatos soportados por Groq Whisper
const SUPPORTED_FORMATS = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg', 'flac', 'mov', 'avi', 'mkv'];

function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? 'mp4';
}

function mapToGroqFormat(ext: string): 'mp4' | 'webm' | 'wav' | 'ogg' | 'm4a' {
  const map: Record<string, 'mp4' | 'webm' | 'wav' | 'ogg' | 'm4a'> = {
    mp4: 'mp4', mov: 'mp4', avi: 'mp4', mkv: 'mp4',
    mpeg: 'mp4', mpga: 'mp4',
    webm: 'webm',
    wav: 'wav',
    ogg: 'ogg',
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

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 });
  }

  // Validar tamaño (25MB máx — límite de Groq)
  const MAX_SIZE = 25 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo supera el límite de 25MB de Groq Whisper.' }, { status: 400 });
  }

  // Validar formato
  const ext = getExtension(file.name);
  if (!SUPPORTED_FORMATS.includes(ext)) {
    return NextResponse.json({
      error: `Formato .${ext} no soportado. Usa: ${SUPPORTED_FORMATS.join(', ')}`,
    }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const format = mapToGroqFormat(ext);

    // Transcribir
    let transcript = '';
    if (settings.groqKey) {
      try {
        transcript = await transcribeAudio(buffer, settings.groqKey, format);
      } catch (e) {
        console.warn('[transcribe-upload] Groq error:', e);
        transcript = '';
      }
    }

    if (!transcript) {
      // Sin Groq key o transcripción vacía → solo resumen básico
      const result = await summarizeText(
        `Archivo: ${file.name}. No se pudo transcribir (configura tu Groq API key en Configuración).`,
        settings.openrouterKey,
        'recording'
      );
      return NextResponse.json({
        filename: file.name,
        noGroqKey: !settings.groqKey,
        ...result,
      });
    }

    // Generar resumen
    const result = await summarizeText(transcript, settings.openrouterKey, 'recording');

    return NextResponse.json({
      filename: file.name,
      transcript,
      summary: result.summary,
      keyPoints: result.keyPoints,
      tasks: result.tasks,
    });

  } catch (err) {
    console.error('[transcribe-upload] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
