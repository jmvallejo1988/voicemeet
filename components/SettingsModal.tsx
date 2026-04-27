'use client';

import { useState, useEffect } from 'react';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [recallKey, setRecallKey]         = useState('');
  const [notify, setNotify]               = useState(true);
  const [saving, setSaving]               = useState(false);
  const [saved,  setSaved]                = useState(false);
  const [orSaved,   setOrSaved]           = useState(false);
  const [recSaved,  setRecSaved]          = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/settings').then(r => r.json()).then(d => {
      setOrSaved(d.openrouterKey === '***SAVED***');
      setRecSaved(d.recallKey    === '***SAVED***');
      setNotify(d.notifyEmail ?? true);
    });
  }, [open]);

  async function handleSave() {
    setSaving(true);
    const body: any = { notifyEmail: notify };
    if (openrouterKey) body.openrouterKey = openrouterKey;
    if (recallKey)     body.recallKey     = recallKey;
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false); setSaved(true);
    if (openrouterKey) setOrSaved(true);
    if (recallKey)     setRecSaved(true);
    setOpenrouterKey(''); setRecallKey('');
    setTimeout(() => { setSaved(false); onClose(); }, 1100);
  }

  if (!open) return null;

  const KeyField = ({
    label, link, linkLabel, saved: isSaved, value, onChange, placeholder, hint,
  }: { label: string; link: string; linkLabel: string; saved: boolean; value: string; onChange: (v: string) => void; placeholder: string; hint: string }) => (
    <div>
      <label className="text-xs font-mono font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--muted)' }}>
        {label}
      </label>
      {isSaved && !value ? (
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm"
          style={{ background: 'rgba(16,185,129,0.07)', border: '1.5px solid rgba(16,185,129,0.25)', color: 'var(--success-dark)' }}>
          <span className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            API Key guardada
          </span>
          <button onClick={() => onChange(' ')} className="text-xs underline" style={{ color: 'var(--muted)' }}>Cambiar</button>
        </div>
      ) : (
        <input type="password" value={value.trim() === '' ? '' : value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder} className="w-input" />
      )}
      <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
        {hint}{' '}
        <a href={link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>{linkLabel}</a>
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(10,22,40,0.5)', backdropFilter: 'blur(6px)' }}
        onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl overflow-hidden fade-in"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>

        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-light)', border: '1.5px solid rgba(34,211,238,0.3)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-dark)" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </div>
            <span className="font-bold text-[15px]" style={{ color: 'var(--text)' }}>Configuración</span>
          </div>
          <button onClick={onClose} className="btn-3d-white btn-icon btn-sm"
            style={{ width: '30px', height: '30px', fontSize: '14px', color: 'var(--muted)' }}>✕</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <KeyField
            label="OpenRouter API Key"
            link="https://openrouter.ai/keys" linkLabel="openrouter.ai/keys"
            saved={orSaved} value={openrouterKey} onChange={setOpenrouterKey}
            placeholder="sk-or-..."
            hint="Para transcripción (GPT-4o Audio) y resúmenes (GPT-4o)."
          />
          <KeyField
            label="Recall.ai API Key"
            link="https://www.recall.ai" linkLabel="recall.ai"
            saved={recSaved} value={recallKey} onChange={setRecallKey}
            placeholder="Token ..."
            hint="Para el bot que graba tus reuniones de Meet automáticamente."
          />

          {/* Email notifications toggle */}
          <div>
            <label className="text-xs font-mono font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--muted)' }}>
              Notificaciones
            </label>
            <label className="flex items-center gap-3 cursor-pointer" onClick={() => setNotify(!notify)}>
              <div className="relative w-11 h-6 rounded-full transition-colors"
                style={{ background: notify ? 'var(--accent)' : 'var(--border)', boxShadow: notify ? '0 2px 0 var(--accent-dark)' : '0 2px 0 var(--border2)' }}>
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                  style={{ left: notify ? '24px' : '4px' }} />
              </div>
              <span className="text-sm" style={{ color: 'var(--text2)' }}>
                Enviar reporte al email cuando termine una reunión
              </span>
            </label>
          </div>

          {/* Info */}
          <div className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{ background: 'var(--accent-light)', border: '1px solid rgba(34,211,238,0.2)', color: 'var(--text2)' }}>
            <strong style={{ color: 'var(--accent-dark)' }}>ℹ Cómo funciona:</strong> El bot de Recall.ai entra a tu reunión de Meet automáticamente 5 min antes. Tú entras desde donde quieras — celular, laptop, tablet. Al terminar, la IA genera el reporte y te lo envía por email.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button onClick={handleSave} disabled={saving || saved} className="btn-3d w-full"
            style={saved ? { background: 'linear-gradient(180deg,#34d399,#10b981)', boxShadow: '0 4px 0 #047857' } : {}}>
            {saved ? '✓ Guardado correctamente' : saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
