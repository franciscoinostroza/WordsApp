import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDeck } from '../hooks/useDecks';
import { useFlashcards } from '../hooks/useFlashcards';
import { C, Tag } from '../lib/tokens';

const PARTS = ['noun', 'verb', 'adjective', 'adverb', 'phrase', 'other'];
const COLORS = ['#c8a96e', '#7eb8a4', '#9b8ec4', '#c0675a', '#6aab8e', '#5b8bd4', '#d4885c'];

const inputStyle = {
  background: C.surface, color: C.textPrimary,
  border: `1px solid ${C.border}`, borderRadius: 10,
  padding: "10px 14px", fontSize: 13,
  fontFamily: "'Inter', system-ui, sans-serif",
  outline: "none", width: "100%",
};

const labelStyle = {
  fontSize: 11, fontWeight: 600, color: C.textMuted,
  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
};

export default function DeckDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { deck, loading: dl, updateDeck } = useDeck(id);
  const { flashcards, loading: fl, createFlashcard, updateFlashcard, deleteFlashcard } = useFlashcards(id);

  // Create flashcard modal
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [definition, setDefinition] = useState('');
  const [example, setExample] = useState('');
  const [ipa, setIpa] = useState('');
  const [pos, setPos] = useState('');
  const [sub, setSub] = useState(false);
  const overlayRef = useRef(null);

  // Edit deck modal
  const [editDeckOpen, setEditDeckOpen] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [deckDesc, setDeckDesc] = useState('');
  const [deckColor, setDeckColor] = useState(COLORS[0]);
  const [editDeckSub, setEditDeckSub] = useState(false);

  // Edit flashcard modal
  const [editCard, setEditCard] = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editTranslation, setEditTranslation] = useState('');
  const [editDefinition, setEditDefinition] = useState('');
  const [editExample, setEditExample] = useState('');
  const [editIpa, setEditIpa] = useState('');
  const [editPos, setEditPos] = useState('');
  const [editSub, setEditSub] = useState(false);

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

  function openEditDeck() {
    setDeckName(deck.name);
    setDeckDesc(deck.description || '');
    setDeckColor(deck.color || COLORS[0]);
    setEditDeckOpen(true);
  }

  async function handleEditDeck(e) {
    e.preventDefault();
    if (!deckName.trim()) return;
    setEditDeckSub(true);
    await updateDeck({
      name: deckName.trim(),
      description: deckDesc.trim() || null,
      color: deckColor,
    });
    setEditDeckSub(false);
    setEditDeckOpen(false);
  }

  function openEditCard(card) {
    setEditCard(card);
    setEditWord(card.word);
    setEditTranslation(card.translation);
    setEditDefinition(card.definition || '');
    setEditExample(card.example || '');
    setEditIpa(card.ipa || '');
    setEditPos(card.part_of_speech || '');
    setEditSub(false);
  }

  async function handleEditCard(e) {
    e.preventDefault();
    if (!editWord.trim() || !editTranslation.trim()) return;
    setEditSub(true);
    await updateFlashcard(editCard.id, {
      word: editWord.trim(),
      translation: editTranslation.trim(),
      definition: editDefinition.trim() || null,
      example: editExample.trim() || null,
      ipa: editIpa.trim() || null,
      part_of_speech: editPos || null,
    });
    setEditSub(false);
    setEditCard(null);
  }

  useEffect(() => {
    function esc(e) { if (e.key === 'Escape') { setOpen(false); setEditDeckOpen(false); setEditCard(null); } }
    const hasModal = open || editDeckOpen || editCard;
    if (hasModal) { window.addEventListener('keydown', esc); }
    return () => window.removeEventListener('keydown', esc);
  }, [open, editDeckOpen, editCard]);

  useEffect(() => {
    document.body.style.overflow = (open || editDeckOpen || editCard) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open, editDeckOpen, editCard]);

  const loading = dl || fl;

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="animate-pulse">
        <div style={{ height: 16, background: C.border, borderRadius: 4, width: 96 }} />
        <div style={{ height: 28, background: C.border, borderRadius: 4, width: 192 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 64, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div style={{ textAlign: "center", paddingTop: 64 }}>
        <p style={{ color: C.textMuted, marginBottom: 8 }}>Mazo no encontrado</p>
        <Link to="/decks" style={{ color: C.gold, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Volver a mazos</Link>
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
        <div style={{ width: 32, height: 32, borderRadius: 8, background: deck.color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: C.textPrimary }}>{deck.name}</h2>
          {deck.description && <p style={{ fontSize: 12, color: C.textMuted }}>{deck.description}</p>}
        </div>
        <button onClick={openEditDeck} style={{
          background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "6px 10px", cursor: "pointer", color: C.textMuted,
          display: "flex", alignItems: "center", gap: 4,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
          Editar
        </button>
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

      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {flashcards.length} tarjetas
      </div>

      {flashcards.length === 0 ? (
        <p style={{ fontSize: 13, color: C.textMuted, padding: "24px 0", textAlign: "center" }}>Aun no hay tarjetas</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {flashcards.map(c => (
            <div key={c.id} style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, color: C.textPrimary }}>{c.word}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{c.translation}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {c.part_of_speech && <Tag>{c.part_of_speech}</Tag>}
                  <button onClick={() => openEditCard(c)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: 4, color: C.textMuted, borderRadius: 4,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                    </svg>
                  </button>
                  <button onClick={async () => { await deleteFlashcard(c.id); }} style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: 4, color: C.red, borderRadius: 4,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
              {c.ipa && (
                <div style={{ fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: 12, color: C.textMuted, marginTop: 8 }}>
                  /{c.ipa}/
                </div>
              )}
              {c.definition && (
                <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 6, lineHeight: 1.4 }}>
                  {c.definition}
                </div>
              )}
              {c.example && (
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, fontStyle: "italic" }}>
                  "{c.example}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create flashcard modal */}
      {open && (
        <Modal onClose={() => setOpen(false)} overlayRef={overlayRef}>
          <ModalHeader title="Nueva tarjeta" onClose={() => setOpen(false)} />
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><div style={labelStyle}>Palabra *</div><input value={word} onChange={e => setWord(e.target.value)} autoFocus style={inputStyle} /></div>
              <div><div style={labelStyle}>Traduccion *</div><input value={translation} onChange={e => setTranslation(e.target.value)} style={inputStyle} /></div>
            </div>
            <div><div style={labelStyle}>Definicion</div><input value={definition} onChange={e => setDefinition(e.target.value)} style={inputStyle} /></div>
            <div><div style={labelStyle}>Ejemplo</div><input value={example} onChange={e => setExample(e.target.value)} style={inputStyle} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><div style={labelStyle}>Fonetica</div><input value={ipa} onChange={e => setIpa(e.target.value)} placeholder="/weord/" style={inputStyle} /></div>
              <div>
                <div style={labelStyle}>Tipo</div>
                <select value={pos} onChange={e => setPos(e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                  <option value="">Seleccionar</option>
                  {PARTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <SubmitButton loading={sub} disabled={!word.trim() || !translation.trim()} label="Guardar" />
          </form>
        </Modal>
      )}

      {/* Edit deck modal */}
      {editDeckOpen && (
        <Modal onClose={() => setEditDeckOpen(false)} overlayRef={overlayRef}>
          <ModalHeader title="Editar mazo" onClose={() => setEditDeckOpen(false)} />
          <form onSubmit={handleEditDeck} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><div style={labelStyle}>Nombre</div><input value={deckName} onChange={e => setDeckName(e.target.value)} autoFocus style={inputStyle} /></div>
            <div><div style={labelStyle}>Descripcion</div><input value={deckDesc} onChange={e => setDeckDesc(e.target.value)} style={inputStyle} /></div>
            <div>
              <div style={labelStyle}>Color</div>
              <div style={{ display: "flex", gap: 8 }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setDeckColor(c)} style={{
                    width: 32, height: 32, borderRadius: 8, background: c,
                    cursor: "pointer", border: "none",
                    outline: deckColor === c ? `2px solid ${C.gold}` : "none",
                    outlineOffset: 2, transform: deckColor === c ? "scale(1.1)" : "scale(1)",
                    transition: "all 0.15s",
                  }} />
                ))}
              </div>
            </div>
            <SubmitButton loading={editDeckSub} disabled={!deckName.trim()} label="Guardar cambios" />
          </form>
        </Modal>
      )}

      {/* Edit flashcard modal */}
      {editCard && (
        <Modal onClose={() => setEditCard(null)} overlayRef={overlayRef}>
          <ModalHeader title="Editar tarjeta" onClose={() => setEditCard(null)} />
          <form onSubmit={handleEditCard} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><div style={labelStyle}>Palabra *</div><input value={editWord} onChange={e => setEditWord(e.target.value)} autoFocus style={inputStyle} /></div>
              <div><div style={labelStyle}>Traduccion *</div><input value={editTranslation} onChange={e => setEditTranslation(e.target.value)} style={inputStyle} /></div>
            </div>
            <div><div style={labelStyle}>Definicion</div><input value={editDefinition} onChange={e => setEditDefinition(e.target.value)} style={inputStyle} /></div>
            <div><div style={labelStyle}>Ejemplo</div><input value={editExample} onChange={e => setEditExample(e.target.value)} style={inputStyle} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><div style={labelStyle}>Fonetica</div><input value={editIpa} onChange={e => setEditIpa(e.target.value)} style={inputStyle} /></div>
              <div>
                <div style={labelStyle}>Tipo</div>
                <select value={editPos} onChange={e => setEditPos(e.target.value)} style={{ ...inputStyle, appearance: "auto" }}>
                  <option value="">Seleccionar</option>
                  {PARTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <SubmitButton loading={editSub} disabled={!editWord.trim() || !editTranslation.trim()} label="Guardar cambios" />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, overlayRef }) {
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0"
      style={{ zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 16, animation: "fadeIn 0.15s ease-out" }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
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
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{ fontWeight: 600, fontSize: 16, color: C.textPrimary }}>{title}</h2>
      <button onClick={onClose} style={{ color: C.textMuted, fontSize: 20, lineHeight: 1, cursor: "pointer", background: "none", border: "none", padding: 4, borderRadius: 4 }}>&times;</button>
    </div>
  );
}

function SubmitButton({ loading, disabled, label }) {
  return (
    <button type="submit" disabled={disabled || loading} style={{
      background: C.gold, color: "#111318", borderRadius: 8,
      padding: "10px 0", fontSize: 13, fontWeight: 700,
      cursor: (disabled || loading) ? "default" : "pointer",
      border: "none", opacity: (disabled || loading) ? 0.5 : 1,
      marginTop: 4, width: "100%",
    }}>
      {loading ? 'Guardando...' : label}
    </button>
  );
}
