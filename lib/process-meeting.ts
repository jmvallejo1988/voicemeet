/**
 * Shared meeting processing pipeline.
 * Called from the UI polling endpoint, the Recall.ai webhook and the cron job.
 *
 * Transcription strategy (Nov 2026):
 *  1. Recall.ai async transcription (server-side, no file-size limit, speaker names).
 *     We request it once the bot is 'done' and wait for it on later polls.
 *  2. Fallback: Groq Whisper, ONLY if the audio file fits Groq's 25 MB limit.
 *     (Before this change the full meeting MP4 was always sent to Groq, which
 *     fails for any meeting longer than a few minutes → "No se pudo extraer
 *     transcripción" and no tasks.)
 */

import { kv } from '@/lib/kv';
import {
  getBot, getBotAudioUrl, getTranscriptState,
  createAsyncTranscript, downloadTranscriptText,
} from '@/lib/recall';
import { updateMeeting, getSettings } from '@/lib/storage';
import { transcribeAudio, summarizeText } from '@/lib/openrouter';
import { sendMeetingReport } from '@/lib/email';
import type { Meeting } from '@/types';

const GROQ_MAX_BYTES        = 24 * 1024 * 1024;   // Groq free tier limit is 25 MB
const RECALL_TRANSCRIPT_WAIT = 60 * 60 * 1000;    // give Recall up to 60 min

export type ProcessResult = 'waiting' | 'done';

async function tryGroq(audioUrl: string | null, groqKey: string): Promise<string> {
  if (!audioUrl || !groqKey) return '';
  try {
    const head = await fetch(audioUrl, { method: 'HEAD' });
    const size = Number(head.headers.get('content-length') ?? '0');
    if (!size || size > GROQ_MAX_BYTES) {
      console.warn(`[VoiceMeet] Audio too large for Groq (${size} bytes) — skipping.`);
      return '';
    }
    const audioRes = await fetch(audioUrl);
    const buffer   = Buffer.from(await audioRes.arrayBuffer());
    return await transcribeAudio(buffer, groqKey, 'mp4');
  } catch (e) {
    console.warn('[VoiceMeet] Groq fallback failed:', e);
    return '';
  }
}

/**
 * Advance a meeting whose bot is 'done'.
 * Returns 'waiting' while Recall.ai is still transcribing (meeting stays pending),
 * or 'done' once the meeting has been summarised and saved.
 */
export async function processMeeting(meeting: Meeting, botId: string): Promise<ProcessResult> {
  const settings = await getSettings(meeting.userId);
  if (!settings.recallKey) {
    await updateMeeting(meeting.id, { status: 'error' });
    return 'done';
  }

  const bot   = await getBot(botId, settings.recallKey);
  const recId = bot.recordings?.[0]?.id;
  const ts    = getTranscriptState(bot);

  let transcript = '';
  let source: Meeting['transcriptSource'] = 'none';

  if (ts.state === 'done') {
    try {
      transcript = await downloadTranscriptText(ts.downloadUrl);
      source = 'recall';
    } catch (e) {
      console.warn('[VoiceMeet] Could not download Recall transcript:', e);
    }
  } else if (ts.state === 'none' && recId && !meeting.transcriptRequestedAt) {
    try {
      await createAsyncTranscript(recId, settings.recallKey);
      await updateMeeting(meeting.id, {
        status: 'pending',
        transcriptRequestedAt: new Date().toISOString(),
      });
      console.log(`[VoiceMeet] Requested Recall transcript for meeting ${meeting.id}`);
      return 'waiting';
    } catch (e) {
      console.warn('[VoiceMeet] create_transcript failed — falling back to Groq:', e);
    }
  } else if (ts.state === 'processing' || (ts.state === 'none' && meeting.transcriptRequestedAt)) {
    const since = meeting.transcriptRequestedAt
      ? Date.now() - new Date(meeting.transcriptRequestedAt).getTime() : 0;
    if (since < RECALL_TRANSCRIPT_WAIT) {
      if (meeting.status !== 'pending') await updateMeeting(meeting.id, { status: 'pending' });
      return 'waiting';
    }
    console.warn(`[VoiceMeet] Recall transcript timed out for ${meeting.id}`);
  } else if (ts.state === 'failed') {
    console.warn(`[VoiceMeet] Recall transcript failed (${ts.reason}) for ${meeting.id}`);
  }

  // ── Final pipeline ───────────────────────────────────────────────────────
  await updateMeeting(meeting.id, {
    status: 'processing',
    processingStartedAt: new Date().toISOString(),
  });

  try {
    if (!transcript) {
      transcript = await tryGroq(getBotAudioUrl(bot), settings.groqKey);
      if (transcript) source = 'groq';
    }

    const result = await summarizeText(
      transcript || 'Reunión grabada automáticamente. No se pudo extraer transcripción.',
      settings.openrouterKey,
      'meeting'
    );

    await updateMeeting(meeting.id, {
      audioUrl:   '',   // Recall URLs are presigned and expire; not stored
      transcript: result.transcript,
      summary:    result.summary,
      keyPoints:  result.keyPoints,
      tasks:      result.tasks,
      transcriptSource: source,
      status:     transcript ? 'ready' : 'error',
    });

    if (settings.notifyEmail && transcript) {
      try {
        const accessToken = await kv.get<string>(`token:${meeting.userId}`);
        if (accessToken) {
          const updated = await kv.get<Meeting>(`meeting:${meeting.id}`);
          if (updated) {
            await sendMeetingReport(accessToken, meeting.userId, updated);
            await updateMeeting(meeting.id, { emailSent: true });
          }
        }
      } catch (e) {
        console.warn('[VoiceMeet] Email send failed:', e);
      }
    }

    console.log(`[VoiceMeet] Meeting ${meeting.id} processed (source=${source}).`);
    return 'done';
  } catch (err) {
    console.error('[VoiceMeet] processMeeting error:', err);
    await updateMeeting(meeting.id, { status: 'error' });
    throw err;
  }
}
