import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useReviews } from '../hooks/useReviews';
import { C, Tag } from '../lib/tokens';
import { speak } from '../lib/speech';
import { updateStreak, updateProgressStats } from '../lib/activity';
import { useAuth } from '../hooks/useAuth';

export default function Review() {
  const { deckId } = useParams();
  const { userId } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { cards, loading, rateCard } = useReviews(deckId || null, refreshKey);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [interleave, setInterleave] = useState(false);
  const [pronouncing, setPronouncing] = useState(false);
  const [pronResult, setPronResult] = useState(null);
  const reviewedCount = useRef(0);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const audioRef = useRef(null);

  const current = interleave && cards.length > 0 ? cards[index] : cards[index];

  async function handleRate(quality) {
    if (!current || animating) return;
    setAnimating(true);
    setAudioUrl(null);
    await rateCard(current, quality);
    reviewedCount.current += 1;

    updateProgressStats(userId, { wordsStudied: 1 }).catch(() => {});

    if (index + 1 >= cards.length) {
      setDone(true);
      await updateStreak(userId);
      await updateProgressStats(userId, {
        wordsStudied: reviewedCount.current,
        minutesStudied: Math.ceil(reviewedCount.current * 0.3),
      });
    } else {
      setIndex(index + 1);
      setFlipped(false);
    }
    setAnimating(false);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.current.start();
      setRecording(true);
    } catch {
      alert('No se pudo acceder al microfono');
    }
  }

  function stopRecording() {
    if (mediaRecorder.current && recording) {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  }

  function playRecording() {
    if (audioRef.current) {
      audioRef.current.play();
    }
  }

  function startPronunciation() {
    setPronResult(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setPronResult({ text: '', correct: false, message: 'Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.' });
      return;
    }
    setPronouncing(true);
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      const confidence = event.results[0][0].confidence;
      const clean = transcript.toLowerCase().replace(/[.,!?]/g, '');
      const expected = card.word.toLowerCase().trim();
      const isCorrect = clean === expected;
      setPronResult({
        text: transcript,
        confidence: Math.round(confidence * 100),
        correct: isCorrect,
        message: isCorrect
          ? '¡Pronunciacion perfecta!'
          : `Esperado: "${card.word}"`,
      });
      setPronouncing(false);
    };
    recognition.onerror = () => {
      setPronResult({ text: '', correct: false, message: 'No se entendio. Intenta de nuevo.' });
      setPronouncing(false);
    };
    recognition.start();
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => { setDone(false); setRefreshKey(k => k + 1); }} style={{
            background: C.tealBg, color: C.teal,
            border: `1px solid ${C.teal}33`, borderRadius: 8,
            padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Repasar todas</button>
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
        <div style={{ display: "flex", gap: 6, alignItems: "center", overflowX: "auto", maxWidth: "100%" }}>
          {!deckId && (
            <button onClick={() => setInterleave(!interleave)} style={{
              background: interleave ? C.goldBg : C.surface,
              border: interleave ? `1px solid ${C.gold}33` : `1px solid ${C.border}`,
              borderRadius: 8, padding: "4px 10px", fontSize: 11,
              fontWeight: 600, color: interleave ? C.gold : C.textMuted,
              cursor: "pointer", flexShrink: 0,
            }}>
              {interleave ? 'Mezclado' : 'Por mazo'}
            </button>
          )}
          {cards.map((c, i) => {
            const isCurrent = i === index;
            const isDone = i < index;
            const word = c.flashcards?.word || '';
            return (
              <div key={c.id || i} style={{
                width: isCurrent ? 38 : 28, height: isCurrent ? 38 : 28,
                borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isCurrent ? 12 : 10, fontWeight: 600,
                background: isCurrent ? C.goldBg : isDone ? C.greenBg : C.surface,
                border: `1px solid ${isCurrent ? C.gold : isDone ? `${C.green}33` : C.border}`,
                color: isCurrent ? C.gold : isDone ? C.green : C.textMuted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                padding: '2px',
                cursor: isDone ? 'default' : 'pointer',
              }}
              title={word}
              onClick={() => {
                if (!isDone) {
                  setFlipped(false);
                  setAudioUrl(null);
                  setPronResult(null);
                  setIndex(i);
                }
              }}
            >
              {isDone ? '✓' : word.slice(0, 3).toUpperCase()}
            </div>
            );
          })}
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onPointerUp={(e) => { e.stopPropagation(); setFlipped(f => !f); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); setFlipped(f => !f); } }}
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
          outline: "none",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
          ...(flipped ? { boxShadow: `0 0 0 1px ${C.gold}14, 0 8px 32px rgba(0,0,0,0.4)` } : {}),
        }}
      >
        {!flipped ? (
          <>
            {card.image_url && (
              <img src={card.image_url} alt="" style={{
                width: 120, height: 120, borderRadius: 12, objectFit: "cover",
                marginBottom: 10, boxShadow: `0 0 0 1px ${C.border}`,
              }} />
            )}
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
            {card.image_url && (
              <img src={card.image_url} alt="" style={{
                width: 120, height: 120, borderRadius: 12, objectFit: "cover",
                boxShadow: `0 0 0 1px ${C.border}`,
              }} />
            )}
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
          </div>
        )}
      </div>

      {flipped && (
        <div style={{ animation: "fadeIn 0.2s ease-out" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
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
            {!recording ? (
              <button onClick={(e) => { e.stopPropagation(); startRecording(); }} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: C.redBg, color: C.red,
                border: `1px solid ${C.red}33`, borderRadius: 8,
                padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
                Grabar
              </button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); stopRecording(); }} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: C.goldBg, color: C.gold,
                border: `1px solid ${C.gold}33`, borderRadius: 8,
                padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill={C.gold} stroke={C.gold} strokeWidth="1">
                  <rect x="2" y="2" width="20" height="20" rx="2"/>
                </svg>
                Parar
              </button>
            )}
            {audioUrl && !recording && (
              <button onClick={(e) => { e.stopPropagation(); playRecording(); }} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: C.greenBg, color: C.green,
                border: `1px solid ${C.green}33`, borderRadius: 8,
                padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                Mi voz
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); startPronunciation(); }} disabled={pronouncing} style={{
              display: "flex", alignItems: "center", gap: 6,
              background: C.purpleBg, color: C.purple,
              border: `1px solid ${C.purple}33`, borderRadius: 8,
              padding: "6px 12px", fontSize: 12, fontWeight: 600,
              cursor: pronouncing ? "default" : "pointer",
              opacity: pronouncing ? 0.5 : 1,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                <path d="M23 9l-6 6M17 9l6 6"/>
              </svg>
              {pronouncing ? 'Escuchando...' : 'Pronunciar'}
            </button>
          </div>
          {pronResult && (
            <div style={{
              marginTop: 10, padding: '10px 14px', borderRadius: 10,
              background: pronResult.correct ? C.greenBg : C.goldBg,
              border: `1px solid ${pronResult.correct ? C.green + '33' : C.goldBorder}`,
              fontSize: 13, lineHeight: 1.6, textAlign: 'center',
            }}>
              {pronResult.text && (
                <div style={{ color: C.textPrimary, fontWeight: 600 }}>
                  Dijiste: <span style={{ color: pronResult.correct ? C.green : C.red }}>"{pronResult.text}"</span>
                  {pronResult.confidence > 0 && (
                    <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>
                      {pronResult.confidence}% confianza
                    </span>
                  )}
                </div>
              )}
              <div style={{
                color: pronResult.correct ? C.green : C.gold,
                fontWeight: 600, marginTop: pronResult.text ? 4 : 0,
              }}>
                {pronResult.message}
              </div>
            </div>
          )}
          {audioUrl && <audio ref={audioRef} src={audioUrl} style={{ display: "none" }} />}
        </div>
      )}

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
