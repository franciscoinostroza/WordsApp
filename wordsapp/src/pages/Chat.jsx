import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { sendMessage } from '../lib/claude';
import { renderMarkdown } from '../lib/markdown';
import { C } from '../lib/tokens';

export default function Chat() {
  const { userId } = useAuth();
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMsgs(data);
        } else {
          setMsgs([{
            id: 'welcome',
            role: 'assistant',
            content: 'Hola! Soy Lex, tu tutora de ingles. En que te ayudo hoy?',
            created_at: new Date().toISOString(),
          }]);
        }
      });
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  async function clearChat() {
    if (clearing) return;
    setClearing(true);
    await supabase.from('chat_messages').delete().eq('user_id', userId);
    setMsgs([{
      id: 'welcome',
      role: 'assistant',
      content: 'Hola! Soy Lex, tu tutora de ingles. En que te ayudo hoy?',
      created_at: new Date().toISOString(),
    }]);
    setClearing(false);
  }

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text, user_id: userId, created_at: new Date().toISOString() };
    setMsgs((prev) => [...prev, { ...userMsg, id: Date.now().toString() }]);
    setInput('');
    setLoading(true);

    try {
      await supabase.from('chat_messages').insert(userMsg);

      const recentMsgs = [...msgs.filter((m) => m.id !== 'welcome'), userMsg]
        .slice(-10)
        .map((m) => ({ role: m.role, text: m.content }));

      const reply = await sendMessage(
        recentMsgs.length > 0 ? recentMsgs : [{ role: 'user', text: 'Hola' }]
      );

      const aiMsg = {
        role: 'assistant',
        content: reply,
        user_id: userId,
        created_at: new Date().toISOString(),
      };

      await supabase.from('chat_messages').insert(aiMsg);
      setMsgs((prev) => [...prev, { ...aiMsg, id: Date.now().toString() + '-ai' }]);
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: `Error: ${err.message}`,
        user_id: userId,
        created_at: new Date().toISOString(),
      };
      setMsgs((prev) => [...prev, { ...errMsg, id: Date.now().toString() + '-err' }]);
    }

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Lex header */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "10px 14px", marginBottom: 14,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, background: C.gold,
          borderRadius: "50%", display: "flex",
          alignItems: "center", justifyContent: "center",
          color: "#111318", fontSize: 13, fontWeight: 800,
        }}>L</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Lex</div>
          <div style={{
            fontSize: 11, color: C.teal, display: "flex",
            alignItems: "center", gap: 4,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%", background: C.teal,
            }} />
            En linea
          </div>
        </div>
        <button onClick={clearChat} disabled={clearing} style={{
          background: "none", border: "none", cursor: clearing ? "default" : "pointer",
          color: C.textMuted, padding: 4, borderRadius: 6,
          opacity: clearing ? 0.4 : 1,
        }} title="Borrar conversacion">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", display: "flex",
        flexDirection: "column", gap: 10, paddingBottom: 12,
      }}>
        {msgs.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} style={{
              display: "flex",
              justifyContent: isUser ? "flex-end" : "flex-start",
              alignItems: "flex-end", gap: 7,
            }}>
              {!isUser && (
                <div style={{
                  width: 26, height: 26, background: C.gold,
                  borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: "#111318", fontSize: 11, fontWeight: 800,
                  flexShrink: 0,
                }}>L</div>
              )}
              <div style={{
                maxWidth: "78%",
                background: isUser ? C.gold : C.surface,
                color: isUser ? "#111318" : C.textPrimary,
                border: isUser ? "none" : `1px solid ${C.border}`,
                borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "10px 14px",
                fontSize: 13,
                lineHeight: 1.55,
                fontWeight: isUser ? 500 : 400,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>
                {isUser ? m.content : <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />}
              </div>
            </div>
          );
        })}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
            <div style={{
              width: 26, height: 26, background: C.gold,
              borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#111318", fontSize: 11, fontWeight: 800,
              flexShrink: 0,
            }}>L</div>
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: "16px 16px 16px 4px",
              padding: "12px 18px",
            }}>
              <div style={{
                display: "flex", gap: 4,
              }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: C.gold, animation: `fadeIn 0.6s ${i * 0.15}s infinite alternate`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        display: "flex", gap: 8,
        paddingTop: 10, borderTop: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribi tu pregunta..."
          style={{
            flex: 1, background: C.surface,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 24, padding: "10px 16px",
            color: C.textPrimary, fontSize: 13, outline: "none",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: C.gold, border: "none",
            cursor: loading ? "default" : "pointer",
            color: "#111318", fontSize: 16, fontWeight: 800,
            display: "flex", alignItems: "center",
            justifyContent: "center",
            opacity: loading || !input.trim() ? 0.4 : 1,
            flexShrink: 0,
          }}
        >
          <span style={{ marginLeft: 1, marginBottom: 1 }}>&rarr;</span>
        </button>
      </form>
    </div>
  );
}
