import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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

export default function Listen() {
  const { userId } = useAuth();
  const [cards, setCards] = useState([]);
  const [dueReviews, setDueReviews] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sessionKey, setSessionKey] = useState(0);
  const [streak, setStreak] = useState(0);
  const hasAutoPlayed = useRef(false);

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

  const options = useMemo(() => {
    if (!current) return [];
    const allWords = cards.map((c) => c.word);
    const wrongOpts = shuffle(allWords.filter((w) => w !== current.word)).slice(0, 3);
    return shuffle([...wrongOpts, current.word]);
  }, [current, cards]);

  useEffect(() => {
    if (current && !hasAutoPlayed.current) {
      setTimeout(() => speak(current.word), 400);
      hasAutoPlayed.current = true;
    }
  }, [current, index]);

  useEffect(() => {
    hasAutoPlayed.current = false;
  }, [index]);

  function handleSelect(opt) {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
    const correct = opt === current.word;
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
    await supabase.from('quiz_sessions').insert({
      user_id: userId,
      type: 'listening',
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
    if (index >= sessionCards.length && sessionCards.length > 0 && answered) {
      finishSession();
    }
  }, [index, sessionCards, answered, finishSession]);

  function nextCard() {
    if (index + 1 >= sessionCards.length) {
      setIndex(index + 1);
    } else {
      setIndex((prev) => prev + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  function restart() {
    setSessionKey((k) => k + 1);
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
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
        <p style={{ fontSize: 13 }}>Agrega mas flashcards para practicar listening</p>
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
          {finalScore === total ? 'Oido absoluto!' : finalScore >= total * 0.7 ? 'Buen oido!' : 'Segui practicando'}
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
  const isCorrect = selected === card?.word;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: C.textMuted }}>
          Audio {index + 1} de {sessionCards.length}
        </div>
        <Tag color={C.teal} bg={C.tealBg}>Listening</Tag>
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
        borderRadius: 20, padding: "36px 20px",
        textAlign: "center", display: "flex", flexDirection: "column",
        alignItems: "center", gap: 12,
      }}>
        <button onClick={() => speak(card.word)} style={{
          width: 64, height: 64, borderRadius: "50%",
          background: C.tealBg, border: `2px solid ${C.teal}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="1.5">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
          </svg>
        </button>
        <div style={{ fontSize: 13, color: C.textMuted }}>
          Escucha y selecciona la palabra correcta
        </div>
        {answered && (
          <button onClick={() => speak(card.word)} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "transparent", color: C.teal,
            border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>
            Reproducir de nuevo
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map((opt) => {
          let bg = C.surface;
          let border = C.border;
          let color = C.textPrimary;

          if (answered) {
            if (opt === card.word) { bg = C.greenBg; border = `${C.green}66`; color = C.green; }
            else if (opt === selected) { bg = C.redBg; border = `${C.red}66`; color = C.red; }
            else { color = C.textMuted; }
          } else if (selected === opt) {
            border = C.gold;
          }

          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={answered}
              style={{
                background: bg, border: `1px solid ${border}`,
                borderRadius: 12, padding: "13px 16px",
                cursor: answered ? "default" : "pointer",
                fontSize: 14, fontWeight: 500, color,
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
                transition: "all 0.15s",
                textAlign: "left",
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              {opt}
              {answered && opt === card.word && <span>&#10003;</span>}
              {answered && opt === selected && opt !== card.word && <span>&#10007;</span>}
            </button>
          );
        })}
      </div>

      {answered && (
        <div style={{ animation: "slideUp 0.2s ease-out" }}>
          <div style={{
            background: isCorrect ? C.greenBg : C.goldBg,
            border: `1px solid ${isCorrect ? `${C.green}33` : C.goldBorder}`,
            borderRadius: 12, padding: 14, fontSize: 13,
            color: C.textSecondary, lineHeight: 1.6,
          }}>
            {isCorrect ? (
              <><span style={{ color: C.green, fontWeight: 600 }}>Correcto!</span> "{card.word}" = {card.translation}</>
            ) : (
              <><span style={{ color: C.gold, fontWeight: 600 }}>Era "{card.word}"</span> = {card.translation}</>
            )}
            {card.ipa && (
              <div style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: 12, color: C.textMuted, marginTop: 4 }}>{card.ipa}</div>
            )}
            {card.example && (
              <div style={{ marginTop: 4, fontStyle: "italic" }}>"{card.example}"</div>
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
    </div>
  );
}
