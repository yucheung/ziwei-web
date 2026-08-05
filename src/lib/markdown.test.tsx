import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

function renderMd(text: string) {
  return render(<>{renderMarkdown(text)}</>);
}

describe('markdown.tsx - lightweight LLM output renderer', () => {
  it('renders ## / ### headings as heading elements', () => {
    renderMd('## 命格總評\n### 性格優勢');
    expect(screen.getByRole('heading', { level: 2, name: '命格總評' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '性格優勢' })).toBeInTheDocument();
  });

  it('renders **bold** text inside a <strong> element', () => {
    renderMd('這是**重點文字**的說明');
    const strong = screen.getByText('重點文字');
    expect(strong.tagName).toBe('STRONG');
  });

  it('renders *italic* text inside an <em> element', () => {
    renderMd('這是*次要重點*的說明');
    const em = screen.getByText('次要重點');
    expect(em.tagName).toBe('EM');
  });

  it('renders inline `code` spans', () => {
    renderMd('請注意 `化忌` 的影響');
    const code = screen.getByText('化忌');
    expect(code.tagName).toBe('CODE');
  });

  it('groups consecutive "- " lines into a single unordered list', () => {
    const { container } = renderMd('- 第一點\n- 第二點\n- 第三點');
    const uls = container.querySelectorAll('ul');
    expect(uls.length).toBe(1);
    expect(uls[0].querySelectorAll('li').length).toBe(3);
    expect(screen.getByText('第一點')).toBeInTheDocument();
  });

  it('groups consecutive "1. " lines into a single ordered list', () => {
    const { container } = renderMd('1. 命格大局\n2. 事業財富\n3. 感情人際');
    const ols = container.querySelectorAll('ol');
    expect(ols.length).toBe(1);
    expect(ols[0].querySelectorAll('li').length).toBe(3);
  });

  it('renders plain paragraphs for lines with no markdown syntax', () => {
    const { container } = renderMd('這是一段普通的解讀文字。');
    expect(container.querySelector('p')).toHaveTextContent('這是一段普通的解讀文字。');
  });

  it('renders blockquote for "> " prefixed lines', () => {
    const { container } = renderMd('> 這是引言');
    const quote = container.querySelector('blockquote');
    expect(quote).toHaveTextContent('這是引言');
  });

  it('does not interpret raw HTML/script tags as markup (no XSS)', () => {
    const { container } = renderMd('<script>alert(1)</script> 一般文字');
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('handles mixed headings, lists and paragraphs together', () => {
    const md = [
      '## 命格總覽',
      '這是命格說明。',
      '',
      '### 優勢',
      '- 聰明',
      '- 積極',
      '',
      '一般結語。',
    ].join('\n');

    const { container } = renderMd(md);
    expect(screen.getByRole('heading', { level: 2, name: '命格總覽' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '優勢' })).toBeInTheDocument();
    expect(container.querySelectorAll('ul li').length).toBe(2);
    expect(screen.getByText('一般結語。')).toBeInTheDocument();
  });
});
