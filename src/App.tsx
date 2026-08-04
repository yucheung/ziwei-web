import { useState, lazy } from 'react';
import { Layers, Bot, TrendingUp } from 'lucide-react';
import { useTranslation } from './i18n';
import { useTheme } from './hooks/useTheme';
import { Header } from './components/Header';
import { InputForm } from './components/InputForm';
import { getChart } from './lib/astro';
import type { Config, AstroType } from './lib/astro';
import { DEFAULT_CONFIG } from './lib/astro';

const ChartGrid = lazy(() => import('./components/ChartGrid').then((m) => ({ default: m.ChartGrid })));
const FortunePanel = lazy(() => import('./components/FortunePanel').then((m) => ({ default: m.FortunePanel })));
const ReadingPanel = lazy(() => import('./components/ReadingPanel').then((m) => ({ default: m.ReadingPanel })));
const MatchPanel = lazy(() => import('./components/MatchPanel').then((m) => ({ default: m.MatchPanel })));

export default function App() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const [solarDate, setSolarDate] = useState('2000-08-16');
  const [timeIndex, setTimeIndex] = useState('2'); // 丑時 (1:00 - 3:00)
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar');

  const [viewMode, setViewMode] = useState<'single' | 'match'>('single');
  const [activeTab, setActiveTab] = useState<'chart' | 'fortunes' | 'reading'>('chart');

  // 斗數設定
  const [config, setConfig] = useState<Config>(() => ({ ...DEFAULT_CONFIG }));
  const [astroType, setAstroType] = useState<AstroType>('heaven');

  // 初始化星盤資料
  const [astrolabe, setAstrolabe] = useState(() => {
    try {
      return getChart({
        date: '2000-08-16',
        timeIndex: 2,
        gender: 'male',
        language: 'zh-TW',
        config: DEFAULT_CONFIG,
        astroType: 'heaven',
      });
    } catch {
      return null;
    }
  });

  const handleGenerateChart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const chart = getChart({
        date: solarDate,
        timeIndex: parseInt(timeIndex, 10),
        gender,
        isLunar: calendarType === 'lunar',
        language: 'zh-TW',
        config,
        astroType,
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
              {activeTab === 'chart' && <ChartGrid astrolabe={astrolabe} />}
              {activeTab === 'fortunes' && <FortunePanel astrolabe={astrolabe} />}
              {activeTab === 'reading' && <ReadingPanel chart={astrolabe} />}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
