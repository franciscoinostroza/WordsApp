import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { sm2 } from '../lib/sm2';
import { C, Tag } from '../lib/tokens';
import { speak } from '../lib/speech';
import { updateStreak, updateProgressStats } from '../lib/activity';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Write() {
  const { userId } = useAuth();
  const [cards, setCards] = useState([]);
  const [dueReviews, setDueReviews] = useState([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const today = new Date().toISOString().split('T')[0];
      const [cardsRes, reviewsRes] = await Promise.all([
        supabase.from('flashcards').select('*').eq('user_id', userId),
        supabase.from('reviews').select('*').eq('user_id', userId).lte('due_date', today),
      ]);
      setCards(cardsRes.data || []);
      setDueReviews(reviewsRes.data || []);
      setLoading(false);
    }
    load();
  }, [userId, sessionKey]);

  const sessionCards = useMemo(() => {
    if (cards.length < 2) return [];
    const dueFlashcardIds = new Set(dueReviews.map((r) => r.flashcard_id));
    const dueCards = cards.filter((c) => dueFlashcardIds.has(c.id));
    const otherCards = cards.filter((c) => !dueFlashcardIds.has(c.id));
    const selected = shuffle(dueCards.length >= 5 ? dueCards : [...dueCards, ...otherCards]).slice(0, Math.min(15, cards.length));
    return selected;
  }, [cards, dueReviews, sessionKey]);

  const current = sessionCards[index];
  const currentReview = useMemo(() => {
    if (!current) return null;
    return dueReviews.find((r) => r.flashcard_id === current.id) || null;
  }, [current, dueReviews]);

  const trimmedAnswer = current?.word?.trim().toLowerCase() || '';

  function normalize(s) {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function handleSubmit() {
    if (submitted || !current) return;
    const correct = normalize(input) === normalize(trimmedAnswer);
    setIsCorrect(correct);
    setSubmitted(true);
    if (correct) setScore((s) => s + 1);

    if (currentReview) {
      const quality = correct ? 3 : 0;
      const result = sm2(currentReview, quality);
      supabase.from('reviews').update({
        due_date: result.due_date,
        interval: result.interval,
        ease_factor: result.ease_factor,
        repetitions: result.repetitions,
        last_quality: result.last_quality,
        updated_at: new Date().toISOString(),
      }).eq('id', currentReview.id).then(() => {});
    }

    updateProgressStats(userId, { wordsStudied: 1 }).catch(() => {});
  }

  const finishSession = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('quiz_sessions').insert({
      user_id: userId,
      type: 'writing',
      score,
      total: sessionCards.length,
      completed_at: new Date().toISOString(),
    });
    const newStreak = await updateStreak(userId);
    setStreak(newStreak);
    await updateProgressStats(userId, {
      wordsStudied: sessionCards.length,
      quizScore: score / (sessionCards.length || 1),
      minutesStudied: Math.ceil(sessionCards.length * 0.5),
    });
    setIndex(sessionCards.length);
  }, [userId, score, sessionCards]);

  useEffect(() => {
    if (index >= sessionCards.length && sessionCards.length > 0 && submitted) {
      finishSession();
    }
  }, [index, sessionCards, submitted, finishSession]);

  function nextCard() {
    setInput('');
    setSubmitted(false);
    setIsCorrect(false);
    setIndex((prev) => prev + 1);
  }

  function restart() {
    setSessionKey((k) => k + 1);
    setIndex(0);
    setInput('');
    setSubmitted(false);
    setIsCorrect(false);
    setScore(0);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !submitted && input.trim()) {
      handleSubmit();
    } else if (e.key === 'Enter' && submitted && index + 1 < sessionCards.length) {
      nextCard();
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
        <div style={{ width: 28, height: 28, border: `2px solid ${C.gold}`, borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
      </div>
    );
  }

  if (cards.length < 4) {
    return (
      <div style={{ textAlign: "center", paddingTop: 80, color: C.textMuted }}>
        <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Necesitas al menos 4 tarjetas</p>
        <p style={{ fontSize: 13 }}>Agrega mas flashcards para practicar escritura</p>
      </div>
    );
  }

  if (index >= sessionCards.length) {
    const finalScore = score;
    const total = sessionCards.length;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 40 }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: C.gold }}>{finalScore}/{total}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
          {finalScore === total ? 'Perfecto!' : finalScore >= total * 0.7 ? 'Buen trabajo!' : 'Segui practicando'}
        </div>
        {streak > 0 && (
          <div style={{ fontSize: 13, color: C.textMuted }}>Racha actual: {streak} dias</div>
        )}
        <button onClick={restart} style={{
          background: C.gold, color: "#111318", border: "none",
          borderRadius: 10, padding: "10px 24px", fontSize: 14,
          fontWeight: 700, cursor: "pointer",
        }}>Otra ronda</button>
      </div>
    );
  }

  const card = current;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: C.textMuted }}>
          Palabra {index + 1} de {sessionCards.length}
        </div>
        <Tag color={C.purple} bg={C.purpleBg}>Escritura</Tag>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        {sessionCards.map((_, i) => (
          <div key={i} style={{
            width: 26, height: 3, borderRadius: 2,
            background: i === index ? C.gold : C.border,
          }} />
        ))}
      </div>

      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: "28px 20px",
        textAlign: "center",
      }}>
        {card.image_url && (
          <img src={card.image_url} alt="" style={{
            width: 100, height: 100, borderRadius: 12, objectFit: "cover",
            margin: "0 auto 12px", boxShadow: `0 0 0 1px ${C.border}`,
          }} />
        )}
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 8 }}>
          Escribe la palabra en ingles
        </div>
        <div style={{
          fontSize: 22, fontWeight: 700, color: C.gold, marginBottom: 4,
        }}>
          {card.translation}
        </div>
        {card.definition && (
          <div style={{ fontSize: 13, color: C.textMuted }}>{card.definition}</div>
        )}
        {card.ipa && (
          <div style={{
            fontFamily: "'SF Mono', 'Fira Code', monospace",
            fontSize: 12, color: C.textMuted, marginTop: 6,
          }}>
            {card.ipa}
          </div>
        )}
        {submitted && (
          <div style={{ marginTop: 8 }}>
            <button onClick={() => speak(card.word)} style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: C.tealBg, color: C.teal,
              border: `1px solid ${C.teal}33`, borderRadius: 8,
              padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
              </svg>
              Escuchar
            </button>
          </div>
        )}
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitted}
        placeholder="Escribe la palabra..."
        autoFocus
        style={{
          background: C.surface,
          border: submitted
            ? `1px solid ${isCorrect ? `${C.green}66` : `${C.red}66`}`
            : `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "14px 16px",
          fontSize: 16,
          color: submitted
            ? (isCorrect ? C.green : C.red)
            : C.textPrimary,
          outline: "none",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      />

      {submitted && (
        <div style={{ animation: "slideUp 0.2s ease-out" }}>
          <div style={{
            background: isCorrect ? C.greenBg : C.goldBg,
            border: `1px solid ${isCorrect ? `${C.green}33` : C.goldBorder}`,
            borderRadius: 12, padding: 14, fontSize: 13,
            color: C.textSecondary, lineHeight: 1.6,
          }}>
            {isCorrect ? (
              <><span style={{ color: C.green, fontWeight: 600 }}>Correcto!</span> "{card.word}"</>
            ) : (
              <>
                <span style={{ color: C.gold, fontWeight: 600 }}>La respuesta es "{card.word}"</span>
                {input.trim() && (
                  <span style={{ color: C.red, display: "block", marginTop: 2 }}>
                    Escribiste "{input.trim()}"
                  </span>
                )}
              </>
            )}
            {card.example && (
              <div style={{ marginTop: 6, fontStyle: "italic" }}>"{card.example}"</div>
            )}
          </div>
          <button onClick={nextCard} style={{
            background: C.gold, color: "#111318", border: "none",
            borderRadius: 10, padding: "10px 16px", fontSize: 13,
            fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 10,
          }}>
            {index + 1 >= sessionCards.length ? 'Ver resultado' : 'Siguiente'}
          </button>
        </div>
      )}

      {!submitted && (
        <button onClick={handleSubmit} disabled={!input.trim()} style={{
          background: input.trim() ? C.gold : C.border,
          color: input.trim() ? "#111318" : C.textMuted,
          border: "none", borderRadius: 12, padding: "14px 16px",
          fontSize: 14, fontWeight: 700, cursor: input.trim() ? "pointer" : "default",
        }}>
          Verificar
        </button>
      )}
    </div>
  );
}
