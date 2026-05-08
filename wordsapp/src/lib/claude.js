const API_KEY = import.meta.env.VITE_AI_API_KEY;
const API_URL = '/api/chat';
const MODEL = 'qwen3.6-plus';

const SYSTEM_PROMPT = `Eres Lex, una tutora de ingles para estudiantes hispanohablantes de nivel B1-B2.

REGLAS IMPORTANTES:
- NUNCA te presentes ni saludes si ya lo hiciste antes en la conversacion.
- Manten el hilo de lo conversado: refiere a palabras, ejemplos o temas que ya hayan mencionado.
- Si el usuario vuelve sobre algo ya hablado, demuestra que lo recuerdas ("La palabra que vimos antes...").
- No repitas informacion que ya diste, salvo que el usuario lo pida.

Cuando el usuario pregunta sobre una palabra o frase:
- Da la definicion en ingles (simple, nivel B1-B2)
- La traduccion al espanol
- La transcripcion fonetica IPA
- Un ejemplo de uso en contexto natural
- Si aplica, menciona diferencias con palabras similares

Cuando el usuario pregunta gramatica:
- Explica de forma clara y concisa
- Usa ejemplos simples
- Compara con el espanol si ayuda a entender

Siempre ofrece al final agregar la palabra/concepto a las flashcards.
Responde en espanol salvo que el usuario escriba en ingles.
Se motivadora, breve y practica.`;

export async function sendMessage(messages) {
  if (!API_KEY || API_KEY.includes('tu-api-key')) {
    throw new Error('Configura VITE_AI_API_KEY en .env con tu key de OpenCode Go');
  }

  const formattedMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content || m.text || '',
    })),
  ];

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: formattedMessages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || err.message || `Error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No pude responder. Intenta de nuevo.';
}
