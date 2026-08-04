import React, { useState } from 'react';
import { Compass, Calendar, Clock, User, Sparkles, ShieldCheck, Layers, Bot, TrendingUp, Settings } from 'lucide-react';
import { getChart } from './lib/astro';
import type { Config, AstroType } from './lib/astro';
import { DEFAULT_CONFIG } from './lib/astro';
import { ChartGrid } from './components/ChartGrid';
import { ReadingPanel } from './components/ReadingPanel';
import { MatchPanel } from './components/MatchPanel';
import { FortunePanel } from './components/FortunePanel';

export default function App() {
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
      alert(err instanceof Error ? err.message : '排盤發生錯誤');
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
                紫微斗數 Web 專業版
              </h1>
              <p className="text-xs text-slate-400 font-mono">Ziwei Astrolabe Pro v0.1</p>
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
                個人命盤
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
                雙人合盤
              </button>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              iztro 引擎
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {viewMode === 'match' ? (
          <MatchPanel
            initialPersonA={{
              name: '乾造 (男方)',
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
                  生辰資料輸入
                </h2>

                <form onSubmit={handleGenerateChart} className="space-y-4">
                  {/* Calendar type switch */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">曆法類型</label>
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
                        陽曆 (西元)
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
                        陰曆 (農曆)
                      </button>
                    </div>
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />出生日期
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
                      <Clock className="w-3.5 h-3.5 text-amber-400" />出生時辰
                    </label>
                    <select
                      value={timeIndex}
                      onChange={(e) => setTimeIndex(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      <option value="0">早子時 (00:00 - 01:00)</option>
                      <option value="1">丑時 (01:00 - 03:00)</option>
                      <option value="2">寅時 (03:00 - 05:00)</option>
                      <option value="3">卯時 (05:00 - 07:00)</option>
                      <option value="4">辰時 (07:00 - 09:00)</option>
                      <option value="5">巳時 (09:00 - 11:00)</option>
                      <option value="6">午時 (11:00 - 13:00)</option>
                      <option value="7">未時 (13:00 - 15:00)</option>
                      <option value="8">申時 (15:00 - 17:00)</option>
                      <option value="9">酉時 (17:00 - 19:00)</option>
                      <option value="10">戌時 (19:00 - 21:00)</option>
                      <option value="11">亥時 (21:00 - 23:00)</option>
                      <option value="12">夜子時 (23:00 - 24:00)</option>
                    </select>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">性別</label>
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
                        乾造 (男)
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
                        坤造 (女)
                      </button>
                    </div>
                  </div>

                  {/* 斗數設定區塊 */}
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-400 flex items-center gap-1 mb-3">
                      <Settings className="w-3.5 h-3.5" />
                      斗數設定
                    </h3>

                    {/* 流派切換 */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-400 mb-1">流派</label>
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
                          通行版
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
                          中州派
                        </button>
                      </div>
                    </div>

                    {/* 三盤切換 */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-400 mb-1">星盤類型</label>
                      <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                        {(['heaven', 'earth', 'human'] as AstroType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setAstroType(t)}
                            className={`py-1 px-1 text-xs font-medium rounded-lg transition-all ${
                              astroType === t
                                ? 'bg-purple-500 text-white font-semibold shadow-md'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {t === 'heaven' ? '天盤' : t === 'earth' ? '地盤' : '人盤'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 晚子時 / 年界 */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-slate-400 mb-1">晚子時處理</label>
                      <select
                        value={config.dayDivide ?? 'current'}
                        onChange={(e) => setConfig((c) => ({ ...c, dayDivide: e.target.value as 'current' | 'forward' }))}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <option value="current">晚子時算當日 (current)</option>
                        <option value="forward">晚子時算來日 (forward)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">年界分界</label>
                      <select
                        value={config.yearDivide ?? 'normal'}
                        onChange={(e) => setConfig((c) => ({ ...c, yearDivide: e.target.value as 'normal' | 'exact' }))}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <option value="normal">正月初一 (normal)</option>
                        <option value="exact">立春 (exact)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    生成紫微命盤
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
                  十二宮星盤總覽
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
                  大限流年運限
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
                  AI 智能命盤解讀
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
