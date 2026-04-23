/**
 * Lightweight HTML+JS code block styled like a VS Code dark editor.
 * No external dependencies — syntax tokens are produced via regex.
 */

interface Props {
  code: string;
  language?: 'html' | 'js';
}

// VS Code dark+ palette
const TOKEN = {
  bg: '#1e1e1e',
  lineNoBg: '#1e1e1e',
  lineNoFg: '#858585',
  plain: '#d4d4d4',
  tag: '#569cd6',
  attr: '#9cdcfe',
  string: '#ce9178',
  keyword: '#c586c0',
  number: '#b5cea8',
  comment: '#6a9955',
  punctuation: '#d4d4d4',
  property: '#9cdcfe',
  variable: '#4fc1ff',
};

// Token types produced by the tokenizer
type Token = { kind: keyof typeof TOKEN; value: string };

// Very small HTML+JS tokenizer — enough for typical embed snippets.
// We walk char-by-char, switching modes for script tags, strings, comments.
function tokenize(source: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const n = source.length;
  let inScript = false;

  const push = (kind: Token['kind'], value: string) => {
    if (!value) return;
    out.push({ kind, value });
  };

  while (i < n) {
    const ch = source[i];

    // HTML tag start
    if (!inScript && ch === '<' && /[/a-zA-Z]/.test(source[i + 1] || '')) {
      // grab "<" or "</"
      let j = i + 1;
      while (j < n && source[j] !== '>') j++;
      const tagChunk = source.substring(i, j + 1);
      // Color the tag brackets + name, then attributes within
      const m = tagChunk.match(/^(<\/?)([a-zA-Z0-9-]+)(.*?)(\/?>)$/s);
      if (m) {
        push('tag', m[1] + m[2]);
        // Split m[3] into attrs
        const attrPart = m[3];
        const attrRe = /([a-zA-Z-]+)(=)("[^"]*"|'[^']*')|(\s+)/g;
        let am: RegExpExecArray | null;
        let lastEnd = 0;
        while ((am = attrRe.exec(attrPart)) !== null) {
          if (am.index > lastEnd) push('plain', attrPart.substring(lastEnd, am.index));
          if (am[1]) {
            // space will have been captured; output explicit space
            push('plain', ' ');
            push('attr', am[1]);
            push('punctuation', am[2]);
            push('string', am[3]);
          } else if (am[4]) {
            push('plain', am[4]);
          }
          lastEnd = attrRe.lastIndex;
        }
        if (lastEnd < attrPart.length) push('plain', attrPart.substring(lastEnd));
        push('tag', m[4]);
        if (m[2].toLowerCase() === 'script' && m[1] === '<') inScript = true;
        if (m[2].toLowerCase() === 'script' && m[1] === '</') inScript = false;
      } else {
        push('plain', tagChunk);
      }
      i = j + 1;
      continue;
    }

    // JS strings
    if (inScript && (ch === '"' || ch === "'" || ch === '`')) {
      const q = ch;
      let j = i + 1;
      while (j < n && source[j] !== q) {
        if (source[j] === '\\') j++;
        j++;
      }
      push('string', source.substring(i, j + 1));
      i = j + 1;
      continue;
    }

    // JS comment (//...)
    if (inScript && ch === '/' && source[i + 1] === '/') {
      let j = i;
      while (j < n && source[j] !== '\n') j++;
      push('comment', source.substring(i, j));
      i = j;
      continue;
    }

    // JS identifiers / keywords / numbers
    if (inScript && /[a-zA-Z_$]/.test(ch)) {
      let j = i;
      while (j < n && /[a-zA-Z0-9_$]/.test(source[j])) j++;
      const word = source.substring(i, j);
      if (/^(const|let|var|new|function|return|if|else|for|while|true|false|null|undefined|await|async|import|export|default)$/.test(word)) {
        push('keyword', word);
      } else if (/^(window|document|console)$/.test(word)) {
        push('variable', word);
      } else {
        push('plain', word);
      }
      i = j;
      continue;
    }
    if (inScript && /[0-9]/.test(ch)) {
      let j = i;
      while (j < n && /[0-9.]/.test(source[j])) j++;
      push('number', source.substring(i, j));
      i = j;
      continue;
    }

    // Fallback
    push('plain', ch);
    i++;
  }
  return out;
}

export default function CodeBlock({ code }: Props) {
  const lines = code.split('\n');
  const lineWidth = String(lines.length).length;

  return (
    <div
      className="prw-codeblock"
      style={{
        background: TOKEN.bg,
        color: TOKEN.plain,
        fontFamily: '"JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace',
        fontSize: 12.5,
        lineHeight: '1.7',
        borderRadius: '0 0 12px 12px',
        overflow: 'auto',
        maxHeight: 460,
        paddingTop: 14,
        paddingBottom: 14,
      }}
    >
      <style>{`
        .prw-codeblock::-webkit-scrollbar { width: 12px; height: 12px; }
        .prw-codeblock::-webkit-scrollbar-track { background: #1e1e1e; }
        .prw-codeblock::-webkit-scrollbar-thumb { background: #424242; border: 3px solid #1e1e1e; border-radius: 6px; }
        .prw-codeblock::-webkit-scrollbar-thumb:hover { background: #4f4f4f; }
        .prw-codeblock::-webkit-scrollbar-corner { background: #1e1e1e; }
        .prw-codeblock { scrollbar-color: #424242 #1e1e1e; scrollbar-width: thin; }
      `}</style>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {lines.map((line, idx) => (
            <tr key={idx}>
              <td
                style={{
                  userSelect: 'none',
                  textAlign: 'right',
                  padding: '0 12px 0 16px',
                  color: TOKEN.lineNoFg,
                  background: TOKEN.lineNoBg,
                  width: `${lineWidth + 2}ch`,
                  minWidth: `${lineWidth + 2}ch`,
                  verticalAlign: 'top',
                }}
              >
                {idx + 1}
              </td>
              <td style={{ padding: '0 16px 0 4px', whiteSpace: 'pre', verticalAlign: 'top' }}>
                {renderTokens(tokenize(line))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderTokens(tokens: Token[]) {
  return tokens.map((t, i) => (
    <span key={i} style={{ color: TOKEN[t.kind] }}>{t.value}</span>
  ));
}
