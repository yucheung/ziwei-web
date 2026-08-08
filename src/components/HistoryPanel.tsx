import { useCallback, useEffect, useState } from 'react';
import { History, Download, Trash2, Columns, ArrowLeft, RotateCcw } from 'lucide-react';
import { useTranslation } from '../i18n';
import { deleteReading, listReadings, type StoredReading } from '../lib/storage';
import { getLegacyChartIdVariants, isLegacyChartId } from '../lib/chartId';

export interface HistoryPanelProps {
  chartId: string;
  legacyChartId?: string;
  onSelectReading: (reading: StoredReading) => void;
}

function chartReadingIds(chartId: string, legacyChartId?: string): string | string[] {
  if (!legacyChartId || legacyChartId === chartId) return chartId;

  const ids = [chartId, ...getLegacyChartIdVariants(legacyChartId)];
  return [...new Set(ids)];
}

export function HistoryPanel({ chartId, legacyChartId, onSelectReading }: HistoryPanelProps) {
  const { locale, t } = useTranslation();
  const [readings, setReadings] = useState<StoredReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  const refreshReadings = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await listReadings(chartReadingIds(chartId, legacyChartId));
      setReadings(list);
      setError(undefined);
    } catch {
      setError(t('history.error'));
    } finally {
      setIsLoading(false);
    }
  }, [chartId, legacyChartId, t]);

  useEffect(() => {
    let cancelled = false;

    void listReadings(chartReadingIds(chartId, legacyChartId))
      .then((loaded) => {
        if (cancelled) return;
        setReadings(loaded);
        setError(undefined);
      })
      .catch(() => {
        if (!cancelled) setError(t('history.error'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [chartId, legacyChartId, t]);

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('history.deleteConfirm'))) return;

    try {
      await deleteReading(id);
      setStatus(t('history.deleted'));
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      await refreshReadings();
    } catch {
      setError(t('history.error'));
    }
  };

  const handleExportJson = () => {
    if (readings.length === 0) return;
    const blob = new Blob([JSON.stringify(readings, null, 2)], { type: 'application/json' });
    const urlApi = globalThis.URL;

    if (typeof urlApi?.createObjectURL !== 'function') {
      setError(t('history.error'));
      return;
    }

    try {
      const url = urlApi.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reading-history-${chartId}.json`;
      link.click();
      urlApi.revokeObjectURL?.(url);
      setStatus(t('history.exported'));
      setError(undefined);
    } catch {
      setError(t('history.error'));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const formatDate = (createdAt: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(createdAt));

  const getRuleCount = (reading: StoredReading): number =>
    Array.isArray(reading.rules) ? reading.rules.length : 0;

  const getSummary = (text: string): string => {
    const trimmed = text.trim();
    if (trimmed.length <= 100) return trimmed;
    return `${trimmed.slice(0, 100)}...`;
  };

  const compareReadings = isComparing && selectedIds.length === 2
    ? readings.filter((r) => selectedIds.includes(r.id)).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    : [];

  return (
    <section className="glass-panel p-5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4" aria-labelledby="history-title">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <h2 id="history-title" className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <History className="w-5 h-5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
          {t('history.title')}
        </h2>

        {readings.length > 0 && !isComparing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={selectedIds.length !== 2}
              onClick={() => setIsComparing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Columns className="w-3.5 h-3.5" aria-hidden="true" />
              {t('history.compare', { count: String(selectedIds.length) })}
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              {t('history.exportJson')}
            </button>
          </div>
        )}

        {isComparing && (
          <button
            type="button"
            onClick={() => setIsComparing(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            {t('history.closeCompare')}
          </button>
        )}
      </div>

      {status && <p className="text-xs text-emerald-700 dark:text-emerald-300" role="status">{status}</p>}
      {error && <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('history.loading')}</p>
      ) : readings.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('history.empty')}</p>
      ) : isComparing && compareReadings.length === 2 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Columns className="w-4 h-4 text-amber-500" aria-hidden="true" />
            {t('history.comparing')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white/50 dark:bg-slate-900/50 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{t('history.readingA')}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  {formatDate(compareReadings[0].createdAt)}
                  {isLegacyChartId(compareReadings[0].chartId) && <span>{t('history.legacyWarning')}</span>}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {t('history.rulesCount', { count: String(getRuleCount(compareReadings[0])) })}
              </p>
              <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-80 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                {compareReadings[0].reading}
              </div>
              <button
                type="button"
                onClick={() => onSelectReading(compareReadings[0])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                {t('history.restore')}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-white/50 dark:bg-slate-900/50 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{t('history.readingB')}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  {formatDate(compareReadings[1].createdAt)}
                  {isLegacyChartId(compareReadings[1].chartId) && <span>{t('history.legacyWarning')}</span>}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {t('history.rulesCount', { count: String(getRuleCount(compareReadings[1])) })}
              </p>
              <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-80 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 rounded-lg">
                {compareReadings[1].reading}
              </div>
              <button
                type="button"
                onClick={() => onSelectReading(compareReadings[1])}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                {t('history.restore')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {selectedIds.length > 0 && selectedIds.length < 2 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {t('history.selectTwoToCompare')}
            </p>
          )}
          <ul className="space-y-2">
            {readings.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <li key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-white/50 dark:bg-slate-900/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`compare-${item.id}`}
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        aria-label={t('history.selectForCompare')}
                      />
                      <time className="text-xs font-semibold text-slate-700 dark:text-slate-300" dateTime={item.createdAt}>
                        {formatDate(item.createdAt)}
                      </time>
                      {isLegacyChartId(item.chartId) && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {t('history.legacyWarning')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      {t('history.rulesCount', { count: String(getRuleCount(item)) })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg">
                    {getSummary(item.reading)}
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onSelectReading(item)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                    >
                      <RotateCcw className="w-3 h-3" aria-hidden="true" />
                      {t('history.restore')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                      {t('history.delete')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
