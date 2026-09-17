const ABBREVIATIONS = new Set(['e.g', 'i.e', 'vs', 'etc', 'inc', 'u.s', 'mr', 'mrs', 'ms', 'dr', 'st', 'approx']);

// Splits UI copy into sentences so each sentence can start on its own line.
// Splits after . ! ? followed by whitespace, and after CJK sentence punctuation.
// Decimal numbers ($3.99), URLs, and common abbreviations stay intact.
export function splitSentences(text: string): string[] {
  const source = text.trim();
  if (!source) return [];
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    let end = -1;
    let resume = -1;
    if ('。！？'.includes(char)) {
      let j = i + 1;
      while (j < source.length && /\s/.test(source[j])) j += 1;
      if (j < source.length) { end = i + 1; resume = j; }
    } else if ('.!?'.includes(char) && next !== undefined && /\s/.test(next)) {
      const word = source.slice(start, i).split(/\s+/).pop()?.toLowerCase() ?? '';
      if (char !== '.' || !ABBREVIATIONS.has(word)) {
        let j = i + 1;
        while (j < source.length && /\s/.test(source[j])) j += 1;
        if (j < source.length) { end = i + 1; resume = j; }
      }
    }
    if (end > 0) {
      sentences.push(source.slice(start, end).trim());
      start = resume;
      i = resume - 1;
    }
  }
  const tail = source.slice(start).trim();
  if (tail) sentences.push(tail);
  return sentences;
}
