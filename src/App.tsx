import { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { Layers, Bot, TrendingUp, Download, Share2 } from 'lucide-react';
import { useTranslation } from './i18n';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FourPillars } from './components/FourPillars';
import { RuleInfoPanel } from './components/RuleInfoPanel';
import { getChart } from './lib/astro';
import type { Config, AstroType, GetChartOptions } from './lib/astro';
import { DEFAULT_CONFIG } from './lib/astro';
import { chartConfigToGetChartOptions, type ChartConfig } from './lib/chartConfig';
import { buildFourPillarsFromGanZhi } from './lib/bazi';
import { downloadChartCsv, downloadChartSummaryText, downloadShareCardImage, downloadChartJson } from './lib/export';
import type { ExportAstrolabe } from './lib/export';
import { createShareUrl, decodeShareUrl } from './lib/shareUrl';
import { IZTRO_VERSION } from './components/RuleInfoPanel';

const ChartGrid = lazy(() => import('./components/ChartGrid').then((m) => ({ default: m.ChartGrid })));
const FortunePanel = lazy(() => import('./components/FortunePanel').then((m) => ({ default: m.FortunePanel })));
const ReadingPanel = lazy(() => import('./components/ReadingPanel').then((m) => ({ default: m.ReadingPanel })));
const MatchPanel = lazy(() => import('./components/MatchPanel').then((m) => ({ default: m.MatchPanel })));
const CollectionPanel = lazy(() => import('./components/CollectionPanel').then((m) => ({ default: m.CollectionPanel })));

const LoadingFallback = () => {
  const { t } = useTranslation();
  return (
    <div className="glass-panel p-12 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-center text-slate-500 dark:text-slate-400 min-h-[300px]">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">{t('app.loading')}</span>
      </div>
    </div>
  );
};

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

  const iztroLanguage = locale === 'zh-CN' ? 'zh-CN' : 'zh-TW';

  const buildBirthData = (): ChartConfig => ({
    ...(calendarType === 'lunar' ? { lunarDate: solarDate } : { solarDate }),
    calendarType,
    isLeapMonth: false,
    hour: solarTimeActive ? preciseTime : parseInt(timeIndex, 10),
    gender,
    algorithm: config.algorithm ?? 'zhongzhou',
    yearDivide: config.yearDivide ?? 'normal',
    dayDivide: config.dayDivide ?? 'forward',
    astroType,
    ...(solarTimeActive ? { longitude: parsedLongitude } : {}),
  });

  // 初始化星盤資料
  const [astrolabe, setAstrolabe] = useState(() => {
    try {
      return getChart(chartConfigToGetChartOptions(buildBirthData(), iztroLanguage));
    } catch {
      return null;
    }
  });

  // Form fields can change before regeneration, so the displayed astrolabe keeps
  // a separate snapshot for exports, persistence, and locale-driven rerenders.
  const [activeBirthData, setActiveBirthData] = useState<ChartConfig | null>(() =>
    astrolabe ? buildBirthData() : null
  );

  // 產生目前 astrolabe 時實際使用的 GetChartOptions (凍結快照)。
  // 供匯出等「必須與畫面上命盤完全對應」的功能使用，避免表單已變動但尚未
  // 重新排盤時，誤讀即時表單 state 而產生與實際命盤矛盾的輸出。
  const [lastChartOptions, setLastChartOptions] = useState<GetChartOptions | null>(() =>
    activeBirthData ? chartConfigToGetChartOptions(activeBirthData, iztroLanguage) : null
  );

  // 當語言變更時，自動更新星盤語言
  const [prevLocale, setPrevLocale] = useState(locale);
  if (locale !== prevLocale) {
    setPrevLocale(locale);
    if (activeBirthData) {
      try {
        const options = chartConfigToGetChartOptions(activeBirthData, iztroLanguage);
        const chart = getChart(options);
        setAstrolabe(chart);
        setLastChartOptions(options);
      } catch {
        // 保留原有星盤
      }
    }
  }

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
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const hasCheckedShareUrlRef = useRef(false);

  const handleExportCsv = () => {
    if (!astrolabe) return;
    downloadChartCsv(astrolabe as unknown as ExportAstrolabe, undefined, locale);
  };

  const handleExportSummary = () => {
    if (!astrolabe) return;
    downloadChartSummaryText(astrolabe as unknown as ExportAstrolabe, undefined, locale);
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

  const handleExportJson = () => {
    if (!astrolabe) return;
    // 讀取「產生目前這張命盤時」凍結下來的參數，而非即時表單 state，
    // 避免表單已改動但尚未重新排盤時，匯出與畫面上命盤矛盾的 input。
    const options = lastChartOptions;
    const frozenConfig = options?.config ?? config;
    const frozenLongitude = options?.longitude;
    const frozenSolarTimeActive = frozenLongitude !== undefined && frozenLongitude !== null;
    downloadChartJson(
      astrolabe as unknown as ExportAstrolabe,
      {
        input: options
          ? {
              timeIndex: options.timeIndex,
              isLunar: options.isLunar,
              longitude: options.longitude,
            }
          : undefined,
        settings: {
          school: frozenConfig.algorithm ?? 'default',
          yearBoundary: frozenConfig.yearDivide ?? 'normal',
          lateZiHandling: frozenConfig.dayDivide ?? 'current',
          trueSolarTime: frozenSolarTimeActive
            ? { enabled: true, longitude: Number(frozenLongitude) }
            : { enabled: false },
          iztroVersion: IZTRO_VERSION,
        },
      },
      locale
    );
  };

  const handleShare = async () => {
    if (!activeBirthData || !window.confirm(t('share.privacyWarning'))) return;

    try {
      const shareUrl = createShareUrl(activeBirthData, '');
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus(t('share.copySuccess'));
    } catch {
      setShareStatus(t('share.copyError'));
    }
  };

  const handleLoadChart = useCallback((birthData: ChartConfig) => {
    try {
      const options = chartConfigToGetChartOptions(birthData, iztroLanguage);
      const chart = getChart(options);

      const birthDate = birthData.calendarType === 'lunar' ? birthData.lunarDate : birthData.solarDate;
      if (!birthDate) throw new Error(t('app.chartError'));

      setSolarDate(birthDate);
      setCalendarType(birthData.calendarType);
      setGender(birthData.gender);
      setConfig({
        algorithm: birthData.algorithm,
        yearDivide: birthData.yearDivide,
        dayDivide: birthData.dayDivide,
      });
      setAstroType(birthData.astroType);
      if (typeof birthData.hour === 'string') {
        setTimeIndex('0');
        setPreciseTime(birthData.hour);
        setLongitude(birthData.longitude === undefined ? '' : String(birthData.longitude));
      } else {
        setTimeIndex(String(birthData.hour));
        setPreciseTime('');
        setLongitude('');
      }
      setAstrolabe(chart);
      setActiveBirthData(birthData);
      setLastChartOptions(options);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('app.chartError'));
    }
  }, [iztroLanguage, t]);

  useEffect(() => {
    if (hasCheckedShareUrlRef.current) return;

    if (!new URLSearchParams(window.location.search).has('s')) {
      hasCheckedShareUrlRef.current = true;
      return;
    }

    const sharedUrl = window.location.href;
    const restoreTimer = window.setTimeout(() => {
      hasCheckedShareUrlRef.current = true;
      const payload = decodeShareUrl(sharedUrl);
      if (payload && window.confirm(t('share.restoreConfirm'))) {
        handleLoadChart(payload.birthData);
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, [handleLoadChart, t]);

  const handleGenerateChart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const birthData = buildBirthData();
      const options = chartConfigToGetChartOptions(birthData, iztroLanguage);
      const chart = getChart(options);
      setAstrolabe(chart);
      setActiveBirthData(birthData);
      setLastChartOptions(options);
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
                  <CollectionPanel currentBirthData={activeBirthData} onLoad={handleLoadChart} />
                </aside>

                {/* Right / Center Astrolabe Grid & Reading Panel */}
                <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
                  {/* Tab Navigation */}
                  <div role="tablist" aria-label={t('a11y.mainNav')} className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                    <button
                      type="button"
                      role="tab"
                      id="tab-chart"
                      aria-selected={activeTab === 'chart'}
                      aria-controls="tabpanel-chart"
                      onClick={() => setActiveTab('chart')}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                        activeTab === 'chart'
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                      }`}
                    >
                      <Layers className="w-4 h-4" aria-hidden="true" />
                      {t('tab.chart')}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      id="tab-fortunes"
                      aria-selected={activeTab === 'fortunes'}
                      aria-controls="tabpanel-fortunes"
                      onClick={() => setActiveTab('fortunes')}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                        activeTab === 'fortunes'
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" aria-hidden="true" />
                      {t('tab.fortunes')}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      id="tab-reading"
                      aria-selected={activeTab === 'reading'}
                      aria-controls="tabpanel-reading"
                      onClick={() => setActiveTab('reading')}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                        activeTab === 'reading'
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                      }`}
                    >
                      <Bot className="w-4 h-4" aria-hidden="true" />
                      {t('tab.reading')}
                    </button>
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'chart' && (
                    <div id="tabpanel-chart" role="tabpanel" aria-labelledby="tab-chart" tabIndex={0} className="space-y-6 focus:outline-none">
                      <div ref={chartCaptureRef} className="space-y-6">
                        {fourPillars && (
                          <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">
                              {t('chart.fourPillars')}
                            </h3>
                            <FourPillars pillars={fourPillars} />
                          </div>
                        )}
                        <RuleInfoPanel
                          astroType={astroType}
                          config={config}
                          solarTimeActive={solarTimeActive}
                          parsedLongitude={parsedLongitude}
                        />
                        <ChartGrid astrolabe={astrolabe} />
                      </div>

                      {astrolabe && (
                        <div className="no-print glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Download className="w-3.5 h-3.5" aria-hidden="true" />
                            {t('chart.exportSection')}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={handleExportCsv}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                            >
                              {t('chart.exportCsv')}
                            </button>
                            <button
                              type="button"
                              onClick={handleExportSummary}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                            >
                              {t('chart.exportSummary')}
                            </button>
                            <button
                              type="button"
                              onClick={handleExportImage}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                            >
                              {t('chart.exportImage')}
                            </button>
                            <button
                              type="button"
                              onClick={handleExportJson}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                            >
                              {t('chart.exportJson')}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleShare()}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                            >
                              <Share2 className="w-3.5 h-3.5 inline-block mr-1" aria-hidden="true" />
                              {t('share.button')}
                            </button>
                          </div>
                          {imageExportError && (
                            <p className="text-xs text-rose-500 dark:text-rose-400">{t('chart.exportImageError')}</p>
                          )}
                          {shareStatus && <p className="text-xs text-emerald-700 dark:text-emerald-300" role="status">{shareStatus}</p>}
                        </div>
                      )}
                    </div>
                  )}
                  {activeTab === 'fortunes' && (
                    <div id="tabpanel-fortunes" role="tabpanel" aria-labelledby="tab-fortunes" tabIndex={0} className="focus:outline-none">
                      <FortunePanel astrolabe={astrolabe} />
                    </div>
                  )}
                  {activeTab === 'reading' && (
                    <div id="tabpanel-reading" role="tabpanel" aria-labelledby="tab-reading" tabIndex={0} className="focus:outline-none">
                      <ReadingPanel
                        chart={astrolabe}
                        chartId={
                          activeBirthData
                            ? `${activeBirthData.calendarType}-${activeBirthData.solarDate || activeBirthData.lunarDate}-${activeBirthData.hour}-${activeBirthData.gender}`
                            : 'default-chart'
                        }
                      />
                    </div>
                  )}
                </section>
              </div>
            )}
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
