import { useCallback, useEffect, useState } from 'react';
import { Bookmark, Pencil, Save, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { ChartConfig } from '../lib/chartConfig';
import { deleteChart, listCharts, saveChart, type StoredChart } from '../lib/storage';

export interface CollectionPanelProps {
  currentBirthData: ChartConfig | null;
  onLoad: (birthData: ChartConfig) => void;
}

function createChartId(): string {
  return globalThis.crypto.randomUUID();
}

export function CollectionPanel({ currentBirthData, onLoad }: CollectionPanelProps) {
  const { locale, t } = useTranslation();
  const [charts, setCharts] = useState<StoredChart[]>([]);
  const [saveName, setSaveName] = useState('');
  const [editingChart, setEditingChart] = useState<StoredChart | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();

  const refreshCharts = useCallback(async () => {
    setIsLoading(true);
    try {
      setCharts(await listCharts());
      setError(undefined);
    } catch {
      setError(t('collection.error'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    void listCharts()
      .then((loadedCharts) => {
        if (cancelled) return;
        setCharts(loadedCharts);
        setError(undefined);
      })
      .catch(() => {
        if (!cancelled) setError(t('collection.error'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSaveCurrent = async () => {
    if (!currentBirthData) return;

    setIsSaving(true);
    try {
      await saveChart({
        id: createChartId(),
        name: saveName.trim() || t('collection.untitled'),
        birthData: currentBirthData,
        createdAt: new Date().toISOString(),
      });
      setSaveName('');
      setStatus(t('collection.saved'));
      await refreshCharts();
    } catch {
      setError(t('collection.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRename = async () => {
    if (!editingChart) return;

    const name = editingName.trim();
    if (!name) {
      setError(t('collection.nameRequired'));
      return;
    }

    try {
      await saveChart({ ...editingChart, name });
      setEditingChart(null);
      setEditingName('');
      setStatus(t('collection.renamed'));
      await refreshCharts();
    } catch {
      setError(t('collection.error'));
    }
  };

  const handleDelete = async (chart: StoredChart) => {
    if (!window.confirm(t('collection.deleteConfirm', { name: chart.name }))) return;

    try {
      await deleteChart(chart.id);
      setStatus(t('collection.deleted'));
      await refreshCharts();
    } catch {
      setError(t('collection.error'));
    }
  };

  const formatSavedDate = (createdAt: string) => new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(createdAt));

  const birthDateLabel = (birthData: ChartConfig) =>
    birthData.calendarType === 'lunar' ? t('collection.lunarDate') : t('collection.solarDate');
  const birthDate = (birthData: ChartConfig) =>
    birthData.calendarType === 'lunar' ? birthData.lunarDate : birthData.solarDate;

  return (
    <section className="glass-panel p-5 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 space-y-4" aria-labelledby="collection-title">
      <h2 id="collection-title" className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
        <Bookmark className="w-5 h-5 text-amber-500 dark:text-amber-400" aria-hidden="true" />
        {t('collection.title')}
      </h2>

      <div className="flex gap-2">
        <label className="sr-only" htmlFor="collection-save-name">{t('collection.name')}</label>
        <input
          id="collection-save-name"
          type="text"
          value={saveName}
          onChange={(event) => setSaveName(event.target.value)}
          placeholder={t('collection.namePlaceholder')}
          className="min-w-0 flex-1 px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        />
        <button
          type="button"
          disabled={!currentBirthData || isSaving}
          onClick={() => void handleSaveCurrent()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 enabled:hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <Save className="w-3.5 h-3.5" aria-hidden="true" />
          {t('collection.saveCurrent')}
        </button>
      </div>

      {status && <p className="text-xs text-emerald-700 dark:text-emerald-300" role="status">{status}</p>}
      {error && <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('collection.loading')}</p>
      ) : charts.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('collection.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {charts.map((chart) => {
            const isEditing = editingChart?.id === chart.id;
            return (
              <li key={chart.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2">
                {isEditing ? (
                  <div className="flex gap-2">
                    <label className="sr-only" htmlFor={`collection-rename-${chart.id}`}>{t('collection.name')}</label>
                    <input
                      id={`collection-rename-${chart.id}`}
                      type="text"
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="min-w-0 flex-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm"
                    />
                    <button type="button" onClick={() => void handleRename()} className="text-xs font-semibold text-amber-700 dark:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded">
                      {t('collection.saveName')}
                    </button>
                    <button type="button" onClick={() => setEditingChart(null)} className="text-xs text-slate-600 dark:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded">
                      {t('collection.cancel')}
                    </button>
                  </div>
                ) : (
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{chart.name}</p>
                )}
                <dl className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div><dt className="inline">{birthDateLabel(chart.birthData)}：</dt><dd className="inline">{birthDate(chart.birthData) ?? t('collection.unknown')}</dd></div>
                  <div><dt className="inline">{t('collection.birthTime')}：</dt><dd className="inline">{String(chart.birthData.hour)}</dd></div>
                  <div><dt className="inline">{t('collection.savedAt')}：</dt><dd className="inline"><time dateTime={chart.createdAt}>{formatSavedDate(chart.createdAt)}</time></dd></div>
                </dl>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => onLoad(chart.birthData)} className="text-xs font-semibold text-amber-700 dark:text-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded">
                    {t('collection.load')}
                  </button>
                  {!isEditing && (
                    <button type="button" onClick={() => { setEditingChart(chart); setEditingName(chart.name); }} className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded">
                      <Pencil className="w-3 h-3" aria-hidden="true" />
                      {t('collection.rename')}
                    </button>
                  )}
                  <button type="button" onClick={() => void handleDelete(chart)} className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded">
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                    {t('collection.delete')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
