/**
 * Recall.ai API client
 * Docs: https://docs.recall.ai
 * Region: us-west-2 (change if needed)
 */

// Use the region from env var or default to us-west-2
const RECALL_REGION = process.env.RECALL_REGION ?? 'us-west-2';
const RECALL_BASE = `https://${RECALL_REGION}.recall.ai/api/v1`;

export interface RecallBot {
  id: string;
  meeting_url: string;
  status_changes: Array<{ code: string; created_at: string; sub_code?: string; message?: string }>;
  video_url?: string;
  mp4_download_url?: string;
  recordings?: Array<{ id: string; started_at: string; completed_at: string; download_url: string }>;
}

export type BotStatus =
  | 'ready' | 'joining_call' | 'in_waiting_room' | 'in_call_not_recording'
  | 'in_call_recording' | 'call_ended' | 'done' | 'fatal';

function headers(apiKey: string) {
  return { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' };
}

/** Send a bot to join a meeting */
export async function createBot(params: {
  meetingUrl: string;
  botName?: string;
  apiKey: string;
}): Promise<RecallBot> {
  const res = await fetch(`${RECALL_BASE}/bot/`, {
    method: 'POST',
    headers: headers(params.apiKey),
    body: JSON.stringify({
      meeting_url: params.meetingUrl,
      bot_name: params.botName ?? 'Wilduit Notetaker',
      automatic_leave: {
        everyone_left_timeout: 120,   // leave 2 min after everyone gone
        silence_detection_timeout: 1800, // leave after 30 min silence
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Recall.ai createBot error ${res.status}: ${err}`);
  }
  return res.json();
}

/** Get bot status */
export async function getBot(botId: string, apiKey: string): Promise<RecallBot> {
  const res = await fetch(`${RECALL_BASE}/bot/${botId}/`, { headers: headers(apiKey) });
  if (!res.ok) throw new Error(`Recall.ai getBot ${res.status}`);
  return res.json();
}

/** Stop (delete) a bot */
export async function stopBot(botId: string, apiKey: string): Promise<void> {
  await fetch(`${RECALL_BASE}/bot/${botId}/leave_call/`, {
    method: 'POST',
    headers: headers(apiKey),
  });
}

/** Get the current status code from a bot */
export function getBotStatusCode(bot: RecallBot): BotStatus {
  if (!bot.status_changes?.length) return 'ready';
  return bot.status_changes[bot.status_changes.length - 1].code as BotStatus;
}

/** Get the audio download URL from a completed bot */
export function getBotAudioUrl(bot: RecallBot): string | null {
  const rec = bot.recordings?.[0];
  return rec?.download_url ?? bot.mp4_download_url ?? null;
}

/** Human-readable status label */
export function botStatusLabel(status: BotStatus): string {
  const labels: Record<BotStatus, string> = {
    ready:                  'Listo',
    joining_call:           'Uniéndose…',
    in_waiting_room:        'En sala de espera',
    in_call_not_recording:  'En reunión',
    in_call_recording:      'Grabando',
    call_ended:             'Reunión terminada',
    done:                   'Completado',
    fatal:                  'Error',
  };
  return labels[status] ?? status;
}
