/**
 * OpenAI-Compatible 多模型 LLM Client 層
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

export const STORAGE_KEY = 'ziwei_llm_config';

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: 'gemini',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  apiKey: '',
  model: 'gemini-2.5-flash',
  temperature: 0.7,
  maxTokens: 3000,
};

export function loadLLMConfig(): LLMConfig {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_LLM_CONFIG };
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_LLM_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load LLM config from localStorage:', e);
  }
  return { ...DEFAULT_LLM_CONFIG };
}

export function saveLLMConfig(config: LLMConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save LLM config to localStorage:', e);
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onChunk: (chunk: string, fullText: string) => void;
  onError?: (err: Error) => void;
  onFinish?: (fullText: string) => void;
  signal?: AbortSignal;
}

export function cleanBaseUrl(url: string): string {
  let cleaned = (url || '').trim();
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
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

function decodeChunk(value: any, decoder: TextDecoder): string {
  if (typeof value === 'string') return value;
  if (!value) return '';

  try {
    const decoded = decoder.decode(value, { stream: true });
    if (decoded) return decoded;
  } catch {}

  try {
    if (value.length !== undefined) {
      const bytes = new Uint8Array(value);
      return new TextDecoder('utf-8').decode(bytes);
    }
  } catch {}

  return String(value);
}

/**
 * 呼叫 OpenAI-compatible SSE Streaming 介面
 */
export async function callLLMStream(
  messages: ChatMessage[],
  config: LLMConfig,
  callbacks: StreamCallbacks
): Promise<string> {
  const { apiKey, baseUrl, model, temperature } = config;
  if (!apiKey && config.provider !== 'custom') {
    throw new Error('未設定 API Key，請點擊「API 設定」設定您的 API Key');
  }
  if (!baseUrl) {
    throw new Error('未設定 Base URL');
  }
  if (!model) {
    throw new Error('未設定 Model 名稱');
  }

  const endpoint = `${cleanBaseUrl(baseUrl)}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (apiKey.trim()) {
    headers['Authorization'] = `Bearer ${apiKey.trim()}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: model.trim(),
      messages,
      temperature: temperature ?? 0.7,
      stream: true,
    }),
    signal: callbacks.signal,
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

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
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
          callbacks.onFinish?.(fullText);
          return fullText;
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
          } catch (e) {
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
      } catch (e) {}
    }

    callbacks.onFinish?.(fullText);
    return fullText;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      callbacks.onFinish?.(fullText);
      return fullText;
    }
    callbacks.onError?.(err);
    throw err;
  }
}
