import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadLLMConfig,
  saveLLMConfig,
  clearLLMConfig,
  cleanBaseUrl,
  validateBaseUrl,
  testLLMConnection,
  callLLMStream,
  DEFAULT_LLM_CONFIG,
  PROVIDER_PRESETS,
  STORAGE_KEY,
  API_KEY_SESSION_KEY,
  API_KEY_SECURITY_WARNING,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  DEFAULT_TEST_CONNECTION_TIMEOUT_MS,
  LLMConfig,
} from './llm';

describe('llm.ts - OpenAI Compatible LLM Client & Settings', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it('should accept https base URLs as secure', () => {
    const result = validateBaseUrl('https://api.openai.com/v1');
    expect(result.valid).toBe(true);
    expect(result.secure).toBe(true);
  });

  it('should flag non-https base URLs as insecure (M6: protect API key in transit)', () => {
    const result = validateBaseUrl('http://api.example.com/v1');
    expect(result.valid).toBe(true);
    expect(result.secure).toBe(false);
    expect(result.message).toContain('https');
  });

  it('should allow http on localhost/127.0.0.1 as an exception', () => {
    expect(validateBaseUrl('http://localhost:1234/v1').secure).toBe(true);
    expect(validateBaseUrl('http://127.0.0.1:11434/v1').secure).toBe(true);
  });

  it('should flag non-https base URLs as insecure with a simplified-Chinese message when locale is zh-CN', () => {
    const result = validateBaseUrl('http://api.example.com/v1', 'zh-CN');
    expect(result.valid).toBe(true);
    expect(result.secure).toBe(false);
    expect(result.message).toContain('https');
    expect(result.message).toContain('并非');
    expect(result.message).not.toContain('並非');
  });

  it('should reject malformed base URLs', () => {
    const result = validateBaseUrl('not a url');
    expect(result.valid).toBe(false);
    expect(result.secure).toBe(false);
  });

  it('should reject empty base URL', () => {
    const result = validateBaseUrl('');
    expect(result.valid).toBe(false);
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

    expect(result).toEqual({ status: 'completed', text: '星盤解析' });
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

  it('should call fetch with an AbortSignal (idle-timeout controller)', async () => {
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

    // Verify that fetch was called with a signal (the idle-timeout controller signal)
    const fetchCallArgs = fetchMock.mock.calls[0][1];
    expect(fetchCallArgs.signal).toBeDefined();
    expect(fetchCallArgs.signal).toBeInstanceOf(AbortSignal);
  });

  it('should reject non-https base URLs before sending the API key (M6)', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      callLLMStream(
        [{ role: 'user', content: 'test' }],
        { ...DEFAULT_LLM_CONFIG, apiKey: 'sk-test', baseUrl: 'http://insecure.example.com/v1' },
        { onChunk: vi.fn() }
      )
    ).rejects.toThrow(/https/);

    // The API key must never be sent to an unvalidated/insecure endpoint
    expect(fetchMock).not.toHaveBeenCalled();
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
    } catch {
      // Expected error
    }

    // releaseLock must be called even on error
    expect(releaseLockMock).toHaveBeenCalled();
    expect(onErrorMock).toHaveBeenCalled();
  });

  it('should mark an interrupted stream as "timeout", NOT "completed" (C2 regression)', async () => {
    // This reproduces the original bug: a long-output model (e.g. gemini-2.5-pro,
    // deepseek-reasoner) that stalls mid-sentence must be reported honestly as
    // "timeout" with partial text, never silently treated as a successful finish.
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

    expect(result).toEqual({ status: 'timeout', text: '' });
    expect(result.status).not.toBe('completed');
    expect(onFinishMock).toHaveBeenCalledWith({ status: 'timeout', text: '' });
    expect(releaseLockMock).toHaveBeenCalled();
  });

  it('should abort with status "timeout" (not "completed") when idle timer fires mid-stream, keeping partial text (C2 core fix)', async () => {
    // Simulates a long-output model that emits one chunk, then stalls for longer
    // than idleTimeoutMs. Mirrors how aborting the fetch AbortSignal in a real
    // browser also errors the still-open ReadableStream reader.
    vi.useFakeTimers();
    const encoder = new TextEncoder();
    let rejectSecondRead: ((err: unknown) => void) | undefined;

    const mockReader = {
      read: vi
        .fn()
        .mockImplementationOnce(async () => ({
          done: false,
          value: encoder.encode('data: {"choices":[{"delta":{"content":"部分內容"}}]}\n\n'),
        }))
        .mockImplementationOnce(
          () => new Promise((_resolve, reject) => {
            rejectSecondRead = reject;
          })
        ),
      releaseLock: vi.fn(),
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init: { signal: AbortSignal }) => {
        init.signal.addEventListener('abort', () => {
          rejectSecondRead?.(new DOMException('aborted', 'AbortError'));
        });
        return Promise.resolve({ ok: true, body: { getReader: () => mockReader } });
      })
    );

    const onFinishMock = vi.fn();
    const resultPromise = callLLMStream(
      [{ role: 'user', content: 'test' }],
      { ...DEFAULT_LLM_CONFIG, apiKey: 'sk-test' },
      { onChunk: vi.fn(), onFinish: onFinishMock },
      1000 // idleTimeoutMs
    );

    await vi.advanceTimersByTimeAsync(1500);
    const result = await resultPromise;

    expect(result).toEqual({ status: 'timeout', text: '部分內容' });
    expect(onFinishMock).toHaveBeenCalledWith({ status: 'timeout', text: '部分內容' });

    vi.useRealTimers();
  });

  it('should mark user-initiated abort as "aborted_by_user", distinct from "timeout"', async () => {
    const abortError = new DOMException('The user aborted a request.', 'AbortError');
    const releaseLockMock = vi.fn();
    const mockReader = {
      read: vi.fn().mockRejectedValue(abortError),
      releaseLock: releaseLockMock,
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => mockReader,
      },
    }));

    const controller = new AbortController();
    controller.abort();

    const result = await callLLMStream(
      [{ role: 'user', content: 'test' }],
      { ...DEFAULT_LLM_CONFIG, apiKey: 'sk-test' },
      { onChunk: vi.fn(), signal: controller.signal }
    );

    expect(result.status).toBe('aborted_by_user');
  });

  it('should export DEFAULT_STREAM_IDLE_TIMEOUT_MS as an idle (not total) timeout', () => {
    expect(DEFAULT_STREAM_IDLE_TIMEOUT_MS).toBe(30_000);
  });

  it('should process SSE lines using "data:{...}" with no space after the colon (A-5)', async () => {
    const encoder = new TextEncoder();
    let callCount = 0;
    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // No space after "data:" — some OpenAI-compatible proxies emit this.
          return { done: false, value: encoder.encode('data:{"choices":[{"delta":{"content":"星"}}]}\n\n') };
        }
        if (callCount === 2) {
          return { done: false, value: encoder.encode('data:{"choices":[{"delta":{"content":"盤"}}]}\n\n') };
        }
        if (callCount === 3) {
          return { done: false, value: encoder.encode('data:[DONE]\n\n') };
        }
        return { done: true, value: undefined };
      }),
      releaseLock: vi.fn(),
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    }));

    const chunks: string[] = [];
    const result = await callLLMStream(
      [{ role: 'user', content: 'test' }],
      { ...DEFAULT_LLM_CONFIG, apiKey: 'sk-test' },
      { onChunk: (chunk) => chunks.push(chunk) }
    );

    expect(result).toEqual({ status: 'completed', text: '星盤' });
    expect(chunks).toEqual(['星', '盤']);
  });

  it('should process a trailing "data:{...}" buffer with no space after the colon (A-5)', async () => {
    const encoder = new TextEncoder();
    const mockReader = {
      // No trailing newline: the payload stays in `buffer` and is only
      // flushed by the post-loop trailing-buffer handling.
      read: vi
        .fn()
        .mockResolvedValueOnce({
          done: false,
          value: encoder.encode('data:{"choices":[{"delta":{"content":"尾聲"}}]}'),
        })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      releaseLock: vi.fn(),
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader },
    }));

    const chunks: string[] = [];
    const result = await callLLMStream(
      [{ role: 'user', content: 'test' }],
      { ...DEFAULT_LLM_CONFIG, apiKey: 'sk-test' },
      { onChunk: (chunk) => chunks.push(chunk) }
    );

    expect(result).toEqual({ status: 'completed', text: '尾聲' });
    expect(chunks).toEqual(['尾聲']);
  });

  it('should export DEFAULT_TEST_CONNECTION_TIMEOUT_MS as 15 seconds (A-6)', () => {
    expect(DEFAULT_TEST_CONNECTION_TIMEOUT_MS).toBe(15_000);
  });

  it('should pass an AbortSignal with a 15s timeout to fetch in testLLMConnection (A-6)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'chatcmpl-123' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await testLLMConnection({ ...DEFAULT_LLM_CONFIG, apiKey: 'sk-mock-key' });

    const fetchCallArgs = mockFetch.mock.calls[0][1];
    expect(fetchCallArgs.signal).toBeInstanceOf(AbortSignal);
  });

  it('should report a timeout message instead of hanging forever when the endpoint never responds (A-6)', async () => {
    const timeoutError = new DOMException('Signal timed out', 'TimeoutError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutError));

    const res = await testLLMConnection({ ...DEFAULT_LLM_CONFIG, apiKey: 'sk-mock-key' });

    expect(res.success).toBe(false);
    expect(res.message).toContain('逾時');
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
