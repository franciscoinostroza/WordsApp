export function renderMarkdown(text) {
  if (!text) return '';

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html
    .replace(/^[\*\-]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>');

  return html;
}
