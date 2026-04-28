/**
 * Shared meeting processing pipeline.
 * Called from both the Recall.ai webhook and the cron job.
 */

import { kv } from '@/lib/kv';
import { getBot, getBotAudioUrl } from '@/lib/recall';
import { updateMeeting, uploadAudio, getSettings } from '@/lib/storage';
import { transcribeAudio, summarizeText } from '@/lib/openrouter';
import { sendMeetingReport } from '@/lib/email';
import type { Meeting } from '@/types';

/**
 * Downloads, transcribes, summarises and emails a completed meeting recording.
 * Should be called only when the Recall bot status is 'done' and the meeting
 * status is still 'pending'.
 *
 * @param meeting  The Meeting object from KV (status must be 'pending')
 * @param botId    The Recall.ai bot ID
 */
export async function processMeeting(meeting: Meeting, botId: string): Promise<void> {
  // Mark as processing immediately so we don't double-process
  await updateMeeting(meeting.id, { status: 'processing' });

  try {
    const settings = await getSettings(meeting.userId);
    if (!settings.recallKey) {
      await updateMeeting(meeting.id, { status: 'error' });
      return;
    }

    // Fetch fresh bot data to get download URL
    const bot      = await getBot(botId, settings.recallKey);
    const audioUrl = getBotAudioUrl(bot);

    let uploadedUrl = '';
    let transcript  = '';

    if (audioUrl) {
      // Download from Recall S3
      const audioRes = await fetch(audioUrl);
      const buffer   = Buffer.from(await audioRes.arrayBuffer());

      // Upload to Vercel Blob (best-effort; may return '' if store is private)
      uploadedUrl = await uploadAudio(buffer, `meetings/${meeting.userId}/${meeting.id}.mp4`);

      // Transcribe with Groq if key is configured
      if (settings.groqKey) {
        transcript = await transcribeAudio(buffer, settings.groqKey, 'mp4');
      }
    }

    // Summarise with OpenRouter (or generate fallback summary)
    const result = await summarizeText(
      transcript || 'Reunión grabada automáticamente. No se pudo extraer transcripción.',
      settings.openrouterKey,
      'meeting'
    );

    await updateMeeting(meeting.id, {
      audioUrl: uploadedUrl,
      transcript: result.transcript,
      summary:    result.summary,
      keyPoints:  result.keyPoints,
      tasks:      result.tasks,
      status:     'ready',
    });

    // Send email report if configured
    if (settings.notifyEmail) {
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

    console.log(`[VoiceMeet] Meeting ${meeting.id} processed successfully.`);
  } catch (err) {
    console.error('[VoiceMeet] processMeeting error:', err);
    await updateMeeting(meeting.id, { status: 'error' });
    throw err;
  }
}
