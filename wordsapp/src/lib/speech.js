export function speak(text, lang = 'en-US') {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const enVoice = voices.find((v) => v.lang.startsWith('en'));
    if (enVoice) utterance.voice = enVoice;
  }

  window.speechSynthesis.speak(utterance);
}
