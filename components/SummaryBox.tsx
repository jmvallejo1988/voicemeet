'use client';

interface SummaryBoxProps {
  summary: string;
  keyPoints: string[];
  tasks: string[];
}

export function SummaryBox({ summary, keyPoints, tasks }: SummaryBoxProps) {
  return (
    <div className="w-card overflow-hidden mb-4">
      {/* Summary */}
      <div className="px-5 py-4" style={{ borderLeft: '3px solid var(--accent)', background: 'var(--accent-light)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: 'var(--accent)', color: '#062030' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--accent-dark)' }}>
            Resumen Ejecutivo
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text2)' }}>
          {summary || 'Procesando…'}
        </p>
      </div>

      {(keyPoints.length > 0 || tasks.length > 0) && (
        <div className="grid sm:grid-cols-2" style={{ borderTop: '1px solid var(--border)' }}>
          {keyPoints.length > 0 && (
            <div className="px-5 py-4" style={{ borderRight: tasks.length > 0 ? '1px solid var(--border)' : 'none' }}>
              <div className="text-xs font-mono font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
                Puntos Clave
              </div>
              <ul className="space-y-2">
                {keyPoints.map((pt, i) => (
                  <li key={i} className="flex gap-2 text-[13px]" style={{ color: 'var(--text2)' }}>
                    <span className="mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                      style={{ background: 'var(--accent-light)', color: 'var(--accent-dark)', border: '1px solid rgba(34,211,238,0.3)' }}>
                      {i + 1}
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tasks.length > 0 && (
            <div className="px-5 py-4">
              <div className="text-xs font-mono font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
                Tareas &amp; Acciones
              </div>
              <ul className="space-y-2">
                {tasks.map((task, i) => (
                  <li key={i} className="flex gap-2 text-[13px]" style={{ color: 'var(--text2)' }}>
                    <span className="mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                      style={{ border: '1.5px solid var(--success)', borderRadius: '4px', color: 'var(--success)' }}>
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="2 6 5 9 10 3"/>
                      </svg>
                    </span>
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
