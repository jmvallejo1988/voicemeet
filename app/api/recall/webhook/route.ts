/**
 * Recall.ai Webhook
 * Receives events when a bot's status changes (recording done, etc.)
 * Configure in Recall.ai dashboard → Webhooks → https://your-app.vercel.app/api/recall/webhook
 *
 * NOTE: Even if this webhook is not configured, the Vercel cron job at
 * /api/cron/process-meetings will pick up completed recordings every minute.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { getBotStatusCode } from '@/lib/recall';
import { processMeeting } from '@/lib/process-meeting';
import type { Meeting } from '@/types';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const event  = body?.event  as string;
  const botId  = body?.data?.bot_id as string;
  const status = body?.data?.status?.code as string;

  console.log(`[Webhook] event=${event} botId=${botId} status=${status}`);

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
    console.warn('[Webhook] No meeting found for botId', botId);
    return NextResponse.json({ ok: true });
  }

  // Already processing or processed (e.g. cron beat us to it)
  if (meeting.status !== 'pending') {
    console.log(`[Webhook] Meeting ${meeting.id} already in status ${meeting.status}, skipping`);
    return NextResponse.json({ ok: true });
  }

  // Return immediately to Recall.ai (prevents retry), process async
  (async () => {
    try {
      await processMeeting(meeting, botId);
      // Clean up the bot index key
      await kv.del(`bot:${botId}`);
    } catch (err) {
      console.error('[Webhook] processMeeting failed:', err);
    }
  })();

  return NextResponse.json({ ok: true });
}
