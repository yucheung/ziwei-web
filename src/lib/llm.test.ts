import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadLLMConfig,
  saveLLMConfig,
  cleanBaseUrl,
  testLLMConnection,
  callLLMStream,
  DEFAULT_LLM_CONFIG,
  PROVIDER_PRESETS,
  LLMConfig,
} from './llm';

describe('llm.ts - OpenAI Compatible LLM Client & Settings', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should load default LLM config when localStorage is empty', () => {
    const config = loadLLMConfig();
    expect(config).toEqual(DEFAULT_LLM_CONFIG);
  });

  it('should save and reload LLM config from localStorage', () => {
    const customConfig: LLMConfig = {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: 'sk-test123456',
      model: 'deepseek-chat',
      temperature: 0.5,
    };

    saveLLMConfig(customConfig);
    const loaded = loadLLMConfig();
    expect(loaded.provider).toBe('deepseek');
    expect(loaded.apiKey).toBe('sk-test123456');
    expect(loaded.model).toBe('deepseek-chat');
  });

  it('should clean trailing slashes from base URL', () => {
    expect(cleanBaseUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1');
    expect(cleanBaseUrl('https://api.openai.com/v1')).toBe('https://api.openai.com/v1');
  });

  it('should return error in testLLMConnection if API key is missing for standard providers', async () => {
    const res = await testLLMConnection({
      ...DEFAULT_LLM_CONFIG,
      apiKey: '',
    });
    expect(res.success).toBe(false);
    expect(res.message).toContain('API Key');
  });

  it('should handle successful connection test via mocked fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'chatcmpl-123' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await testLLMConnection({
      ...DEFAULT_LLM_CONFIG,
      apiKey: 'sk-mock-key',
    });

    expect(res.success).toBe(true);
    expect(res.message).toContain('連線成功');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-mock-key',
        }),
      })
    );
  });

  it('should process SSE streaming response in callLLMStream', async () => {
    const encoder = new TextEncoder();
    let callCount = 0;

    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { done: false, value: encoder.encode('data: {"choices":[{"delta":{"content":"星"}]}}\n\n') };
        }
        if (callCount === 2) {
          return { done: false, value: encoder.encode('data: {"choices":[{"delta":{"content":"盤"}]}}\n\n') };
        }
        if (callCount === 3) {
          return { done: false, value: encoder.encode('data: {"choices":[{"delta":{"content":"解析"}]}}\n\n') };
        }
        if (callCount === 4) {
          return { done: false, value: encoder.encode('data: [DONE]\n\n') };
        }
        return { done: true, value: undefined };
      }),
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    });

    let accumulated = '';
    const chunks: string[] = [];

    const result = await callLLMStream(
      [{ role: 'user', content: 'test' }],
      { ...DEFAULT_LLM_CONFIG, apiKey: 'sk-test' },
      {
        onChunk: (chunk, fullText) => {
          chunks.push(chunk);
          accumulated = fullText;
        },
      }
    );

    expect(result).toBe('星盤解析');
    expect(accumulated).toBe('星盤解析');
    expect(chunks).toEqual(['星', '盤', '解析']);
  });

  it('should include preset options for Gemini, DeepSeek, OpenAI, Kimi, OpenRouter', () => {
    const ids = PROVIDER_PRESETS.map((p) => p.id);
    expect(ids).toContain('gemini');
    expect(ids).toContain('openai');
    expect(ids).toContain('deepseek');
    expect(ids).toContain('kimi');
    expect(ids).toContain('openrouter');
  });
});
