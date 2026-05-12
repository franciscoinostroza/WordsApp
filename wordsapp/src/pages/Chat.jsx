import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useDecks } from '../hooks/useDecks';
import { sendMessage } from '../lib/claude';
import { renderMarkdown } from '../lib/markdown';
import { C } from '../lib/tokens';

const SCENARIOS = [
  { label: 'Restaurante', prompt: 'Simulemos que estoy en un restaurante. Vos sos la mesera y yo el cliente. Empeza vos.' },
  { label: 'Hotel', prompt: 'Simulemos que estoy haciendo check-in en un hotel. Vos sos la recepcionista y yo el huesped. Empeza vos.' },
  { label: 'Entrevista', prompt: 'Simulemos una entrevista de trabajo en ingles. Vos sos la entrevistadora. Haceme preguntas tipicas.' },
  { label: 'Gramatica', prompt: 'Dame una mini-leccion de gramatica. Elegi un tema util para nivel B1-B2 y explicalo con ejemplos y comparacion con espanol.' },
  { label: 'Vocabulario', prompt: 'Dame 5 palabras nuevas de nivel B1-B2 con su definicion en ingles, traduccion al espanol, IPA, y un ejemplo de uso. Elegi un tema util.' },
  { label: 'Corregir', prompt: 'Voy a escribir una frase en ingles. Corregila y explicame los errores.' },
];

function extractFlashcards(text) {
  const match = text.match(/<flashcards>([\s\S]*?)<\/flashcards>/);
  if (!match) return { cleanedText: text, cards: null };
  const raw = match[1].trim();
  let cleanedText = text.replace(/<flashcards>[\s\S]*?<\/flashcards>/, '').trim();
  try {
    const cards = JSON.parse(raw);
    return { cleanedText, cards: Array.isArray(cards) ? cards : null };
  } catch {
    const cleaned = raw
      .replace(/```json\s*|```\s*/g, '')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/,\s*,/g, ',');
    try {
      const cards = JSON.parse(cleaned);
      return { cleanedText, cards: Array.isArray(cards) ? cards : null };
    } catch {
      return { cleanedText, cards: null };
    }
  }
}

function getFlashcardImage(word) {
  return `https://picsum.photos/seed/${encodeURIComponent(word.replace(/\s+/g, '-'))}/400/300`;
}

export default function Chat() {
  const { userId } = useAuth();
  const { decks, createDeck } = useDecks();
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [flashcardData, setFlashcardData] = useState(null);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [useExistingDeck, setUseExistingDeck] = useState(true);
  const [importing, setImporting] = useState(false);
  const [lastFlashMsgId, setLastFlashMsgId] = useState(null);
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
          const lastMsg = data[data.length - 1];
          if (lastMsg.role === 'assistant') {
            const { cards } = extractFlashcards(lastMsg.content);
            if (cards) {
              setFlashcardData(cards);
              setLastFlashMsgId(lastMsg.id);
            }
          }
        } else {
          const welcomeMsg = {
            id: 'welcome',
            role: 'assistant',
            content: 'Hola! Soy Lex, tu tutora de ingles. En que te ayudo hoy?\n\nPodes:\n- **Preguntarme** sobre una palabra o frase\n- **Pedir una mini-leccion** de gramatica\n- **Practicar** con un role-play (restaurante, hotel, entrevista...)\n- **Pedir que cree flashcards** sobre un tema\n- **Escribir en ingles** y te corrijo\n\nUsa los botones de abajo para empezar rapido!',
            created_at: new Date().toISOString(),
          };
          setMsgs([welcomeMsg]);
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
    setFlashcardData(null);
    setLastFlashMsgId(null);
    setMsgs([{
      id: 'welcome',
      role: 'assistant',
      content: 'Hola! Soy Lex, tu tutora de ingles. En que te ayudo hoy?\n\nPodes:\n- **Preguntarme** sobre una palabra o frase\n- **Pedir una mini-leccion** de gramatica\n- **Practicar** con un role-play (restaurante, hotel, entrevista...)\n- **Pedir que cree flashcards** sobre un tema\n- **Escribir en ingles** y te corrijo\n\nUsa los botones de abajo para empezar rapido!',
      created_at: new Date().toISOString(),
    }]);
    setClearing(false);
  }

  async function handleSend(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setFlashcardData(null);
    setLastFlashMsgId(null);
    await sendChatMessage(text);
  }

  async function sendScenario(prompt) {
    if (loading) return;
    setShowScenarios(false);
    setFlashcardData(null);
    setLastFlashMsgId(null);
    await sendChatMessage(prompt);
  }

  async function sendChatMessage(text) {
    const userMsg = { role: 'user', content: text, user_id: userId, created_at: new Date().toISOString() };
    setMsgs((prev) => [...prev, { ...userMsg, id: Date.now().toString() }]);
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
      const aiMsgId = Date.now().toString() + '-ai';
      setMsgs((prev) => [...prev, { ...aiMsg, id: aiMsgId }]);

      const { cards } = extractFlashcards(reply);
      if (cards) {
        setFlashcardData(cards);
        setLastFlashMsgId(aiMsgId);
      }
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

  async function sendStoryRequest() {
    if (loading) return;
    setShowScenarios(false);
    setFlashcardData(null);
    setLastFlashMsgId(null);
    setLoading(true);

    try {
      const { data: cards } = await supabase
        .from('flashcards')
        .select('word, translation')
        .eq('user_id', userId)
        .limit(40);

      const shuffled = [...(cards || [])].sort(() => Math.random() - 0.5).slice(0, 20);
      if (shuffled.length < 4) {
        setMsgs(prev => [...prev, {
          id: Date.now().toString() + '-err',
          role: 'assistant',
          content: 'Necesitas al menos 4 flashcards para crear una historia. Agrega mas tarjetas primero.',
          user_id: userId,
          created_at: new Date().toISOString(),
        }]);
        setLoading(false);
        return;
      }

      const wordList = shuffled.map(c => `${c.word} (${c.translation})`).join(', ');
      const prompt = `Crea una HISTORIA CON MI VOCABULARIO usando estas palabras: ${wordList}`;

      const userMsg = { role: 'user', content: prompt, user_id: userId, created_at: new Date().toISOString() };
      setMsgs((prev) => [...prev, { ...userMsg, id: Date.now().toString() }]);
      await supabase.from('chat_messages').insert(userMsg);

      const reply = await sendMessage([{ role: 'user', text: prompt }]);

      const aiMsg = {
        role: 'assistant',
        content: reply,
        user_id: userId,
        created_at: new Date().toISOString(),
      };
      await supabase.from('chat_messages').insert(aiMsg);
      setMsgs((prev) => [...prev, { ...aiMsg, id: Date.now().toString() + '-ai' }]);
    } catch (err) {
      setMsgs((prev) => [...prev, {
        id: Date.now().toString() + '-err',
        role: 'assistant',
        content: `Error: ${err.message}`,
        user_id: userId,
        created_at: new Date().toISOString(),
      }]);
    }

    setLoading(false);
  }

  async function importFlashcards() {
    if (importing || !flashcardData) return;

    let deckId = selectedDeckId;
    let deckNameForMsg = '';

    if (!useExistingDeck) {
      const name = newDeckName.trim();
      if (!name) return;
      const deck = await createDeck(name, 'Mazo creado desde Lex', '#6366f1');
      deckId = deck.id;
      deckNameForMsg = name;
    } else {
      if (!deckId) return;
      const deck = decks.find(d => d.id === deckId);
      deckNameForMsg = deck?.name || 'mazo';
    }

    setImporting(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const cards = flashcardData.map(c => ({
        word: c.word,
        translation: c.translation,
        definition: c.definition || '',
        example: c.example || '',
        ipa: c.ipa || '',
        part_of_speech: c.part_of_speech || '',
        image_url: getFlashcardImage(c.word),
        deck_id: deckId,
        user_id: userId,
      }));

      const { data: inserted, error: fcError } = await supabase
        .from('flashcards')
        .insert(cards)
        .select('id');

      if (fcError) throw fcError;

      const reviews = (inserted || []).map(c => ({
        flashcard_id: c.id,
        user_id: userId,
        due_date: today,
        interval: 0,
        ease_factor: 2.5,
        repetitions: 0,
      }));

      await supabase.from('reviews').insert(reviews);

      const confirmContent = `${cards.length} flashcards agregadas a "${deckNameForMsg}"`;
      const confirmMsg = {
        role: 'assistant',
        content: confirmContent,
        user_id: userId,
        created_at: new Date().toISOString(),
      };
      await supabase.from('chat_messages').insert(confirmMsg);
      setMsgs(prev => [...prev, { ...confirmMsg, id: Date.now().toString() + '-confirm' }]);

      setFlashcardData(null);
      setLastFlashMsgId(null);
      setSelectedDeckId('');
      setNewDeckName('');
      setUseExistingDeck(true);
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: `Error al importar: ${err.message}`,
        user_id: userId,
        created_at: new Date().toISOString(),
      };
      setMsgs(prev => [...prev, { ...errMsg, id: Date.now().toString() + '-err' }]);
    }

    setImporting(false);
  }

  function renderFlashcardPreview(cards) {
    return (
      <div style={{ marginTop: 12, marginBottom: 8 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: 8, marginBottom: 12,
        }}>
          {cards.map((c, i) => (
            <div key={i} style={{
              background: C.bg, borderRadius: 10, overflow: 'hidden',
              border: `1px solid ${C.border}`,
            }}>
              <img
                src={getFlashcardImage(c.word)}
                alt=""
                style={{ width: '100%', height: 80, objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>
                  {c.word}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>
                  {c.translation}
                </div>
                {c.ipa && (
                  <div style={{
                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                    fontSize: 10, color: C.textMuted, marginTop: 3,
                  }}>{c.ipa}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Deck selector */}
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 10 }}>
            Agregar {cards.length} flashcards a:
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
            cursor: 'pointer', fontSize: 13, color: C.textPrimary,
          }}>
            <input
              type="radio"
              checked={useExistingDeck}
              onChange={() => setUseExistingDeck(true)}
              style={{ accentColor: C.gold }}
            />
            Mazo existente
          </label>

          {useExistingDeck && (
            <select
              value={selectedDeckId}
              onChange={e => setSelectedDeckId(e.target.value)}
              style={{
                width: '100%', background: C.bg, color: C.textPrimary,
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '8px 12px', fontSize: 13, marginBottom: 10,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              <option value="">-- Elegi un mazo --</option>
              {decks.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}

          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
            cursor: 'pointer', fontSize: 13, color: C.textPrimary,
          }}>
            <input
              type="radio"
              checked={!useExistingDeck}
              onChange={() => setUseExistingDeck(false)}
              style={{ accentColor: C.gold }}
            />
            Crear mazo nuevo
          </label>

          {!useExistingDeck && (
            <input
              type="text"
              value={newDeckName}
              onChange={e => setNewDeckName(e.target.value)}
              placeholder="Nombre del nuevo mazo"
              style={{
                width: '100%', background: C.bg, color: C.textPrimary,
                border: `1px solid ${C.border}`, borderRadius: 8,
                padding: '8px 12px', fontSize: 13, marginBottom: 10,
                fontFamily: "'Inter', system-ui, sans-serif", outline: 'none',
              }}
            />
          )}

          <button
            onClick={importFlashcards}
            disabled={importing || (useExistingDeck && !selectedDeckId) || (!useExistingDeck && !newDeckName.trim())}
            style={{
              width: '100%', background: importing || (useExistingDeck && !selectedDeckId) || (!useExistingDeck && !newDeckName.trim())
                ? C.border : C.gold,
              color: importing || (useExistingDeck && !selectedDeckId) || (!useExistingDeck && !newDeckName.trim())
                ? C.textMuted : '#111318',
              border: 'none', borderRadius: 10, padding: '10px 16px',
              fontSize: 13, fontWeight: 700, cursor: importing ? 'default' : 'pointer',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            {importing ? 'Agregando...' : `Agregar ${cards.length} flashcards`}
          </button>
        </div>
      </div>
    );
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
          const isConfirm = m.content && m.content.includes('flashcards agregadas');
          const { cleanedText } = m.id === lastFlashMsgId && flashcardData
            ? extractFlashcards(m.content)
            : { cleanedText: m.content };

          return (
            <div key={m.id} style={{
              display: "flex",
              justifyContent: isUser ? "flex-end" : "flex-start",
              alignItems: "flex-end", gap: 7,
            }}>
              {!isUser && (
                <div style={{
                  width: 26, height: 26, background: isConfirm ? C.green : C.gold,
                  borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  color: "#111318", fontSize: 11, fontWeight: 800,
                  flexShrink: 0,
                }}>{isConfirm ? '✓' : 'L'}</div>
              )}
              <div style={{ maxWidth: "78%", flexShrink: 1 }}>
                <div style={{
                  background: isUser ? C.gold : isConfirm ? C.greenBg : C.surface,
                  color: isUser ? "#111318" : C.textPrimary,
                  border: isUser ? "none" : isConfirm ? `1px solid ${C.green}33` : `1px solid ${C.border}`,
                  borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "10px 14px",
                  fontSize: 13,
                  lineHeight: 1.55,
                  fontWeight: isUser ? 500 : 400,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {isUser || isConfirm ? m.content : <span dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanedText) }} />}
                </div>
              </div>
            </div>
          );
        })}
        {flashcardData && !importing && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
            <div style={{ width: 26, flexShrink: 0 }} />
            <div style={{ maxWidth: "78%", flexShrink: 1 }}>
              {renderFlashcardPreview(flashcardData)}
            </div>
          </div>
        )}
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

      {/* Scenario buttons */}
      <div style={{ paddingBottom: 8 }}>
        <button
          onClick={() => setShowScenarios(!showScenarios)}
          style={{
            background: "none", border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "5px 12px", fontSize: 11,
            fontWeight: 600, color: C.textMuted, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          {showScenarios ? 'Ocultar opciones' : 'Actividades'}
        </button>
        {showScenarios && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            <button
              onClick={() => sendScenario('Crea 8 flashcards sobre un tema util para nivel B1-B2.')}
              disabled={loading}
              style={{
                background: C.goldBg, border: `1px solid ${C.gold}33`,
                borderRadius: 16, padding: "6px 14px", fontSize: 12,
                fontWeight: 600, color: C.gold,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.4 : 1,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              + Flashcard
            </button>
            <button
              onClick={sendStoryRequest}
              disabled={loading}
              style={{
                background: C.tealBg, border: `1px solid ${C.teal}33`,
                borderRadius: 16, padding: "6px 14px", fontSize: 12,
                fontWeight: 600, color: C.teal,
                cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.4 : 1,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}
            >
              Historia
            </button>
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                onClick={() => sendScenario(s.prompt)}
                disabled={loading}
                style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 16, padding: "6px 14px", fontSize: 12,
                  fontWeight: 500, color: C.textPrimary,
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.4 : 1,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        display: "flex", gap: 8,
        paddingTop: 10, borderTop: `1px solid ${C.border}`,
        flexShrink: 0, position: "sticky", bottom: 0,
        background: C.bg, paddingBottom: 4,
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
