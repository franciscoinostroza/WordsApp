import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { C } from '../lib/tokens';
import { speak } from '../lib/speech';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos dias";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function getDailyGoals() {
  const stored = localStorage.getItem('wordsapp_daily_goals');
  if (stored) {
    try { return JSON.parse(stored); } catch { /* */ }
  }
  return { reviewTarget: 10, newWordsTarget: 5 };
}

function saveDailyGoals(goals) {
  localStorage.setItem('wordsapp_daily_goals', JSON.stringify(goals));
}

function getLastWordOfDay() {
  const stored = localStorage.getItem('wordsapp_wod_date');
  return stored || '';
}

function setLastWordOfDay(word) {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem('wordsapp_wod_date', today);
  localStorage.setItem('wordsapp_wod_word', word);
}

function getLastWordOfDayWord() {
  return localStorage.getItem('wordsapp_wod_word') || '';
}

export default function Home() {
  const { userId, user } = useAuth();
  const [stats, setStats] = useState({ dueCards: 0, totalCards: 0, totalDecks: 0, streak: 0 });
  const [decks, setDecks] = useState([]);
  const [deckCardCounts, setDeckCardCounts] = useState({});
  const [wordOfDay, setWordOfDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [todayProgress, setTodayProgress] = useState({ wordsStudied: 0, wordsLearned: 0 });
  const [goals] = useState(getDailyGoals);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const today = new Date().toISOString().split('T')[0];
      const wodDate = getLastWordOfDay();
      const wodWord = getLastWordOfDayWord();

      const [r, c, d, u, dl, fc, wd, progressRes] = await Promise.all([
        supabase.from('reviews').select('id', { count: 'exact' }).eq('user_id', userId).lte('due_date', today),
        supabase.from('flashcards').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('decks').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('users').select('streak_days').eq('id', userId).single(),
        supabase.from('decks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        supabase.from('flashcards').select('id, deck_id').eq('user_id', userId),
        wodDate !== today || !wodWord
          ? supabase.from('flashcards').select('*').eq('user_id', userId).not('word', 'eq', wodWord).limit(20)
          : supabase.from('flashcards').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
        supabase.from('progress_stats').select('*').eq('user_id', userId).eq('date', today).single(),
      ]);

      const counts = {};
      (fc.data || []).forEach(card => {
        counts[card.deck_id] = (counts[card.deck_id] || 0) + 1;
      });
      setDeckCardCounts(counts);

      setStats({ dueCards: r.count || 0, totalCards: c.count || 0, totalDecks: d.count || 0, streak: u.data?.streak_days || 0 });
      setDecks(dl.data || []);

      let selectedWord = null;
      if (wd.data?.length) {
        if (wodDate !== today) {
          const randomIndex = Math.floor(Math.random() * wd.data.length);
          selectedWord = wd.data[randomIndex];
          setLastWordOfDay(selectedWord.word);
        } else {
          selectedWord = wd.data[0];
        }
      }
      setWordOfDay(selectedWord);

      setTodayProgress({
        wordsStudied: progressRes.data?.words_studied || 0,
        wordsLearned: progressRes.data?.words_learned || 0,
      });

      setLoading(false);
    }
    load();
  }, [userId]);

  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    if (!userId) return;
    supabase.from('users').select('name').eq('id', userId).single().then(({ data }) => {
      setProfileName(data?.name || '');
    });
  }, [userId]);

  const name = profileName || user?.user_metadata?.name || user?.email?.split('@')[0] || '';

  const cardStyle = {
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 16, padding: 20, position: "relative", overflow: "hidden",
  };

  const reviewProgress = Math.min(todayProgress.wordsStudied, goals.reviewTarget);
  const reviewPct = goals.reviewTarget > 0 ? Math.round((reviewProgress / goals.reviewTarget) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{
          fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: C.textPrimary,
        }}>
          {getGreeting()}, {name || 'Usuario'}
        </div>
        {stats.dueCards > 0 && (
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
            Tienes{' '}
            <span style={{ color: C.gold, fontWeight: 600 }}>{stats.dueCards} tarjetas</span>
            {' '}para repasar hoy
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{
          position: "absolute", top: 0, left: 0, width: "100%",
          height: 3, background: `linear-gradient(90deg, ${C.gold}, ${C.gold}88)`,
        }} />
        <div style={{
          fontSize: 10, fontWeight: 700, color: C.gold,
          letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10,
        }}>Palabra del dia</div>
        <div style={{
          fontSize: 28, fontWeight: 800, letterSpacing: -0.6, color: C.textPrimary,
        }}>
          {wordOfDay ? wordOfDay.word : 'Serendipity'}
        </div>
        {wordOfDay?.image_url && (
          <img src={wordOfDay.image_url} alt="" style={{
            width: 100, height: 100, borderRadius: 10, objectFit: "cover",
            marginTop: 10, boxShadow: `0 0 0 1px ${C.border}`,
          }} />
        )}
        <div style={{
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          fontSize: 12, color: C.textMuted, marginTop: 6,
        }}>
          {wordOfDay
            ? `${wordOfDay.ipa || '/ˈweord/'} · ${wordOfDay.part_of_speech || 'noun'}`
            : "/seren'dipiti/ · noun"}
        </div>
        <div style={{
          fontSize: 13, color: C.textMuted, marginTop: 10, lineHeight: 1.6,
        }}>
          {wordOfDay?.definition || 'El hallazgo afortunado de algo bueno sin buscarlo.'}
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          <button style={{
            background: C.gold, color: "#111318", border: "none",
            borderRadius: 8, padding: "6px 14px", fontSize: 12,
            fontWeight: 700, cursor: "pointer",
          }}>
            + Agregar
          </button>
          <button onClick={() => wordOfDay && speak(wordOfDay.word)} style={{
            background: "transparent", color: C.textMuted,
            border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "6px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}>
            Escuchar
          </button>
        </div>
      </div>

      <div style={{
        background: C.surface, borderRadius: 16, padding: 16,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Meta diaria
          </div>
          <div style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>
            {reviewProgress}/{goals.reviewTarget} repasos
          </div>
        </div>
        <div style={{
          height: 6, background: C.bg, borderRadius: 3, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 3,
            background: `linear-gradient(90deg, ${C.gold}, ${C.gold}cc)`,
            width: `${Math.min(reviewPct, 100)}%`,
            transition: "width 0.5s ease",
          }} />
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8 }}>
          {reviewPct >= 100
            ? 'Meta diaria completada!'
            : reviewPct > 0
              ? `Te faltan ${goals.reviewTarget - reviewProgress} repasos`
              : 'Hoy no has repasado nada todavia'}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <QuickCard
          label="Repasar" sub={`${stats.dueCards} pendientes`}
          to="/review" color={C.gold} bg={C.goldBg} borderColor={C.goldBorder}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          }
        />
        <QuickCard
          label="Mazos" sub={loading ? '...' : `${stats.totalDecks} mazos · ${stats.totalCards} tarjetas`}
          to="/decks" color={C.teal} bg={C.tealBg} borderColor={C.tealBorder}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="1.5">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
              <rect x="8" y="2" width="8" height="4" rx="1"/>
            </svg>
          }
        />
        <QuickCard
          label="Escribir" sub="Produccion escrita"
          to="/write" color={C.purple} bg={C.purpleBg} borderColor={`${C.purple}33`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="1.5">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          }
        />
        <QuickCard
          label="Escuchar" sub="Comprension auditiva"
          to="/listen" color={C.teal} bg={C.tealBg} borderColor={C.tealBorder}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="1.5">
              <path d="M2 10v4M6 7v10M10 4v16M14 7v10M18 10v4"/>
            </svg>
          }
        />
        <QuickCard
          label="Cloze" sub="Rellenar espacios"
          to="/cloze" color={C.purple} bg={C.purpleBg} borderColor={`${C.purple}33`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="12" y2="13"/>
            </svg>
          }
        />
        <QuickCard
          label="Ordenar" sub="Formar oraciones"
          to="/scramble" color={C.green} bg={C.greenBg} borderColor={`${C.green}33`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.5">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          }
        />
        <QuickCard
          label="Tarjetas" sub={loading ? '...' : `${stats.totalCards} total`}
          to="/decks" color={C.purple} bg={C.purpleBg} borderColor={`${C.purple}33`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.purple} strokeWidth="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <line x1="8" y1="2" x2="8" y2="4"/><line x1="16" y1="2" x2="16" y2="4"/>
            </svg>
          }
        />
        <QuickCard
          label="Progreso" sub={`${stats.streak}d de racha`}
          to="/progress" color={C.green} bg={C.greenBg} borderColor={`${C.green}33`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="1.5">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
          }
        />
      </div>

      <div style={{
        background: C.surface, borderRadius: 16, padding: 16,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Mis mazos
          </div>
          <Link to="/decks" style={{ fontSize: 11, color: C.gold, fontWeight: 600, textDecoration: "none" }}>
            Ver todos
          </Link>
        </div>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
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
          <p style={{ fontSize: 13, color: C.textMuted, padding: "16px 0", textAlign: "center" }}>
            No hay mazos todavia
          </p>
        ) : (
          <div>
            {decks.map((d, i) => (
              <Link key={d.id} to={`/decks/${d.id}`} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0", textDecoration: "none",
                borderBottom: i < decks.length - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 3, height: 28, borderRadius: 2,
                    background: d.color || C.gold,
                  }} />
                  <span style={{ fontSize: 13, color: C.textPrimary }}>{d.name}</span>
                </div>
                <span style={{
                  fontSize: 11, color: C.textMuted, background: C.bg,
                  border: `1px solid ${C.border}`, borderRadius: 20,
                  padding: "2px 10px",
                }}>
                  {deckCardCounts[d.id] ?? '-'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickCard({ label, sub, to, color, bg, borderColor, icon }) {
  return (
    <Link to={to} style={{
      display: "block", borderRadius: 16, padding: 14,
      border: `1px solid ${borderColor}`, background: bg,
      textDecoration: "none",
    }}>
      <div style={{ marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: 13, color }}>{label}</div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sub}</div>
    </Link>
  );
}
