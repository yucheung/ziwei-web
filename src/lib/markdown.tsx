/**
 * 極輕量 Markdown Renderer，專為 LLM 命理解讀輸出設計。
 *
 * 只支援 LLM 常用的子集（標題 #~###、粗體 **、斜體 *、行內程式碼 `、
 * 有序/無序清單、引言 >），不引入 react-markdown / remark 等重型依賴。
 * 純文字內容一律原樣輸出（不做任何 HTML 解析），因此不會有 XSS 風險。
 */
import React from 'react';

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(
        <strong key={key++} className="font-bold text-amber-800 dark:text-amber-200">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-amber-700 dark:text-amber-300 text-[0.85em] font-mono">
          {token.slice(1, -1)}
        </code>
      );
    } else {
      nodes.push(
        <em key={key++} className="italic text-slate-600 dark:text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

interface ListBuffer {
  ordered: boolean;
  items: string[];
}

/**
 * 將 LLM 輸出的 Markdown 純文字轉換為可讀的 React 節點樹。
 */
export function renderMarkdown(markdown: string): React.ReactNode {
  const lines = (markdown || '').replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: ListBuffer | null = null;
  let key = 0;

  const flushList = () => {
    if (!listBuffer) return;
    const items = listBuffer.items;
    const className = listBuffer.ordered ? 'list-decimal pl-5 space-y-1' : 'list-disc pl-5 space-y-1';
    blocks.push(
      listBuffer.ordered ? (
        <ol key={key++} className={className}>
          {items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ol>
      ) : (
        <ul key={key++} className={className}>
          {items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      )
    );
    listBuffer = null;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2]);
      if (level === 1) {
        blocks.push(<h1 key={key++} className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-4 mb-2 first:mt-0">{content}</h1>);
      } else if (level === 2) {
        blocks.push(<h2 key={key++} className="text-base font-bold text-amber-700 dark:text-amber-300 mt-3 mb-1.5 first:mt-0">{content}</h2>);
      } else {
        blocks.push(<h3 key={key++} className="text-sm font-bold text-amber-800 dark:text-amber-200 mt-2 mb-1 first:mt-0">{content}</h3>);
      }
      continue;
    }

    const quoteMatch = /^>\s?(.*)$/.exec(trimmed);
    if (quoteMatch) {
      flushList();
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-amber-500/40 pl-3 text-slate-400 italic">
          {renderInline(quoteMatch[1])}
        </blockquote>
      );
      continue;
    }

    const orderedMatch = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    const unorderedMatch = /^[-*+]\s+(.*)$/.exec(trimmed);

    if (orderedMatch || unorderedMatch) {
      const ordered = !!orderedMatch;
      const content = (orderedMatch ?? unorderedMatch)![1];
      if (!listBuffer || listBuffer.ordered !== ordered) {
        flushList();
        listBuffer = { ordered, items: [] };
      }
      listBuffer.items.push(content);
      continue;
    }

    flushList();
    blocks.push(
      <p key={key++} className="leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();
  return <>{blocks}</>;
}
