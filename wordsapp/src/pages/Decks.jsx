import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDecks } from '../hooks/useDecks';
import { C } from '../lib/tokens';

const COLORS = ['#c8a96e', '#7eb8a4', '#9b8ec4', '#c0675a', '#6aab8e', '#5b8bd4', '#d4885c'];

export default function Decks() {
  const { decks, loading, createDeck } = useDecks();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const overlayRef = useRef(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await createDeck(name.trim(), description.trim() || null, color);
    setName(''); setDescription(''); setColor(COLORS[0]);
    setSubmitting(false); setOpen(false);
  }

  useEffect(() => {
    function esc(e) { if (e.key === 'Escape') setOpen(false); }
    if (open) { window.addEventListener('keydown', esc); }
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{
            fontSize: 11, fontWeight: 700, color: C.textMuted,
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>Mazos</div>
          <div style={{
            fontSize: 18, fontWeight: 700, letterSpacing: -0.4,
            marginTop: 2, color: C.textPrimary,
          }}>
            {loading ? '...' : `${decks.length} mazos`}
          </div>
        </div>
        <button onClick={() => setOpen(true)} style={{
          background: C.gold, color: "#111318", borderRadius: 8,
          padding: "8px 16px", fontSize: 13, fontWeight: 700,
          cursor: "pointer", border: "none",
        }}>Nuevo</button>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              background: C.surface, borderRadius: 12, padding: 12,
              border: `1px solid ${C.border}`, display: "flex",
              alignItems: "center", gap: 12,
            }} className="animate-pulse">
              <div style={{
                width: 3, height: 28, background: C.border, borderRadius: 2,
              }} />
              <div style={{
                flex: 1, height: 16, background: C.border, borderRadius: 4,
              }} />
              <div style={{
                width: 32, height: 20, background: C.border, borderRadius: 10,
              }} />
            </div>
          ))}
        </div>
      ) : decks.length === 0 ? (
        <div style={{
          textAlign: "center", paddingTop: 64,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 56, height: 56, background: C.surface,
            borderRadius: 16, display: "flex", alignItems: "center",
            justifyContent: "center", border: `1px solid ${C.border}`,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke={C.textMuted} strokeWidth="1.5">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <p style={{ color: C.textMuted, fontSize: 13 }}>No tienes mazos todavia</p>
          <button onClick={() => setOpen(true)} style={{
            background: C.gold, color: "#111318", borderRadius: 8,
            padding: "8px 16px", fontSize: 13, fontWeight: 700,
            cursor: "pointer", border: "none",
          }}>Crear primer mazo</button>
        </div>
      ) : (
        <div style={{
          background: C.surface, borderRadius: 16,
          border: `1px solid ${C.border}`, overflow: "hidden",
        }}>
          {decks.map((d, i) => (
            <Link key={d.id} to={`/decks/${d.id}`} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", textDecoration: "none",
              borderBottom: i < decks.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 3, height: 28, borderRadius: 2,
                  background: d.color || C.gold,
                }} />
                <div>
                  <span style={{ fontSize: 13, color: C.textPrimary }}>{d.name}</span>
                  {d.description && (
                    <p style={{ fontSize: 11, color: C.textMuted }}>{d.description}</p>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 11, color: C.textMuted, background: C.bg,
                  border: `1px solid ${C.border}`, borderRadius: 20,
                  padding: "2px 10px",
                }}>{d.card_count ?? '-'}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={C.textMuted} strokeWidth="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0"
          style={{
            zIndex: 50, display: "flex", alignItems: "flex-end",
            justifyContent: "center", padding: 16,
            animation: "fadeIn 0.15s ease-out",
          }}
          onClick={(e) => { if (e.target === overlayRef.current) setOpen(false); }}
        >
          <div className="fixed inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div style={{
            position: "relative", background: C.surface, borderRadius: 16,
            width: "100%", maxWidth: 420, maxHeight: "85vh",
            overflowY: "auto", padding: 20,
            border: `1px solid ${C.border}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            animation: "slideUp 0.15s ease-out",
          }}>
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between", marginBottom: 16,
            }}>
              <h2 style={{
                fontWeight: 600, fontSize: 16, color: C.textPrimary,
              }}>Nuevo mazo</h2>
              <button onClick={() => setOpen(false)} style={{
                color: C.textMuted, fontSize: 20, lineHeight: 1,
                cursor: "pointer", background: "none", border: "none",
                padding: 4, borderRadius: 4,
              }}>&times;</button>
            </div>
            <form onSubmit={handleCreate} style={{
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: C.textMuted,
                  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
                }}>Nombre</div>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Viajes, Trabajo..." autoFocus
                  style={{
                    background: C.surface, color: C.textPrimary,
                    border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: "10px 14px", fontSize: 13,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    outline: "none", width: "100%",
                  }}
                />
              </div>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: C.textMuted,
                  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
                }}>Descripcion</div>
                <input value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Opcional"
                  style={{
                    background: C.surface, color: C.textPrimary,
                    border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: "10px 14px", fontSize: 13,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    outline: "none", width: "100%",
                  }}
                />
              </div>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: C.textMuted,
                  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
                }}>Color</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)} style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: c, cursor: "pointer", border: "none",
                      outline: color === c ? `2px solid ${C.gold}` : "none",
                      outlineOffset: 2,
                      transform: color === c ? "scale(1.1)" : "scale(1)",
                      transition: "all 0.15s",
                    }} />
                  ))}
                </div>
              </div>
              <button type="submit" disabled={submitting || !name.trim()} style={{
                background: C.gold, color: "#111318", borderRadius: 8,
                padding: "10px 0", fontSize: 13, fontWeight: 700,
                cursor: (submitting || !name.trim()) ? "default" : "pointer",
                border: "none",
                opacity: (submitting || !name.trim()) ? 0.5 : 1,
                marginTop: 4, width: "100%",
              }}>
                {submitting ? 'Creando...' : 'Crear mazo'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
