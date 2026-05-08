import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useReviews } from '../hooks/useReviews';
import { C, Tag } from '../lib/tokens';
import { speak } from '../lib/speech';

export default function Review() {
  const { deckId } = useParams();
  const { cards, loading, rateCard } = useReviews(deckId || null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [animating, setAnimating] = useState(false);

  const current = cards[index];

  async function handleRate(quality) {
    if (!current || animating) return;
    setAnimating(true);
    await rateCard(current, quality);
    if (index + 1 >= cards.length) setDone(true);
    else { setIndex(index + 1); setFlipped(false); }
    setAnimating(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <div style={{
          width: 28, height: 28, border: `2px solid ${C.gold}`,
          borderTopColor: "transparent", borderRadius: "50%",
        }} className="animate-spin" />
      </div>
    );
  }

  if (done || cards.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 16, paddingTop: 80, textAlign: "center",
      }}>
        <div style={{
          width: 64, height: 64, background: C.surface,
          borderRadius: 16, display: "flex", alignItems: "center",
          justifyContent: "center", border: `1px solid ${C.border}`,
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke={cards.length === 0 ? C.textMuted : C.gold} strokeWidth="1.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <h2 style={{
            fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: C.textPrimary,
          }}>
            {cards.length === 0 ? 'Todo al dia' : 'Sesion completa'}
          </h2>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
            {cards.length === 0 ? 'No hay tarjetas pendientes.' : 'Buen trabajo, segui practicando.'}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link to="/decks" style={{
            background: C.surface, color: C.textPrimary,
            border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "8px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", textDecoration: "none",
          }}>Mazos</Link>
          <Link to="/" style={{
            background: C.gold, color: "#111318", borderRadius: 8,
            padding: "8px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", textDecoration: "none",
          }}>Inicio</Link>
        </div>
      </div>
    );
  }

  const card = current.flashcards;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: C.textMuted }}>
          Tarjeta {index + 1} / {cards.length}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {cards.map((_, i) => (
            <div key={i} style={{
              width: 26, height: 3, borderRadius: 2,
              background: i === index ? C.gold : C.border,
            }} />
          ))}
        </div>
      </div>

      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          background: C.surface,
          border: flipped ? `1px solid ${C.gold}55` : `1px solid ${C.border}`,
          borderRadius: 20,
          padding: "36px 24px",
          minHeight: 230,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.25s",
          userSelect: "none",
          ...(flipped ? { boxShadow: `0 0 0 1px ${C.gold}14, 0 8px 32px rgba(0,0,0,0.4)` } : {}),
        }}
      >
        {!flipped ? (
          <>
            {card.part_of_speech && (
              <Tag>{card.part_of_speech}</Tag>
            )}
            <div style={{
              fontSize: 32, fontWeight: 800, letterSpacing: -0.6,
              color: C.textPrimary, marginTop: 4,
            }}>{card.word}</div>
            {card.ipa && (
              <div style={{
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                fontSize: 13, color: C.textMuted, marginTop: 4,
              }}>
                {card.ipa}
              </div>
            )}
            <div style={{
              fontSize: 11, color: C.textMuted,
              letterSpacing: 0.3, marginTop: 12,
            }}>Toca para revelar</div>
          </>
        ) : (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 8, width: "100%",
            animation: "fadeIn 0.2s ease-out",
          }}>
            <div style={{
              width: 36, height: 1, background: C.border, margin: "6px 0",
            }} />
            <div style={{
              fontSize: 20, fontWeight: 700, color: C.gold,
            }}>{card.translation}</div>
            {card.definition && (
              <div style={{
                fontSize: 13, color: C.textMuted, maxWidth: 280,
                lineHeight: 1.6,
              }}>{card.definition}</div>
            )}
            {card.example && (
              <div style={{
                fontSize: 13, color: C.textMuted, fontStyle: "italic",
                maxWidth: 280, lineHeight: 1.6, marginTop: 2,
              }}>"{card.example}"</div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={(e) => { e.stopPropagation(); speak(card.word); }} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: C.tealBg, color: C.teal,
                border: `1px solid ${C.teal}33`, borderRadius: 8,
                padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                  <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
                </svg>
                Audio
              </button>
              <button style={{
                display: "flex", alignItems: "center", gap: 6,
                background: C.goldBg, color: C.gold,
                border: `1px solid ${C.gold}33`, borderRadius: 8,
                padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                + Mazo
              </button>
            </div>
          </div>
        )}
      </div>

      {flipped && (
        <div style={{ animation: "slideUp 0.2s ease-out" }}>
          <div style={{
            fontSize: 11, color: C.textMuted,
            textAlign: "center", marginBottom: 10, letterSpacing: 0.3,
          }}>
            Que tan bien la recordaste?
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
          }}>
            {[
              { label: 'Nada', q: 0, color: C.red, bg: C.redBg, border: `${C.red}33` },
              { label: 'Dificil', q: 2, color: C.gold, bg: C.goldBg, border: C.goldBorder },
              { label: 'Bien', q: 3, color: C.green, bg: C.greenBg, border: `${C.green}33` },
              { label: 'Perfecta', q: 5, color: C.teal, bg: C.tealBg, border: C.tealBorder },
            ].map(({ label, q, color, bg, border }) => (
              <button
                key={q}
                onClick={() => handleRate(q)}
                disabled={animating}
                style={{
                  padding: "12px 4px", borderRadius: 12, fontSize: 11,
                  fontWeight: 700, border: `1px solid ${border}`,
                  background: bg, color,
                  cursor: animating ? "default" : "pointer",
                  opacity: animating ? 0.3 : 1,
                  lineHeight: 1.3,
                  textAlign: "center",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
