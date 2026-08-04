import { useState, lazy } from 'react';
import { Compass, Calendar, Clock, User, Sparkles, ShieldCheck, Layers, Bot, TrendingUp, Settings } from 'lucide-react';
import { useTranslation } from './i18n';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { getChart } from './lib/astro';
import type { Config, AstroType } from './lib/astro';
import { DEFAULT_CONFIG } from './lib/astro';

const ChartGrid = lazy(() => import('./components/ChartGrid').then((m) => ({ default: m.ChartGrid })));
const FortunePanel = lazy(() => import('./components/FortunePanel').then((m) => ({ default: m.FortunePanel })));
const ReadingPanel = lazy(() => import('./components/ReadingPanel').then((m) => ({ default: m.ReadingPanel })));
const MatchPanel = lazy(() => import('./components/MatchPanel').then((m) => ({ default: m.MatchPanel })));

export default function App() {
  const { t } = useTranslation();

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-purple-500/20 border border-amber-500/30 text-amber-400">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-purple-300 bg-clip-text text-transparent">
                {t('app.title')}
              </h1>
              <p className="text-xs text-slate-400 font-mono">{t('app.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'single'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('app.single')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('match')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  viewMode === 'match'
                    ? 'bg-rose-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('app.match')}
              </button>
            </div>

            <LanguageSwitcher />

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('app.engine')}
            </span>
          </div>
        </div>
      </header>

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
              <div className="glass-panel p-6 rounded-2xl shadow-xl border border-slate-800">
                <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-5">
                  <User className="w-5 h-5 text-amber-400" />
                  {t('form.title')}
                </h2>

                <form onSubmit={handleGenerateChart} className="space-y-4">
                  {/* Calendar type switch */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('form.calendarType')}</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setCalendarType('solar')}
                        className={`py-1.5 px-3 text-xs font-medium rounded-lg transition-all ${
                          calendarType === 'solar'
                            ? 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t('form.solar')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarType('lunar')}
                        className={`py-1.5 px-3 text-xs font-medium rounded-lg transition-all ${
                          calendarType === 'lunar'
                            ? 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t('form.lunar')}
                      </button>
                    </div>
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />{t('form.birthDate')}
                    </label>
                    <input
                      type="date"
                      value={solarDate}
                      onChange={(e) => setSolarDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  {/* Time Index Selection */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />{t('form.birthTime')}
                    </label>
                    <select
                      value={timeIndex}
                      onChange={(e) => setTimeIndex(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="0">{t('time.0')}</option>
                      <option value="1">{t('time.1')}</option>
                      <option value="2">{t('time.2')}</option>
                      <option value="3">{t('time.3')}</option>
                      <option value="4">{t('time.4')}</option>
                      <option value="5">{t('time.5')}</option>
                      <option value="6">{t('time.6')}</option>
                      <option value="7">{t('time.7')}</option>
                      <option value="8">{t('time.8')}</option>
                      <option value="9">{t('time.9')}</option>
                      <option value="10">{t('time.10')}</option>
                      <option value="11">{t('time.11')}</option>
                      <option value="12">{t('time.12')}</option>
                    </select>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('form.gender')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGender('male')}
                        className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                          gender === 'male'
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t('form.male')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('female')}
                        className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                          gender === 'female'
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-semibold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t('form.female')}
                      </button>
                    </div>
                  </div>

                  {/* 斗數設定區塊 */}
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1 mb-3">
                      <Settings className="w-3.5 h-3.5" />
                      {t('settings.title')}
                    </h3>

                    {/* 流派切換 */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-400 mb-1">{t('settings.school')}</label>
                      <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setConfig((c) => ({ ...c, algorithm: 'default' }))}
                          className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
                            config.algorithm === 'default'
                              ? 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {t('settings.default')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig((c) => ({ ...c, algorithm: 'zhongzhou' }))}
                          className={`py-1.5 px-2 text-xs font-medium rounded-lg transition-all ${
                            config.algorithm === 'zhongzhou'
                              ? 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {t('settings.zhongzhou')}
                        </button>
                      </div>
                    </div>

                    {/* 三盤切換 */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-400 mb-1">{t('settings.astroType')}</label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                        {(['heaven', 'earth', 'human'] as AstroType[]).map((tType) => (
                          <button
                            key={tType}
                            type="button"
                            onClick={() => setAstroType(tType)}
                            className={`py-1 px-1 text-xs font-medium rounded-lg transition-all ${
                              astroType === tType
                                ? 'bg-purple-500 text-white font-semibold shadow-md'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {tType === 'heaven' ? t('settings.heaven') : tType === 'earth' ? t('settings.earth') : t('settings.human')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 晚子時 / 年界 */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-400 mb-1">{t('settings.lateZi')}</label>
                      <select
                        value={config.dayDivide ?? 'current'}
                        onChange={(e) => setConfig((c) => ({ ...c, dayDivide: e.target.value as 'current' | 'forward' }))}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <option value="current">{t('settings.lateZi.current')}</option>
                        <option value="forward">{t('settings.lateZi.forward')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{t('settings.yearBoundary')}</label>
                      <select
                        value={config.yearDivide ?? 'normal'}
                        onChange={(e) => setConfig((c) => ({ ...c, yearDivide: e.target.value as 'normal' | 'exact' }))}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <option value="normal">{t('settings.yearBoundary.normal')}</option>
                        <option value="exact">{t('settings.yearBoundary.exact')}</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    {t('settings.generate')}
                  </button>
                </form>
              </div>
            </aside>

            {/* Right / Center Astrolabe Grid & Reading Panel */}
            <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('chart')}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                    activeTab === 'chart'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
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
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
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
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
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
