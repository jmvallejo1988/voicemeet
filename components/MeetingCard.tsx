'use client';

import { useState } from 'react';
import { SummaryBox } from './SummaryBox';
import type { Meeting } from '@/types';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-ES', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
});
const fmtDuration = (s: number) => s > 0 ? `${Math.floor(s / 60)} min` : '';

export function MeetingCard({ meeting, onDelete }: { meeting: Meeting; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const isProcessing = meeting.status === 'processing' || meeting.status === 'pending';
  const isError = meeting.status === 'error';
  const isReady = meeting.status === 'ready';

  async function handleDelete() {
    if (!confirm('¿Eliminar esta reunión?')) return;
    await fetch(`/api/meetings/${meeting.id}`, { method: 'DELETE' });
    onDelete(meeting.id);
  }

  return (
    <div className="w-card w-card-hover overflow-hidden fade-in">
      <div className="px-5 py-4 cursor-pointer select-none flex items-center gap-3"
        onClick={() => isReady && setExpanded(v => !v)}>

        {/* Icon */}
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{
            background: isError ? 'rgba(239,68,68,0.08)' : 'linear-gradient(135deg,rgba(16,185,129,0.1),rgba(16,185,129,0.18))',
            border: `1.5px solid ${isError ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.3)'}`,
            boxShadow: isReady ? '0 2px 0 rgba(16,185,129,0.2)' : 'none',
          }}>
          {isProcessing ? (
            <span className="dot-bounce text-sm font-bold" style={{ '--accent': 'var(--success)' } as any}>
              <span>·</span><span>·</span><span>·</span>
            </span>
          ) : isError ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--success-dark)" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[14px] truncate" style={{ color: 'var(--text)' }}>{meeting.title}</div>
          <div className="text-xs flex flex-wrap items-center gap-x-2 mt-0.5" style={{ color: 'var(--muted)' }}>
            <span>{fmtDate(meeting.startTime)}</span>
            {meeting.duration > 0 && <><span>·</span><span>{fmtDuration(meeting.duration)}</span></>}
            {meeting.attendees?.length > 0 && <><span>·</span><span>{meeting.attendees.length} participantes</span></>}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isProcessing && <span className="badge badge-cyan">Procesando</span>}
          {isError     && <span className="badge badge-red">Error</span>}
          {isReady && (
            <div className="flex items-center gap-1.5">
              <span className="badge badge-green">✓ Listo</span>
              {meeting.emailSent && <span className="badge badge-gray">✉ Email</span>}
            </div>
          )}

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
              style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          )}
        </div>
      </div>

      {expanded && isReady && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="pt-4">
            <SummaryBox summary={meeting.summary} keyPoints={meeting.keyPoints} tasks={meeting.tasks} />

            {meeting.attendees?.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-mono font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Participantes</div>
                <div className="flex flex-wrap gap-2">
                  {meeting.attendees.map((a, i) => (
                    <span key={i} className="badge badge-gray">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {meeting.audioUrl && (
              <div className="mb-4">
                <audio controls src={meeting.audioUrl} className="w-full rounded-xl" style={{ accentColor: 'var(--accent)' }} />
              </div>
            )}

            <button onClick={() => setShowTranscript(v => !v)} className="btn-3d-white btn-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
              </svg>
              {showTranscript ? 'Ocultar transcripción' : 'Ver transcripción'}
            </button>

            {showTranscript && (
              <div className="mt-3 p-4 rounded-xl text-sm leading-relaxed"
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text2)' }}>
                {meeting.transcript || 'Sin transcripción disponible.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
