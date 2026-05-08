const API_KEY = import.meta.env.VITE_AI_API_KEY;
const API_URL = '/api/chat';
const MODEL = 'ling-2.6-flash';

const SYSTEM_PROMPT = `Eres una tutora de ingles amigable y experta, especializada en estudiantes de nivel B1-B2 de habla hispana. 
Tu nombre es Lex.

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
      max_tokens: 512,
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
