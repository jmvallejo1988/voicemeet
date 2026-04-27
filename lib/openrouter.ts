/**
 * OpenRouter utilities
 * - transcribeAudio  → GPT-4o Audio Preview  (audio → text)
 * - summarizeText    → GPT-4o Text           (text  → JSON summary)
 */

import type { SummaryResult } from '@/types';

const OR_BASE = 'https://openrouter.ai/api/v1';

// ─── Transcription ─────────────────────────────────────────────────────────

export async function transcribeAudio(
  audioBase64: string,
  apiKey: string,
  format: 'webm' | 'mp4' | 'wav' | 'ogg' = 'webm'
): Promise<string> {
  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wilduitmarketing.com',
      'X-Title': 'Wilduit VoiceMeet',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-audio-preview',
      modalities: ['text'],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: { data: audioBase64, format },
            },
            {
              type: 'text',
              text: 'Transcribe este audio con precisión. Devuelve SOLO el texto transcrito, sin comentarios adicionales. Si hay múltiples hablantes, separa sus intervenciones con saltos de línea.',
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter transcription error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
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

  const userPrompt = `Analiza la siguiente transcripción y devuelve un JSON con exactamente este formato:
{
  "summary": "Resumen ejecutivo en 2-3 oraciones concisas",
  "keyPoints": ["Punto clave 1", "Punto clave 2", "Punto clave 3"],
  "tasks": ["Tarea o acción 1 (responsable si aplica)", "Tarea 2"]
}

TRANSCRIPCIÓN:
${transcript}

Responde ÚNICAMENTE con el JSON, sin markdown, sin explicaciones adicionales.`;

  const res = await fetch(`${OR_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://wilduitmarketing.com',
      'X-Title': 'Wilduit VoiceMeet',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
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
