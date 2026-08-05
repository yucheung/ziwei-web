import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Layers, Bot, TrendingUp, Download } from 'lucide-react';
import { useTranslation } from './i18n';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FourPillars } from './components/FourPillars';
import { getChart } from './lib/astro';
import type { Config, AstroType } from './lib/astro';
import { DEFAULT_CONFIG } from './lib/astro';
import { buildFourPillarsFromGanZhi } from './lib/bazi';
import { downloadChartCsv, downloadChartSummaryText, downloadShareCardImage } from './lib/export';
import type { ExportAstrolabe } from './lib/export';

const ChartGrid = lazy(() => import('./components/ChartGrid').then((m) => ({ default: m.ChartGrid })));
const FortunePanel = lazy(() => import('./components/FortunePanel').then((m) => ({ default: m.FortunePanel })));
const ReadingPanel = lazy(() => import('./components/ReadingPanel').then((m) => ({ default: m.ReadingPanel })));
const MatchPanel = lazy(() => import('./components/MatchPanel').then((m) => ({ default: m.MatchPanel })));

const LoadingFallback = () => (
  <div className="glass-panel p-12 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-center text-slate-500 dark:text-slate-400 min-h-[300px]">
    <div className="flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium">載入中... / Loading...</span>
    </div>
  </div>
);

export default function App() {
  const { locale, t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const [solarDate, setSolarDate] = useState('2000-08-16');
  const [timeIndex, setTimeIndex] = useState('2'); // 丑時 (1:00 - 3:00)
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar');

  // 真太陽時修正：經度 + 精確出生時間 (兩者皆填才會套用修正，預設空白 = 不啟用)
  const [longitude, setLongitude] = useState('');
  const [preciseTime, setPreciseTime] = useState('');
  const parsedLongitude = longitude.trim() === '' ? undefined : parseFloat(longitude);
  const hasValidLongitude =
    parsedLongitude !== undefined && !Number.isNaN(parsedLongitude) && parsedLongitude >= -180 && parsedLongitude <= 180;
  const solarTimeActive = hasValidLongitude && preciseTime.trim() !== '';

  const [viewMode, setViewMode] = useState<'single' | 'match'>('single');
  const [activeTab, setActiveTab] = useState<'chart' | 'fortunes' | 'reading'>('chart');

  // 斗數設定
  const [config, setConfig] = useState<Config>(() => ({ ...DEFAULT_CONFIG }));
  const [astroType, setAstroType] = useState<AstroType>('heaven');

  const iztroLanguage = locale === 'en' ? 'en-US' : 'zh-TW';

  // 初始化星盤資料
  const [astrolabe, setAstrolabe] = useState(() => {
    try {
      return getChart({
        date: '2000-08-16',
        timeIndex: 2,
        gender: 'male',
        language: iztroLanguage,
        config: DEFAULT_CONFIG,
        astroType: 'heaven',
      });
    } catch {
      return null;
    }
  });

  // 當語言變更時，自動更新星盤語言
  useEffect(() => {
    try {
      const chart = getChart({
        date: solarDate,
        timeIndex: solarTimeActive ? preciseTime : parseInt(timeIndex, 10),
        gender,
        isLunar: calendarType === 'lunar',
        language: iztroLanguage,
        config,
        astroType,
        ...(solarTimeActive ? { longitude: parsedLongitude } : {}),
      });
      setAstrolabe(chart);
    } catch {
      // 保留原有星盤
    }
  }, [locale]);

  // 四柱八字 (由已排好的命盤干支直接組出，避免與命盤日期產生分歧)
  const fourPillars = useMemo(() => {
    const chineseDate = astrolabe?.rawDates?.chineseDate;
    if (!chineseDate) return null;
    return buildFourPillarsFromGanZhi(
      chineseDate.yearly,
      chineseDate.monthly,
      chineseDate.daily,
      chineseDate.hourly,
    );
  }, [astrolabe]);

  // 匯出 / 分享
  const chartCaptureRef = useRef<HTMLDivElement>(null);
  const [imageExportError, setImageExportError] = useState(false);

  const handleExportCsv = () => {
    if (!astrolabe) return;
    downloadChartCsv(astrolabe as unknown as ExportAstrolabe);
  };

  const handleExportSummary = () => {
    if (!astrolabe) return;
    downloadChartSummaryText(astrolabe as unknown as ExportAstrolabe);
  };

  const handleExportImage = async () => {
    if (!chartCaptureRef.current) return;
    setImageExportError(false);
    try {
      await downloadShareCardImage(chartCaptureRef.current);
    } catch {
      setImageExportError(true);
    }
  };

  const handleGenerateChart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const chart = getChart({
        date: solarDate,
        timeIndex: solarTimeActive ? preciseTime : parseInt(timeIndex, 10),
        gender,
        isLunar: calendarType === 'lunar',
        language: iztroLanguage,
        config,
        astroType,
        ...(solarTimeActive ? { longitude: parsedLongitude } : {}),
      });
      setAstrolabe(chart);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('app.chartError'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/30 via-slate-50 to-slate-50 dark:from-indigo-950/40 dark:via-slate-950 dark:to-slate-950 transition-colors duration-300">
      {/* Top Header */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <ErrorBoundary>
          <Suspense fallback={<LoadingFallback />}>
            {viewMode === 'match' ? (
              <MatchPanel
                initialPersonA={{
                  name: t('match.defaultPersonA'),
                  date: solarDate,
                  timeIndex,
                  gender,
                }}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Control Panel / Birth Input Form */}
                <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
                  <InputForm
                    solarDate={solarDate}
                    setSolarDate={setSolarDate}
                    timeIndex={timeIndex}
                    setTimeIndex={setTimeIndex}
                    gender={gender}
                    setGender={setGender}
                    calendarType={calendarType}
                    setCalendarType={setCalendarType}
                    config={config}
                    setConfig={setConfig}
                    astroType={astroType}
                    setAstroType={setAstroType}
                    longitude={longitude}
                    setLongitude={setLongitude}
                    preciseTime={preciseTime}
                    setPreciseTime={setPreciseTime}
                    solarTimeActive={solarTimeActive}
                    onSubmit={handleGenerateChart}
                  />
                </aside>

                {/* Right / Center Astrolabe Grid & Reading Panel */}
                <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
                  {/* Tab Navigation */}
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('chart')}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                        activeTab === 'chart'
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      {t('tab.chart')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('fortunes')}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                        activeTab === 'fortunes'
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      {t('tab.fortunes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('reading')}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                        activeTab === 'reading'
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                      }`}
                    >
                      <Bot className="w-4 h-4" />
                      {t('tab.reading')}
                    </button>
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'chart' && (
                    <div className="space-y-6">
                      <div ref={chartCaptureRef} className="space-y-6">
                        {fourPillars && (
                          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                              {t('chart.fourPillars')}
                            </h3>
                            <FourPillars pillars={fourPillars} />
                          </div>
                        )}
                        <ChartGrid astrolabe={astrolabe} />
                      </div>

                      {astrolabe && (
                        <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5" />
                            {t('chart.exportSection')}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={handleExportCsv}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              {t('chart.exportCsv')}
                            </button>
                            <button
                              type="button"
                              onClick={handleExportSummary}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              {t('chart.exportSummary')}
                            </button>
                            <button
                              type="button"
                              onClick={handleExportImage}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              {t('chart.exportImage')}
                            </button>
                          </div>
                          {imageExportError && (
                            <p className="text-xs text-rose-500 dark:text-rose-400">{t('chart.exportImageError')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'fortunes' && <FortunePanel astrolabe={astrolabe} />}
                  {activeTab === 'reading' && <ReadingPanel chart={astrolabe} />}
                </section>
              </div>
            )}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
