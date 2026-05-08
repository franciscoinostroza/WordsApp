import { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { C } from '../lib/tokens';
import { supabase } from '../lib/supabase';

const navItems = [
  { label: "Inicio", to: "/", icon: HomeIcon },
  { label: "Repasar", to: "/review", icon: ReviewIcon },
  { label: "Lex", to: "/chat", icon: ChatIcon },
  { label: "Quiz", to: "/quiz", icon: QuizIcon },
  { label: "Progreso", to: "/progress", icon: ProgressIcon },
];

export default function Layout() {
  const { user, userId } = useAuth();
  const [profile, setProfile] = useState({ streak: 0, name: '' });

  useEffect(() => {
    if (!userId) return;
    supabase.from('users').select('streak_days, name').eq('id', userId).single().then(({ data }) => {
      setProfile({ streak: data?.streak_days || 0, name: data?.name || '' });
    });
  }, [userId]);

  return (
    <div className="flex h-screen overflow-hidden" style={{
      background: C.bg, color: C.textPrimary,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:flex-col" style={{
        width: 220, background: C.surface, borderRight: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28, paddingLeft: 14 }}>
            <img src="/logo.png" alt="WordsApp" style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.4, color: C.textPrimary }}>WordsApp</span>
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {navItems.map(({ label, to, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === "/"} style={{ textDecoration: "none" }}>
                {({ isActive }) => (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 11,
                    padding: "11px 14px", borderRadius: 10,
                    background: isActive ? `${C.gold}12` : "transparent",
                    color: isActive ? C.gold : C.textMuted,
                    fontWeight: isActive ? 600 : 500,
                    fontSize: 13,
                    transition: "all 0.15s",
                  }}>
                    <Icon color={isActive ? C.gold : C.textMuted} size={18} />
                    {label}
                  </div>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
        <div style={{ marginTop: "auto", padding: 16, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", color: "#111318", fontSize: 11, fontWeight: 800 }}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile.name || user?.email?.split('@')[0] || 'Usuario'}
              </div>
              <div style={{ fontSize: 10, color: C.textMuted }}>{profile.streak} dias de racha</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ width: "100%" }}>
        {/* Mobile header */}
        <header className="md:hidden" style={{
          background: C.surface, borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px", display: "flex", alignItems: "center",
          justifyContent: "space-between", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="WordsApp" style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: -0.4 }}>WordsApp</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              background: C.goldBg, color: C.gold,
              border: `1px solid ${C.gold}33`,
              borderRadius: 6, padding: "2px 8px",
              fontSize: 11, fontWeight: 600,
            }}>{profile.streak} dias</span>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", color: "#111318", fontSize: 12, fontWeight: 800 }}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: 20 }}>
          <div className="max-w-[430px] md:max-w-none mx-auto w-full min-h-full flex flex-col">
            <Outlet />
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav className="flex md:hidden" style={{
          background: C.surface, borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
          paddingBottom: "env(safe-area-inset-bottom, 0)",
        }}>
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} style={{ flex: 1, textDecoration: "none" }}>
              {({ isActive }) => (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    background: isActive ? C.gold : "transparent",
                    transition: "all 0.2s",
                  }}>
                    <Icon color={isActive ? "#111318" : C.textMuted} size={16} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 500, marginTop: 2, color: isActive ? C.gold : C.textMuted }}>
                    {label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function HomeIcon({ color, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function ReviewIcon({ color, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="M8 2v4M16 2v4"/>
      <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>
    </svg>
  );
}

function ChatIcon({ color, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function QuizIcon({ color, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  );
}

function ProgressIcon({ color, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
