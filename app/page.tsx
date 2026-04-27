'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/recordings');
  }, [status, router]);

  if (status === 'loading') return (
    <div className="min-h-screen flex items-center justify-center bg-page">
      <div className="dot-bounce text-2xl"><span>·</span><span>·</span><span>·</span></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-page">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-20 h-20 rounded-2xl items-center justify-center font-black text-4xl mb-5"
            style={{
              background: 'linear-gradient(135deg,#38e8ff,#22d3ee)',
              color: '#062030',
              boxShadow: '0 6px 0 #0891b2, 0 10px 28px rgba(34,211,238,0.3)',
            }}>
            W
          </div>
          <h1 className="text-[26px] font-black mb-1.5" style={{ color: 'var(--text)' }}>Wilduit VoiceMeet</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Transcripción IA de reuniones y notas de voz
          </p>
        </div>

        {/* Feature cards */}
        <div className="w-card p-5 mb-5 space-y-3">
          {[
            { icon: '🤖', title: 'Bot automático', desc: 'Se une a tu Meet y graba — tú entras desde donde quieras' },
            { icon: '📅', title: 'Google Calendar', desc: 'Ve tus reuniones del día y envía el bot con un clic' },
            { icon: '✦',  title: 'IA con OpenRouter', desc: 'Resumen, puntos clave y tareas generadas al instante' },
            { icon: '✉️', title: 'Email automático', desc: 'El reporte llega a tu Gmail al terminar la reunión' },
          ].map(({ icon, title, desc }, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-base"
                style={{ background: 'var(--accent-light)', border: '1px solid rgba(34,211,238,0.25)' }}>
                {icon}
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Sign in */}
        <button onClick={() => signIn('google', { callbackUrl: '/recordings' })} className="btn-3d w-full py-4 text-base">
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Ingresar con Gmail
        </button>

        <p className="text-xs text-center mt-4" style={{ color: 'var(--muted)' }}>
          Usa tu cuenta de Google. Se solicitarán permisos para Calendar, Meet y Gmail.
        </p>
      </div>

      <div className="mt-10 text-xs" style={{ color: 'var(--border2)' }}>
        wilduitmarketing.com
      </div>
    </div>
  );
}
