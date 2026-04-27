'use client';

import { useSession, signOut } from 'next-auth/react';
import { useTheme } from './ThemeProvider';
import Image from 'next/image';

interface HeaderProps { onOpenSettings: () => void; }

export function Header({ onOpenSettings }: HeaderProps) {
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-50" style={{
      background: 'var(--card)',
      borderBottom: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg"
            style={{ background: 'linear-gradient(135deg,#38e8ff,#22d3ee)', color: '#062030', boxShadow: '0 3px 0 #0891b2' }}>
            W
          </div>
          <div className="hidden sm:block">
            <div className="font-bold text-[15px] leading-tight" style={{ color: 'var(--text)' }}>VoiceMeet</div>
            <div className="text-[11px] font-mono font-semibold" style={{ color: 'var(--accent)' }}>by Wilduit</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">

          {/* Theme */}
          <button onClick={toggle} className="btn-3d-white btn-icon" title={theme === 'dark' ? 'Modo día' : 'Modo noche'}>
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {/* Settings */}
          <button onClick={onOpenSettings} className="btn-3d-white btn-icon" title="Configuración">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {/* User */}
          {session?.user && (
            <div className="flex items-center gap-2 pl-1">
              {session.user.image ? (
                <Image src={session.user.image} alt="avatar" width={34} height={34}
                  className="rounded-full" style={{ border: '2px solid var(--accent)', boxShadow: '0 2px 0 var(--accent-dark)' }} />
              ) : (
                <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'var(--accent)', color: '#062030', boxShadow: '0 2px 0 var(--accent-dark)' }}>
                  {session.user.name?.[0] ?? 'U'}
                </div>
              )}
              <button onClick={() => signOut()}
                className="hidden sm:block btn-3d-white btn-sm text-xs"
                style={{ padding: '6px 12px', fontSize: '12px' }}>
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
