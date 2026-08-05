/**
 * OpenAI-Compatible 多模型 LLM Client 層
 *
 * 安全設計：
 * - API Key 存於 sessionStorage（分頁關閉即清除），降低 XSS 竊取風險
 * - 非機密設定 (provider/baseUrl/model/temperature) 仍用 localStorage 持久化
 * - SSE 串流採用「閒置逾時」(idle timeout)：每收到一個 chunk 就重置計時器，
 *   總輸出長度不設上限，避免長輸出在總逾時內寫不完就被誤判為正常結束
 * - Base URL 強制驗證為 https（localhost 例外），避免 API Key 被送往不安全端點
 * - finally 內固定呼叫 reader.releaseLock() 避免 ReadableStream 記憶體洩漏
 */

export interface LLMProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  modelSuggestions: string[];
}

export const PROVIDER_PRESETS: LLMProviderPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini (OpenAI-compatible)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultModel: 'gemini-2.5-flash',
    modelSuggestions: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    modelSuggestions: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    modelSuggestions: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'kimi',
    name: 'Kimi (Moonshot AI)',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    modelSuggestions: ['moonshot-v1-8k', 'moonshot-v1-32k'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter / Claude',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    modelSuggestions: [
      'anthropic/claude-3.5-sonnet',
      'google/gemini-2.5-flash',
      'deepseek/deepseek-chat',
    ],
  },
  {
    id: 'custom',
    name: '自訂 API (Custom OpenAI-Compatible)',
    baseUrl: '',
    defaultModel: '',
    modelSuggestions: [],
  },
];

export interface LLMConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens?: number;
}

/** localStorage key for non-sensitive settings */
export const STORAGE_KEY = 'ziwei_llm_config';

/** sessionStorage key for API Key (cleared when tab/browser closes) */
export const API_KEY_SESSION_KEY = 'ziwei_llm_apikey';

/**
 * Idle timeout (ms) for SSE streaming fetch：計時器在每次收到 chunk 時重置，
 * 而非整個請求的總逾時。因此輸出再長也不會被截斷，只有「閒置超過此秒數沒有新資料」
 * 才會中斷連線。
 */
export const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 30_000;

/** 安全警告：提醒使用者前端存儲 API Key 的風險 */
export const API_KEY_SECURITY_WARNING =
  '⚠️ 安全提醒：API Key 僅暫存於本瀏覽器分頁（sessionStorage），關閉分頁即自動清除。' +
  '即便如此，前端儲存 API Key 仍有 XSS 風險，建議僅在可信網路環境使用，並定期輪換 Key。';

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  apiKey: '',
  model: 'gemini-2.5-flash',
  temperature: 0.7,
  maxTokens: 3000,
};

export function loadLLMConfig(): LLMConfig {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_LLM_CONFIG };
  }
  try {
    // Non-sensitive settings from localStorage
    const saved = window.localStorage?.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    // API Key from sessionStorage (tab-scoped, no persistence)
    const sessionKey = window.sessionStorage?.getItem(API_KEY_SESSION_KEY) ?? '';
    return {
      ...DEFAULT_LLM_CONFIG,
      ...parsed,
      apiKey: sessionKey,
    };
  } catch (e) {
    console.error('Failed to load LLM config:', e);
  }
  return { ...DEFAULT_LLM_CONFIG };
}

export function saveLLMConfig(config: LLMConfig): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    // Separate API key from other settings
    const { apiKey, ...nonSensitive } = config;
    // Non-sensitive settings → localStorage (persists across sessions)
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(nonSensitive));
    // API Key → sessionStorage (cleared when tab closes)
    window.sessionStorage?.setItem(API_KEY_SESSION_KEY, apiKey || '');
  } catch (e) {
    console.error('Failed to save LLM config:', e);
  }
}

/**
 * 一鍵清除所有存儲的 LLM 設定與 API Key
 */
export function clearLLMConfig(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage?.removeItem(STORAGE_KEY);
    window.sessionStorage?.removeItem(API_KEY_SESSION_KEY);
  } catch (e) {
    console.error('Failed to clear LLM config:', e);
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 串流終止狀態：
 * - completed: 正常收到 [DONE] 或伺服器自然關閉連線
 * - aborted_by_user: 使用者主動點擊「停止生成」或元件卸載
 * - timeout: 閒置逾時（長時間沒有新 chunk）被迫中斷，內容可能不完整
 * - error: 網路或 API 錯誤（透過 onError + throw 傳遞，不會經由此狀態解析）
 */
export type StreamFinishStatus = 'completed' | 'aborted_by_user' | 'timeout' | 'error';

export interface StreamResult {
  status: StreamFinishStatus;
  text: string;
}

export interface StreamCallbacks {
  onChunk: (chunk: string, fullText: string) => void;
  onError?: (err: Error) => void;
  onFinish?: (result: StreamResult) => void;
  signal?: AbortSignal;
}

export function cleanBaseUrl(url: string): string {
  let cleaned = (url || '').trim();
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

export interface BaseUrlCheck {
  valid: boolean;
  secure: boolean;
  message?: string;
}

/**
 * 驗證 Base URL 是否為合法且安全（https）的網址。
 * 為保護 API Key，僅允許 https 端點，本機開發用的 localhost/127.0.0.1 例外放行。
 */
export function validateBaseUrl(url: string): BaseUrlCheck {
  const cleaned = cleanBaseUrl(url);
  if (!cleaned) {
    return { valid: false, secure: false, message: '請輸入 Base URL' };
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    return {
      valid: false,
      secure: false,
      message: 'Base URL 格式不正確，請輸入完整網址（需包含 https://）',
    };
  }

  const isLocalhost =
    parsed.hostname === 'localhost' ||
    parsed.hostname === '127.0.0.1' ||
    parsed.hostname === '::1';
  const secure = parsed.protocol === 'https:' || isLocalhost;

  if (!secure) {
    return {
      valid: true,
      secure: false,
      message: '⚠️ 此 Base URL 並非 https，您的 API Key 傳輸時可能遭中間人攔截，強烈建議改用 https 端點',
    };
  }

  return { valid: true, secure: true };
}

/**
 * 測試 API 連線狀態
 */
export async function testLLMConnection(config: LLMConfig): Promise<{ success: boolean; message: string }> {
  if (!config.apiKey && config.provider !== 'custom') {
    return { success: false, message: '請輸入 API Key' };
  }
  if (!config.baseUrl) {
    return { success: false, message: '請輸入 Base URL' };
  }
  if (!config.model) {
    return { success: false, message: '請輸入模型名稱' };
  }

  const urlCheck = validateBaseUrl(config.baseUrl);
  if (!urlCheck.valid) {
    return { success: false, message: urlCheck.message! };
  }
  if (!urlCheck.secure) {
    return {
      success: false,
      message: '為保護 API Key 安全，暫不允許透過非 https 端點測試連線（localhost 除外）',
    };
  }

  const endpoint = `${cleanBaseUrl(config.baseUrl)}/chat/completions`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model.trim(),
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let msg = `HTTP ${res.status} ${res.statusText}`;
      try {
        const json = JSON.parse(errText);
        if (json.error?.message) {
          msg = json.error.message;
        }
      } catch {
        if (errText) msg = errText.slice(0, 120);
      }
      return { success: false, message: `連線失敗: ${msg}` };
    }

    return { success: true, message: '連線成功！API Key 與 Base URL 驗證通過' };
  } catch (err: any) {
    return { success: false, message: `網絡或連線錯誤: ${err.message || String(err)}` };
  }
}

/**
 * 呼叫 OpenAI-compatible SSE Streaming 介面。
 *
 * 逾時策略為「閒置逾時」：每收到一個 chunk（或串流自然結束）即重置計時器，
 * 只有連續 idleTimeoutMs 毫秒沒有任何新資料時才會中斷連線，因此輸出長度
 * 不受總時長限制。回傳值以 StreamResult 明確標示是正常結束、使用者中止、
 * 逾時中斷還是錯誤，呼叫端不應把「逾時」誤當成「完成」處理。
 */
export async function callLLMStream(
  messages: ChatMessage[],
  config: LLMConfig,
  callbacks: StreamCallbacks,
  idleTimeoutMs: number = DEFAULT_STREAM_IDLE_TIMEOUT_MS
): Promise<StreamResult> {
  const { apiKey, baseUrl, model, temperature, maxTokens } = config;
  if (!apiKey && config.provider !== 'custom') {
    throw new Error('未設定 API Key，請點擊「API 設定」設定您的 API Key');
  }
  if (!baseUrl) {
    throw new Error('未設定 Base URL');
  }
  if (!model) {
    throw new Error('未設定 Model 名稱');
  }

  const urlCheck = validateBaseUrl(baseUrl);
  if (!urlCheck.valid) {
    throw new Error(urlCheck.message);
  }
  if (!urlCheck.secure) {
    throw new Error('為保護 API Key 安全，暫不允許透過非 https 端點傳送請求（localhost 除外）');
  }

  const endpoint = `${cleanBaseUrl(baseUrl)}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const body: Record<string, unknown> = {
    model: model.trim(),
    messages,
    temperature: temperature ?? 0.7,
    stream: true,
  };
  if (maxTokens && maxTokens > 0) {
    body.max_tokens = maxTokens;
  }

  // Idle-timeout controller: reset on every chunk so long outputs are never
  // truncated by a total-request deadline; only silence triggers an abort.
  const idleController = new AbortController();
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      timedOut = true;
      idleController.abort();
    }, idleTimeoutMs);
  };

  const userSignal = callbacks.signal;
  const mergedSignal = userSignal
    ? AbortSignal.any([userSignal, idleController.signal])
    : idleController.signal;

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let fullText = '';

  resetIdleTimer();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: mergedSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API 請求失敗 (HTTP ${response.status})`;
      try {
        const json = JSON.parse(errorText);
        if (json.error?.message) {
          errorMessage = json.error.message;
        }
      } catch {
        if (errorText) errorMessage = errorText.slice(0, 150);
      }
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error('伺服器未回傳響應串流 (Response Body is empty)');
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    streamLoop: while (true) {
      const { done, value } = await reader.read();
      resetIdleTimer();
      if (done) break;

      let chunkStr = '';
      if (typeof value === 'string') {
        chunkStr = value;
      } else if (value) {
        try {
          chunkStr = decoder.decode(value as any, { stream: true });
        } catch {
          chunkStr = String(value);
        }
      }
      buffer += chunkStr;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') {
          break streamLoop;
        }

        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              callbacks.onChunk(content, fullText);
            }
          } catch {
            // parse error on partial chunk line, ignore
          }
        }
      }
    }

    if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
      try {
        const parsed = JSON.parse(buffer.trim().slice(6));
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          callbacks.onChunk(content, fullText);
        }
      } catch {
        // parse error on trailing buffer, ignore
      }
    }

    const result: StreamResult = { status: 'completed', text: fullText };
    callbacks.onFinish?.(result);
    return result;
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      const status: StreamFinishStatus = timedOut || err.name === 'TimeoutError' ? 'timeout' : 'aborted_by_user';
      const result: StreamResult = { status, text: fullText };
      callbacks.onFinish?.(result);
      return result;
    }
    if (err instanceof Error) {
      callbacks.onError?.(err);
    } else {
      callbacks.onError?.(new Error(String(err)));
    }
    throw err;
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
    // Always release the ReadableStream lock to prevent memory leaks
    try {
      reader?.releaseLock();
    } catch {
      // releaseLock may throw if stream is already closed; safe to ignore
    }
  }
}
