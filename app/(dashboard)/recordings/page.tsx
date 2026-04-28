'use client';

import { useState, useEffect, useCallback } from 'react';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { RecordingCard } from '@/components/RecordingCard';
import type { Recording } from '@/types';

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchRecordings = useCallback(async () => {
    const res = await fetch('/api/recordings');
    if (res.ok) setRecordings(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecordings();
    // Poll every 5s for processing items
    const interval = setInterval(() => {
      setRecordings(prev => {
        if (prev.some(r => r.status === 'processing')) {
          fetchRecordings();
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchRecordings]);

  async function handleRecordingComplete(blob: Blob, duration: number, title: string) {
    setUploading(true);
    const form = new FormData();
    form.append('audio', blob, 'recording.webm');
    form.append('duration', String(duration));
    form.append('title', title);

    const res = await fetch('/api/recordings', { method: 'POST', body: form });
    const data = await res.json();
    if (res.ok) {
      // El procesamiento es síncrono — re-fetch para mostrar el estado actualizado
      await fetchRecordings();
    } else {
      alert(data.error || 'Error al procesar la grabación. Revisa tu Groq API Key en Configuración.');
    }
    setUploading(false);
  }

  function handleDelete(id: string) {
    setRecordings(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div>
      {/* Page title */}
      <div className="mb-6">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Grabaciones de Voz</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Graba, transcribe y analiza tus notas de voz con IA
        </p>
      </div>

      {/* Recorder */}
      <VoiceRecorder onRecordingComplete={handleRecordingComplete} />

      {/* Upload indicator */}
      {uploading && (
        <div
          className="rounded-xl px-5 py-3 mb-4 flex items-center gap-3 text-sm"
          style={{ background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.2)', color: 'var(--accent)' }}
        >
          <span className="dot-bounce"><span>·</span><span>·</span><span>·</span></span>
          Subiendo grabación y procesando con IA…
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="dot-bounce text-xl" style={{ color: 'var(--accent)' }}>
            <span>·</span><span>·</span><span>·</span>
          </div>
        </div>
      ) : recordings.length === 0 ? (
        <div
          className="rounded-xl px-6 py-12 text-center"
          style={{ border: '1px dashed var(--border)' }}
        >
          <div className="text-3xl mb-3">🎙</div>
          <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>
            Sin grabaciones aún
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Presiona "Grabar" para crear tu primera nota de voz
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recordings.map(rec => (
            <RecordingCard key={rec.id} recording={rec} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Storage note */}
      {recordings.length > 0 && (
        <p className="text-xs mt-6 text-center" style={{ color: 'var(--border)' }}>
          Las grabaciones se eliminan automáticamente a los 30 días
        </p>
      )}
    </div>
  );
}
