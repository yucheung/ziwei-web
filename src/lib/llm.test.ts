import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadLLMConfig,
  saveLLMConfig,
  clearLLMConfig,
  cleanBaseUrl,
  testLLMConnection,
  callLLMStream,
  DEFAULT_LLM_CONFIG,
  PROVIDER_PRESETS,
  STORAGE_KEY,
  API_KEY_SESSION_KEY,
  API_KEY_SECURITY_WARNING,
  DEFAULT_STREAM_TIMEOUT_MS,
  LLMConfig,
} from './llm';

describe('llm.ts - OpenAI Compatible LLM Client & Settings', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('should load default LLM config when storage is empty', () => {
    const config = loadLLMConfig();
    expect(config).toEqual(DEFAULT_LLM_CONFIG);
  });

  it('should save non-sensitive settings to localStorage and API Key to sessionStorage', () => {
    const customConfig: LLMConfig = {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: 'sk-test123456',
      model: 'deepseek-chat',
      temperature: 0.5,
    };

    saveLLMConfig(customConfig);

    // API Key should be in sessionStorage, NOT in localStorage
    const storedInLocalStorage = localStorage.getItem(STORAGE_KEY);
    expect(storedInLocalStorage).toBeTruthy();
    expect(storedInLocalStorage).not.toContain('sk-test123456');

    const storedApiKey = sessionStorage.getItem(API_KEY_SESSION_KEY);
    expect(storedApiKey).toBe('sk-test123456');

    // loadLLMConfig should reconstruct the full config
    const loaded = loadLLMConfig();
    expect(loaded.provider).toBe('deepseek');
    expect(loaded.apiKey).toBe('sk-test123456');
    expect(loaded.model).toBe('deepseek-chat');
  });

  it('should NOT store API Key in localStorage (XSS risk mitigation)', () => {
    saveLLMConfig({
      ...DEFAULT_LLM_CONFIG,
      apiKey: 'sk-secret-key-12345',
    });

    const localData = localStorage.getItem(STORAGE_KEY) || '';
    expect(localData).not.toContain('sk-secret-key-12345');
    expect(localData).not.toContain('apiKey');
  });

  it('should clear all stored config via clearLLMConfig', () => {
    saveLLMConfig({
      ...DEFAULT_LLM_CONFIG,
      apiKey: 'sk-to-clear',
      provider: 'openai',
    });

    // Verify stored
    expect(sessionStorage.getItem(API_KEY_SESSION_KEY)).toBe('sk-to-clear');
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();

    clearLLMConfig();

    expect(sessionStorage.getItem(API_KEY_SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // Should load defaults after clearing
    const config = loadLLMConfig();
    expect(config).toEqual(DEFAULT_LLM_CONFIG);
  });

  it('should export a security warning constant', () => {
    expect(API_KEY_SECURITY_WARNING).toContain('sessionStorage');
    expect(API_KEY_SECURITY_WARNING).toContain('XSS');
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
    const releaseLockMock = vi.fn();
    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { done: false, value: encoder.encode('data: {"choices":[{"delta":{"content":"星"}}]}\n\n') };
        }
        if (callCount === 2) {
          return { done: false, value: encoder.encode('data: {"choices":[{"delta":{"content":"盤"}}]}\n\n') };
        }
        if (callCount === 3) {
          return { done: false, value: encoder.encode('data: {"choices":[{"delta":{"content":"解析"}}]}\n\n') };
        }
        if (callCount === 4) {
          return { done: false, value: encoder.encode('data: [DONE]\n\n') };
        }
        return { done: true, value: undefined };
      }),
      releaseLock: releaseLockMock,
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    }));

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
    // Verify reader.releaseLock was called in finally block
    expect(releaseLockMock).toHaveBeenCalled();
  });

  it('should pass maxTokens in the request body when configured', async () => {
    const encoder = new TextEncoder();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: encoder.encode('data: [DONE]\n\n') })
            .mockResolvedValueOnce({ done: true, value: undefined }),
          releaseLock: vi.fn(),
        }),
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    await callLLMStream(
      [{ role: 'user', content: 'test' }],
      { ...DEFAULT_LLM_CONFIG, apiKey: 'sk-test', maxTokens: 2000 },
      { onChunk: vi.fn() }
    );

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.max_tokens).toBe(2000);
    expect(callBody.stream).toBe(true);
  });

  it('should use AbortSignal.timeout for the fetch request', async () => {
    const encoder = new TextEncoder();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: encoder.encode('data: [DONE]\n\n') })
            .mockResolvedValueOnce({ done: true, value: undefined }),
          releaseLock: vi.fn(),
        }),
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    await callLLMStream(
      [{ role: 'user', content: 'test' }],
      { ...DEFAULT_LLM_CONFIG, apiKey: 'sk-test' },
      { onChunk: vi.fn() }
    );

    // Verify that fetch was called with a signal (the merged timeout signal)
    const fetchCallArgs = fetchMock.mock.calls[0][1];
    expect(fetchCallArgs.signal).toBeDefined();
    expect(fetchCallArgs.signal).toBeInstanceOf(AbortSignal);
  });

  it('should release reader lock even when an error occurs (memory leak fix)', async () => {
    const releaseLockMock = vi.fn();
    const mockReader = {
      read: vi.fn().mockRejectedValue(new Error('Network failure')),
      releaseLock: releaseLockMock,
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    }));

    const onErrorMock = vi.fn();

    try {
      await callLLMStream(
        [{ role: 'user', content: 'test' }],
        { ...DEFAULT_LLM_CONFIG, apiKey: 'sk-test' },
        { onChunk: vi.fn(), onError: onErrorMock }
      );
    } catch (err) {
      // Expected error
    }

    // releaseLock must be called even on error
    expect(releaseLockMock).toHaveBeenCalled();
    expect(onErrorMock).toHaveBeenCalled();
  });

  it('should handle TimeoutError gracefully (AbortSignal.timeout)', async () => {
    const timeoutError = new DOMException('Signal timed out', 'TimeoutError');
    const releaseLockMock = vi.fn();
    const mockReader = {
      read: vi.fn().mockRejectedValue(timeoutError),
      releaseLock: releaseLockMock,
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    }));

    const onFinishMock = vi.fn();

    const result = await callLLMStream(
      [{ role: 'user', content: 'test' }],
      { ...DEFAULT_LLM_CONFIG, apiKey: 'sk-test' },
      { onChunk: vi.fn(), onFinish: onFinishMock }
    );

    // TimeoutError should be handled gracefully, returning partial text
    expect(result).toBe('');
    expect(onFinishMock).toHaveBeenCalledWith('');
    expect(releaseLockMock).toHaveBeenCalled();
  });

  it('should export DEFAULT_STREAM_TIMEOUT_MS', () => {
    expect(DEFAULT_STREAM_TIMEOUT_MS).toBe(60_000);
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
