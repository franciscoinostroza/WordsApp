import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { C } from '../lib/tokens';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) await signUp(email, password, name.trim() || email.split('@')[0]);
      else await signIn(email, password);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  const inputStyle = {
    background: C.surface,
    color: C.textPrimary,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    fontFamily: "'Inter', system-ui, sans-serif",
    outline: "none",
    width: "100%",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "0 20px", background: C.bg,
    }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: C.gold,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <span style={{ color: "#111318", fontWeight: 800, fontSize: 18 }}>W</span>
          </div>
          <h1 style={{
            fontSize: 20, fontWeight: 700, letterSpacing: -0.4, color: C.textPrimary,
          }}>WordsApp</h1>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>
            {isSignUp ? 'Crea tu cuenta para empezar' : 'Inicia sesion para continuar'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.textMuted,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
            }}>Email</div>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required autoFocus style={inputStyle}
            />
          </div>
          {isSignUp ? (
            <div>
              <div style={{
                fontSize: 11, fontWeight: 700, color: C.textMuted,
                textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
              }}>Nombre</div>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Tu nombre" style={inputStyle}
              />
            </div>
          ) : null}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.textMuted,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
            }}>Contrasena</div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Minimo 6 caracteres" required minLength={6} style={inputStyle}
            />
          </div>

          {error ? (
            <div style={{
              fontSize: 13, padding: "10px 12px", borderRadius: 8,
              background: error.includes('confirmar') || error.includes('email') ? C.goldBg : C.redBg,
              color: error.includes('confirmar') || error.includes('email') ? C.gold : C.red,
              border: `1px solid ${error.includes('confirmar') || error.includes('email') ? C.goldBorder : C.red}33`,
            }}>
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={loading} style={{
            background: C.gold, color: "#111318", borderRadius: 8,
            padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer",
            opacity: loading ? 0.5 : 1, border: "none", marginTop: 4,
          }} className="active:scale-[0.98]">
            {loading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesion'}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13, color: C.textMuted, marginTop: 20 }}>
          {isSignUp ? 'Ya tienes cuenta?' : 'No tienes cuenta?'}{' '}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }} style={{
            color: C.gold, fontWeight: 700, cursor: "pointer",
            background: "none", border: "none", fontSize: 13, textDecoration: "underline",
          }}>
            {isSignUp ? 'Inicia sesion' : 'Registrate'}
          </button>
        </p>
      </div>
    </div>
  );
}
