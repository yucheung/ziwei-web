import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode, Suspense } from 'react';
import App from './App';
import { I18nProvider } from './i18n';
import * as exportLib from './lib/export';
import * as llmModule from './lib/llm';
import * as localeModule from './i18n/locale';
import { createShareUrl, decodeShareUrl } from './lib/shareUrl';
import type { ChartConfig } from './lib/chartConfig';
import { clearAll, saveChart } from './lib/storage';

// Mock locale to always return zh-TW
vi.mock('./i18n/locale', () => ({
  getInitialLocale: () => 'zh-TW' as const,
  saveLocale: vi.fn(),
  LOCALES: [
    { id: 'zh-TW', label: '繁體中文', flag: '🇹🇼' },
    { id: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
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
    saveLLMConfig: vi.fn(),
    clearLLMConfig: vi.fn(),
  };
});

function renderApp(defaultLocale?: 'zh-TW' | 'zh-CN') {
  return render(
    <I18nProvider defaultLocale={defaultLocale}>
      <Suspense fallback={<div>Loading...</div>}>
        <App />
      </Suspense>
    </I18nProvider>,
  );
}

function renderStrictApp(defaultLocale?: 'zh-TW' | 'zh-CN') {
  return render(
    <StrictMode>
      <I18nProvider defaultLocale={defaultLocale}>
        <Suspense fallback={<div>Loading...</div>}>
          <App />
        </Suspense>
      </I18nProvider>
    </StrictMode>,
  );
}

describe('App Integration Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
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
    expect(await screen.findByText(/大限流分析圖/i)).toBeInTheDocument();

    // Click 'AI 智能命盤解讀' Tab
    const readingTab = await screen.findByRole('tab', { name: /AI 智能命盤解讀/i });
    fireEvent.click(readingTab);

    expect(await screen.findByText('AI 多模型命盤結構化解讀')).toBeInTheDocument();
    expect(await screen.findByText('AI 專題命盤解讀')).toBeInTheDocument();

    // Switch back to '十二宮星盤總覽' Tab
    const chartTab = await screen.findByRole('tab', { name: /十二宮星盤總覽/i });
    fireEvent.click(chartTab);

    // ChartGrid should be visible again
    expect(await screen.findByRole('tab', { name: /十二宮星盤總覽/i })).toBeInTheDocument();
  });

  it('sends App-evaluated matched rules into the main reading system prompt', async () => {
    let sentMessages: llmModule.ChatMessage[] | undefined;
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (messages, _config, callbacks) => {
      sentMessages = messages;
      const result = { status: 'completed' as const, text: '規則約束下的解讀' };
      callbacks.onFinish?.(result);
      return result;
    });

    renderApp();
    await screen.findByText('生辰資料輸入');
    fireEvent.click(await screen.findByRole('tab', { name: /AI 智能命盤解讀/i }));
    fireEvent.click(await screen.findByRole('button', { name: /生成 AI 命盤解讀/i }));

    await waitFor(() => expect(sentMessages).toBeDefined());

    const systemPrompt = sentMessages?.find((message) => message.role === 'system')?.content ?? '';
    expect(systemPrompt).toContain('【已匹配規則】');
    expect(systemPrompt).toMatch(/規則名稱：.+/u);
    expect(systemPrompt).toMatch(/evidence 重點：.+/u);
    expect(systemPrompt).toMatch(/confidence：0\.\d+/u);
    expect(systemPrompt).toContain('規則外的主張必須標示為不確定');
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

    // Wait for chart center panel to update, then verify it (not the form
    // radio, which also renders "坤造") reflects the selected gender. Re-query
    // the heading on every retry since the chart panel remounts (briefly
    // showing an empty placeholder) while the astrolabe recalculates.
    await waitFor(() => {
      const centerInfo = screen.getByText('紫微斗數命盤中樞').nextElementSibling;
      expect(centerInfo?.textContent).toMatch(/坤造/);
    });
    const centerInfo = screen.getByText('紫微斗數命盤中樞').nextElementSibling;
    expect(centerInfo?.textContent).not.toMatch(/乾造/);
  });

  it('displays gender correctly in the chart center panel under zh-CN locale', async () => {
    const { container } = renderApp();

    // Wait for initial load
    await screen.findByText('生辰資料輸入');

    // Switch to Simplified Chinese
    const langSwitcher = await screen.findByRole('combobox', { name: '語言' });
    fireEvent.change(langSwitcher, { target: { value: 'zh-CN' } });

    // Change date so the form is valid for submission
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeInTheDocument();
    fireEvent.change(dateInput, { target: { value: '1995-10-15' } });

    // Change gender to female
    const femaleBtn = await screen.findByRole('radio', { name: '坤造 (女)' });
    fireEvent.click(femaleBtn);

    // Submit form
    const submitBtn = await screen.findByRole('button', { name: '生成紫微命盘' });
    fireEvent.click(submitBtn);

    // Verify the chart center panel (not the form radio) shows the female label.
    // Re-query the heading on every retry since the chart panel remounts
    // (briefly showing an empty placeholder) while the astrolabe recalculates.
    await waitFor(() => {
      const centerInfo = screen.getByText('紫微斗数命盘中枢').nextElementSibling;
      expect(centerInfo?.textContent?.startsWith('坤造 (女)')).toBe(true);
    });
    const centerInfo = screen.getByText('紫微斗数命盘中枢').nextElementSibling;
    expect(centerInfo?.textContent?.startsWith('乾造')).toBe(false);
  });

  it('applies true solar time correction once longitude and precise time are entered (H1)', async () => {
    renderStrictApp();
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

  it('renders the rule info panel above ChartGrid (B1-1)', async () => {
    renderApp();
    await screen.findByText('生辰資料輸入');

    const rulesHeading = await screen.findByText('排盤規則');
    const chartGrid = await screen.findByRole('grid', { name: '紫微斗數十二宮命盤' });

    // DOM_POSITION_FOLLOWING means rulesHeading comes before chartGrid in document order
    expect(
      rulesHeading.compareDocumentPosition(chartGrid) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(screen.getByText('三合派 (sanhe-v1)')).toBeInTheDocument();
    expect(screen.getByText('iztro 版本')).toBeInTheDocument();
    expect(screen.getByText('2.5.8')).toBeInTheDocument();
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

  it('wires up the "匯出命盤 JSON" button to downloadChartJson with the actual chart options (H1)', async () => {
    const jsonSpy = vi.spyOn(exportLib, 'downloadChartJson').mockImplementation(() => {});

    renderApp();
    await screen.findByText('生辰資料輸入');

    fireEvent.click(await screen.findByRole('button', { name: '匯出命盤 JSON' }));

    expect(jsonSpy).toHaveBeenCalledTimes(1);
    const [astrolabeArg, optionsArg, localeArg] = jsonSpy.mock.calls[0];
    expect(astrolabeArg).toBeTruthy();
    expect(optionsArg?.input).toEqual({
      timeIndex: 2,
      isLunar: false,
      longitude: undefined,
    });
    expect(localeArg).toBe('zh-TW');

    jsonSpy.mockRestore();
  });

  it('copies a consented chart share URL to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const confirmSpy = vi.mocked(window.confirm).mockReturnValue(true);

    renderApp();
    await screen.findByText('生辰資料輸入');

    fireEvent.click(await screen.findByRole('button', { name: '分享' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copiedUrl = writeText.mock.calls[0][0] as string;
    expect(decodeShareUrl(copiedUrl)).toEqual({
      version: 1,
      birthData: {
        solarDate: '2000-08-16',
        calendarType: 'solar',
        isLeapMonth: false,
        hour: 2,
        gender: 'male',
        algorithm: 'zhongzhou',
        yearDivide: 'normal',
        dayDivide: 'forward',
        astroType: 'heaven',
      },
      reading: '',
    });
    expect(confirmSpy).toHaveBeenCalledWith('此 URL 包含出生資料，請確認後再分享');
    expect(await screen.findByRole('status')).toHaveTextContent('已複製分享連結');
  });

  it('detects a shared URL and restores the chart after confirmation', async () => {
    const sharedBirthData: ChartConfig = {
      solarDate: '1995-10-15',
      calendarType: 'solar',
      isLeapMonth: false,
      hour: 6,
      gender: 'female',
      algorithm: 'zhongzhou',
      yearDivide: 'exact',
      dayDivide: 'current',
      astroType: 'human',
    };
    const sharedUrl = new URL(createShareUrl(sharedBirthData, '', 'http://localhost/?source=test'));
    window.history.replaceState({}, '', `${sharedUrl.pathname}${sharedUrl.search}`);
    const confirmSpy = vi.mocked(window.confirm).mockReturnValue(true);

    renderStrictApp();
    await screen.findByText('生辰資料輸入');

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith('偵測到分享連結，是否載入？');
      expect(confirmSpy).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect((document.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('1995-10-15');
      expect((document.getElementById('birth-time-select') as HTMLSelectElement).value).toBe('6');
      expect(screen.getByRole('radio', { name: '坤造 (女)' })).toBeChecked();
    });
    await waitFor(() => {
      const centerInfo = screen.getByText('紫微斗數命盤中樞').nextElementSibling;
      expect(centerInfo?.textContent).toMatch(/坤造/);
    });
  });

  it('copies the generated reading for the active chart', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (_messages, _config, callbacks) => {
      const result = { status: 'completed' as const, text: '這是可分享的命盤解讀。' };
      callbacks.onFinish?.(result);
      return result;
    });

    renderApp();
    await screen.findByText('生辰資料輸入');

    fireEvent.change(document.getElementById('birth-time-select')!, { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: '生成紫微命盤' }));
    fireEvent.click(await screen.findByRole('tab', { name: 'AI 智能命盤解讀' }));
    fireEvent.click(await screen.findByRole('button', { name: '生成 AI 命盤解讀' }));

    await screen.findByText('這是可分享的命盤解讀。');
    fireEvent.click(await screen.findByRole('button', { name: '複製解讀' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('這是可分享的命盤解讀。'));
  });

  it('loads a saved chart in the current locale without changing LLM settings', async () => {
    await clearAll();
    await saveChart({
      id: 'app-integration-chart',
      name: '待載入命盤',
      birthData: {
        solarDate: '1995-10-15',
        calendarType: 'solar',
        isLeapMonth: false,
        hour: 6,
        gender: 'female',
        algorithm: 'zhongzhou',
        yearDivide: 'exact',
        dayDivide: 'current',
        astroType: 'human',
      },
      createdAt: '2026-08-07T12:00:00.000Z',
    });
    const confirmSpy = vi.mocked(window.confirm);
    confirmSpy.mockReturnValue(true);

    renderApp('zh-CN');

    expect(await screen.findByText('紫微斗数 Web 专业版')).toBeInTheDocument();
    expect(await screen.findByText('待載入命盤')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '加载' }));
    await waitFor(() => {
      expect((document.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('1995-10-15');
    });
    expect(localeModule.saveLocale).not.toHaveBeenCalled();
    expect(llmModule.saveLLMConfig).not.toHaveBeenCalled();
    expect(llmModule.clearLLMConfig).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '删除' }));
    expect(confirmSpy).toHaveBeenCalledWith('确定要删除“待載入命盤”吗？此操作无法恢复。');
    await waitFor(() => expect(screen.queryByText('待載入命盤')).not.toBeInTheDocument());
    await clearAll();
  });

  it('uses the frozen chart options (not live form state) when exporting JSON without regenerating (N1)', async () => {
    const jsonSpy = vi.spyOn(exportLib, 'downloadChartJson').mockImplementation(() => {});

    renderApp();
    await screen.findByText('生辰資料輸入');

    // 修改表單時辰，但不按「生成」→ astrolabe 與 lastChartOptions 仍為初始盤 (timeIndex 2 / male)
    const timeSelect = document.getElementById('birth-time-select') as HTMLSelectElement;
    expect(timeSelect).toBeTruthy();
    fireEvent.change(timeSelect, { target: { value: '5' } });

    fireEvent.click(await screen.findByRole('button', { name: '匯出命盤 JSON' }));

    expect(jsonSpy).toHaveBeenCalledTimes(1);
    const optionsArg = jsonSpy.mock.calls[0][1] as { input?: { timeIndex?: number; isLunar?: boolean } };
    // 匯出 input 描述的是「目前畫面上的命盤」(初始盤 timeIndex 2)，而非表單新值 5
    expect(optionsArg?.input?.timeIndex).toBe(2);
    expect(optionsArg?.input?.isLunar).toBe(false);

    jsonSpy.mockRestore();
  });
});
