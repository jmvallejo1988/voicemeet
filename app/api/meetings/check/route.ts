/**
 * POST /api/meetings/check
 * Called by the frontend when there are pending meetings.
 * Checks bot statuses and kicks off processing for any completed bots.
 * Requires an active user session — only processes that user's meetings.
 *
 * The bot ID is stored in meeting.meetSpaceId (set by /api/recall POST).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { kv } from '@/lib/kv';
import { getBot, getBotStatusCode } from '@/lib/recall';
import { getSettings, listMeetings } from '@/lib/storage';
import { processMeeting } from '@/lib/process-meeting';

export const maxDuration = 60;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.email;

  try {
    // Get all pending meetings for this user
    const meetings = await listMeetings(userId);
    const pending = meetings.filter(m => m.status === 'pending');

    if (pending.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No pending meetings' });
    }

    // Get user's Recall.ai key
    const settings = await getSettings(userId);
    if (!settings.recallKey) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No Recall API key configured' });
    }

    let processed = 0;
    let errors = 0;

    for (const meeting of pending) {
      // Bot ID is stored in meetSpaceId when created via /api/recall
      const botId = meeting.meetSpaceId;
      if (!botId) continue;

      // Check bot status with Recall.ai
      let bot;
      try {
        bot = await getBot(botId, settings.recallKey);
      } catch {
        continue; // Bot not found or API error — skip silently
      }

      const statusCode = getBotStatusCode(bot);
      if (statusCode !== 'done') continue;

      // Bot is done — process the recording
      try {
        await processMeeting(meeting, botId);
        await kv.del(`bot:${botId}`);
        processed++;
      } catch (e) {
        console.error(`[check] Failed to process meeting ${meeting.id}:`, e);
        errors++;
      }
    }

    return NextResponse.json({ ok: true, processed, errors });
  } catch (err) {
    console.error('[check] Error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
