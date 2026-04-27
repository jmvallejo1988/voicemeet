import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listRecordings, saveRecording, updateRecording, uploadAudio, expiresAt30Days, getSettings } from '@/lib/storage';
import { transcribeAudio, summarizeText } from '@/lib/openrouter';
import { randomUUID } from 'crypto';
import type { Recording } from '@/types';

// GET → list recordings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recordings = await listRecordings(session.user.email);
  return NextResponse.json(recordings);
}

// POST → upload + process recording
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.email;
  const settings = await getSettings(userId);

  if (!settings.openrouterKey) {
    return NextResponse.json({ error: 'OpenRouter API key not configured. Please add it in Settings.' }, { status: 400 });
  }

  const formData = await req.formData();
  const audioFile = formData.get('audio') as File | null;
  const title = (formData.get('title') as string) || 'Nota de voz';

  if (!audioFile) return NextResponse.json({ error: 'No audio file' }, { status: 400 });

  const id = randomUUID();
  const now = new Date().toISOString();

  // Create pending record
  const recording: Recording = {
    id, userId, title,
    audioUrl: '',
    duration: Number(formData.get('duration') ?? 0),
    transcript: '',
    summary: '',
    keyPoints: [],
    tasks: [],
    createdAt: now,
    expiresAt: expiresAt30Days(),
    status: 'processing',
  };
  await saveRecording(recording);

  // Process async
  (async () => {
    try {
      // Upload audio
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const audioUrl = await uploadAudio(buffer, `recordings/${userId}/${id}.webm`);

      // Transcribe
      const base64 = buffer.toString('base64');
      const transcript = await transcribeAudio(base64, settings.openrouterKey, 'webm');

      // Summarize
      const result = await summarizeText(transcript, settings.openrouterKey, 'recording');

      await updateRecording(id, {
        audioUrl,
        transcript: result.transcript,
        summary: result.summary,
        keyPoints: result.keyPoints,
        tasks: result.tasks,
        status: 'ready',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      console.error('Recording processing error:', msg);
      await updateRecording(id, { status: 'error' });
    }
  })();

  return NextResponse.json({ id, status: 'processing' });
}
