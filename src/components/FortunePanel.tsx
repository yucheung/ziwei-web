import { useState, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  Table as TableIcon,
  Flame,
  Zap,
  ShieldAlert,
} from 'lucide-react';
import { getHoroscopeSummary, HoroscopeSummary, DecadalItem } from '../lib/fortunes';

export type FortuneLevel = 'yearly' | 'monthly' | 'daily' | 'hourly';

const FORTUNE_LEVEL_LABELS: Record<FortuneLevel, { zh: string; sub: string }> = {
  yearly: { zh: '流年', sub: '年度運勢' },
  monthly: { zh: '流月', sub: '月份運勢' },
  daily: { zh: '流日', sub: '日期運勢' },
  hourly: { zh: '流時', sub: '時辰運勢' },
};

const FORTUNE_LEVEL_STYLES: Record<FortuneLevel, string> = {
  yearly: 'amber',
  monthly: 'emerald',
  daily: 'sky',
  hourly: 'rose',
};

export interface FortunePanelProps {
  astrolabe: any | null;
  initialTargetDate?: string;
  onSelectDecadal?: (decadalItem: DecadalItem) => void;
}

export function FortunePanel({
  astrolabe,
  initialTargetDate,
  onSelectDecadal,
}: FortunePanelProps) {
  // 預設查詢日期 (預設為今天 "YYYY-MM-DD")
  const defaultDateStr = useMemo(() => {
    if (initialTargetDate) return initialTargetDate;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [initialTargetDate]);

  const [targetDate, setTargetDate] = useState<string>(defaultDateStr);
  const [selectedPalaceIndex, setSelectedPalaceIndex] = useState<number | null>(null);
  const [fortuneLevel, setFortuneLevel] = useState<FortuneLevel>('yearly');

  // 快捷切換年份
  const currentYear = new Date().getFullYear();

  // 計算運限總覽
  const summary: HoroscopeSummary | null = useMemo(() => {
    if (!astrolabe) return null;
    try {
      return getHoroscopeSummary(astrolabe, targetDate);
    } catch (e) {
      console.error('Horoscope calculation failed:', e);
      return null;
    }
  }, [astrolabe, targetDate]);

  if (!astrolabe) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-4 text-slate-500 dark:text-slate-400 min-h-[360px]">
        <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-500 dark:text-amber-400">
          <TrendingUp className="w-8 h-8 opacity-80" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">未載入星盤資料</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            請先在生辰輸入表單設定資料並點擊「生成紫微命盤」，系統將自動推算大限、流年與流曜。
          </p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 flex items-center gap-3">
        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
        <span className="text-xs">無法計算該日期的運限資料，請確認日期格式是否正確。</span>
      </div>
    );
  }

  // 大限列表
  const decadalTable = summary.decadalTable;

  // 當前選取運限層級資料
  const levelData = summary[fortuneLevel];

  return (
    <div className="space-y-6">
      {/* 1. Date Selector & Info Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                運限大盤分析 (大限 / 流年 / 流曜)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                查詢西元 {summary.solarDate} ({summary.lunarDate})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-semibold font-mono">
              虛歲 {summary.nominalAge} 歲
            </span>
          </div>
        </div>

        {/* Date Input & Quick Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <Calendar className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <label htmlFor="target-date-input" className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              切換查詢日期：
            </label>
            <input
              id="target-date-input"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTargetDate(`${currentYear}-01-01`)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                targetDate.startsWith(String(currentYear))
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300 font-semibold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              今年 ({currentYear})
            </button>
            <button
              type="button"
              onClick={() => setTargetDate(`${currentYear + 1}-01-01`)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                targetDate.startsWith(String(currentYear + 1))
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300 font-semibold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              明年 ({currentYear + 1})
            </button>
            <button
              type="button"
              onClick={() => setTargetDate(`${currentYear + 2}-01-01`)}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                targetDate.startsWith(String(currentYear + 2))
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300 font-semibold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              後年 ({currentYear + 2})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Decadal & Yearly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Decadal Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50 dark:from-indigo-950/30 dark:to-slate-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse" />
              <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300">當前大限 (十年運勢)</h3>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-500/30">
              {summary.decadal.stemBranch} 大限
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="space-y-0.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">大限命宮重疊本命</span>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{summary.decadal.name}宮</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  (原盤第 {summary.decadal.index + 1} 宮)
                </span>
              </div>
            </div>
          </div>

          {/* Decadal Mutagens */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              大限天干 [{summary.decadal.stemBranch.charAt(0)}] 四化引動：
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-medium">
              <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                <span className="block text-[10px] text-emerald-600 dark:text-emerald-500/80">化祿</span>
                {summary.decadal.mutagen.lu}
              </div>
              <div className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-400">
                <span className="block text-[10px] text-purple-600 dark:text-purple-500/80">化權</span>
                {summary.decadal.mutagen.quan}
              </div>
              <div className="px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-400">
                <span className="block text-[10px] text-sky-600 dark:text-sky-500/80">化科</span>
                {summary.decadal.mutagen.ke}
              </div>
              <div className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400">
                <span className="block text-[10px] text-rose-600 dark:text-rose-500/80">化忌</span>
                {summary.decadal.mutagen.ji}
              </div>
            </div>
          </div>
        </div>

        {/* Fortune Level Card (流年/流月/流日/流時 切換) */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-amber-50/50 via-white to-slate-50/50 dark:from-amber-950/20 dark:to-slate-900/60 space-y-3">
          {/* Level Tab Buttons */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            {(['yearly', 'monthly', 'daily', 'hourly'] as FortuneLevel[]).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFortuneLevel(level)}
                className={`flex-1 px-2 py-1.5 text-xs rounded-md font-medium transition-all ${
                  fortuneLevel === level
                    ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent'
                }`}
              >
                {FORTUNE_LEVEL_LABELS[level].zh}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse bg-${FORTUNE_LEVEL_STYLES[fortuneLevel]}-500 dark:bg-${FORTUNE_LEVEL_STYLES[fortuneLevel]}-400`} />
              <h3 className={`text-sm font-bold text-${FORTUNE_LEVEL_STYLES[fortuneLevel]}-700 dark:text-${FORTUNE_LEVEL_STYLES[fortuneLevel]}-300`}>
                當前{FORTUNE_LEVEL_LABELS[fortuneLevel].zh} ({FORTUNE_LEVEL_LABELS[fortuneLevel].sub})
              </h3>
            </div>
            <span className={`text-xs font-mono px-2 py-0.5 rounded bg-${FORTUNE_LEVEL_STYLES[fortuneLevel]}-500/20 text-${FORTUNE_LEVEL_STYLES[fortuneLevel]}-800 dark:text-${FORTUNE_LEVEL_STYLES[fortuneLevel]}-300 border border-${FORTUNE_LEVEL_STYLES[fortuneLevel]}-500/30`}>
              {levelData.stemBranch} {FORTUNE_LEVEL_LABELS[fortuneLevel].zh}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="space-y-0.5">
              <span className="text-xs text-slate-500 dark:text-slate-400">{FORTUNE_LEVEL_LABELS[fortuneLevel].zh}命宮重疊本命</span>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>{levelData.name}宮</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  (原盤第 {levelData.index + 1} 宮)
                </span>
              </div>
            </div>
          </div>

          {/* Level Mutagens */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              {FORTUNE_LEVEL_LABELS[fortuneLevel].zh}天干 [{levelData.stemBranch.charAt(0)}] 四化引動：
            </span>
            <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-medium">
              <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                <span className="block text-[10px] text-emerald-600 dark:text-emerald-500/80">化祿</span>
                {levelData.mutagen.lu}
              </div>
              <div className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-400">
                <span className="block text-[10px] text-purple-600 dark:text-purple-500/80">化權</span>
                {levelData.mutagen.quan}
              </div>
              <div className="px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-400">
                <span className="block text-[10px] text-sky-600 dark:text-sky-500/80">化科</span>
                {levelData.mutagen.ke}
              </div>
              <div className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400">
                <span className="block text-[10px] text-rose-600 dark:text-rose-500/80">化忌</span>
                {levelData.mutagen.ji}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Decadal Table (大限表格) */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">大限運勢推算表 (10年大限)</h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400"> Highlight 為當前大限所在</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">歲數範圍</th>
                <th className="py-2.5 px-3">本命宮位</th>
                <th className="py-2.5 px-3">宮位干支</th>
                <th className="py-2.5 px-3">主星</th>
                <th className="py-2.5 px-3">大限四化 (祿/權/科/忌)</th>
                <th className="py-2.5 px-3 text-right">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-mono">
              {decadalTable.map((item) => {
                const isSelected = selectedPalaceIndex === item.index;

                return (
                  <tr
                    key={item.index}
                    onClick={() => {
                      setSelectedPalaceIndex(item.index);
                      if (onSelectDecadal) onSelectDecadal(item);
                    }}
                    className={`transition-colors cursor-pointer ${
                      item.isCurrent
                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200'
                        : isSelected
                        ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-900 dark:text-indigo-200'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold font-sans">
                      {item.rangeText}
                    </td>
                    <td className="py-3 px-3 font-bold font-sans">
                      {item.palaceName}宮
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-bold">
                      {item.stemBranch}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-800 dark:text-slate-200">
                      {item.majorStars.length > 0 ? item.majorStars.join('、') : '無主星'}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          祿:{item.mutagen.lu}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
                          權:{item.mutagen.quan}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
                          科:{item.mutagen.ke}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                          忌:{item.mutagen.ji}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      {item.isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-slate-950 shadow-xs shadow-amber-500/30">
                          <Flame className="w-3 h-3" /> 當前大限
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">一</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Flow Stars Breakdown (十二宮流曜與歲神對照) */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              十二宮流曜與神煞對照 (西元 {summary.solarDate})
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">大限流曜 / {FORTUNE_LEVEL_LABELS[fortuneLevel].zh}流曜 / 歲前將前神</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {astrolabe.palaces.map((palace: any, idx: number) => {
            const scopeStars = summary.palaceScopeStars[idx] || {
              decadalStars: [],
              yearlyStars: [],
              monthlyStars: [],
              dailyStars: [],
              hourlyStars: [],
            };
            const decadalPalaceName = summary.decadal.palaceNames[idx] || '';
            const levelPalaceName = levelData.palaceNames[idx] || '';
            const isDecadalLife = summary.decadal.index === idx;
            const isLevelLife = levelData.index === idx;

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                  isLevelLife
                    ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40 shadow-xs shadow-amber-500/10'
                    : isDecadalLife
                    ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-500/40'
                    : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between font-bold border-b border-slate-200 dark:border-slate-800/60 pb-1.5">
                  <span className="text-slate-800 dark:text-slate-200">
                    {palace.name}宮 ({palace.heavenlyStem}
                    {palace.earthlyBranch})
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    {isDecadalLife && (
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-800 dark:text-indigo-300">
                        限命
                      </span>
                    )}
                    {isLevelLife && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300">
                        {FORTUNE_LEVEL_LABELS[fortuneLevel].zh}命
                      </span>
                    )}
                  </div>
                </div>

                {/* Overlap Roles */}
                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-x-2 font-mono">
                  <span>限:{decadalPalaceName}</span>
                  <span>{FORTUNE_LEVEL_LABELS[fortuneLevel].zh}:{levelPalaceName}</span>
                </div>

                {/* Flow Stars List */}
                <div className="space-y-1 pt-1">
                  {/* Decadal Stars */}
                  {scopeStars.decadalStars.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {scopeStars.decadalStars.map((star: string, sIdx: number) => (
                        <span
                          key={sIdx}
                          className="px-1.5 py-0.5 text-[10px] rounded bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 border border-indigo-500/20"
                        >
                          {star}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Level-specific Stars */}
                  {(scopeStars as any)[`${fortuneLevel}Stars`]?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(scopeStars as any)[`${fortuneLevel}Stars`].map((star: string, sIdx: number) => (
                        <span
                          key={sIdx}
                          className={`px-1.5 py-0.5 text-[10px] rounded bg-${FORTUNE_LEVEL_STYLES[fortuneLevel]}-500/10 text-${FORTUNE_LEVEL_STYLES[fortuneLevel]}-800 dark:text-${FORTUNE_LEVEL_STYLES[fortuneLevel]}-300 border border-${FORTUNE_LEVEL_STYLES[fortuneLevel]}-500/20`}
                        >
                          {star}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Suiqian / Jiangqian Stars */}
                  {(scopeStars.suiqianStar || scopeStars.jiangqianStar) && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                      {scopeStars.suiqianStar && (
                        <span className="text-slate-500 dark:text-slate-400">歲:{scopeStars.suiqianStar}</span>
                      )}
                      {scopeStars.jiangqianStar && (
                        <span className="text-slate-500 dark:text-slate-400">將:{scopeStars.jiangqianStar}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
