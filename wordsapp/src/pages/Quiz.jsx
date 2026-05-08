import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { C } from '../lib/tokens';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(cards) {
  if (cards.length < 2) return [];
  const shuffled = shuffle(cards).slice(0, Math.min(5, cards.length));
  const allWords = cards.map((c) => c.word);

  return shuffled.map((card) => {
    const wrongOpts = shuffle(allWords.filter((w) => w !== card.word)).slice(0, 3);
    const options = shuffle([...wrongOpts, card.word]);
    return { card, options, answer: card.word };
  });
}

export default function Quiz() {
  const { userId } = useAuth();
  const [cards, setCards] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    if (!userId) return;
    supabase.from('flashcards').select('*').eq('user_id', userId).then(({ data }) => {
      setCards(data || []);
      setLoading(false);
    });
  }, [userId]);

  const questions = useMemo(() => {
    if (cards.length < 2) return [];
    return buildQuestions(cards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, gameKey]);

  function handleSelect(opt) {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
    if (opt === questions[qIndex]?.answer) setScore((s) => s + 1);
  }

  function nextQuestion() {
    if (qIndex + 1 >= questions.length) {
      setQIndex(qIndex + 1);
      supabase.from('quiz_sessions').insert({
        user_id: userId,
        type: 'multiple_choice',
        score: score + (selected === questions[qIndex]?.answer ? 1 : 0),
        total: questions.length,
      }).then(() => {});
    } else {
      setQIndex((prev) => prev + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  function restart() {
    setGameKey((k) => k + 1);
    setQIndex(0);
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
        <p style={{ fontSize: 13, color: C.textMuted }}>Agrega mas flashcards para jugar el quiz</p>
      </div>
    );
  }

  if (qIndex >= questions.length) {
    const finalScore = score;
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, paddingTop: 40 }}>
        <div style={{ fontSize: 48, fontWeight: 800, color: C.gold }}>{finalScore}/{questions.length}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
          {finalScore === questions.length ? 'Perfecto!' : finalScore >= 3 ? 'Buen trabajo!' : 'Segui practicando'}
        </div>
        <button onClick={restart} style={{
          background: C.gold, color: "#111318", border: "none",
          borderRadius: 10, padding: "10px 24px", fontSize: 14,
          fontWeight: 700, cursor: "pointer",
        }}>Intentar de nuevo</button>
      </div>
    );
  }

  const q = questions[qIndex];
  const card = q?.card;
  const isCorrect = selected === q?.answer;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: C.textMuted }}>
          Pregunta {qIndex + 1} de {questions.length}
        </div>
        <span style={{
          background: C.purpleBg, color: C.purple,
          border: `1px solid ${C.purple}33`,
          borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600,
        }}>Multiple choice</span>
      </div>

      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "22px 20px",
        fontSize: 15, lineHeight: 2, color: C.textSecondary,
      }}>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6 }}>
          Cual es la palabra correcta para:
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary }}>
          {card?.translation}
        </div>
        {card?.definition && (
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{card.definition}</div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map((opt) => {
          let bg = C.surface;
          let border = C.border;
          let color = C.textPrimary;

          if (answered) {
            if (opt === q.answer) { bg = C.greenBg; border = `${C.green}66`; color = C.green; }
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
              {answered && opt === q.answer && <span>&#10003;</span>}
              {answered && opt === selected && opt !== q.answer && <span>&#10007;</span>}
            </button>
          );
        })}
      </div>

      {answered && (
        <div>
          <div style={{
            background: isCorrect ? C.greenBg : C.goldBg,
            border: `1px solid ${isCorrect ? `${C.green}33` : C.goldBorder}`,
            borderRadius: 12, padding: 14, fontSize: 13,
            color: C.textSecondary, lineHeight: 1.6,
          }}>
            {isCorrect ? (
              <><span style={{ color: C.green, fontWeight: 600 }}>Correcto!</span> "{card.word}" = {card.translation}</>
            ) : (
              <><span style={{ color: C.gold, fontWeight: 600 }}>La respuesta es "{q.answer}"</span> = {card.translation}</>
            )}
            {card.example && <div style={{ marginTop: 4, fontStyle: "italic" }}>"{card.example}"</div>}
          </div>
          <button onClick={nextQuestion} style={{
            background: C.gold, color: "#111318", border: "none",
            borderRadius: 10, padding: "10px 16px", fontSize: 13,
            fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 10,
          }}>
            {qIndex + 1 >= questions.length ? 'Ver resultado' : 'Siguiente'}
          </button>
        </div>
      )}
    </div>
  );
}
