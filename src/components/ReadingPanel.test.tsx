import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReadingPanel } from './ReadingPanel';
import * as llmModule from '../lib/llm';
import { getChart } from '../lib/astro';
import { I18nProvider } from '../i18n';
import { buildReadingPrompt } from '../lib/prompts';
import { canonicalizeAstrolabeForReading } from '../lib/chartModel';
import * as storageModule from '../lib/storage';
import type { RuleResult } from '../lib/rules/types';
import type { ChartConfig } from '../lib/chartConfig';

vi.mock('../lib/storage', async () => {
  const actual = await vi.importActual<typeof import('../lib/storage')>('../lib/storage');
  return {
    ...actual,
    saveReading: vi.fn(),
  };
});

// Mock LLM module
vi.mock('../lib/llm', async () => {
  const actual = await vi.importActual<typeof import('../lib/llm')>('../lib/llm');
  return {
    ...actual,
    loadLLMConfig: vi.fn(),
    saveLLMConfig: vi.fn(),
    clearLLMConfig: vi.fn(),
    callLLMStream: vi.fn(),
    testLLMConnection: vi.fn(),
  };
});

describe('ReadingPanel Component Test Suite', () => {
  const mockChart = getChart({
    date: '2000-08-16',
    timeIndex: 1,
    gender: 'male',
  });

  const defaultMockConfig: llmModule.LLMConfig = {
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    apiKey: 'test-api-key-123',
    model: 'gemini-2.5-flash',
    temperature: 0.7,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(llmModule.loadLLMConfig).mockReturnValue({ ...defaultMockConfig });

    // Mock scrollIntoView for jsdom/happy-dom environment
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('renders ReadingPanel with provider title and current model info', () => {
    render(<ReadingPanel chart={mockChart} />);

    expect(screen.getByText('AI 多模型命盤結構化解讀')).toBeInTheDocument();
    expect(screen.getByText(/Google Gemini/)).toBeInTheDocument();
    expect(screen.getByText(/gemini-2.5-flash/)).toBeInTheDocument();
  });

  it('shows missing API Key warning when apiKey is empty', () => {
    vi.mocked(llmModule.loadLLMConfig).mockReturnValue({
      ...defaultMockConfig,
      apiKey: '',
    });

    render(<ReadingPanel chart={mockChart} />);

    expect(screen.getByText(/尚未設定 API Key！/)).toBeInTheDocument();
  });

  it('displays error message if start reading without a chart', async () => {
    render(<ReadingPanel chart={null} />);

    const generateBtn = screen.getByRole('button', { name: /生成 AI 命盤解讀/i });
    fireEvent.click(generateBtn);

    expect((await screen.findAllByText('請先在上表單輸入生辰資料並生成命盤！'))[0]).toBeInTheDocument();
  });

  it('opens LLMConfigModal when API Key is missing and user clicks generate', async () => {
    vi.mocked(llmModule.loadLLMConfig).mockReturnValue({
      ...defaultMockConfig,
      apiKey: '',
    });

    render(<ReadingPanel chart={mockChart} />);

    const generateBtn = screen.getByRole('button', { name: /生成 AI 命盤解讀/i });
    fireEvent.click(generateBtn);

    expect(await screen.findByText('OpenAI-Compatible LLM 多模型設定')).toBeInTheDocument();
  });

  it('switches reading types and shows focus palace selection for "palaces" type', () => {
    render(<ReadingPanel chart={mockChart} />);

    // Default reading type: overall
    expect(screen.queryByText('特定宮位焦點 (選填)')).not.toBeInTheDocument();

    // Click "十二宮剖析"
    const palaceBtn = screen.getByRole('radio', { name: /十二宮剖析/i });
    fireEvent.click(palaceBtn);

    expect(screen.getByText('特定宮位焦點 (選填)')).toBeInTheDocument();

    // Select specific palace
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '命宮' } });
    expect(select).toHaveValue('命宮');
  });

  it('handles custom instructions input', () => {
    render(<ReadingPanel chart={mockChart} />);

    const input = screen.getByPlaceholderText(/想了解近兩年事業轉職/i);
    fireEvent.change(input, { target: { value: '關注今年財運發展' } });

    expect(input).toHaveValue('關注今年財運發展');
  });

  it('opens LLMConfigModal via "API 與模型設定" button and updates configuration', async () => {
    render(<ReadingPanel chart={mockChart} />);

    const configBtn = screen.getByRole('button', { name: /API 與模型設定/i });
    fireEvent.click(configBtn);

    expect(screen.getByText('OpenAI-Compatible LLM 多模型設定')).toBeInTheDocument();

    // Change provider to OpenAI
    const providerLabel = screen.getByText('模型服務商預設');
    const providerSelect = providerLabel.nextElementSibling as HTMLSelectElement;
    fireEvent.change(providerSelect, { target: { value: 'openai' } });

    // Test API connection
    vi.mocked(llmModule.testLLMConnection).mockResolvedValueOnce({
      success: true,
      message: '連線成功！API Key 與 Base URL 驗證通過',
    });

    const testBtn = screen.getByRole('button', { name: /測試 API 連線/i });
    fireEvent.click(testBtn);

    expect(await screen.findByText('連線成功！API Key 與 Base URL 驗證通過')).toBeInTheDocument();

    // Submit form to save config
    const saveBtn = screen.getByRole('button', { name: /儲存設定/i });
    const form = saveBtn.closest('form')!;
    fireEvent.submit(form);

    expect(llmModule.saveLLMConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'openai',
      })
    );
  });

  it('shows https warning when base URL is not https (non-localhost)', async () => {
    render(<ReadingPanel chart={mockChart} />);

    const configBtn = screen.getByRole('button', { name: /API 與模型設定/i });
    fireEvent.click(configBtn);

    const baseUrlLabel = screen.getByText('Base URL (OpenAI-compatible 端點)');
    const baseUrlInput = baseUrlLabel.nextElementSibling as HTMLInputElement;
    fireEvent.change(baseUrlInput, { target: { value: 'http://example.com/v1' } });

    expect(await screen.findByText(/並非 https/)).toBeInTheDocument();
  });

  it('does not show https warning for localhost base URL', async () => {
    render(<ReadingPanel chart={mockChart} />);

    const configBtn = screen.getByRole('button', { name: /API 與模型設定/i });
    fireEvent.click(configBtn);

    const baseUrlLabel = screen.getByText('Base URL (OpenAI-compatible 端點)');
    const baseUrlInput = baseUrlLabel.nextElementSibling as HTMLInputElement;
    fireEvent.change(baseUrlInput, { target: { value: 'http://localhost:8080/v1' } });

    expect(screen.queryByText(/並非 https/)).not.toBeInTheDocument();
  });

  it('displays the API key security warning in the settings modal', () => {
    render(<ReadingPanel chart={mockChart} />);

    const configBtn = screen.getByRole('button', { name: /API 與模型設定/i });
    fireEvent.click(configBtn);

    expect(screen.getByText(/前端儲存 API Key 仍有 XSS 風險/)).toBeInTheDocument();
  });

  it('clears the API key after user confirms the clear-key dialog', () => {
    const confirmSpy = vi.fn().mockReturnValue(true);
    window.confirm = confirmSpy;

    render(<ReadingPanel chart={mockChart} />);

    const configBtn = screen.getByRole('button', { name: /API 與模型設定/i });
    fireEvent.click(configBtn);

    const clearBtn = screen.getByRole('button', { name: /清除 API Key/i });
    fireEvent.click(clearBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(llmModule.clearLLMConfig).toHaveBeenCalledTimes(1);
    expect(screen.getByText('API Key 已清除')).toBeInTheDocument();

    const apiKeyInput = screen.getByPlaceholderText('sk-...') as HTMLInputElement;
    expect(apiKeyInput).toHaveValue('');
  });

  it('toggles API key visibility between masked and plain text', () => {
    render(<ReadingPanel chart={mockChart} />);

    const configBtn = screen.getByRole('button', { name: /API 與模型設定/i });
    fireEvent.click(configBtn);

    const apiKeyInput = screen.getByPlaceholderText('sk-...') as HTMLInputElement;
    expect(apiKeyInput.type).toBe('password');

    const showBtn = screen.getByRole('button', { name: '顯示 API Key' });
    fireEvent.click(showBtn);

    expect(apiKeyInput.type).toBe('text');
    expect(apiKeyInput).toHaveValue('test-api-key-123');

    const hideBtn = screen.getByRole('button', { name: '隱藏 API Key' });
    fireEvent.click(hideBtn);

    expect(apiKeyInput.type).toBe('password');
  });

  it('does not clear the API key when user cancels the confirm dialog', () => {
    const confirmSpy = vi.fn().mockReturnValue(false);
    window.confirm = confirmSpy;

    render(<ReadingPanel chart={mockChart} />);

    const configBtn = screen.getByRole('button', { name: /API 與模型設定/i });
    fireEvent.click(configBtn);

    const clearBtn = screen.getByRole('button', { name: /清除 API Key/i });
    fireEvent.click(clearBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(llmModule.clearLLMConfig).not.toHaveBeenCalled();

    const apiKeyInput = screen.getByPlaceholderText('sk-...') as HTMLInputElement;
    expect(apiKeyInput).toHaveValue('test-api-key-123');
  });

  it('calls callLLMStream and streams content to display area', async () => {
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
      callbacks.onChunk('紫微', '紫微');
      callbacks.onChunk('斗數解讀內容...', '紫微斗數解讀內容...');
      const result = { status: 'completed' as const, text: '紫微斗數解讀內容...' };
      callbacks.onFinish?.(result);
      return result;
    });

    render(<ReadingPanel chart={mockChart} />);

    const generateBtn = screen.getByRole('button', { name: /生成 AI 命盤解讀/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('紫微斗數解讀內容...')).toBeInTheDocument();
    });

    expect(llmModule.callLLMStream).toHaveBeenCalledTimes(1);
  });

  it('stores the supplied rules unchanged when a reading completes', async () => {
    const chartConfig: ChartConfig = {
      solarDate: '2000-08-16',
      calendarType: 'solar',
      isLeapMonth: false,
      hour: 1,
      gender: 'male',
      algorithm: 'zhongzhou',
      yearDivide: 'normal',
      dayDivide: 'forward',
      astroType: 'heaven',
      longitude: 121.56,
    };
    const rules: RuleResult[] = [{
      ruleId: 'pattern-test',
      ruleName: '測試規則',
      matched: true,
      evidence: [{
        knowledgeId: 'star-ziwei',
        field: 'palaces[0].majorStars[0]',
        source: 'iztro-sanhe-v1',
        value: '紫微',
        reasoning: '測試證據',
      }],
      confidence: 0.88,
    }];
    vi.mocked(storageModule.saveReading).mockResolvedValue({
      id: 'stored-reading',
      chartId: 'chart-1',
      reading: '可保存的解讀',
      rules,
      chartConfig,
      createdAt: '2026-08-08T00:00:00.000Z',
    });
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
      const result = { status: 'completed' as const, text: '可保存的解讀' };
      callbacks.onFinish?.(result);
      return result;
    });

    render(<ReadingPanel chart={mockChart} chartId="chart-1" rules={rules} chartConfig={chartConfig} />);
    fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));

    await waitFor(() => {
      expect(storageModule.saveReading).toHaveBeenCalledWith(expect.objectContaining({
        chartId: 'chart-1',
        reading: '可保存的解讀',
        rules,
        chartConfig,
      }));
    });
  });

  it('renders completed streamed reading text', async () => {
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
      const result = { status: 'completed' as const, text: '可分享的解讀內容' };
      callbacks.onFinish?.(result);
      return result;
    });

    render(<ReadingPanel chart={mockChart} />);
    fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));

    await waitFor(() => {
      expect(screen.getByText('可分享的解讀內容')).toBeInTheDocument();
    });
  });

  it('handles stream error gracefully and displays error message', async () => {
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
      callbacks.onError?.(new Error('Network Timeout'));
      throw new Error('Network Timeout');
    });

    render(<ReadingPanel chart={mockChart} />);

    const generateBtn = screen.getByRole('button', { name: /生成 AI 命盤解讀/i });
    fireEvent.click(generateBtn);

    expect((await screen.findAllByText(/Network Timeout/))[0]).toBeInTheDocument();
  });

  it('handles stop reading button click', async () => {
    let callSignal: AbortSignal | undefined;
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
      callSignal = callbacks.signal;
      return new Promise(() => {});
    });

    render(<ReadingPanel chart={mockChart} />);

    const generateBtn = screen.getByRole('button', { name: /生成 AI 命盤解讀/i });
    fireEvent.click(generateBtn);

    const stopBtn = await screen.findByRole('button', { name: /停止生成/i });
    expect(stopBtn).toBeInTheDocument();

    fireEvent.click(stopBtn);

    expect(callSignal?.aborted).toBe(true);
  });

  it('aborts ongoing stream when component is unmounted', async () => {
    let callSignal: AbortSignal | undefined;
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
      callSignal = callbacks.signal;
      return new Promise(() => {});
    });

    const { unmount } = render(<ReadingPanel chart={mockChart} />);

    const generateBtn = screen.getByRole('button', { name: /生成 AI 命盤解讀/i });
    fireEvent.click(generateBtn);

    expect(callSignal?.aborted).toBe(false);

    unmount();

    expect(callSignal?.aborted).toBe(true);
  });


  it('allows copying reading text to clipboard', async () => {
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
      const result = { status: 'completed' as const, text: '命格分析結果' };
      callbacks.onFinish?.(result);
      return result;
    });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      get: () => ({ writeText: writeTextMock }),
      configurable: true,
    });

    render(<ReadingPanel chart={mockChart} />);

    const generateBtn = screen.getByRole('button', { name: /生成 AI 命盤解讀/i });
    fireEvent.click(generateBtn);

    const copyBtn = await screen.findByRole('button', { name: /複製解讀/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('命格分析結果');
    expect(await screen.findByText(/已複製/)).toBeInTheDocument();
  });

  describe('B1-3: LLM 輸入檢視（Debug 面板）', () => {
    it('shows the exact systemPrompt sent to the LLM after clicking "查看 LLM 輸入"', async () => {
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        const result = { status: 'completed' as const, text: '' };
        callbacks.onFinish?.(result);
        return result;
      });

      render(<ReadingPanel chart={mockChart} />);

      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));
      await waitFor(() => expect(llmModule.callLLMStream).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole('button', { name: /查看 LLM 輸入/i }));

      expect(screen.getByText(/紫微斗數（三合派）/)).toBeInTheDocument();
    });

    it('shows the exact userPrompt (including chart facts like 命宮) after expanding the debug panel', async () => {
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        const result = { status: 'completed' as const, text: '' };
        callbacks.onFinish?.(result);
        return result;
      });

      render(<ReadingPanel chart={mockChart} />);

      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));
      await waitFor(() => expect(llmModule.callLLMStream).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole('button', { name: /查看 LLM 輸入/i }));

      const userPromptBlocks = screen.getAllByText(/命宮/);
      expect(userPromptBlocks.length).toBeGreaterThan(0);
    });

    it('displays request meta (provider/model/status) after the stream finishes', async () => {
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        const result = { status: 'completed' as const, text: '命格分析結果' };
        callbacks.onFinish?.(result);
        return result;
      });

      render(<ReadingPanel chart={mockChart} />);

      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));
      await waitFor(() => expect(llmModule.callLLMStream).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole('button', { name: /查看 LLM 輸入/i }));

      expect(screen.getByText('最近請求')).toBeInTheDocument();
      expect(screen.getByText('Google Gemini (OpenAI-compatible)')).toBeInTheDocument();
      expect(screen.getByText('gemini-2.5-flash')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('does not auto-expand the debug panel and does not affect the normal reading flow', async () => {
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        const result = { status: 'completed' as const, text: '命格分析結果' };
        callbacks.onFinish?.(result);
        return result;
      });

      render(<ReadingPanel chart={mockChart} />);

      expect(screen.queryByText('System Prompt')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));

      await waitFor(() => {
        expect(screen.getByText('命格分析結果')).toBeInTheDocument();
      });
      // Debug panel remains collapsed even after a completed request
      expect(screen.queryByText('System Prompt')).not.toBeInTheDocument();
    });
  });

  describe('M-2: 送出的 prompt 與 buildReadingPrompt() 逐字相等', () => {
    it('sends messages whose content byte-for-byte matches buildReadingPrompt() for the same input', async () => {
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        const result = { status: 'completed' as const, text: '' };
        callbacks.onFinish?.(result);
        return result;
      });

      render(<ReadingPanel chart={mockChart} />);
      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));
      await waitFor(() => expect(llmModule.callLLMStream).toHaveBeenCalledTimes(1));

      const [sentMessages] = vi.mocked(llmModule.callLLMStream).mock.calls[0];

      const canonicalChart = canonicalizeAstrolabeForReading(mockChart, 'zh-TW');
      const { systemPrompt, userPrompt } = buildReadingPrompt(canonicalChart, {
        type: 'overall',
        customInstructions: '',
        focusPalace: undefined,
        locale: 'zh-TW',
      });

      expect(sentMessages).toEqual([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    });
  });

  describe('A-1: aria-live status announcer (does not wrap the whole streaming output tree)', () => {
    it('keeps the output container aria-live="off" so streaming chunks are not spammed to screen readers', () => {
      const { container } = render(<ReadingPanel chart={mockChart} />);

      const outputArea = container.querySelector('[aria-busy]');
      expect(outputArea).toHaveAttribute('aria-live', 'off');
    });

    it('announces completion via a dedicated role="status" element', async () => {
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        const result = { status: 'completed' as const, text: '命格分析結果' };
        callbacks.onFinish?.(result);
        return result;
      });

      render(<ReadingPanel chart={mockChart} />);

      const generateBtn = screen.getByRole('button', { name: /生成 AI 命盤解讀/i });
      fireEvent.click(generateBtn);

      const status = screen.getByRole('status');
      await waitFor(() => {
        expect(status).toHaveTextContent('已收到全部回應');
      });
    });

    it('announces abort via the role="status" element, distinct from completion', async () => {
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        const result = { status: 'aborted_by_user' as const, text: '' };
        callbacks.onFinish?.(result);
        return result;
      });

      render(<ReadingPanel chart={mockChart} />);

      const generateBtn = screen.getByRole('button', { name: /生成 AI 命盤解讀/i });
      fireEvent.click(generateBtn);

      const status = screen.getByRole('status');
      await waitFor(() => {
        expect(status).toHaveTextContent('回應已中止');
      });
    });
  });

  describe('A-3: LLM ACL — canonical (locale-independent) chart data feeds the LLM prompt', () => {
    it('canonicalizes simplified star/mutagen forms back to zh-TW in the prompt when UI locale is zh-CN', async () => {
      const cnChart = getChart({ date: '2000-08-16', timeIndex: 1, gender: 'male', language: 'zh-CN' });

      let capturedMessages: llmModule.ChatMessage[] | undefined;
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (msg, _cfg, callbacks) => {
        capturedMessages = msg;
        const result = { status: 'completed' as const, text: '' };
        callbacks.onFinish?.(result);
        return result;
      });

      render(
        <I18nProvider defaultLocale="zh-CN">
          <ReadingPanel chart={cnChart} />
        </I18nProvider>,
      );

      const generateBtn = screen.getByRole('button', { name: /生成 AI 命盘解读/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(capturedMessages).toBeDefined();
      });

      const userPrompt = capturedMessages!.find((m) => m.role === 'user')!.content;
      // 命盤資料本身（宮位/星曜/四化 canonical key）不得因顯示語言簡化；一律還原為
      // zh-TW canonical 命理詞彙。B1 之後，解讀指令與 UI 標籤才會依 locale 改為簡體
      // 散文（例如「財帛宮」寫成「财帛宫」），因此不能再斷言整段 prompt 完全不含
      // 任何簡體「宮」部件，只針對具體資料值（星曜名／四化前綴）做精確比對。
      expect(userPrompt).toContain('命宮');
      expect(userPrompt).not.toContain('巨门');
      expect(userPrompt).not.toContain('生年禄');
    });

    it('keeps chart data (palace/star canonical key) identical across UI locales while the reading instructions/labels follow the UI locale (B1)', async () => {
      const zhChart = getChart({ date: '2000-08-16', timeIndex: 1, gender: 'male', language: 'zh-TW' });
      const cnChart = getChart({ date: '2000-08-16', timeIndex: 1, gender: 'male', language: 'zh-CN' });

      let capturedUserPrompt = '';
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (msg, _cfg, callbacks) => {
        capturedUserPrompt = msg.find((m) => m.role === 'user')!.content;
        const result = { status: 'completed' as const, text: '' };
        callbacks.onFinish?.(result);
        return result;
      });

      const { unmount } = render(
        <I18nProvider defaultLocale="zh-TW">
          <ReadingPanel chart={zhChart} />
        </I18nProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));
      await waitFor(() => expect(capturedUserPrompt).not.toBe(''));
      const zhSourcedPrompt = capturedUserPrompt;
      unmount();

      capturedUserPrompt = '';
      render(
        <I18nProvider defaultLocale="zh-CN">
          <ReadingPanel chart={cnChart} />
        </I18nProvider>,
      );
      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盘解读/i }));
      await waitFor(() => expect(capturedUserPrompt).not.toBe(''));
      const cnSourcedPrompt = capturedUserPrompt;

      // 命盤資料本身（宮位/星曜/四化 canonical key）不受顯示語言影響，兩者皆為 zh-TW
      // 字形；解讀指令與 UI 標籤散文則可依 locale 改為簡體，因此不斷言整段 prompt
      // 完全不含簡體「宮」部件，只針對具體資料值做精確比對（見上一測試的說明）。
      expect(zhSourcedPrompt).toContain('命宮');
      expect(cnSourcedPrompt).toContain('命宮');
      expect(cnSourcedPrompt).not.toContain('巨门');
      expect(cnSourcedPrompt).not.toContain('生年禄');

      // 但解讀指令與 UI 標籤的語言，B1 修正後應跟隨當下顯示語言而非恆為繁體
      expect(zhSourcedPrompt).toContain('【解讀重點：');
      expect(cnSourcedPrompt).toContain('【解读重点：');
      expect(cnSourcedPrompt).not.toBe(zhSourcedPrompt);
    });

    it('triggers window.print when print button is clicked', async () => {
      const printSpy = vi.fn();
      vi.stubGlobal('print', printSpy);

      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        const result = { status: 'completed' as const, text: '測試解讀內文' };
        callbacks.onChunk?.('測試解讀內文', '測試解讀內文');
        callbacks.onFinish?.(result);
        return result;
      });

      render(
        <I18nProvider defaultLocale="zh-TW">
          <ReadingPanel chart={mockChart} />
        </I18nProvider>,
      );

      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));
      await waitFor(() => expect(screen.getByText('列印解讀')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: '列印解讀' }));
      expect(printSpy).toHaveBeenCalledTimes(1);

      vi.unstubAllGlobals();
    });
  });

  describe('Follow-up (對話追問) UI 接線', () => {
    it('does not render follow-up input before initial reading completes', () => {
      render(<ReadingPanel chart={mockChart} />);
      expect(screen.queryByPlaceholderText(/針對此命盤提出追問/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /送出追問/i })).not.toBeInTheDocument();
    });

    it('renders input box and submit button after initial reading completes (zh-TW and zh-CN)', async () => {
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        const result = { status: 'completed' as const, text: '首輪解讀完成' };
        callbacks.onFinish?.(result);
        return result;
      });

      const { unmount } = render(
        <I18nProvider defaultLocale="zh-TW">
          <ReadingPanel chart={mockChart} chartId="chart-1" />
        </I18nProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));
      await waitFor(() => expect(screen.getByText('首輪解讀完成')).toBeInTheDocument());

      expect(screen.getByPlaceholderText('針對此命盤提出追問，例如：事業上的貴人何時出現？')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '送出追問' })).toBeInTheDocument();

      unmount();

      // Test zh-CN locale placeholder
      render(
        <I18nProvider defaultLocale="zh-CN">
          <ReadingPanel chart={mockChart} chartId="chart-1" />
        </I18nProvider>
      );
      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盘解读/i }));
      await waitFor(() => expect(screen.getByText('首輪解讀完成')).toBeInTheDocument());

      expect(screen.getByPlaceholderText('针对此命盘提出追问，例如：事业上的贵人何时出现？')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '发送追问' })).toBeInTheDocument();
    });

    it('submits follow-up with initial system prompt and renders markdown response', async () => {
      let callCount = 0;
      let followUpSentMessages: llmModule.ChatMessage[] | undefined;

      vi.mocked(llmModule.callLLMStream).mockImplementation(async (msg, _cfg, callbacks) => {
        callCount++;
        if (callCount === 1) {
          const result = { status: 'completed' as const, text: '首輪解讀內容' };
          callbacks.onFinish?.(result);
          return result;
        } else {
          followUpSentMessages = msg;
          callbacks.onChunk?.('**事業有貴人**，特別是在', '**事業有貴人**，特別是在');
          callbacks.onChunk?.('今年秋季。', '**事業有貴人**，特別是在今年秋季。');
          const result = { status: 'completed' as const, text: '**事業有貴人**，特別是在今年秋季。' };
          callbacks.onFinish?.(result);
          return result;
        }
      });

      render(
        <I18nProvider defaultLocale="zh-TW">
          <ReadingPanel chart={mockChart} chartId="chart-1" />
        </I18nProvider>
      );

      // 1. First round
      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));
      await waitFor(() => expect(screen.getByText('首輪解讀內容')).toBeInTheDocument());

      // 2. Submit follow-up question
      const input = screen.getByPlaceholderText(/針對此命盤提出追問/i);
      fireEvent.change(input, { target: { value: '我的事業貴人何時會出現？<script>alert(1)</script>' } });
      const submitBtn = screen.getByRole('button', { name: /送出追問/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(callCount).toBe(2);
      });

      // Verify messages sent
      expect(followUpSentMessages).toBeDefined();
      expect(followUpSentMessages![0].role).toBe('system');
      // System prompt contains structured chart facts
      expect(followUpSentMessages![0].content).toMatch(/命[宮宫]|紫微/);
      // User question is sanitized (script tags encoded)
      expect(followUpSentMessages![1].role).toBe('user');
      expect(followUpSentMessages![1].content).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(followUpSentMessages![1].content).not.toContain('<script>');

      // Verify Markdown rendering in AI follow-up reply (strong tag for bold)
      await waitFor(() => {
        expect(screen.getByText('事業有貴人')).toBeInTheDocument();
      });
      const strongElement = screen.getByText('事業有貴人');
      expect(strongElement.tagName).toBe('STRONG');
    });

    it('clears dialogue and shows stale notice when chartId changes (isFollowUpStale)', async () => {
      let callCount = 0;
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        callCount++;
        const result = { status: 'completed' as const, text: `解讀或回覆內容 ${callCount}` };
        callbacks.onFinish?.(result);
        return result;
      });

      const { rerender } = render(
        <I18nProvider defaultLocale="zh-TW">
          <ReadingPanel chart={mockChart} chartId="chart-A" />
        </I18nProvider>
      );

      // Complete initial reading
      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));
      await waitFor(() => expect(screen.getByText('解讀或回覆內容 1')).toBeInTheDocument());

      // Send follow-up
      const input = screen.getByPlaceholderText(/針對此命盤提出追問/i);
      fireEvent.change(input, { target: { value: '第一個命盤的追問問題' } });
      fireEvent.click(screen.getByRole('button', { name: /送出追問/i }));
      await waitFor(() => expect(screen.getByText('第一個命盤的追問問題')).toBeInTheDocument());
      await waitFor(() => expect(screen.getByText('解讀或回覆內容 2')).toBeInTheDocument());

      // Now chartId changes to chart-B
      rerender(
        <I18nProvider defaultLocale="zh-TW">
          <ReadingPanel chart={mockChart} chartId="chart-B" />
        </I18nProvider>
      );

      // Stale notice should be displayed
      expect(screen.getByText('命盤已變更，先前的追問對話已清空。')).toBeInTheDocument();
      // Previous conversation messages should be cleared
      expect(screen.queryByText('第一個命盤的追問問題')).not.toBeInTheDocument();
      expect(screen.queryByText('解讀或回覆內容 2')).not.toBeInTheDocument();
    });

    it('supports stopping follow-up generation', async () => {
      let followUpSignal: AbortSignal | undefined;
      let callCount = 0;
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        callCount++;
        if (callCount === 1) {
          const result = { status: 'completed' as const, text: '首輪完成' };
          callbacks.onFinish?.(result);
          return result;
        } else {
          followUpSignal = callbacks.signal;
          return new Promise(() => {});
        }
      });

      render(
        <I18nProvider defaultLocale="zh-TW">
          <ReadingPanel chart={mockChart} chartId="chart-1" />
        </I18nProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));
      await waitFor(() => expect(screen.getByText('首輪完成')).toBeInTheDocument());

      const input = screen.getByPlaceholderText(/針對此命盤提出追問/i);
      fireEvent.change(input, { target: { value: '想問健康' } });
      fireEvent.click(screen.getByRole('button', { name: /送出追問/i }));

      const stopBtn = await screen.findByRole('button', { name: /停止生成/i });
      expect(stopBtn).toBeInTheDocument();
      fireEvent.click(stopBtn);

      expect(followUpSignal?.aborted).toBe(true);
    });
  });

  describe('Faithfulness runtime checking', () => {
    const lianzhenLu: RuleResult = {
      ruleId: 'four-transformation-lianzhen-huaLu',
      ruleName: '廉貞化祿',
      matched: true,
      confidence: 0.9,
      evidence: [
        {
          knowledgeId: 'star-lianzhen',
          field: 'palaces[0].majorStars[0]',
          source: 'iztro-sanhe-v1',
          value: '廉貞化祿',
          reasoning: '廉貞化祿的規則證據。',
        },
        {
          knowledgeId: 'palace-ming',
          field: 'palaces[0].name',
          source: 'iztro-sanhe-v1',
          value: '命宮',
          reasoning: '命宮的規則證據。',
        },
      ],
    };

    it('flags unfaithful items in warning style when LLM output contradicts or lacks rule support', async () => {
      const mockLlmText = '命主廉貞化忌落在命宮，且天府化祿落在財帛宮。';
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        const result = { status: 'completed' as const, text: mockLlmText };
        callbacks.onFinish?.(result);
        return result;
      });

      render(
        <I18nProvider defaultLocale="zh-TW">
          <ReadingPanel chart={mockChart} rules={[lianzhenLu]} />
        </I18nProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));

      await waitFor(() => {
        expect(screen.getByTestId('faithfulness-warning')).toBeInTheDocument();
      });

      expect(screen.getByText(/解讀內容忠實度提醒/i)).toBeInTheDocument();
      const warning = screen.getByTestId('faithfulness-warning');
      expect(within(warning).getByText(/廉貞化忌落在命宮/i)).toBeInTheDocument();
      expect(screen.getByText(/廉貞化祿/i)).toBeInTheDocument();
      expect(screen.getByText(/天府化祿落在財帛宮/i)).toBeInTheDocument();
      expect(screen.getByText(/沒有規則支持/i)).toBeInTheDocument();
    });

    it('shows pass hint when all claims are faithful', async () => {
      const mockLlmText = '廉貞化祿落在命宮，資源主題較容易被引動。';
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        const result = { status: 'completed' as const, text: mockLlmText };
        callbacks.onFinish?.(result);
        return result;
      });

      render(
        <I18nProvider defaultLocale="zh-TW">
          <ReadingPanel chart={mockChart} rules={[lianzhenLu]} />
        </I18nProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));

      await waitFor(() => {
        expect(screen.getByTestId('faithfulness-passed')).toBeInTheDocument();
      });

      expect(screen.getByText('忠實度檢查通過：解讀內容與星盤規則相符')).toBeInTheDocument();
      expect(screen.queryByTestId('faithfulness-warning')).not.toBeInTheDocument();
    });

    it('does not display check result during streaming before stream completes', async () => {
      let triggerChunk: ((chunk: string, full: string) => void) | undefined;
      vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
        triggerChunk = callbacks.onChunk;
        return new Promise(() => {});
      });

      render(
        <I18nProvider defaultLocale="zh-TW">
          <ReadingPanel chart={mockChart} rules={[lianzhenLu]} />
        </I18nProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /生成 AI 命盤解讀/i }));

      triggerChunk?.('廉貞化忌', '廉貞化忌落在命宮。');

      await waitFor(() => {
        expect(screen.getByText(/廉貞化忌落在命宮。/i)).toBeInTheDocument();
      });

      expect(screen.queryByTestId('faithfulness-warning')).not.toBeInTheDocument();
      expect(screen.queryByTestId('faithfulness-passed')).not.toBeInTheDocument();
    });
  });
});
