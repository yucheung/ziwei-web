import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ReadingPanel } from './ReadingPanel';
import * as llmModule from '../lib/llm';
import { getChart } from '../lib/astro';

// Mock LLM module
vi.mock('../lib/llm', async () => {
  const actual = await vi.importActual<typeof import('../lib/llm')>('../lib/llm');
  return {
    ...actual,
    loadLLMConfig: vi.fn(),
    saveLLMConfig: vi.fn(),
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

    expect(await screen.findByText('請先在上表單輸入生辰資料並生成命盤！')).toBeInTheDocument();
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
    const palaceBtn = screen.getByRole('button', { name: /十二宮剖析/i });
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

  it('calls callLLMStream and streams content to display area', async () => {
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
      callbacks.onChunk('紫微', '紫微');
      callbacks.onChunk('斗數解讀內容...', '紫微斗數解讀內容...');
      callbacks.onFinish?.('紫微斗數解讀內容...');
      return '紫微斗數解讀內容...';
    });

    render(<ReadingPanel chart={mockChart} />);

    const generateBtn = screen.getByRole('button', { name: /生成 AI 命盤解讀/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('紫微斗數解讀內容...')).toBeInTheDocument();
    });

    expect(llmModule.callLLMStream).toHaveBeenCalledTimes(1);
  });

  it('handles stream error gracefully and displays error message', async () => {
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
      callbacks.onError?.(new Error('Network Timeout'));
      throw new Error('Network Timeout');
    });

    render(<ReadingPanel chart={mockChart} />);

    const generateBtn = screen.getByRole('button', { name: /生成 AI 命盤解讀/i });
    fireEvent.click(generateBtn);

    expect(await screen.findByText(/Network Timeout/)).toBeInTheDocument();
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

  it('allows copying reading text to clipboard', async () => {
    vi.mocked(llmModule.callLLMStream).mockImplementation(async (_msg, _cfg, callbacks) => {
      callbacks.onFinish?.('命格分析結果');
      return '命格分析結果';
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
});
