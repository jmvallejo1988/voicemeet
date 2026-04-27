/**
 * Recall.ai Webhook
 * Receives events when a bot's status changes (recording done, etc.)
 * Configure in Recall.ai dashboard → Webhooks → https://your-app.vercel.app/api/recall/webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getBot, getBotAudioUrl, getBotStatusCode } from '@/lib/recall';
import { updateMeeting, uploadAudio, getSettings } from '@/lib/storage';
import { transcribeAudio, summarizeText } from '@/lib/openrouter';
import { sendMeetingReport } from '@/lib/email';
import type { Meeting } from '@/types';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const event  = body?.event  as string;
  const botId  = body?.data?.bot_id as string;
  const status = body?.data?.status?.code as string;

  // We only care about the "done" status (recording complete)
  if (event !== 'bot.status_change' || status !== 'done') {
    return NextResponse.json({ ok: true });
  }

  // Fast lookup: botId → meetingId index (written by /api/recall POST)
  const meetingId = await kv.get<string>(`bot:${botId}`);
  const meeting: Meeting | null = meetingId
    ? await kv.get<Meeting>(`meeting:${meetingId}`)
    : null;

  if (!meeting) {
    console.warn('Webhook: no meeting found for botId', botId);
    return NextResponse.json({ ok: true });
  }

  await updateMeeting(meeting.id, { status: 'processing' });

  // Process async
  (async () => {
    try {
      const settings = await getSettings(meeting!.userId);
      if (!settings.openrouterKey || !settings.recallKey) {
        await updateMeeting(meeting!.id, { status: 'error' });
        return;
      }

      // Get bot data & audio URL
      const bot      = await getBot(botId, settings.recallKey);
      const audioUrl = getBotAudioUrl(bot);

      let uploadedUrl = '';
      let transcript  = '';

      if (audioUrl) {
        // Download audio from Recall
        const audioRes = await fetch(audioUrl);
        const buffer   = Buffer.from(await audioRes.arrayBuffer());

        // Upload to Vercel Blob
        uploadedUrl = await uploadAudio(buffer, `meetings/${meeting!.userId}/${meeting!.id}.mp4`);

        // Transcribe
        const base64   = buffer.toString('base64');
        transcript = await transcribeAudio(base64, settings.openrouterKey, 'mp4');
      }

      // Summarize
      const result = await summarizeText(
        transcript || 'Reunión grabada automáticamente. No se pudo extraer transcripción.',
        settings.openrouterKey,
        'meeting'
      );

      await updateMeeting(meeting!.id, {
        audioUrl: uploadedUrl,
        transcript: result.transcript,
        summary: result.summary,
        keyPoints: result.keyPoints,
        tasks: result.tasks,
        status: 'ready',
      });

      // Send email report
      if (settings.notifyEmail) {
        try {
          // Need the access token — get from session (stored in KV by userId)
          const accessToken = await kv.get<string>(`token:${meeting!.userId}`);
          if (accessToken) {
            const updatedMeeting = await kv.get<Meeting>(`meeting:${meeting!.id}`);
            if (updatedMeeting) {
              await sendMeetingReport(accessToken, meeting!.userId, updatedMeeting);
              await updateMeeting(meeting!.id, { emailSent: true });
            }
          }
        } catch (e) {
          console.warn('Email send failed:', e);
        }
      }
    } catch (err) {
      console.error('Webhook processing error:', err);
      await updateMeeting(meeting!.id, { status: 'error' });
    }
  })();

  return NextResponse.json({ ok: true });
}
