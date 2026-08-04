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
import { useTranslation, type TranslationKey } from '../i18n';

interface ReadingPanelProps {
  chart: any;
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

export const ReadingPanel: React.FC<ReadingPanelProps> = ({ chart }) => {
  const { t } = useTranslation();
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
          setErrorMsg(`${t('reading.error.prefix')}: ${err.message || String(err)}`);
          setIsLoading(false);
        },
        onFinish: (fullText) => {
          setReadingText(fullText);
          setIsLoading(false);
        },
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg(`${t('reading.error.apiError')}: ${err.message || String(err)}`);
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
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col gap-5 shadow-2xl relative">
      {/* Header & Model Settings toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              {t('reading.title')}
            </h3>
            <p className="text-xs text-slate-400">
              {t('reading.currentModel')}：
              <span className="text-amber-400 font-mono font-medium ml-1">
                {currentProviderName} ({llmConfig.model || t('reading.notSet')})
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsConfigOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Settings className="w-3.5 h-3.5 text-amber-400" />
          {t('reading.apiSettings')}
        </button>
      </div>

      {/* API Key Missing Banner */}
      {!llmConfig.apiKey && llmConfig.provider !== 'custom' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <span>{t('reading.noApiKey')}</span>
          </div>
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition-colors shrink-0 ml-2 cursor-pointer"
          >
            {t('reading.goSettings')}
          </button>
        </div>
      )}

      {/* Topic Pills */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-400">{t('reading.chooseTopic')}</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {READING_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setReadingType(type.id)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                readingType === type.id
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
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
            <label className="block text-xs font-medium text-slate-400 mb-1">{t('reading.focusPalace')}</label>
            <select
              value={focusPalace}
              onChange={(e) => setFocusPalace(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
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
          <label className="block text-xs font-medium text-slate-400 mb-1">{t('reading.customQ')}</label>
          <input
            type="text"
            placeholder={t('reading.customPlaceholder')}
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!isLoading ? (
          <button
            type="button"
            onClick={handleStartReading}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {t('reading.generate')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopReading}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs sm:text-sm hover:bg-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
          >
            <Square className="w-4 h-4 fill-rose-300" />
            {t('reading.stop')}
          </button>
        )}

        {readingText && (
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" /> {t('reading.copied')}
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" /> {t('reading.copy')}
              </>
            )}
          </button>
        )}
      </div>

      {/* Error Message Banner */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Reading Output Area */}
      <div className="min-h-[220px] max-h-[500px] overflow-y-auto rounded-xl bg-slate-950/80 border border-slate-800/80 p-4 sm:p-5 text-slate-200 text-xs sm:text-sm leading-relaxed space-y-3 font-sans selection:bg-amber-500/30">
        {readingText ? (
          <div className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed">
            {readingText}
          </div>
        ) : isLoading ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
            <p className="text-xs">{t('reading.loading')}</p>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-slate-500 space-y-2 text-center">
            <BookOpen className="w-8 h-8 text-slate-700" />
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
  const { t } = useTranslation();
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
    setTestStatus({ loading: true, message: t('llm.testing') });
    const result = await testLLMConnection(formData);
    setTestStatus({
      loading: false,
      message: result.message,
      success: result.success,
    });
  };

  const currentPreset = PROVIDER_PRESETS.find((p) => p.id === formData.provider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 text-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            {t('llm.title')}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm font-bold px-2 py-1 rounded"
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
            <label className="block text-xs font-medium text-slate-300 mb-1.5">{t('llm.provider')}</label>
            <select
              value={formData.provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
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
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {t('llm.baseUrl')}
            </label>
            <input
              type="text"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              {t('llm.apiKey')}
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-10 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Model Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">{t('llm.modelName')}</label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g. gemini-2.5-flash, deepseek-chat, gpt-4o"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />

            {/* Model Suggestions */}
            {currentPreset && currentPreset.modelSuggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400">{t('llm.quickSelect')}:</span>
                {currentPreset.modelSuggestions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormData({ ...formData, model: m })}
                    className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-amber-300 hover:bg-slate-700 transition-colors font-mono"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Temperature Slider */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
              <span>{t('llm.temperature')}: {formData.temperature}</span>
              <span className="text-[10px] text-slate-400">{t('llm.tempHint')}</span>
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

          {/* Test Status Message */}
          {testStatus.message && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testStatus.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {testStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{testStatus.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleTest}
              disabled={testStatus.loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {testStatus.loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              {t('llm.test')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              {t('llm.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
