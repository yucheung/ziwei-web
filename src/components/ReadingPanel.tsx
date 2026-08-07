import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Settings,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  Square,
  Eye,
  EyeOff,
  Zap,
  BookOpen,
  KeyRound,
  Sliders,
  CheckCircle2,
  Trash2,
  PlayCircle,
  Terminal,
} from 'lucide-react';
import {
  LLMConfig,
  ChatMessage,
  StreamFinishStatus,
  PROVIDER_PRESETS,
  loadLLMConfig,
  saveLLMConfig,
  clearLLMConfig,
  callLLMStream,
  testLLMConnection,
  validateBaseUrl,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
} from '../lib/llm';
import { buildReadingPrompt, ReadingType } from '../lib/prompts';
import { canonicalizeAstrolabeForReading, type AppLocale, type IFunctionalAstrolabe } from '../lib/chartModel';
import { renderMarkdown } from '../lib/markdown';
import { useTranslation, type TranslationKey } from '../i18n';

interface ReadingPanelProps {
  chart: IFunctionalAstrolabe | null;
}

const READING_TYPES: Array<{ id: ReadingType; labelKey: TranslationKey }> = [
  { id: 'overall', labelKey: 'reading.overall' },
  { id: 'palaces', labelKey: 'reading.palaces' },
  { id: 'mutagens', labelKey: 'reading.mutagens' },
  { id: 'patterns', labelKey: 'reading.patterns' },
  { id: 'comprehensive', labelKey: 'reading.comprehensive' },
];

const PALACE_OPTIONS: Array<{ id: string; key: TranslationKey }> = [
  { id: '\u547d\u5bae', key: 'palace.ming' },
  { id: '\u5144\u5f1f\u5bae', key: 'palace.xiongdi' },
  { id: '\u592b\u59bb\u5bae', key: 'palace.fuqi' },
  { id: '\u5b50\u5973\u5bae', key: 'palace.zinv' },
  { id: '\u8ca1\u5e1b\u5bae', key: 'palace.caibo' },
  { id: '\u75be\u5384\u5bae', key: 'palace.jie' },
  { id: '\u9077\u79fb\u5bae', key: 'palace.qianyi' },
  { id: '\u5096\u5f79\u5bae', key: 'palace.puyi' },
  { id: '\u5b98\u797f\u5bae', key: 'palace.guanlu' },
  { id: '\u7530\u5b85\u5bae', key: 'palace.tianzhai' },
  { id: '\u798f\u5fb7\u5bae', key: 'palace.fude' },
  { id: '\u7236\u6bcd\u5bae', key: 'palace.fumu' },
];

/**
 * 量測請求延遲用。獨立於元件之外，避免 react-hooks/purity 規則誤判
 * `performance.now()`（本身確實不純，但只在事件處理器內呼叫，不影響 render）
 * 是在渲染階段被呼叫。
 */
function nowMs(): number {
  return performance.now();
}

export const ReadingPanel: React.FC<ReadingPanelProps> = ({ chart }) => {
  const { t, locale } = useTranslation();
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(loadLLMConfig);
  const [readingType, setReadingType] = useState<ReadingType>('overall');
  const [customInstructions, setCustomInstructions] = useState('');
  const [focusPalace, setFocusPalace] = useState('');
  const [readingText, setReadingText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [finishStatus, setFinishStatus] = useState<StreamFinishStatus | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugPrompt, setDebugPrompt] = useState<{ systemPrompt: string; userPrompt: string } | null>(null);
  const [lastRequestMeta, setLastRequestMeta] = useState<{
    provider: string;
    model: string;
    status: StreamFinishStatus;
    latencyMs: number;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const outputEndRef = useRef<HTMLDivElement | null>(null);
  const lastMessagesRef = useRef<ChatMessage[] | null>(null);

  // Abort active SSE connection on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Sync config when modal closes
  const handleSaveConfig = (newConfig: LLMConfig) => {
    saveLLMConfig(newConfig);
    setLlmConfig(newConfig);
    setIsConfigOpen(false);
    setErrorMsg(null);
  };

  // Auto scroll to stream bottom
  useEffect(() => {
    if (isLoading && outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [readingText, isLoading]);

  const runStream = async (messages: ChatMessage[], baseText: string) => {
    lastMessagesRef.current = messages;
    setErrorMsg(null);
    setIsLoading(true);
    setFinishStatus(null);
    setCopied(false);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const requestStartedAt = nowMs();
    const recordMeta = (status: StreamFinishStatus) => {
      setLastRequestMeta({
        provider: currentProviderName,
        model: llmConfig.model,
        status,
        latencyMs: Math.round(nowMs() - requestStartedAt),
      });
    };

    try {
      await callLLMStream(messages, llmConfig, {
        signal: abortControllerRef.current.signal,
        onChunk: (_chunk, fullText) => {
          setReadingText(baseText + fullText);
        },
        onError: (err) => {
          setErrorMsg(`${t('reading.error.prefix')}: ${err.message || String(err)}`);
          setIsLoading(false);
          recordMeta('error');
        },
        onFinish: (result) => {
          setReadingText(baseText + result.text);
          setIsLoading(false);
          setFinishStatus(result.status);
          recordMeta(result.status);
        },
      }, DEFAULT_STREAM_IDLE_TIMEOUT_MS, locale);
    } catch (err: unknown) {
      if (!(err instanceof Error) || err.name !== 'AbortError') {
        const message = err instanceof Error ? err.message || String(err) : String(err);
        setErrorMsg(`${t('reading.error.apiError')}: ${message}`);
      }
      setIsLoading(false);
    }
  };

  const handleStartReading = async () => {
    if (!chart) {
      setErrorMsg(t('reading.error.noChart'));
      return;
    }

    if (!llmConfig.apiKey && llmConfig.provider !== 'custom') {
      setIsConfigOpen(true);
      setErrorMsg(t('reading.error.noKey'));
      return;
    }

    setReadingText('');

    // A-3: chart 為 App 層依目前 UI 顯示語言排出的 astrolabe (可能為 en-US 顯示字串)，
    // 先還原為 zh-TW canonical key 再交給 buildReadingPrompt，避免英文模式下 iztro
    // 原生的四化字母碼 (A/B/C/D)、亮度括號碼等對 LLM 毫無語意的縮寫混入 prompt。
    const appLocale: AppLocale = locale === 'zh-CN' ? 'zh-CN' : 'zh-TW';
    const canonicalChart = canonicalizeAstrolabeForReading(chart, appLocale);

    const { systemPrompt, userPrompt } = buildReadingPrompt(canonicalChart, {
      type: readingType,
      customInstructions,
      focusPalace: focusPalace || undefined,
      locale: appLocale,
    });

    setDebugPrompt({ systemPrompt, userPrompt });

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    await runStream(messages, '');
  };

  const handleContinueReading = async () => {
    if (!lastMessagesRef.current) return;

    const baseText = readingText;
    const continuePrompt =
      locale === 'zh-CN'
        ? '请从上方中断处直接接续输出，不要重复已经输出的内容，也不要加上任何开场白。'
        : '請從上方中斷處直接接續輸出，不要重複已經輸出過的內容，也不要加上任何開場白。';
    const continuationMessages: ChatMessage[] = [
      ...lastMessagesRef.current,
      { role: 'assistant', content: baseText },
      { role: 'user', content: continuePrompt },
    ];

    await runStream(continuationMessages, baseText);
  };

  const handleStopReading = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleCopy = () => {
    if (!readingText) return;
    navigator.clipboard.writeText(readingText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentProviderName =
    PROVIDER_PRESETS.find((p) => p.id === llmConfig.provider)?.name || llmConfig.provider;

  // A-1: 輸出區的 aria-live 只用於播報「狀態」而非整段串流文字本身
  // (串流逐字更新若整棵輸出樹都是 aria-live="polite"，會導致螢幕報讀器
  // 每個 chunk 都搶著唸，噪音極大)。因此輸出容器一律 aria-live="off"，
  // 由這個獨立、視覺隱藏的 role="status" 元素只在「狀態轉換」時播報一次。
  const statusMessage = errorMsg
    ? errorMsg
    : isLoading
    ? t('reading.status.loading')
    : finishStatus === 'completed'
    ? t('reading.status.completed')
    : finishStatus === 'aborted_by_user'
    ? t('reading.status.aborted')
    : finishStatus === 'timeout'
    ? t('reading.status.timeout')
    : '';

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 shadow-2xl relative">
      {/* Header & Model Settings toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {t('reading.title')}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('reading.currentModel')}：
              <span className="text-amber-600 dark:text-amber-400 font-mono font-medium ml-1">
                {currentProviderName} ({llmConfig.model || t('reading.notSet')})
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsConfigOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:border-amber-500/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <Settings className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          {t('reading.apiSettings')}
        </button>
      </div>

      {/* API Key Missing Banner */}
      {!llmConfig.apiKey && llmConfig.provider !== 'custom' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-bounce" aria-hidden="true" />
            <span>{t('reading.noApiKey')}</span>
          </div>
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition-colors shrink-0 ml-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {t('reading.goSettings')}
          </button>
        </div>
      )}

      {/* Topic Pills */}
      <div className="space-y-2">
        <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">{t('reading.chooseTopic')}</span>
        <div role="radiogroup" aria-label={t('reading.chooseTopic')} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {READING_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              role="radio"
              aria-checked={readingType === type.id}
              onClick={() => setReadingType(type.id)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                readingType === type.id
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500/60 text-amber-700 dark:text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {t(type.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Focus & Custom Questions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {readingType === 'palaces' && (
          <div>
            <label htmlFor="focus-palace-select" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('reading.focusPalace')}</label>
            <select
              id="focus-palace-select"
              value={focusPalace}
              onChange={(e) => setFocusPalace(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <option value="">{t('reading.defaultFocus')}</option>
              {PALACE_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {t(p.key)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={readingType === 'palaces' ? 'sm:col-span-2' : 'sm:col-span-3'}>
          <label htmlFor="custom-instructions-input" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{t('reading.customQ')}</label>
          <input
            id="custom-instructions-input"
            type="text"
            placeholder={t('reading.customPlaceholder')}
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!isLoading ? (
          <button
            type="button"
            onClick={handleStartReading}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {t('reading.generate')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopReading}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm hover:bg-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <Square className="w-4 h-4 fill-rose-600 dark:fill-rose-300" aria-hidden="true" />
            {t('reading.stop')}
          </button>
        )}

        {readingText && (
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-400 dark:hover:border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> {t('reading.copied')}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" aria-hidden="true" /> {t('reading.copy')}
              </>
            )}
          </button>
        )}
      </div>

      {/* LLM Debug Panel: read-only view of the exact prompt sent + last request meta */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowDebugPanel((prev) => !prev)}
          aria-expanded={showDebugPanel}
          className="w-fit flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
        >
          <Terminal className="w-3.5 h-3.5" aria-hidden="true" />
          {showDebugPanel ? t('llm.debug.hideInput') : t('llm.debug.showInput')}
        </button>

        {showDebugPanel && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-3 text-xs">
            {debugPrompt ? (
              <>
                <div>
                  <p className="font-semibold text-slate-600 dark:text-slate-400 mb-1">{t('llm.debug.systemPrompt')}</p>
                  <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2">
                    {debugPrompt.systemPrompt}
                  </pre>
                </div>
                <div>
                  <p className="font-semibold text-slate-600 dark:text-slate-400 mb-1">{t('llm.debug.userPrompt')}</p>
                  <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2">
                    {debugPrompt.userPrompt}
                  </pre>
                </div>
              </>
            ) : (
              <p className="text-slate-500 dark:text-slate-500">{t('llm.debug.noPromptYet')}</p>
            )}

            {lastRequestMeta && (
              <div>
                <p className="font-semibold text-slate-600 dark:text-slate-400 mb-1">{t('llm.debug.lastRequest')}</p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  <dt className="text-slate-500 dark:text-slate-500">{t('llm.debug.provider')}</dt>
                  <dd>{lastRequestMeta.provider}</dd>
                  <dt className="text-slate-500 dark:text-slate-500">{t('llm.debug.model')}</dt>
                  <dd>{lastRequestMeta.model || t('reading.notSet')}</dd>
                  <dt className="text-slate-500 dark:text-slate-500">{t('llm.debug.status')}</dt>
                  <dd>{lastRequestMeta.status}</dd>
                  <dt className="text-slate-500 dark:text-slate-500">{t('llm.debug.latency')}</dt>
                  <dd>{lastRequestMeta.latencyMs} ms</dd>
                </dl>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Timeout Banner: idle-timeout interrupted the stream, content may be incomplete */}
      {!isLoading && finishStatus === 'timeout' && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <span>{t('reading.timeoutBanner')}</span>
          </div>
          <button
            type="button"
            onClick={handleContinueReading}
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {t('reading.continueGenerating')}
          </button>
        </div>
      )}

      {/* Status announcer: sr-only, announces state transitions only (not the streaming text itself) */}
      <div role="status" className="sr-only">
        {statusMessage}
      </div>

      {/* Reading Output Area */}
      <div
        aria-live="off"
        aria-busy={isLoading}
        className="min-h-[220px] max-h-[500px] overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 p-4 sm:p-5 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed space-y-3 font-sans selection:bg-amber-500/30"
      >
        {readingText ? (
          <div className="font-sans text-slate-800 dark:text-slate-200 leading-relaxed space-y-2">
            {renderMarkdown(readingText)}
          </div>
        ) : isLoading ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 text-amber-600 dark:text-amber-400 animate-spin" />
            <p className="text-xs">{t('reading.loading')}</p>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            <p className="text-xs">{t('reading.hint')}</p>
          </div>
        )}
        <div ref={outputEndRef} />
      </div>

      {/* API Config Modal */}
      {isConfigOpen && (
        <LLMConfigModal
          config={llmConfig}
          onClose={() => setIsConfigOpen(false)}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  );
};

interface ModalProps {
  config: LLMConfig;
  onClose: () => void;
  onSave: (config: LLMConfig) => void;
}

const LLMConfigModal: React.FC<ModalProps> = ({ config, onClose, onSave }) => {
  const { t, locale } = useTranslation();
  const [formData, setFormData] = useState<LLMConfig>({ ...config });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; message: string; success?: boolean }>({
    loading: false,
    message: '',
  });
  const [clearedMsg, setClearedMsg] = useState<string | null>(null);

  const urlCheck = validateBaseUrl(formData.baseUrl, locale);
  const showHttpsWarning = urlCheck.valid && !urlCheck.secure;

  const handleClearKey = () => {
    if (!window.confirm(t('llm.clearKeyConfirm'))) {
      return;
    }
    clearLLMConfig();
    setFormData((prev) => ({ ...prev, apiKey: '' }));
    setClearedMsg(t('llm.clearKeyDone'));
  };

  const handleProviderChange = (providerId: string) => {
    const preset = PROVIDER_PRESETS.find((p) => p.id === providerId);
    if (preset && preset.id !== 'custom') {
      setFormData((prev) => ({
        ...prev,
        provider: providerId,
        baseUrl: preset.baseUrl,
        model: preset.defaultModel,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        provider: 'custom',
      }));
    }
  };

  const handleTest = async () => {
    setTestStatus({ loading: true, message: t('llm.testing') });
    const result = await testLLMConnection(formData, locale);
    setTestStatus({
      loading: false,
      message: result.message,
      success: result.success,
    });
  };

  const currentPreset = PROVIDER_PRESETS.find((p) => p.id === formData.provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            {t('llm.title')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('a11y.closeModal')}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-bold px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}
          className="space-y-4"
        >
          {/* Provider Preset Dropdown */}
          <div>
            <label htmlFor="llm-provider-select" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('llm.provider')}</label>
            <select
              id="llm-provider-select"
              value={formData.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {PROVIDER_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          {/* Base URL */}
          <div>
            <label htmlFor="llm-base-url-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('llm.baseUrl')}
            </label>
            <input
              id="llm-base-url-input"
              type="text"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            />
            {showHttpsWarning && (
              <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400 flex items-start gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{urlCheck.message}</span>
              </p>
            )}
          </div>

          {/* API Key */}
          <div>
            <label htmlFor="llm-api-key-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              {t('llm.apiKey')}
            </label>
            <div className="relative">
              <input
                id="llm-api-key-input"
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                aria-label={showApiKey ? t('a11y.hideApiKey') : t('a11y.showApiKey')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded p-1"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-amber-700/90 dark:text-amber-400/90 leading-relaxed">
              {t('llm.apiKeySecurityWarning')}
            </p>
            {clearedMsg && (
              <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">{clearedMsg}</p>
            )}
          </div>

          {/* Model Name */}
          <div>
            <label htmlFor="llm-model-name-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">{t('llm.modelName')}</label>
            <input
              id="llm-model-name-input"
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g. gemini-2.5-flash, deepseek-chat, gpt-4o"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            />

            {/* Model Suggestions */}
            {currentPreset && currentPreset.modelSuggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-600 dark:text-slate-400">{t('llm.quickSelect')}:</span>
                {currentPreset.modelSuggestions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormData({ ...formData, model: m })}
                    className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Temperature Slider */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 mb-1">
              <label htmlFor="llm-temperature-input">{t('llm.temperature')}: {formData.temperature}</label>
              <span className="text-[10px] text-slate-600 dark:text-slate-400">{t('llm.tempHint')}</span>
            </div>
            <input
              id="llm-temperature-input"
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            />
          </div>

          {/* Test Status Message */}
          {testStatus.message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testStatus.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              )}
              <span>{testStatus.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClearKey}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              {t('llm.clearKey')}
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTest}
                disabled={testStatus.loading}
                className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {testStatus.loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                {t('llm.test')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                {t('llm.save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
