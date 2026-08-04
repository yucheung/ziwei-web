import React from 'react';
import type { FourPillars as FourPillarsData } from '../lib/bazi';
import { WUXING_COLORS } from '../lib/bazi';

interface FourPillarsProps {
  pillars: FourPillarsData;
  className?: string;
}

const PILLAR_LABELS = ['年柱', '月柱', '日柱', '時柱'] as const;

export const FourPillars: React.FC<FourPillarsProps> = ({ pillars, className = '' }) => {
  const items = [
    { label: PILLAR_LABELS[0], ...pillars.year, nayin: pillars.yearNaYin },
    { label: PILLAR_LABELS[1], ...pillars.month, nayin: pillars.monthNaYin },
    { label: PILLAR_LABELS[2], ...pillars.day, nayin: pillars.dayNaYin },
    { label: PILLAR_LABELS[3], ...pillars.time, nayin: pillars.timeNaYin },
  ];

  return (
    <div className={`grid grid-cols-4 gap-1.5 text-center ${className}`} data-testid="four-pillars">
      {items.map((item) => {
        const ganColor = WUXING_COLORS[item.ganWuXing] ?? 'text-slate-700 dark:text-slate-300';
        const zhiColor = WUXING_COLORS[item.zhiWuXing] ?? 'text-slate-700 dark:text-slate-300';

        return (
          <div key={item.label} className="flex flex-col items-center gap-0.5">
            {/* 柱標籤 */}
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium tracking-wider">
              {item.label}
            </span>
            {/* 天干 */}
            <span className={`text-lg font-bold leading-tight ${ganColor}`}>
              {item.gan}
            </span>
            {/* 地支 */}
            <span className={`text-lg font-bold leading-tight ${zhiColor}`}>
              {item.zhi}
            </span>
            {/* 五行標籤 */}
            <span className="text-[8px] text-slate-500 dark:text-slate-400 font-mono">
              {item.ganWuXing}{item.zhiWuXing}
            </span>
            {/* 納音 */}
            <span className="text-[8px] text-slate-600 dark:text-slate-500 font-mono truncate w-full">
              {item.nayin}
            </span>
          </div>
        );
      })}
    </div>
  );
};
