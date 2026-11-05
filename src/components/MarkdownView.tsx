import React from 'react';

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export const MarkdownView: React.FC<MarkdownViewProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split into paragraphs / lines
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const rows = tableRows.slice(1).filter((r) => !r.every((c) => c.match(/^[:\-\s]+$/)));

      elements.push(
        <div key={key} className="overflow-x-auto my-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-200">
              <tr>
                {header.map((col, idx) => (
                  <th key={idx} className="p-2.5 border-b border-slate-200 dark:border-slate-700">
                    {col.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2.5 text-slate-600 dark:text-slate-300">
                      {formatInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  const formatInline = (text: string): React.ReactNode => {
    // Process bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-extrabold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="italic text-slate-800 dark:text-slate-200">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono text-xs"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for markdown table row
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|');
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable(`table_${i}`);
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-bold text-slate-900 dark:text-white mt-5 mb-2 flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-emerald-500 inline-block" />
          <span>{line.replace('### ', '')}</span>
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg font-extrabold text-slate-900 dark:text-white mt-6 mb-3 flex items-center gap-2 border-b pb-1 border-slate-200 dark:border-slate-800">
          <span>{line.replace('## ', '')}</span>
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-xl font-black text-slate-900 dark:text-white mt-6 mb-3">
          {line.replace('# ', '')}
        </h1>
      );
    }
    // Blockquotes / Callouts
    else if (line.startsWith('>')) {
      elements.push(
        <div
          key={i}
          className="my-3 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 text-amber-900 dark:text-amber-200 text-sm leading-relaxed"
        >
          {formatInline(line.replace(/^>\s*/, ''))}
        </div>
      );
    }
    // Bullet lists
    else if (line.trim().match(/^[-*•]\s+/)) {
      elements.push(
        <li key={i} className="ml-5 list-disc text-slate-700 dark:text-slate-300 text-sm leading-relaxed my-1">
          {formatInline(line.trim().replace(/^[-*•]\s+/, ''))}
        </li>
      );
    }
    // Numbered lists
    else if (line.trim().match(/^\d+\.\s+/)) {
      elements.push(
        <li key={i} className="ml-5 list-decimal text-slate-700 dark:text-slate-300 text-sm leading-relaxed my-1 font-medium">
          {formatInline(line.trim().replace(/^\d+\.\s+/, ''))}
        </li>
      );
    }
    // Empty line
    else if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
    }
    // Standard paragraph
    else {
      elements.push(
        <p key={i} className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed my-2">
          {formatInline(line)}
        </p>
      );
    }
  }

  if (inTable) {
    flushTable('table_end');
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
};
