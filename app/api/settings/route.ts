import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettings, saveSettings } from '@/lib/storage';
import { kv } from '@/lib/kv';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await getSettings(session.user.email);
  return NextResponse.json({
    ...settings,
    openrouterKey: settings.openrouterKey ? '***SAVED***' : '',
    recallKey:     (settings as any).recallKey     ? '***SAVED***' : '',
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  await saveSettings(session.user.email, body);

  // Cache access token for webhook use
  const accessToken = (session as any).accessToken as string;
  if (accessToken) {
    await kv.set(`token:${session.user.email}`, accessToken, { ex: 3600 });
  }

  return NextResponse.json({ ok: true });
}
