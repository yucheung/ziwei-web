import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Suspense } from 'react';
import App from './App';
import { I18nProvider } from './i18n';
import * as exportLib from './lib/export';

// Mock locale to always return zh-TW
vi.mock('./i18n/locale', () => ({
  getInitialLocale: () => 'zh-TW' as const,
  saveLocale: vi.fn(),
  LOCALES: [
    { id: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
    { id: 'en', label: 'English', flag: '🇬🇧' },
  ],
}));

// Mock LLM module for ReadingPanel sub-component
vi.mock('./lib/llm', async () => {
  const actual = await vi.importActual<typeof import('./lib/llm')>('./lib/llm');
  return {
    ...actual,
    loadLLMConfig: vi.fn().mockReturnValue({
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: 'mock-api-key',
      model: 'gemini-2.5-flash',
      temperature: 0.7,
    }),
    callLLMStream: vi.fn(),
  };
});

function renderApp() {
  return render(
    <I18nProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <App />
      </Suspense>
    </I18nProvider>,
  );
}

describe('App Integration Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial App state with header, form inputs, and default astrolabe chart', async () => {
    renderApp();

    // Header title and badges (not behind Suspense lazy)
    expect(await screen.findByText('紫微斗數 Web 專業版')).toBeInTheDocument();
    expect(screen.getByText('iztro 引擎')).toBeInTheDocument();

    // Form inputs section (inside Suspense, needs lazy components to resolve)
    expect(await screen.findByText('生辰資料輸入')).toBeInTheDocument();

    // Default active tab is Twelve Palaces Chart Grid (lazy ChartGrid)
    expect(await screen.findByRole('tab', { name: /十二宮星盤總覽/i })).toBeInTheDocument();
  });

  it('navigates between single mode tabs (ChartGrid -> FortunePanel -> ReadingPanel)', async () => {
    renderApp();

    // Wait for lazy components to load
    await screen.findByText('生辰資料輸入');

    // Click '大限流年運限' Tab
    const fortunesTab = await screen.findByRole('tab', { name: /大限流年運限/i });
    fireEvent.click(fortunesTab);

    expect(await screen.findByText(/運限大盤分析/i)).toBeInTheDocument();

    // Click 'AI 智能命盤解讀' Tab
    const readingTab = await screen.findByRole('tab', { name: /AI 智能命盤解讀/i });
    fireEvent.click(readingTab);

    expect(await screen.findByText('AI 多模型命盤結構化解讀')).toBeInTheDocument();

    // Switch back to '十二宮星盤總覽' Tab
    const chartTab = await screen.findByRole('tab', { name: /十二宮星盤總覽/i });
    fireEvent.click(chartTab);

    // ChartGrid should be visible again
    expect(await screen.findByRole('tab', { name: /十二宮星盤總覽/i })).toBeInTheDocument();
  });

  it('switches view mode between 個人命盤 and 雙人合盤', async () => {
    renderApp();

    // Wait for initial load
    await screen.findByText('生辰資料輸入');

    // Click '雙人合盤'
    const matchModeBtn = await screen.findByRole('tab', { name: '雙人合盤' });
    fireEvent.click(matchModeBtn);

    // Wait for lazy-loaded MatchPanel
    expect(await screen.findByText(/雙人紫微命盤合盤/i, {}, { timeout: 4000 })).toBeInTheDocument();

    // Click '個人命盤' to return
    const singleModeBtn = await screen.findByRole('tab', { name: '個人命盤' });
    fireEvent.click(singleModeBtn);

    expect(await screen.findByText('生辰資料輸入')).toBeInTheDocument();
  });

  it('updates astrolabe chart when form is submitted with new birth info', async () => {
    const { container } = renderApp();

    // Wait for initial load
    await screen.findByText('生辰資料輸入');

    // Switch to Lunar Calendar
    const lunarBtn = await screen.findByRole('radio', { name: /陰曆 \(農曆\)/i });
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
    const femaleBtn = await screen.findByRole('radio', { name: /坤造 \(女\)/i });
    fireEvent.click(femaleBtn);

    // Submit form
    const submitBtn = await screen.findByRole('button', { name: /生成紫微命盤/i });
    fireEvent.click(submitBtn);

    // Wait for chart to update with 坤造
    expect(await screen.findByText(/坤造/)).toBeInTheDocument();
  });

  it('applies true solar time correction once longitude and precise time are entered (H1)', async () => {
    renderApp();
    await screen.findByText('生辰資料輸入');

    // No correction active by default
    expect(screen.getByText('同時輸入經度與精確時間，即可套用真太陽時修正時辰')).toBeInTheDocument();
    expect(screen.queryByText('已套用真太陽時修正')).not.toBeInTheDocument();

    // Hong Kong longitude (114.17), matches the known golden test case in astro.test.ts:
    // 2000-08-16 00:10 at 114.17°E / UTC+8 crosses midnight back to 2000-8-15 (晚子時)
    const longitudeInput = screen.getByLabelText('出生地經度') as HTMLInputElement;
    fireEvent.change(longitudeInput, { target: { value: '114.17' } });

    const preciseTimeInput = screen.getByLabelText('精確出生時間') as HTMLInputElement;
    fireEvent.change(preciseTimeInput, { target: { value: '00:10' } });

    expect(screen.getByText('已套用真太陽時修正')).toBeInTheDocument();

    const submitBtn = await screen.findByRole('button', { name: /生成紫微命盤/i });
    fireEvent.click(submitBtn);

    // Chart's solar date shifts a day earlier due to the true solar time correction
    expect(await screen.findByText('2000-8-15')).toBeInTheDocument();
  });

  it('leaves the chart unaffected when longitude is left blank (regression protection)', async () => {
    renderApp();
    await screen.findByText('生辰資料輸入');

    const submitBtn = await screen.findByRole('button', { name: /生成紫微命盤/i });
    fireEvent.click(submitBtn);

    // Default birth date (2000-08-16) is unaffected by the (unused) solar time correction fields
    expect(await screen.findByText('2000-8-16')).toBeInTheDocument();
    expect(screen.queryByText('已套用真太陽時修正')).not.toBeInTheDocument();
  });

  it('renders 四柱八字 (Four Pillars) on the chart tab', async () => {
    const { container } = renderApp();
    await screen.findByText('生辰資料輸入');

    expect(await screen.findByText('四柱八字')).toBeInTheDocument();
    const fourPillars = container.querySelector('[data-testid="four-pillars"]');
    expect(fourPillars).toBeInTheDocument();
    expect(fourPillars?.textContent).toContain('年柱');
    expect(fourPillars?.textContent).toContain('時柱');
  });

  it('wires up export buttons (CSV / summary / image) to lib/export (H7)', async () => {
    const csvSpy = vi.spyOn(exportLib, 'downloadChartCsv').mockImplementation(() => {});
    const summarySpy = vi.spyOn(exportLib, 'downloadChartSummaryText').mockImplementation(() => {});
    const imageSpy = vi.spyOn(exportLib, 'downloadShareCardImage').mockResolvedValue(undefined);

    renderApp();
    await screen.findByText('生辰資料輸入');

    fireEvent.click(await screen.findByRole('button', { name: '匯出 CSV' }));
    expect(csvSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(await screen.findByRole('button', { name: '下載命盤摘要' }));
    expect(summarySpy).toHaveBeenCalledTimes(1);

    fireEvent.click(await screen.findByRole('button', { name: '下載分享卡' }));
    await waitFor(() => expect(imageSpy).toHaveBeenCalledTimes(1));

    csvSpy.mockRestore();
    summarySpy.mockRestore();
    imageSpy.mockRestore();
  });
});
