import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listMeetings } from '@/lib/storage';

// GET → list saved meetings (bot recordings via Recall.ai)
// New meetings are created by /api/recall (POST) and processed by /api/recall/webhook
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const meetings = await listMeetings(session.user.email);
  return NextResponse.json(meetings);
}
