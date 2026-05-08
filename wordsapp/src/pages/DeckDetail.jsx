import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDeck } from '../hooks/useDecks';
import { useFlashcards } from '../hooks/useFlashcards';
import { C, Tag } from '../lib/tokens';

const PARTS = ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'other'];

export default function DeckDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deck, loading: dl } = useDeck(id);
  const { flashcards, loading: fl, createFlashcard } = useFlashcards(id);

  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [definition, setDefinition] = useState('');
  const [example, setExample] = useState('');
  const [ipa, setIpa] = useState('');
  const [pos, setPos] = useState('');
  const [sub, setSub] = useState(false);
  const overlayRef = useRef(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!word.trim() || !translation.trim()) return;
    setSub(true);
    await createFlashcard({
      word: word.trim(),
      translation: translation.trim(),
      definition: definition.trim() || null,
      example: example.trim() || null,
      ipa: ipa.trim() || null,
      part_of_speech: pos || null,
    });
    setWord(''); setTranslation(''); setDefinition('');
    setExample(''); setIpa(''); setPos('');
    setSub(false); setOpen(false);
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

  const loading = dl || fl;

  const inputStyle = {
    background: C.surface, color: C.textPrimary,
    border: `1px solid ${C.border}`, borderRadius: 10,
    padding: "10px 14px", fontSize: 13,
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: "none", width: "100%",
  };

  if (loading) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", gap: 16,
      }} className="animate-pulse">
        <div style={{ height: 16, background: C.border, borderRadius: 4, width: 96 }} />
        <div style={{ height: 28, background: C.border, borderRadius: 4, width: 192 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              height: 64, background: C.surface, borderRadius: 12,
              border: `1px solid ${C.border}`,
            }} />
          ))}
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div style={{ textAlign: "center", paddingTop: 64 }}>
        <p style={{ color: C.textMuted, marginBottom: 8 }}>Mazo no encontrado</p>
        <Link to="/decks" style={{
          color: C.gold, fontSize: 13, fontWeight: 600, textDecoration: "none",
        }}>Volver a mazos</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={() => navigate('/decks')} style={{
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 12, color: C.textMuted, cursor: "pointer",
        background: "none", border: "none", width: "fit-content",
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Mazos
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: deck.color, flexShrink: 0,
        }} />
        <div>
          <h2 style={{
            fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: C.textPrimary,
          }}>{deck.name}</h2>
          {deck.description && (
            <p style={{ fontSize: 12, color: C.textMuted }}>{deck.description}</p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setOpen(true)} style={{
          background: C.gold, color: "#111318", borderRadius: 8,
          padding: "8px 16px", fontSize: 13, fontWeight: 700,
          cursor: "pointer", border: "none",
        }}>+ Agregar</button>
        <Link to={`/review/${id}`} style={{
          background: C.surface, color: C.textPrimary,
          border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "8px 16px", fontSize: 13, fontWeight: 600,
          cursor: "pointer", textDecoration: "none",
        }}>Repasar</Link>
      </div>

      <div style={{
        fontSize: 11, fontWeight: 700, color: C.textMuted,
        textTransform: "uppercase", letterSpacing: 0.5,
      }}>
        {flashcards.length} tarjetas
      </div>

      {flashcards.length === 0 ? (
        <p style={{
          fontSize: 13, color: C.textMuted,
          padding: "24px 0", textAlign: "center",
        }}>Aun no hay tarjetas</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {flashcards.map(c => (
            <div key={c.id} style={{
              background: C.surface, borderRadius: 12,
              border: `1px solid ${C.border}`, padding: 16,
            }}>
              <div style={{
                display: "flex", alignItems: "flex-start",
                justifyContent: "space-between", gap: 12,
              }}>
                <div>
                  <div style={{
                    fontWeight: 600, color: C.textPrimary,
                  }}>{c.word}</div>
                  <div style={{
                    fontSize: 13, color: C.textMuted, marginTop: 2,
                  }}>{c.translation}</div>
                </div>
                {c.part_of_speech && <Tag>{c.part_of_speech}</Tag>}
              </div>
              {c.ipa && (
                <div style={{
                  fontFamily: "'SF Mono', 'Fira Code', monospace",
                  fontSize: 12, color: C.textMuted, marginTop: 8,
                }}>/{c.ipa}/</div>
              )}
            </div>
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
              }}>Nueva tarjeta</h2>
              <button onClick={() => setOpen(false)} style={{
                color: C.textMuted, fontSize: 20, lineHeight: 1,
                cursor: "pointer", background: "none", border: "none",
                padding: 4, borderRadius: 4,
              }}>&times;</button>
            </div>
            <form onSubmit={handleCreate} style={{
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: C.textMuted,
                    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
                  }}>Palabra *</div>
                  <input value={word} onChange={e => setWord(e.target.value)}
                    autoFocus style={inputStyle}
                  />
                </div>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: C.textMuted,
                    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
                  }}>Traduccion *</div>
                  <input value={translation} onChange={e => setTranslation(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: C.textMuted,
                  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
                }}>Definicion</div>
                <input value={definition} onChange={e => setDefinition(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: C.textMuted,
                  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
                }}>Ejemplo</div>
                <input value={example} onChange={e => setExample(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: C.textMuted,
                    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
                  }}>Fonetica</div>
                  <input value={ipa} onChange={e => setIpa(e.target.value)}
                    placeholder="/weord/" style={inputStyle}
                  />
                </div>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, color: C.textMuted,
                    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
                  }}>Tipo</div>
                  <select value={pos} onChange={e => setPos(e.target.value)} style={{
                    ...inputStyle,
                    appearance: "auto",
                  }}>
                    <option value="">Seleccionar</option>
                    {PARTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={sub || !word.trim() || !translation.trim()} style={{
                background: C.gold, color: "#111318", borderRadius: 8,
                padding: "10px 0", fontSize: 13, fontWeight: 700,
                cursor: (sub || !word.trim() || !translation.trim()) ? "default" : "pointer",
                border: "none",
                opacity: (sub || !word.trim() || !translation.trim()) ? 0.5 : 1,
                marginTop: 4, width: "100%",
              }}>
                {sub ? 'Guardando...' : 'Guardar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
