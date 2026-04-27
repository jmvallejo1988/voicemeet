import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteMeeting } from '@/lib/storage';
import { kv } from '@/lib/kv';
import type { Meeting } from '@/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const meeting = await kv.get<Meeting>(`meeting:${params.id}`);
  if (!meeting || meeting.userId !== session.user.email) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(meeting);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await deleteMeeting(params.id, session.user.email);
  return NextResponse.json({ ok: true });
}
