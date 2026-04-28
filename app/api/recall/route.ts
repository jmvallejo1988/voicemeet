import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createBot, getBot, stopBot, getBotStatusCode } from '@/lib/recall';
import { getSettings, saveMeeting, updateMeeting, expiresAt30Days } from '@/lib/storage';
import { kv } from '@/lib/kv';
import { randomUUID } from 'crypto';
import type { Meeting } from '@/types';

/** POST /api/recall — send bot to a meeting */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId   = session.user.email;
  const settings = await getSettings(userId);

  if (!settings.recallKey) {
    return NextResponse.json({ error: 'Recall.ai API key no configurada. Agrégala en Configuración.' }, { status: 400 });
  }

  const { meetingUrl, title, startTime, endTime, attendees } = await req.json();

  if (!meetingUrl) return NextResponse.json({ error: 'meetingUrl is required' }, { status: 400 });

  // Create the Recall bot
  const bot = await createBot({ meetingUrl, apiKey: settings.recallKey });

  // Save meeting record
  const id  = randomUUID();
  const now = new Date().toISOString();

  const meeting: Meeting = {
    id, userId,
    title: title || `Reunión ${new Date(startTime || now).toLocaleDateString('es-ES')}`,
    meetSpaceId: bot.id,   // store bot ID here for tracking
    audioUrl: '',
    duration: 0,
    startTime: startTime || now,
    endTime,
    transcript: '', summary: '', keyPoints: [], tasks: [],
    attendees: attendees || [],
    createdAt: now,
    expiresAt: expiresAt30Days(),
    status: 'pending',
    emailSent: false,
  };

  await saveMeeting(meeting);

  // Index: botId → meetingId (used by webhook to avoid full KV scan)
  await kv.set(`bot:${bot.id}`, id, { ex: 60 * 60 * 24 * 2 }); // 48h TTL

  return NextResponse.json({ id, botId: bot.id, status: 'pending' });
}

/** GET /api/recall?botId=xxx — poll bot status */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await getSettings(session.user.email);
  if (!settings.recallKey) return NextResponse.json({ error: 'No Recall key' }, { status: 400 });

  const botId = new URL(req.url).searchParams.get('botId');
  if (!botId) return NextResponse.json({ error: 'botId required' }, { status: 400 });

  const bot = await getBot(botId, settings.recallKey);
  const statusCode = getBotStatusCode(bot);

  return NextResponse.json({ statusCode, bot });
}

/** DELETE /api/recall?botId=xxx — stop a bot */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await getSettings(session.user.email);
  if (!settings.recallKey) return NextResponse.json({ error: 'No Recall key' }, { status: 400 });

  const botId = new URL(req.url).searchParams.get('botId');
  if (!botId) return NextResponse.json({ error: 'botId required' }, { status: 400 });

  await stopBot(botId, settings.recallKey);
  return NextResponse.json({ ok: true });
}
