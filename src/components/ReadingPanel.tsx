import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Settings,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Square,
  Eye,
  EyeOff,
  Zap,
  BookOpen,
  KeyRound,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import {
  LLMConfig,
  PROVIDER_PRESETS,
  loadLLMConfig,
  saveLLMConfig,
  callLLMStream,
  testLLMConnection,
} from '../lib/llm';
import { buildReadingPrompt, ReadingType } from '../lib/prompts';

interface ReadingPanelProps {
  chart: any;
}

export const ReadingPanel: React.FC<ReadingPanelProps> = ({ chart }) => {
  const [llmConfig, setLlmConfig] = useState<LLMConfig>(loadLLMConfig);
  const [readingType, setReadingType] = useState<ReadingType>('overall');
  const [customInstructions, setCustomInstructions] = useState('');
  const [focusPalace, setFocusPalace] = useState('');
  const [readingText, setReadingText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const outputEndRef = useRef<HTMLDivElement | null>(null);

  // 元件卸載時中斷進行中的 SSE 連線
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // 當配置 Modal 關閉時同步最新載入的 config
  const handleSaveConfig = (newConfig: LLMConfig) => {
    saveLLMConfig(newConfig);
    setLlmConfig(newConfig);
    setIsConfigOpen(false);
    setErrorMsg(null);
  };

  // 自動捲動到串流文字底部
  useEffect(() => {
    if (isLoading && outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [readingText, isLoading]);

  const handleStartReading = async () => {
    if (!chart) {
      setErrorMsg('請先在上表單輸入生辰資料並生成命盤！');
      return;
    }

    if (!llmConfig.apiKey && llmConfig.provider !== 'custom') {
      setIsConfigOpen(true);
      setErrorMsg('請先在設定中輸入您的 API Key。');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    setReadingText('');
    setCopied(false);

    const { systemPrompt, userPrompt } = buildReadingPrompt(chart, {
      type: readingType,
      customInstructions,
      focusPalace: focusPalace || undefined,
    });

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt },
    ];

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      await callLLMStream(messages, llmConfig, {
        signal: abortControllerRef.current.signal,
        onChunk: (_chunk, fullText) => {
          setReadingText(fullText);
        },
        onError: (err) => {
          setErrorMsg(`解讀出錯: ${err.message || String(err)}`);
          setIsLoading(false);
        },
        onFinish: (fullText) => {
          setReadingText(fullText);
          setIsLoading(false);
        },
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg(`呼叫 LLM 失敗: ${err.message || String(err)}`);
      }
      setIsLoading(false);
    }
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

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 shadow-2xl relative">
      {/* 區塊標題與模型設定開關 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/ dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              AI 多模型命盤結構化解讀
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 dark:text-slate-400">
              當前模型：
              <span className="text-amber-500 dark:text-amber-400 font-mono font-medium ml-1">
                {currentProviderName} ({llmConfig.model || '未設定'})
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsConfigOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300/ dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:text-amber-300 hover:border-amber-400 dark:hover:border-amber-500/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Settings className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          API 與模型設定
        </button>
      </div>

      {/* 尚未輸入 API Key 提示條 */}
      {!llmConfig.apiKey && llmConfig.provider !== 'custom' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-700 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 animate-bounce" />
            <span>
              尚未設定 API Key！點擊「API 與模型設定」即可開啓 Gemini / DeepSeek / Claude / OpenAI AI 深度解讀。
            </span>
          </div>
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition-colors shrink-0 ml-2 cursor-pointer"
          >
            前往設定
          </button>
        </div>
      )}

      {/* 解讀模式切換 Pills */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400">選擇解讀主題</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 'overall', label: '🌟 命格總覽' },
            { id: 'palaces', label: '🏛️ 十二宮剖析' },
            { id: 'mutagens', label: '⚡ 生年四化' },
            { id: 'patterns', label: '☯️ 格局吉凶' },
            { id: 'comprehensive', label: '📖 全盤大師解讀' },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setReadingType(type.id as ReadingType)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                readingType === type.id
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500/60 text-amber-600 dark:text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-slate-100/ dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 hover:border-slate-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* 補充提問與宮位焦點 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {readingType === 'palaces' && (
          <div>
            <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1">特定宮位焦點 (選填)</label>
            <select
              value={focusPalace}
              onChange={(e) => setFocusPalace(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">預設 (三大核心宮位)</option>
              {['命宮', '兄弟宮', '夫妻宮', '子女宮', '財帛宮', '疾厄宮', '遷移宮', '僕役宮', '官祿宮', '田宅宮', '福德宮', '父母宮'].map(
                (p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                )
              )}
            </select>
          </div>
        )}
        <div className={readingType === 'palaces' ? 'sm:col-span-2' : 'sm:col-span-3'}>
          <label className="block text-xs font-medium text-slate-400 dark:text-slate-500 dark:text-slate-400 mb-1">補充提問 / 關注事項 (選填)</label>
          <input
            type="text"
            placeholder="例如：想了解近兩年事業轉職與創業機會..."
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs placeholder:text-slate-400 dark:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* 按鈕與操作 */}
      <div className="flex items-center gap-3">
        {!isLoading ? (
          <button
            type="button"
            onClick={handleStartReading}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            生成 AI 命盤解讀
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopReading}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-300 font-bold text-xs sm:text-sm hover:bg-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
          >
            <Square className="w-4 h-4 fill-rose-300" />
            停止生成
          </button>
        )}

        {readingText && (
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-slate-100 hover:border-slate-300 dark:border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> 已複製
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400 dark:text-slate-500 dark:text-slate-400" /> 複製解讀
              </>
            )}
          </button>
        )}
      </div>

      {/* 錯誤訊息提示 */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 解讀輸出區域 */}
      <div className="min-h-[220px] max-h-[500px] overflow-y-auto rounded-xl bg-slate-50/ dark:bg-slate-950/80 border border-slate-200/ dark:border-slate-800/80 p-4 sm:p-5 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed space-y-3 font-sans selection:bg-amber-500/30">
        {readingText ? (
          <div className="whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200 leading-relaxed">
            {readingText}
          </div>
        ) : isLoading ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 dark:text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 text-amber-500 dark:text-amber-400 animate-spin" />
            <p className="text-xs">AI 大師正在運算紫微星盤與四化能量...</p>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2 text-center">
            <BookOpen className="w-8 h-8 text-slate-700" />
            <p className="text-xs">點擊「生成 AI 命盤解讀」，即刻獲得多模型結構化命理剖析</p>
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
  const [formData, setFormData] = useState<LLMConfig>({ ...config });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; message: string; success?: boolean }>({
    loading: false,
    message: '',
  });

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
    setTestStatus({ loading: true, message: '連線測試中...' });
    const result = await testLLMConnection(formData);
    setTestStatus({
      loading: false,
      message: result.message,
      success: result.success,
    });
  };

  const currentPreset = PROVIDER_PRESETS.find((p) => p.id === formData.provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/ dark:bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-base font-bold text-amber-600 dark:text-amber-300 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            OpenAI-Compatible LLM 多模型設定
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 text-sm font-bold px-2 py-1 rounded"
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
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">模型服務商預設</label>
            <select
              value={formData.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
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
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Base URL (OpenAI-compatible 端點)
            </label>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              API Key (暫存於此分頁，關閉即清除)
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">模型名稱 (Model Name)</label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g. gemini-2.5-flash, deepseek-chat, gpt-4o"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />

            {/* Model Suggestions */}
            {currentPreset && currentPreset.modelSuggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400">快速選擇:</span>
                {currentPreset.modelSuggestions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormData({ ...formData, model: m })}
                    className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:text-amber-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-mono"
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
              <span>溫度 (Temperature): {formData.temperature}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 dark:text-slate-400">0.1 (精準) ~ 1.0 (富文采)</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          {/* 測試結果訊息 */}
          {testStatus.message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testStatus.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
              )}
              <span>{testStatus.message}</span>
            </div>
          )}

          {/* 按鈕組合 */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleTest}
              disabled={testStatus.loading}
              className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {testStatus.loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              測試 API 連線
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              儲存設定
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
