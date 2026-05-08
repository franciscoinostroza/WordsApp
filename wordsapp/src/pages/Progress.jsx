import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { C } from '../lib/tokens';

export default function Progress() {
  const { userId } = useAuth();
  const [stats, setStats] = useState({
    total: 0, streak: 0, sessions: 0, avgScore: 0,
    weekData: [], dueByDay: {},
  });
  const [difficult, setDifficult] = useState([]);
  const [loading, setLoading] = useState(true);

  const days = ["L", "M", "X", "J", "V", "S", "D"];

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const now = new Date();
      const dayIdx = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayIdx + 6) % 7));
      const todayStr = now.toISOString().split('T')[0];
      const mondayStr = monday.toISOString().split('T')[0];

      const [cardsRes, userRes, quizRes, reviewsRes, dueRes, difficultRes] = await Promise.all([
        supabase.from('flashcards').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('users').select('streak_days').eq('id', userId).single(),
        supabase.from('quiz_sessions').select('score,total,completed_at').eq('user_id', userId).order('completed_at', { ascending: false }).limit(10),
        supabase.from('reviews').select('due_date,interval,repetitions,ease_factor').eq('user_id', userId).gte('due_date', mondayStr).lte('due_date', todayStr),
        supabase.from('reviews').select('due_date').eq('user_id', userId).lte('due_date', todayStr),
        supabase.from('reviews').select('*, flashcards(word)').eq('user_id', userId).lt('ease_factor', 2.0).order('ease_factor', { ascending: true }).limit(3),
      ]);

      const quizzes = quizRes.data || [];
      const avgScore = quizzes.length > 0
        ? Math.round(quizzes.reduce((a, q) => a + (q.score / q.total), 0) / quizzes.length * 100)
        : 0;

      const reviewData = reviewsRes.data || [];
      const weekCounts = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        weekCounts[d.toISOString().split('T')[0]] = 0;
      }
      reviewData.forEach((r) => {
        if (weekCounts[r.due_date] !== undefined) weekCounts[r.due_date]++;
      });

      const dueCounts = {};
      (dueRes.data || []).forEach((r) => {
        dueCounts[r.due_date] = (dueCounts[r.due_date] || 0) + 1;
      });

      setStats({
        total: cardsRes.count || 0,
        streak: userRes.data?.streak_days || 0,
        sessions: quizzes.length,
        avgScore,
        weekData: Object.entries(weekCounts).map(([, c]) => c),
        dueByDay: dueCounts,
      });
      setDifficult((difficultRes.data || []).map((r) => ({
        word: r.flashcards?.word || '?',
        id: r.id,
        ef: r.ease_factor,
      })));
      setLoading(false);
    }
    load();
  }, [userId]);

  const maxWeek = Math.max(...stats.weekData, 1);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
        <div style={{ width: 28, height: 28, border: `2px solid ${C.gold}`, borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3, color: C.textPrimary }}>
        Tu progreso
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <StatCard icon="\uD83D\uDCD6" label="Palabras" value={String(stats.total)} color={C.gold} bg={C.goldBg} border={C.goldBorder} />
        <StatCard icon="\u26A1" label="Racha" value={`${stats.streak} dias`} color={C.gold} bg={C.goldBg} border={C.goldBorder} />
        <StatCard icon="\uD83D\uDCC5" label="Quizzes" value={String(stats.sessions)} color={C.teal} bg={C.tealBg} border={C.tealBorder} />
        <StatCard icon="\uD83C\uDFAF" label="Promedio" value={`${stats.avgScore}%`} color={C.purple} bg={C.purpleBg} border={`${C.purple}33`} />
      </div>

      <div style={{
        background: C.surface, borderRadius: 14, padding: 16,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: C.textSecondary,
          letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 14,
        }}>Actividad semanal</div>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 6, height: 80,
        }}>
          {stats.weekData.map((v, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{
                width: "100%", borderRadius: 4,
                background: i === new Date().getDay() || (i === 6 && new Date().getDay() === 0) ? C.gold : C.border,
                height: Math.max(4, (v / maxWeek) * 72),
                transition: "all 0.3s",
              }} />
              <div style={{
                fontSize: 10, fontWeight: i === new Date().getDay() ? 700 : 400,
                color: i === new Date().getDay() ? C.gold : C.textMuted,
              }}>{days[i]}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: C.surface, borderRadius: 14, padding: 16,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: C.textSecondary,
          letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12,
        }}>Palabras dificiles</div>
        {difficult.length === 0 ? (
          <p style={{ fontSize: 13, color: C.textMuted, padding: "8px 0" }}>No hay palabras dificiles detectadas</p>
        ) : (
          difficult.map((w) => (
            <div key={w.id} style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "9px 0",
              borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 13, color: C.textPrimary }}>{w.word}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1, 2].map((j) => (
                  <div key={j} style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: j < Math.ceil((2.5 - w.ef) / 0.4) ? C.red : C.border,
                  }} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{
        background: C.surface, borderRadius: 14, padding: 16,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: C.textSecondary,
          letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 12,
        }}>Pendientes por dia</div>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 50 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const key = d.toISOString().split('T')[0];
            const count = stats.dueByDay[key] || 0;
            const max = Math.max(...Object.values(stats.dueByDay), 1);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: "100%", borderRadius: 3,
                  background: i === 0 ? C.gold : C.border,
                  height: Math.max(3, (count / max) * 46),
                }} />
                <div style={{
                  fontSize: 9, color: i === 0 ? C.gold : C.textMuted,
                  fontWeight: i === 0 ? 600 : 400,
                }}>
                  {i === 0 ? 'Hoy' : i === 1 ? 'M' : i === 2 ? 'M' : i === 3 ? 'J' : i === 4 ? 'V' : i === 5 ? 'S' : 'D'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg, border }) {
  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: 14, padding: 14,
    }}>
      <div style={{ fontSize: 18, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: -0.5 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{label}</div>
    </div>
  );
}
