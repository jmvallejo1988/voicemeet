import { kv } from '@/lib/kv';
import { put, del } from '@vercel/blob';
import type { Recording, Meeting, UserSettings } from '@/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

function expiresAt30Days(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

// ─── Settings ──────────────────────────────────────────────────────────────

export async function getSettings(userId: string): Promise<UserSettings> {
  const s = await kv.get<UserSettings>(`settings:${userId}`);
  return s ?? { openrouterKey: '', groqKey: '', recallKey: '', theme: 'dark', notifyEmail: true };
}

export async function saveSettings(userId: string, settings: Partial<UserSettings>) {
  const current = await getSettings(userId);
  await kv.set(`settings:${userId}`, { ...current, ...settings });
}

// ─── Recordings ────────────────────────────────────────────────────────────

export async function listRecordings(userId: string): Promise<Recording[]> {
  const ids = (await kv.lrange<string>(`recordings:${userId}`, 0, -1)) ?? [];
  if (ids.length === 0) return [];
  const items = await Promise.all(ids.map((id) => kv.get<Recording>(`recording:${id}`)));
  return (items.filter(Boolean) as Recording[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveRecording(recording: Recording): Promise<void> {
  await kv.set(`recording:${recording.id}`, recording);
  await kv.lpush(`recordings:${recording.userId}`, recording.id);
}

export async function updateRecording(id: string, patch: Partial<Recording>): Promise<void> {
  const current = await kv.get<Recording>(`recording:${id}`);
  if (!current) return;
  await kv.set(`recording:${id}`, { ...current, ...patch });
}

export async function deleteRecording(id: string, userId: string): Promise<void> {
  const rec = await kv.get<Recording>(`recording:${id}`);
  if (!rec) return;
  // Delete audio from Blob
  if (rec.audioUrl) {
    try { await del(rec.audioUrl); } catch {}
  }
  await kv.del(`recording:${id}`);
  await kv.lrem(`recordings:${userId}`, 0, id);
}

// ─── Meetings ──────────────────────────────────────────────────────────────

export async function listMeetings(userId: string): Promise<Meeting[]> {
  const ids = (await kv.lrange<string>(`meetings:${userId}`, 0, -1)) ?? [];
  if (ids.length === 0) return [];
  const items = await Promise.all(ids.map((id) => kv.get<Meeting>(`meeting:${id}`)));
  return (items.filter(Boolean) as Meeting[]).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function saveMeeting(meeting: Meeting): Promise<void> {
  await kv.set(`meeting:${meeting.id}`, meeting);
  await kv.lpush(`meetings:${meeting.userId}`, meeting.id);
}

export async function updateMeeting(id: string, patch: Partial<Meeting>): Promise<void> {
  const current = await kv.get<Meeting>(`meeting:${id}`);
  if (!current) return;
  await kv.set(`meeting:${id}`, { ...current, ...patch });
}

export async function deleteMeeting(id: string, userId: string): Promise<void> {
  const m = await kv.get<Meeting>(`meeting:${id}`);
  if (!m) return;
  if (m.audioUrl) {
    try { await del(m.audioUrl); } catch {}
  }
  await kv.del(`meeting:${id}`);
  await kv.lrem(`meetings:${userId}`, 0, id);
}

// ─── Blob upload ───────────────────────────────────────────────────────────

function getContentType(filename: string): string {
  if (filename.endsWith('.mp4')) return 'video/mp4';
  if (filename.endsWith('.mp3')) return 'audio/mpeg';
  if (filename.endsWith('.webm')) return 'audio/webm';
  if (filename.endsWith('.ogg')) return 'audio/ogg';
  return 'audio/mpeg';
}

export async function uploadAudio(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const contentType = getContentType(filename);

  // Intentar primero con access: 'public'
  try {
    const blob = await put(filename, buffer, { access: 'public', contentType });
    console.log(`[VoiceMeet] Audio uploaded (public): ${blob.url}`);
    return blob.url;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const isPrivateStoreError =
      msg.includes('private') ||
      msg.includes('public access') ||
      msg.includes('not allowed') ||
      msg.includes('forbidden');

    if (!isPrivateStoreError) throw e; // error inesperado → propagar
  }

  // Fallback: subir como private (funciona con store en modo enforced-private)
  try {
    const blob = await put(filename, buffer, { access: 'private', contentType });
    console.log(`[VoiceMeet] Audio uploaded (private): ${blob.url}`);
    return blob.url;
  } catch (e2: unknown) {
    // Si tampoco funciona, continuar sin audio (transcripción se guarda igual)
    console.warn('[VoiceMeet] Blob upload failed — audio will not be stored. Transcript continues.', e2);
    return '';
  }
}

export { expiresAt30Days };
