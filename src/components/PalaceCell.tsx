import React from 'react';
import { StarTag } from './StarTag';

export interface PalaceStar {
  name: string;
  type?: string;
  brightness?: string;
  mutagen?: string;
}

export interface PalaceData {
  index: number;
  name: string;
  isBodyPalace?: boolean;
  isOriginalPalace?: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: PalaceStar[];
  minorStars: PalaceStar[];
  adjectiveStars: PalaceStar[];
  changsheng12?: string;
  boshi12?: string;
  suiqian12?: string;
  jiangqian12?: string;
  decadal?: {
    range: [number, number];
    heavenlyStem?: string;
    earthlyBranch?: string;
  };
  ages?: number[];
}

/** 飛入四化標記 */
export interface FlyingMutagenBadge {
  star: string;
  type: '祿' | '權' | '科' | '忌';
  /** 'native' = 本宮天干四化落在本宮; 'flying' = 從其他宮位飛入 */
  source: 'native' | 'flying';
  fromPalace?: string;
}

export interface PalaceCellProps {
  palace: PalaceData;
  isSelected?: boolean;
  role?: 'target' | 'opposite' | 'career' | 'wealth' | 'anhe' | null;
  flyingBadges?: FlyingMutagenBadge[];
  onClick?: () => void;
  className?: string;
}

export const PalaceCell: React.FC<PalaceCellProps> = ({
  palace,
  isSelected = false,
  role = null,
  flyingBadges = [],
  onClick,
  className = '',
}) => {
  const {
    name,
    isBodyPalace,
    isOriginalPalace,
    heavenlyStem,
    earthlyBranch,
    majorStars = [],
    minorStars = [],
    adjectiveStars = [],
    changsheng12,
    decadal,
  } = palace;

  // 角色視覺亮顯與標記
  const getRoleBadge = () => {
    switch (role) {
      case 'target':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 shadow-md">本宮</span>;
      case 'opposite':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white shadow-md">對宮</span>;
      case 'career':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-slate-950 shadow-md">事業位</span>;
      case 'wealth':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500 text-slate-950 shadow-md">財帛位</span>;
      case 'anhe':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 shadow-md">暗合宮</span>;
      default:
        return null;
    }
  };

  // 飛星四化標記色彩
  const getFlyingBadgeStyle = (type: string, source: string) => {
    const base = source === 'flying' ? 'border-dashed ' : '';
    switch (type) {
      case '祿': return `${base}bg-emerald-500/20 text-emerald-300 border-emerald-500/40`;
      case '權': return `${base}bg-rose-500/20 text-rose-300 border-rose-500/40`;
      case '科': return `${base}bg-sky-500/20 text-sky-300 border-sky-500/40`;
      case '忌': return `${base}bg-purple-600/25 text-purple-200 border-purple-500/40`;
      default: return `${base}bg-slate-700/50 text-slate-200 border-slate-600`;
    }
  };

  // 外框亮顯樣式
  const getBorderAndBgStyle = () => {
    if (isSelected || role === 'target') {
      return 'border-amber-400 ring-2 ring-amber-400/80 bg-amber-950/20 shadow-lg shadow-amber-500/10 z-20';
    }
    switch (role) {
      case 'opposite':
        return 'border-rose-500/80 ring-2 ring-rose-500/60 bg-rose-950/25 shadow-md shadow-rose-500/10 z-10';
      case 'career':
      case 'wealth':
        return 'border-sky-500/80 ring-2 ring-sky-500/60 bg-sky-950/25 shadow-md shadow-sky-500/10 z-10';
      case 'anhe':
        return 'border-emerald-500/80 ring-2 ring-emerald-500/60 bg-emerald-950/25 shadow-md shadow-emerald-500/10 z-10';
      default:
        return 'border-slate-800/80 bg-slate-900/60 hover:border-amber-500/40 hover:bg-slate-900/90 hover:shadow-md';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative p-2 rounded-xl border flex flex-col justify-between transition-all duration-200 cursor-pointer overflow-hidden min-h-[140px] select-none ${getBorderAndBgStyle()} ${className}`}
      data-testid={`palace-cell-${earthlyBranch}`}
    >
      {/* 宮位標頭：三方/暗合 Role 標籤 (若有) */}
      <div className="flex items-center justify-between gap-1 min-h-[20px] mb-1">
        <div>{getRoleBadge()}</div>
        <div className="flex items-center gap-1">
          {isBodyPalace && (
            <span className="px-1 py-0.2 rounded text-[10px] font-bold bg-purple-500/30 text-purple-300 border border-purple-500/50" title="身宮">
              身
            </span>
          )}
          {isOriginalPalace && (
            <span className="px-1 py-0.2 rounded text-[10px] font-bold bg-amber-500/30 text-amber-300 border border-amber-500/50" title="來因宮">
              來
            </span>
          )}
        </div>
      </div>

      {/* 星曜主要分佈區 */}
      <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {/* 主星區 (直排) */}
        {majorStars.length > 0 ? (
          <div className="flex gap-1.5 items-start">
            {majorStars.map((star, i) => (
              <StarTag
                key={`major-${i}-${star.name}`}
                name={star.name}
                brightness={star.brightness}
                mutagen={star.mutagen}
                type="major"
                vertical={true}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-start">
            <span className="text-[10px] text-slate-500 font-medium px-1 py-0.5 rounded bg-slate-800/40 border border-slate-700/30">
              空宮
            </span>
          </div>
        )}

        {/* 輔星/吉煞星區 (直排) */}
        {minorStars.length > 0 && (
          <div className="flex gap-1 items-start border-l border-slate-800/60 pl-1">
            {minorStars.map((star, i) => (
              <StarTag
                key={`minor-${i}-${star.name}`}
                name={star.name}
                brightness={star.brightness}
                mutagen={star.mutagen}
                type="minor"
                vertical={true}
              />
            ))}
          </div>
        )}

        {/* 雜曜 (若空間許可，取前幾顆) */}
        {adjectiveStars.length > 0 && (
          <div className="hidden sm:flex flex-col gap-0.5 justify-start text-[10px] text-slate-400/80 border-l border-slate-800/40 pl-1">
            {adjectiveStars.slice(0, 3).map((star, i) => (
              <span key={`adj-${i}`} className="truncate max-w-[28px]" title={star.name}>
                {star.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 底部宮位資訊資訊列 */}
      <div className="border-t border-slate-800/80 pt-1 mt-1 flex flex-col gap-1">
        {/* 飛星四化標記列 */}
        {flyingBadges.length > 0 && (
          <div className="flex flex-wrap gap-0.5" title="飛星四化標記">
            {flyingBadges.map((badge, i) => (
              <span
                key={`fly-${i}`}
                className={`px-1 py-0.5 rounded text-[9px] font-bold border ${getFlyingBadgeStyle(badge.type, badge.source)}`}
                title={`${badge.star}化${badge.type}${badge.source === 'flying' ? ` (飛入自${badge.fromPalace})` : ' (本宮)'}`}
              >
                {badge.star.slice(0, 1)}{badge.type}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end justify-between">
          {/* 12 神 & 大限歲數 */}
          <div className="flex flex-col text-[10px] text-slate-400 font-mono leading-tight">
            {decadal?.range && (
              <span className="text-amber-400/90 font-medium">
                {decadal.range[0]}-{decadal.range[1]}
              </span>
            )}
            {changsheng12 && <span className="text-slate-400">{changsheng12}</span>}
          </div>

          {/* 天干地支 + 宮位名稱 */}
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-mono font-bold text-amber-300">
              {heavenlyStem}
              {earthlyBranch}
            </span>
            <span className="text-sm font-bold text-slate-100">{name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
