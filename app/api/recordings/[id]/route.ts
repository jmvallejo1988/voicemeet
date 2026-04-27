import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteRecording } from '@/lib/storage';
import { kv } from '@/lib/kv';
import type { Recording } from '@/types';

// GET → single recording
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rec = await kv.get<Recording>(`recording:${params.id}`);
  if (!rec || rec.userId !== session.user.email) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(rec);
}

// DELETE → remove recording + blob
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await deleteRecording(params.id, session.user.email);
  return NextResponse.json({ ok: true });
}
