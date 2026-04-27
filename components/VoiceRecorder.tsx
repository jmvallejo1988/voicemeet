'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  onRecordingComplete: (blob: Blob, duration: number, title: string) => void;
}

type RecState = 'idle' | 'recording' | 'paused';

export function VoiceRecorder({ onRecordingComplete }: Props) {
  const [state, setState] = useState<RecState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [title, setTitle] = useState('');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => () => { timerRef.current && clearInterval(timerRef.current); }, []);

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(1000);
      mediaRef.current = mr;
      setState('recording');
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    } catch {
      alert('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  }

  function pauseRecording() {
    mediaRef.current?.pause(); setState('paused');
    timerRef.current && clearInterval(timerRef.current);
  }

  function resumeRecording() {
    mediaRef.current?.resume(); setState('recording');
    timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
  }

  function stopRecording() {
    if (!mediaRef.current) return;
    timerRef.current && clearInterval(timerRef.current);
    mediaRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const t = title.trim() || `Nota ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
      onRecordingComplete(blob, elapsed, t);
      setState('idle'); setElapsed(0); setTitle('');
      mediaRef.current?.stream.getTracks().forEach(t => t.stop());
    };
    mediaRef.current.stop();
  }

  return (
    <div className="w-card p-5 mb-6 fade-in">
      {/* Title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,var(--accent-light),rgba(34,211,238,0.15))', border: '1.5px solid rgba(34,211,238,0.3)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent-dark)" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </div>
        <div>
          <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Nueva nota de voz</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Graba y transcribe automáticamente</div>
        </div>
      </div>

      {/* Input */}
      <input
        type="text" value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Nombre de la nota (opcional)"
        className="w-input mb-4"
      />

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {state === 'idle' && (
          <button onClick={startRecording} className="btn-3d">
            <span className="w-2.5 h-2.5 rounded-full animate-rec" style={{ background: '#ef4444', flexShrink: 0 }}/>
            Grabar
          </button>
        )}

        {state === 'recording' && (
          <>
            <button onClick={pauseRecording} className="btn-3d-white">⏸ Pausar</button>
            <button onClick={stopRecording} className="btn-3d-danger">⏹ Guardar y transcribir</button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="w-2.5 h-2.5 rounded-full animate-rec" style={{ background: '#ef4444' }}/>
              <span className="font-mono font-bold text-sm" style={{ color: 'var(--text)' }}>{fmtTime(elapsed)}</span>
            </div>
          </>
        )}

        {state === 'paused' && (
          <>
            <button onClick={resumeRecording} className="btn-3d">▶ Continuar</button>
            <button onClick={stopRecording} className="btn-3d-success btn-sm">✓ Guardar</button>
            <span className="ml-auto font-mono text-sm" style={{ color: 'var(--muted)' }}>{fmtTime(elapsed)} ⏸</span>
          </>
        )}
      </div>
    </div>
  );
}
