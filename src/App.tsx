import { useState } from 'react';
import { Compass, Calendar, Clock, User, Sparkles, Layers, ShieldCheck } from 'lucide-react';

export default function App() {
  const [solarDate, setSolarDate] = useState('2000-08-16');
  const [timeIndex, setTimeIndex] = useState('2'); // 丑時 (1:00 - 3:00)
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar');

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

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              iztro 確定性引擎
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel / Birth Input Form */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-6">
          <div className="glass-panel p-6 rounded-2xl shadow-xl border border-slate-800">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2 mb-5">
              <User className="w-5 h-5 text-amber-400" />
              生辰資料輸入
            </h2>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
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
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    坤造 (女)
                  </button>
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

        {/* Right / Center Astrolabe Grid Container */}
        <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
          {/* Chart Grid Placeholder */}
          <div className="glass-panel p-6 rounded-2xl min-h-[500px] flex flex-col justify-between border border-slate-800 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-amber-300 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                十二宮星盤總覽 (12 Palaces Chart Container)
              </h3>
              <span className="text-xs text-slate-400">點擊宮位可檢視三方四正與詳細星曜</span>
            </div>

            {/* 12 Palaces Grid Outline Placeholder */}
            <div className="grid grid-cols-4 grid-rows-4 gap-2 aspect-square max-w-[640px] mx-auto w-full p-2 bg-slate-950/60 rounded-xl border border-slate-800">
              {/* Row 1 */}
              <div className="border border-amber-500/20 bg-slate-900/40 p-2 rounded flex flex-col justify-between text-xs hover:border-amber-500/50 transition-colors cursor-pointer">
                <span className="font-bold text-amber-400">巳宮</span>
                <span className="text-slate-400 text-center">宮位預覽</span>
              </div>
              <div className="border border-amber-500/20 bg-slate-900/40 p-2 rounded flex flex-col justify-between text-xs hover:border-amber-500/50 transition-colors cursor-pointer">
                <span className="font-bold text-amber-400">午宮</span>
                <span className="text-slate-400 text-center">宮位預覽</span>
              </div>
              <div className="border border-amber-500/20 bg-slate-900/40 p-2 rounded flex flex-col justify-between text-xs hover:border-amber-500/50 transition-colors cursor-pointer">
                <span className="font-bold text-amber-400">未宮</span>
                <span className="text-slate-400 text-center">宮位預覽</span>
              </div>
              <div className="border border-amber-500/20 bg-slate-900/40 p-2 rounded flex flex-col justify-between text-xs hover:border-amber-500/50 transition-colors cursor-pointer">
                <span className="font-bold text-amber-400">申宮</span>
                <span className="text-slate-400 text-center">宮位預覽</span>
              </div>

              {/* Row 2 */}
              <div className="border border-amber-500/20 bg-slate-900/40 p-2 rounded flex flex-col justify-between text-xs hover:border-amber-500/50 transition-colors cursor-pointer">
                <span className="font-bold text-amber-400">辰宮</span>
                <span className="text-slate-400 text-center">宮位預覽</span>
              </div>
              {/* Center Info Box (2x2) */}
              <div className="col-span-2 row-span-2 bg-slate-900/80 border border-slate-700/50 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Compass className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-200 text-sm">紫微斗數命盤中樞</h4>
                <p className="text-xs text-slate-400">請設定生辰資料並點擊「生成紫微命盤」</p>
              </div>
              <div className="border border-amber-500/20 bg-slate-900/40 p-2 rounded flex flex-col justify-between text-xs hover:border-amber-500/50 transition-colors cursor-pointer">
                <span className="font-bold text-amber-400">酉宮</span>
                <span className="text-slate-400 text-center">宮位預覽</span>
              </div>

              {/* Row 3 */}
              <div className="border border-amber-500/20 bg-slate-900/40 p-2 rounded flex flex-col justify-between text-xs hover:border-amber-500/50 transition-colors cursor-pointer">
                <span className="font-bold text-amber-400">卯宮</span>
                <span className="text-slate-400 text-center">宮位預覽</span>
              </div>
              <div className="border border-amber-500/20 bg-slate-900/40 p-2 rounded flex flex-col justify-between text-xs hover:border-amber-500/50 transition-colors cursor-pointer">
                <span className="font-bold text-amber-400">戌宮</span>
                <span className="text-slate-400 text-center">宮位預覽</span>
              </div>

              {/* Row 4 */}
              <div className="border border-amber-500/20 bg-slate-900/40 p-2 rounded flex flex-col justify-between text-xs hover:border-amber-500/50 transition-colors cursor-pointer">
                <span className="font-bold text-amber-400">寅宮</span>
                <span className="text-slate-400 text-center">宮位預覽</span>
              </div>
              <div className="border border-amber-500/20 bg-slate-900/40 p-2 rounded flex flex-col justify-between text-xs hover:border-amber-500/50 transition-colors cursor-pointer">
                <span className="font-bold text-amber-400">丑宮</span>
                <span className="text-slate-400 text-center">宮位預覽</span>
              </div>
              <div className="border border-amber-500/20 bg-slate-900/40 p-2 rounded flex flex-col justify-between text-xs hover:border-amber-500/50 transition-colors cursor-pointer">
                <span className="font-bold text-amber-400">子宮</span>
                <span className="text-slate-400 text-center">宮位預覽</span>
              </div>
              <div className="border border-amber-500/20 bg-slate-900/40 p-2 rounded flex flex-col justify-between text-xs hover:border-amber-500/50 transition-colors cursor-pointer">
                <span className="font-bold text-amber-400">亥宮</span>
                <span className="text-slate-400 text-center">宮位預覽</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
