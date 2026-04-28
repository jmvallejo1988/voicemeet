import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listRecordings, saveRecording, updateRecording, uploadAudio, expiresAt30Days, getSettings } from '@/lib/storage';
import { transcribeAudio, summarizeText } from '@/lib/openrouter';
import { randomUUID } from 'crypto';
import type { Recording } from '@/types';

// Permite hasta 60s para procesar audio largo (Vercel Hobby soporta hasta 60s)
export const maxDuration = 60;

// GET → list recordings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recordings = await listRecordings(session.user.email);
  return NextResponse.json(recordings);
}

// POST → upload + process recording (síncrono: espera el resultado antes de responder)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.email;
  const settings = await getSettings(userId);

  if (!settings.groqKey) {
    return NextResponse.json(
      { error: 'Groq API key no configurada. Ve a Configuración y agrega tu Groq Key gratuita.' },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const audioFile = formData.get('audio') as File | null;
  const title = (formData.get('title') as string) || 'Nota de voz';

  if (!audioFile) return NextResponse.json({ error: 'No audio file' }, { status: 400 });

  const id = randomUUID();
  const now = new Date().toISOString();

  // Leer el buffer antes de procesar (necesario antes de que el request expiration)
  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const duration = Number(formData.get('duration') ?? 0);

  // Crear registro inmediato con status processing
  const recording: Recording = {
    id, userId, title,
    audioUrl: '',
    duration,
    transcript: '',
    summary: '',
    keyPoints: [],
    tasks: [],
    createdAt: now,
    expiresAt: expiresAt30Days(),
    status: 'processing',
  };
  await saveRecording(recording);

  // Procesar de forma síncrona (la función espera antes de responder)
  try {
    // 1. Subir audio a Blob
    const audioUrl = await uploadAudio(buffer, `recordings/${userId}/${id}.webm`);

    // 2. Transcribir con Groq Whisper (gratis)
    const transcript = await transcribeAudio(buffer, settings.groqKey, 'webm');

    // 3. Resumir con OpenRouter (solo si hay OpenRouter key; si no, resume básico)
    let result;
    if (settings.openrouterKey && transcript) {
      result = await summarizeText(transcript, settings.openrouterKey, 'recording');
    } else {
      result = { transcript, summary: '', keyPoints: [], tasks: [] };
    }

    await updateRecording(id, {
      audioUrl,
      transcript: result.transcript,
      summary: result.summary,
      keyPoints: result.keyPoints,
      tasks: result.tasks,
      status: 'ready',
    });

    return NextResponse.json({ id, status: 'ready' });

  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    const stack = err instanceof Error ? err.stack : '';
    console.error('[VoiceMeet] Recording processing error:', msg);
    console.error('[VoiceMeet] Stack:', stack);
    await updateRecording(id, { status: 'error' });
    return NextResponse.json({ id, status: 'error', error: msg }, { status: 500 });
  }
}
