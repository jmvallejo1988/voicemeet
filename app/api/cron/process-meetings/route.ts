/**
 * Vercel Cron Job: process completed Recall.ai recordings.
 *
 * Runs every minute (configured in vercel.json).
 * Scans all pending bot:* keys in KV, checks bot status via Recall.ai API,
 * and processes any completed recordings through the shared pipeline.
 *
 * This is the primary processing trigger — it fires even when the Recall.ai
 * Svix webhook is not configured, acting as a reliable polling fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { getBot, getBotStatusCode } from '@/lib/recall';
import { getSettings } from '@/lib/storage';
import { processMeeting } from '@/lib/process-meeting';
import type { Meeting } from '@/types';

export const maxDuration = 300; // 5 min — enough time to process 1-2 meetings

export async function GET(req: NextRequest) {
  // Security: only allow Vercel cron calls or requests with the cron secret
  const cronHeader = req.headers.get('x-vercel-cron');
  const secretHeader = req.headers.get('x-cron-secret');
  const validSecret = process.env.CRON_SECRET && secretHeader === process.env.CRON_SECRET;

  if (!cronHeader && !validSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[Cron] process-meetings started');

  try {
    // Scan all bot:* keys (each maps botId → meetingId, TTL 48h)
    let cursor = 0;
    const botKeys: string[] = [];

    do {
      const [nextCursor, keys] = await (kv as any).scan(cursor, { match: 'bot:*', count: 100 });
      cursor = Number(nextCursor);
      botKeys.push(...(keys as string[]));
    } while (cursor !== 0);

    console.log(`[Cron] Found ${botKeys.length} tracked bot(s)`);

    if (botKeys.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No pending bots' });
    }

    let processed = 0;
    let skipped   = 0;
    let errors    = 0;

    for (const botKey of botKeys) {
      const botId = botKey.replace('bot:', '');

      // Look up the meeting for this bot
      const meetingId = await kv.get<string>(botKey);
      if (!meetingId) { skipped++; continue; }

      const meeting = await kv.get<Meeting>(`meeting:${meetingId}`);
      if (!meeting) { skipped++; continue; }

      // Only process meetings still in pending state
      if (meeting.status !== 'pending') { skipped++; continue; }

      // Get the user's Recall.ai key
      const settings = await getSettings(meeting.userId);
      if (!settings.recallKey) { skipped++; continue; }

      // Check bot status with Recall.ai API
      let bot;
      try {
        bot = await getBot(botId, settings.recallKey);
      } catch (e) {
        console.warn(`[Cron] Could not fetch bot ${botId}:`, e);
        skipped++;
        continue;
      }

      const statusCode = getBotStatusCode(bot);
      console.log(`[Cron] Bot ${botId} → status: ${statusCode}`);

      if (statusCode !== 'done') {
        // Bot still in progress (joining, recording, etc.) — skip
        skipped++;
        continue;
      }

      // Bot is done — process the recording
      console.log(`[Cron] Processing meeting ${meetingId} (bot ${botId})`);
      try {
        await processMeeting(meeting, botId);
        processed++;
        // Clean up the bot → meetingId index
        await kv.del(botKey);
      } catch (e) {
        console.error(`[Cron] Failed to process meeting ${meetingId}:`, e);
        errors++;
      }
    }

    console.log(`[Cron] Done — processed: ${processed}, skipped: ${skipped}, errors: ${errors}`);
    return NextResponse.json({ ok: true, processed, skipped, errors });
  } catch (err) {
    console.error('[Cron] Fatal error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
