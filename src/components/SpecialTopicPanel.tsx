import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, BookOpen, RefreshCw, ShieldAlert, Sparkles, Square } from 'lucide-react';
import { useTranslation, type TranslationKey } from '../i18n';
import { formatKnowledgeSource, traceCitations } from '../lib/citationTracer';
import {
  callLLMStream,
  DEFAULT_STREAM_IDLE_TIMEOUT_MS,
  loadLLMConfig,
  type StreamFinishStatus,
} from '../lib/llm';
import { renderMarkdown } from '../lib/markdown';
import { buildSpecialTopicPrompt, type TopicType } from '../lib/specialTopics';
import type { AnalyzedChart } from '../lib/chartAnalyzer';
import type { RuleResult } from '../lib/rules/types';

export interface SpecialTopicPanelProps {
  chart: AnalyzedChart;
  rules: RuleResult[];
}

const TOPIC_OPTIONS: Array<{ id: TopicType; labelKey: TranslationKey }> = [
  { id: 'career', labelKey: 'specialTopic.career' },
  { id: 'wealth', labelKey: 'specialTopic.wealth' },
  { id: 'relationship', labelKey: 'specialTopic.relationship' },
  { id: 'health', labelKey: 'specialTopic.health' },
  { id: 'education', labelKey: 'specialTopic.education' },
];

export function SpecialTopicPanel({ chart, rules }: SpecialTopicPanelProps) {
  const { t, locale } = useTranslation();
  const [topic, setTopic] = useState<TopicType>('career');
  const [llmConfig] = useState(loadLLMConfig);
  const [readingText, setReadingText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [finishStatus, setFinishStatus] = useState<StreamFinishStatus | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const outputEndRef = useRef<HTMLDivElement | null>(null);

  const promptPlan = useMemo(() => buildSpecialTopicPrompt(chart, topic, rules), [chart, topic, rules]);
  const citations = useMemo(() => traceCitations(chart), [chart]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (isLoading) outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [readingText, isLoading]);

  const handleStartReading = async () => {
    setReadingText('');
    setErrorMsg(null);
    setFinishStatus(null);
    setIsLoading(true);

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    try {
      const systemPrompt = [t('specialTopic.systemPrompt'), promptPlan.sensitivityInstruction]
        .filter(Boolean)
        .join('\n\n');

      await callLLMStream(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: promptPlan.userPrompt },
        ],
        llmConfig,
        {
          signal: abortControllerRef.current.signal,
          onChunk: (_chunk, fullText) => setReadingText(fullText),
          onError: (error) => {
            setErrorMsg(t('specialTopic.error', { message: error.message || String(error) }));
            setIsLoading(false);
          },
          onFinish: (result) => {
            setReadingText(result.text);
            setFinishStatus(result.status);
            setIsLoading(false);
          },
        },
        DEFAULT_STREAM_IDLE_TIMEOUT_MS,
        locale,
      );
    } catch (error: unknown) {
      if (!(error instanceof Error) || error.name !== 'AbortError') {
        const message = error instanceof Error ? error.message || String(error) : String(error);
        setErrorMsg(t('specialTopic.error', { message }));
      }
      setIsLoading(false);
    }
  };

  const handleStopReading = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
    setFinishStatus('aborted_by_user');
  };

  const statusMessage = errorMsg
    ? errorMsg
    : isLoading
      ? t('specialTopic.loading')
      : finishStatus === 'completed'
        ? t('specialTopic.completed')
        : finishStatus === 'aborted_by_user'
          ? t('specialTopic.aborted')
          : finishStatus === 'timeout'
            ? t('specialTopic.timeout')
            : '';

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 shadow-2xl relative">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('specialTopic.title')}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">{t('specialTopic.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">{t('specialTopic.chooseTopic')}</span>
        <div role="radiogroup" aria-label={t('specialTopic.chooseTopic')} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TOPIC_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={topic === option.id}
              onClick={() => setTopic(option.id)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                topic === option.id
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500/60 text-amber-700 dark:text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {llmConfig.provider !== 'custom' && !llmConfig.apiKey && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          {t('specialTopic.noApiKey')}
        </div>
      )}

      {promptPlan.config.sensitivity === 'high' && (
        <aside className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span>{t('specialTopic.sensitivityNotice')}</span>
        </aside>
      )}

      <div className="flex items-center gap-3">
        {!isLoading ? (
          <button
            type="button"
            onClick={handleStartReading}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {t('specialTopic.generate')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopReading}
            className="flex-1 py-3 px-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm hover:bg-rose-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <Square className="w-4 h-4 fill-rose-600 dark:fill-rose-300" aria-hidden="true" />
            {t('specialTopic.stop')}
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div
        aria-live="off"
        aria-busy={isLoading}
        className="min-h-[220px] max-h-[500px] overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 p-4 sm:p-5 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed space-y-3 font-sans selection:bg-amber-500/30"
      >
        {readingText ? (
          <div className="font-sans text-slate-800 dark:text-slate-200 leading-relaxed space-y-2">{renderMarkdown(readingText)}</div>
        ) : isLoading ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 text-amber-600 dark:text-amber-400 animate-spin" aria-hidden="true" />
            <p className="text-xs">{t('specialTopic.loading')}</p>
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            <p className="text-xs">{t('specialTopic.hint')}</p>
          </div>
        )}
        <div ref={outputEndRef} />
      </div>

      <section aria-label={t('specialTopic.sources')} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('specialTopic.sources')}</h4>
        {citations.length > 0 ? (
          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
            {citations.map((citation) => (
              <li key={`${citation.knowledgeId}-${citation.field}`}>
                [{citation.knowledgeId}] {formatKnowledgeSource(citation.source)} — {citation.field} ({citation.confidence})
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('specialTopic.noSources')}</p>
        )}
      </section>

      <div role="status" className="sr-only">{statusMessage}</div>
    </div>
  );
}
