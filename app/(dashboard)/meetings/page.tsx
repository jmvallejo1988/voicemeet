'use client';

import { useState, useEffect, useCallback } from 'react';
import { MeetingCard } from '@/components/MeetingCard';
import { CalendarEventCard } from '@/components/CalendarEventCard';
import type { Meeting } from '@/types';
import type { CalendarEvent } from '@/lib/google-calendar';

export default function MeetingsPage() {
  const [meetings,   setMeetings]   = useState<Meeting[]>([]);
  const [events,     setEvents]     = useState<CalendarEvent[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [calLoading, setCalLoading] = useState(false);
  const [sendingBot, setSendingBot] = useState<string | null>(null);
  const [tab,        setTab]        = useState<'calendar' | 'recordings'>('calendar');

  const fetchMeetings = useCallback(async () => {
    const res = await fetch('/api/meetings');
    if (res.ok) setMeetings(await res.json());
    setLoading(false);
  }, []);

  const fetchCalendar = useCallback(async () => {
    setCalLoading(true);
    const res = await fetch('/api/calendar');
    if (res.ok) setEvents(await res.json());
    setCalLoading(false);
  }, []);

  useEffect(() => {
    fetchMeetings();
    fetchCalendar();
    // Poll every 8s for processing meetings
    const interval = setInterval(() => {
      setMeetings(prev => {
        if (prev.some(m => m.status === 'processing' || m.status === 'pending')) {
          fetchMeetings();
        }
        return prev;
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchMeetings, fetchCalendar]);

  async function handleSendBot(event: CalendarEvent) {
    if (!event.meetLink) return;
    setSendingBot(event.id);
    try {
      const res = await fetch('/api/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingUrl: event.meetLink,
          title:      event.title,
          startTime:  event.startTime,
          endTime:    event.endTime,
          attendees:  event.attendees,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'No se pudo enviar el bot. Verifica tu API Key de Recall.ai en Configuración.');
        return;
      }
      const { id } = await res.json();
      // Add placeholder
      const placeholder: Meeting = {
        id, userId: '',
        title: event.title,
        meetSpaceId: '',
        audioUrl: '', duration: 0,
        startTime: event.startTime,
        endTime:   event.endTime,
        transcript: '', summary: '', keyPoints: [], tasks: [],
        attendees: event.attendees,
        createdAt: new Date().toISOString(),
        expiresAt: '',
        status: 'pending',
        emailSent: false,
      };
      setMeetings(prev => [placeholder, ...prev]);
      setTab('recordings');
    } finally {
      setSendingBot(null);
    }
  }

  function handleDelete(id: string) {
    setMeetings(prev => prev.filter(m => m.id !== id));
  }

  const today    = events.filter(e => e.minutesUntilStart > -120 && e.minutesUntilStart < 1440);
  const upcoming = events.filter(e => e.minutesUntilStart >= 1440);

  return (
    <div>
      {/* Page title */}
      <div className="mb-5">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Reuniones de Meet</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          El bot entra automáticamente a tu reunión y graba — tú te conectas desde donde quieras
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
        {([
          { key: 'calendar',   label: 'Mi Calendario', icon: '📅' },
          { key: 'recordings', label: `Grabaciones${meetings.length ? ` (${meetings.length})` : ''}`, icon: '🎙' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
            style={tab === t.key ? {
              background: 'var(--card)',
              color: 'var(--text)',
              boxShadow: 'var(--shadow-sm)',
            } : { color: 'var(--muted)' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── CALENDAR TAB ── */}
      {tab === 'calendar' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold" style={{ color: 'var(--text2)' }}>
              Próximas reuniones con Meet
            </span>
            <button onClick={fetchCalendar} disabled={calLoading} className="btn-3d-white btn-sm">
              {calLoading ? (
                <><span className="dot-bounce text-xs"><span>·</span><span>·</span><span>·</span></span> Cargando</>
              ) : (
                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg> Actualizar</>
              )}
            </button>
          </div>

          {calLoading && events.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="dot-bounce text-xl"><span>·</span><span>·</span><span>·</span></div>
            </div>
          ) : events.length === 0 ? (
            <div className="w-card p-8 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>No hay reuniones de Meet próximas</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Las reuniones de Google Calendar con Meet link aparecen aquí automáticamente
              </p>
              <div className="mt-4 text-xs px-4 py-3 rounded-xl" style={{ background: 'var(--accent-light)', color: 'var(--accent-dark)' }}>
                Asegúrate de tener el scope de Google Calendar habilitado — puede que necesites volver a iniciar sesión
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {today.length > 0 && (
                <>
                  <div className="text-xs font-mono font-bold uppercase tracking-widest px-1" style={{ color: 'var(--muted)' }}>
                    Hoy y en curso
                  </div>
                  {today.map(e => (
                    <CalendarEventCard key={e.id} event={e}
                      onSendBot={handleSendBot} sending={sendingBot === e.id} />
                  ))}
                </>
              )}
              {upcoming.length > 0 && (
                <>
                  <div className="text-xs font-mono font-bold uppercase tracking-widest px-1 mt-4" style={{ color: 'var(--muted)' }}>
                    Próximas 48h
                  </div>
                  {upcoming.map(e => (
                    <CalendarEventCard key={e.id} event={e}
                      onSendBot={handleSendBot} sending={sendingBot === e.id} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* How it works */}
          <div className="mt-6 w-card p-4">
            <div className="text-xs font-mono font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
              ¿Cómo funciona?
            </div>
            <div className="space-y-3">
              {[
                { n: '1', t: 'Haz clic en "Enviar bot a grabar"', d: 'El bot de Wilduit entra a la reunión de Meet como "Wilduit Notetaker"' },
                { n: '2', t: 'Únete desde donde quieras', d: 'Celular, laptop, tablet — el bot ya está grabando independientemente' },
                { n: '3', t: 'Termina tu reunión', d: 'Al finalizar, la IA transcribe y genera el reporte automáticamente' },
                { n: '4', t: 'Recibe el email', d: 'Resumen, puntos clave y tareas llegan a tu Gmail al instante' },
              ].map(s => (
                <div key={s.n} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-xs"
                    style={{ background: 'linear-gradient(135deg,#38e8ff,#22d3ee)', color: '#062030', boxShadow: '0 2px 0 var(--accent-dark)' }}>
                    {s.n}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{s.t}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{s.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RECORDINGS TAB ── */}
      {tab === 'recordings' && (
        <div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="dot-bounce text-xl"><span>·</span><span>·</span><span>·</span></div>
            </div>
          ) : meetings.length === 0 ? (
            <div className="w-card p-8 text-center">
              <div className="text-4xl mb-3">🤖</div>
              <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>Sin grabaciones de reuniones</p>
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                Ve a "Mi Calendario" y envía el bot a una reunión
              </p>
              <button onClick={() => setTab('calendar')} className="btn-3d">
                Ver mi calendario
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map(m => (
                <MeetingCard key={m.id} meeting={m} onDelete={handleDelete} />
              ))}
            </div>
          )}
          {meetings.length > 0 && (
            <p className="text-xs mt-5 text-center" style={{ color: 'var(--border2)' }}>
              Las grabaciones se eliminan automáticamente a los 30 días
            </p>
          )}
        </div>
      )}
    </div>
  );
}
