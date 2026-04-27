'use client';

import { useState } from 'react';
import { SummaryBox } from './SummaryBox';
import type { Recording } from '@/types';

const fmtDuration = (s: number) => s ? `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}` : '';
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

export function RecordingCard({ recording, onDelete }: { recording: Recording; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const isProcessing = recording.status === 'processing';
  const isError = recording.status === 'error';
  const isReady = recording.status === 'ready';

  async function handleDelete() {
    if (!confirm('¿Eliminar esta grabación?')) return;
    await fetch(`/api/recordings/${recording.id}`, { method: 'DELETE' });
    onDelete(recording.id);
  }

  return (
    <div className="w-card w-card-hover overflow-hidden fade-in">
      {/* Header row */}
      <div className="px-5 py-4 cursor-pointer select-none flex items-center gap-3"
        onClick={() => isReady && setExpanded(v => !v)}>

        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{
            background: isError ? 'rgba(239,68,68,0.08)' : isProcessing ? 'var(--accent-light)' : 'linear-gradient(135deg,var(--accent-light),rgba(34,211,238,0.2))',
            border: `1.5px solid ${isError ? 'rgba(239,68,68,0.25)' : 'rgba(34,211,238,0.3)'}`,
            boxShadow: isReady ? '0 2px 0 rgba(34,211,238,0.2)' : 'none',
          }}>
          {isProcessing ? (
            <span className="dot-bounce text-sm font-bold"><span>·</span><span>·</span><span>·</span></span>
          ) : isError ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent-dark)" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            </svg>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14px] truncate" style={{ color: 'var(--text)' }}>{recording.title}</div>
          <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: 'var(--muted)' }}>
            <span>{fmtDate(recording.createdAt)}</span>
            {recording.duration > 0 && <><span>·</span><span>{fmtDuration(recording.duration)}</span></>}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isProcessing && <span className="badge badge-cyan">Procesando</span>}
          {isError     && <span className="badge badge-red">Error</span>}
          {isReady     && <span className="badge badge-green">✓ Listo</span>}

          <button onClick={e => { e.stopPropagation(); handleDelete(); }}
            className="btn-3d-white btn-icon btn-sm" title="Eliminar"
            style={{ color: 'var(--danger)', width: '32px', height: '32px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>

          {isReady && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"
              style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          )}
        </div>
      </div>

      {/* Expanded */}
      {expanded && isReady && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="pt-4">
            <SummaryBox summary={recording.summary} keyPoints={recording.keyPoints} tasks={recording.tasks} />

            {recording.audioUrl && (
              <div className="mb-4">
                <audio controls src={recording.audioUrl} className="w-full rounded-xl" style={{ accentColor: 'var(--accent)' }} />
              </div>
            )}

            <button onClick={() => setShowTranscript(v => !v)}
              className="btn-3d-white btn-sm flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              {showTranscript ? 'Ocultar transcripción' : 'Ver transcripción completa'}
            </button>

            {showTranscript && (
              <div className="mt-3 p-4 rounded-xl text-sm leading-relaxed"
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                {recording.transcript || 'Sin transcripción disponible.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
