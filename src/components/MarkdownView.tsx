import React from 'react';

interface MarkdownViewProps {
  content: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content }) => {
  if (!content) return null;

  // Split into paragraphs / lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentListItems: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const flushList = (key: string) => {
    if (currentListItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="my-3 space-y-1.5 pl-2">
          {currentListItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-slate-700 leading-relaxed text-sm md:text-base">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>{formatInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentListItems = [];
    }
  };

  const flushCode = (key: string) => {
    if (codeBuffer.length > 0) {
      elements.push(
        <pre
          key={`code-${key}`}
          className="my-3 overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs md:text-sm text-emerald-300 shadow-inner"
        >
          <code>{codeBuffer.join('\n')}</code>
        </pre>
      );
      codeBuffer = [];
    }
  };

  const formatInline = (text: string): React.ReactNode => {
    // Replace bold **text**
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-xs font-medium text-indigo-700 border border-indigo-100"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCode(`block-${index}`);
        inCodeBlock = false;
      } else {
        flushList(`before-code-${index}`);
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Check headings
    if (trimmed.startsWith('### ')) {
      flushList(`h3-${index}`);
      const title = trimmed.replace('### ', '');
      elements.push(
        <div key={`h3-${index}`} className="mt-6 mb-3 first:mt-2">
          <div className="flex items-center gap-2 border-b border-indigo-100/80 pb-2">
            <span className="h-2 w-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
            <h3 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">
              {title}
            </h3>
          </div>
        </div>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList(`h2-${index}`);
      elements.push(
        <h2
          key={`h2-${index}`}
          className="mt-7 mb-3 text-xl md:text-2xl font-bold tracking-tight text-slate-900 border-b border-slate-200 pb-2"
        >
          {trimmed.replace('## ', '')}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushList(`h1-${index}`);
      elements.push(
        <h1
          key={`h1-${index}`}
          className="mt-6 mb-4 text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900"
        >
          {trimmed.replace('# ', '')}
        </h1>
      );
      return;
    }

    // Unordered lists
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      currentListItems.push(trimmed.slice(2));
      return;
    }

    // Ordered list (e.g. "1. ")
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) {
      flushList(`ordered-before-${index}`);
      elements.push(
        <div key={`ord-${index}`} className="my-2 flex items-start gap-3 text-slate-700 text-sm md:text-base">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
            {orderedMatch[1]}
          </span>
          <div className="pt-0.5 leading-relaxed">{formatInline(orderedMatch[2])}</div>
        </div>
      );
      return;
    }

    // Callout / blockquote
    if (trimmed.startsWith('> ')) {
      flushList(`quote-${index}`);
      elements.push(
        <div
          key={`quote-${index}`}
          className="my-3 rounded-xl border-l-4 border-indigo-500 bg-indigo-50/70 p-3.5 text-sm md:text-base text-indigo-950 font-medium shadow-xs"
        >
          {formatInline(trimmed.replace('> ', ''))}
        </div>
      );
      return;
    }

    // Empty lines
    if (!trimmed) {
      flushList(`empty-${index}`);
      return;
    }

    // Normal paragraph
    flushList(`p-${index}`);
    elements.push(
      <p key={`p-${index}`} className="my-2.5 text-sm md:text-base leading-relaxed text-slate-700">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList('final');
  flushCode('final');

  return <div className="space-y-1 text-slate-800">{elements}</div>;
};
