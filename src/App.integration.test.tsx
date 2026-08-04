import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
// Mock LLM module for ReadingPanel sub-component
vi.mock('./lib/llm', async () => {
  const actual = await vi.importActual<typeof import('./lib/llm')>('./lib/llm');
  return {
    ...actual,
    loadLLMConfig: vi.fn().mockReturnValue({
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: 'mock-key',
      model: 'gemini-2.5-flash',
      temperature: 0.7,
    }),
    callLLMStream: vi.fn(),
  };
});

describe('App Integration Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial App state with header, form inputs, and default astrolabe chart', () => {
    render(<App />);

    // Header title and badges
    expect(screen.getByText('紫微斗數 Web 專業版')).toBeInTheDocument();
    expect(screen.getByText('iztro 引擎')).toBeInTheDocument();

    // Form inputs section
    expect(screen.getByText('生辰資料輸入')).toBeInTheDocument();

    // Default active tab is Twelve Palaces Chart Grid
    expect(screen.getByRole('button', { name: /十二宮星盤總覽/i })).toHaveClass('text-amber-300');
  });

  it('navigates between single mode tabs (ChartGrid -> FortunePanel -> ReadingPanel)', async () => {
    render(<App />);

    // Click '大限流年運限' Tab
    const fortunesTab = screen.getByRole('button', { name: /大限流年運限/i });
    fireEvent.click(fortunesTab);

    // Wait for lazy-loaded FortunePanel
    expect(await screen.findByText(/運限大盤分析/i)).toBeInTheDocument();

    // Click 'AI 智能命盤解讀' Tab
    const readingTab = screen.getByRole('button', { name: /AI 智能命盤解讀/i });
    fireEvent.click(readingTab);

    // Wait for lazy-loaded ReadingPanel
    expect(await screen.findByText('AI 多模型命盤結構化解讀')).toBeInTheDocument();

    // Switch back to '十二宮星盤總覽' Tab
    const chartTab = screen.getByRole('button', { name: /十二宮星盤總覽/i });
    fireEvent.click(chartTab);

    expect(screen.getByRole('button', { name: /十二宮星盤總覽/i })).toHaveClass('text-amber-300');
  });

  it('switches view mode between 個人命盤 and 雙人合盤', async () => {
    render(<App />);

    // Click '雙人合盤'
    const matchModeBtn = screen.getByRole('button', { name: '雙人合盤' });
    fireEvent.click(matchModeBtn);

    // Wait for lazy-loaded MatchPanel
    expect(await screen.findByText(/雙人紫微命盤合盤/i)).toBeInTheDocument();

    // Click '個人命盤' to return
    const singleModeBtn = screen.getByRole('button', { name: '個人命盤' });
    fireEvent.click(singleModeBtn);

    expect(screen.getByText('生辰資料輸入')).toBeInTheDocument();
  });

  it('updates astrolabe chart when form is submitted with new birth info', () => {
    const { container } = render(<App />);

    // Switch to Lunar Calendar
    const lunarBtn = screen.getByRole('button', { name: /陰曆 \(農曆\)/i });
    fireEvent.click(lunarBtn);

    // Change date
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeInTheDocument();
    fireEvent.change(dateInput, { target: { value: '1995-10-15' } });

    // Change time index to 午時 (11:00 - 13:00, value "6")
    const timeSelect = container.querySelector('select') as HTMLSelectElement;
    expect(timeSelect).toBeInTheDocument();
    fireEvent.change(timeSelect, { target: { value: '6' } });

    // Change gender to female
    const femaleBtn = screen.getByRole('button', { name: /坤造 \(女\)/i });
    fireEvent.click(femaleBtn);

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /生成紫微命盤/i });
    fireEvent.click(submitBtn);

    // Verify chart updated with 坤造
    expect(screen.getByText(/坤造/)).toBeInTheDocument();
  });
});
