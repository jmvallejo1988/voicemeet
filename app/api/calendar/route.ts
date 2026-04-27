import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getUpcomingMeetEvents } from '@/lib/google-calendar';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accessToken = (session as any).accessToken as string;
  if (!accessToken) return NextResponse.json({ error: 'No access token' }, { status: 401 });

  const events = await getUpcomingMeetEvents(accessToken);
  return NextResponse.json(events);
}
