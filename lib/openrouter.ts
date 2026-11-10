/**
 * OpenRouter / Groq utilities
 * - transcribeAudio  → Groq Whisper-large-v3 (gratuito, rápido, soporta webm)
 * - summarizeText    → OpenRouter GPT-4o-mini (text → JSON summary)
 *
 * IMPORTANTE: OpenRouter NO expone /audio/transcriptions.
 * Usamos Groq (gratis) para transcripción. El groqKey viene de UserSettings.
 */

import type { SummaryResult } from '@/types';

const OR_BASE   = 'https://openrouter.ai/api/v1';
const GROQ_BASE = 'https://api.groq.com/openai/v1';

// ─── Transcription via Groq Whisper (multipart, gratis) ────────────────────

export async function transcribeAudio(
  audioBuffer: Buffer,
  groqKey: string,
  format: 'webm' | 'mp4' | 'wav' | 'ogg' | 'm4a' = 'webm'
): Promise<string> {
  // Uint8Array.from() produces Uint8Array<ArrayBuffer> (not ArrayBufferLike) — required by Node 24 types
  const blob = new Blob([Uint8Array.from(audioBuffer)], { type: `audio/${format}` });

  const formData = new FormData();
  formData.append('file', blob, `audio.${format}`);
  formData.append('model', 'whisper-large-v3');
  formData.append('language', 'es');
  formData.append('response_format', 'text');

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${groqKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq transcription error ${res.status}: ${errText}`);
  }

  // response_format: 'text' devuelve texto plano (no JSON)
  const text = await res.text();
  return text.trim();
}

// ─── Summarization ─────────────────────────────────────────────────────────

export async function summarizeText(
  transcript: string,
  apiKey: string,
  type: 'meeting' | 'recording' = 'recording'
): Promise<SummaryResult> {
  const systemPrompt =
    type === 'meeting'
      ? `Eres un asistente experto en análisis de reuniones de negocios.
         Tu tarea es procesar transcripciones de reuniones y extraer información clave.`
      : `Eres un asistente experto en procesamiento de notas de voz y grabaciones personales.
         Tu tarea es transcribir y estructurar la información de forma clara.`;

  // gpt-4o-mini soporta ~128k tokens; recortamos por seguridad en reuniones muy largas
  const MAX_CHARS = 350_000;
  const clipped = transcript.length > MAX_CHARS
    ? transcript.slice(0, MAX_CHARS) + '\n[...transcripción recortada por longitud...]'
    : transcript;

  const userPrompt = `Analiza la siguiente transcripción (cada línea puede empezar con "Nombre:" indicando quién habla) y devuelve un JSON con exactamente este formato:
{
  "summary": "Resumen ejecutivo en 3-5 oraciones: objetivo de la reunión, lo que se decidió y próximos pasos",
  "keyPoints": ["Punto clave, decisión o acuerdo 1", "Punto clave 2", "..."],
  "tasks": ["Responsable — tarea concreta — fecha/plazo si se mencionó", "..."]
}

Reglas para "tasks":
- Incluye TODO compromiso, pendiente, encargo o siguiente paso mencionado (aunque sea implícito: "yo te mando...", "quedamos en...", "hay que...", "para el lunes...").
- Indica el responsable por su nombre cuando se sepa; si no, usa "Por definir".
- Si de verdad no hay ninguna tarea, devuelve [].
Incluye entre 3 y 8 keyPoints según la duración de la reunión.

TRANSCRIPCIÓN:
${clipped}

Responde ÚNICAMENTE con el JSON, sin markdown, sin explicaciones adicionales.`;

  // Sin API key → resumen local sin llamada externa
  if (!apiKey) {
    console.warn('[VoiceMeet] No OpenRouter key — using local fallback summary.');
    const sentences = transcript.split(/[.!?]\s+/).filter(s => s.trim().length > 20);
    return {
      transcript,
      summary: transcript.slice(0, 300) ||
        'Reunión procesada. Agrega tu OpenRouter API key en Configuración para obtener resúmenes con IA.',
      keyPoints: sentences.slice(0, 3),
      tasks: [],
    };
  }

  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wilduitmarketing.com',
      'X-Title': 'Wilduit VoiceMeet',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter summary error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(content);
    return {
      transcript,
      summary: parsed.summary ?? '',
      keyPoints: parsed.keyPoints ?? [],
      tasks: parsed.tasks ?? [],
    };
  } catch {
    return { transcript, summary: content, keyPoints: [], tasks: [] };
  }
}
