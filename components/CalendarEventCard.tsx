'use client';

import type { CalendarEvent } from '@/lib/google-calendar';

interface Props {
  event: CalendarEvent;
  onSendBot: (event: CalendarEvent) => void;
  sending: boolean;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function fmtDayNum(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric' });
}

function fmtMonthAbbr(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
}

function fmtDayName(iso: string) {
  const d = new Date(iso);
  const today    = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString())    return 'HOY';
  if (d.toDateString() === tomorrow.toDateString()) return 'MAÑANA';
  return d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase();
}

export function CalendarEventCard({ event, onSendBot, sending }: Props) {
  const isNow          = event.minutesUntilStart < 0 && event.minutesUntilStart > -180;
  const isStartingSoon = event.minutesUntilStart >= 0 && event.minutesUntilStart <= 15;
  const isToday        = event.minutesUntilStart > 15 && event.minutesUntilStart < 1440;
  const isPast         = event.minutesUntilStart <= -180;

  const timeLabel = isNow
    ? 'En curso'
    : isPast
    ? 'Terminó'
    : event.minutesUntilStart < 60
    ? `En ${event.minutesUntilStart} min`
    : event.minutesUntilStart < 1440
    ? `En ${Math.round(event.minutesUntilStart / 60)}h`
    : `${fmtDayName(event.startTime)} ${fmtTime(event.startTime)}`;

  // Accent color bar — matches Google Calendar event color logic
  const accentColor = isNow
    ? '#0d8050'
    : isStartingSoon
    ? '#c5221f'
    : isToday
    ? '#1a73e8'
    : isPast
    ? '#bdbdbd'
    : '#5f6368';

  // Chip component to render
  function TimeChip() {
    if (isPast) return null;
    if (isNow)          return <span className="gcal-live"><span style={{ fontSize: 8 }}>●</span>En curso</span>;
    if (isStartingSoon) return <span className="gcal-urgent">⚡ {timeLabel}</span>;
    if (isToday)        return <span className="gcal-today">🗓 {timeLabel}</span>;
    return <span className="gcal-future">{timeLabel}</span>;
  }

  return (
    <div
      className="w-card fade-in overflow-hidden"
      style={{
        borderLeft: `4px solid ${accentColor}`,
        opacity: isPast ? 0.45 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <div className="flex items-stretch gap-0">

        {/* Date badge — Google Calendar mini calendar chip */}
        <div
          className="flex-shrink-0 flex flex-col items-center justify-center px-3 py-3"
          style={{
            minWidth: 56,
            background: isNow
              ? 'linear-gradient(160deg,#e6f4ea,#d2f0da)'
              : isStartingSoon
              ? 'linear-gradient(160deg,#fce8e6,#fdd5d3)'
              : isToday
              ? 'linear-gradient(160deg,#e8f0fe,#d2e3fc)'
              : 'var(--bg2)',
            borderRight: '1px solid var(--border)',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: accentColor,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {fmtDayName(event.startTime)}
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              lineHeight: 1.1,
              color: accentColor,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {fmtDayNum(event.startTime)}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: accentColor,
              opacity: 0.75,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {fmtMonthAbbr(event.startTime)}
          </span>
        </div>

        {/* Event info */}
        <div className="flex-1 min-w-0 p-4">
          <div className="flex items-start gap-2 flex-wrap mb-1">
            <span className="font-semibold text-[14px] leading-snug" style={{ color: 'var(--text)', flex: '1 1 0', minWidth: 0 }}>
              {event.title}
            </span>
            <TimeChip />
          </div>

          <div className="text-xs flex items-center gap-2 mb-3" style={{ color: 'var(--muted)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{fmtTime(event.startTime)} – {fmtTime(event.endTime)}</span>
            {event.attendees.length > 0 && (
              <>
                <span style={{ opacity: 0.4 }}>|</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>{event.attendees.length} participantes</span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={event.meetLink}
              target="_blank"
              rel="noreferrer"
              className="btn-3d-white btn-sm"
              style={{ textDecoration: 'none', fontSize: 12 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.361a1 1 0 0 1-1.447.894L15 14"/>
                <rect x="1" y="6" width="14" height="12" rx="2"/>
              </svg>
              Abrir Meet
            </a>

            {!isPast && (
              <button
                onClick={() => onSendBot(event)}
                disabled={sending}
                className="btn-3d btn-sm"
              >
                {sending ? (
                  <><span className="dot-bounce" style={{ fontSize: 10 }}><span>·</span><span>·</span><span>·</span></span> Enviando…</>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="7"/>
                      <line x1="12" y1="5" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="19" y2="12"/>
                    </svg>
                    Enviar bot a grabar
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
