/**
 * KV client — handles both prefixed (voicemeetkv_) and standard env var names.
 * Vercel's Upstash integration prefixes env vars with the store name.
 */
import { createClient } from '@vercel/kv';

const url =
  process.env.voicemeetkv_KV_REST_API_URL ||
  process.env.KV_REST_API_URL;

const token =
  process.env.voicemeetkv_KV_REST_API_TOKEN ||
  process.env.KV_REST_API_TOKEN;

if (!url || !token) {
  throw new Error(
    '@vercel/kv: Missing KV_REST_API_URL or KV_REST_API_TOKEN. ' +
    'Check your Vercel Storage connection.'
  );
}

export const kv = createClient({ url, token });
