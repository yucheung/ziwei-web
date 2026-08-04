import React, { useState, useEffect, useMemo } from 'react';
import { Compass, Sparkles, Target, Layers, Shield, Zap } from 'lucide-react';
import { PalaceCell, PalaceData, FlyingMutagenBadge } from './PalaceCell';
import { StarTag } from './StarTag';
import {
  getAnheIndex,
  getGridPosition,
} from '../data/palace-layout';
import {
  calculateFlyingStars,
  getPalaceMutagenLabels,
  type FlyingPalace,
  type FlyingStarsResult,
} from '../lib/flying';

export interface ChartGridProps {
  /** iztro 產生的完整 Astrolabe 物件或符合格式的命盤物件 */
  astrolabe?: {
    solarDate?: string;
    lunarDate?: string;
    chineseDate?: string;
    fiveElementsClass?: string;
    soul?: string;
    body?: string;
    zodiac?: string;
    sign?: string;
    gender?: string;
    palaces: PalaceData[];
    surroundedPalaces: (targetIndex: number) => {
      target: PalaceData;
      opposite: PalaceData;
      wealth: PalaceData;
      career: PalaceData;
    };
  } | null;
  /** 受控模式下選擇的宮位索引 (0..11) */
  selectedIndex?: number;
  /** 當點擊宮位時觸發 */
  onSelectPalace?: (index: number) => void;
  className?: string;
}

export const ChartGrid: React.FC<ChartGridProps> = ({
  astrolabe,
  selectedIndex: propSelectedIndex,
  onSelectPalace,
  className = '',
}) => {
  // 尋找命宮預設索引 (若無則預設 0)
  const defaultIndex = React.useMemo(() => {
    if (!astrolabe || !astrolabe.palaces || astrolabe.palaces.length === 0) return 0;
    const idx = astrolabe.palaces.findIndex((p) => p.name === '命宫' || p.name === '命宮');
    return idx >= 0 ? idx : 0;
  }, [astrolabe]);

  const [internalSelectedIndex, setInternalSelectedIndex] = useState<number>(defaultIndex);

  // 當外部傳入新的 astrolabe 時重置到命宮
  useEffect(() => {
    setInternalSelectedIndex(defaultIndex);
  }, [defaultIndex]);

  // 選取的宮位索引 (受控 vs 非受控)
  const selectedIndex = propSelectedIndex !== undefined ? propSelectedIndex : internalSelectedIndex;

  // 計算飛星四化
  const flyingResult: FlyingStarsResult | null = useMemo(() => {
    if (!astrolabe || !astrolabe.palaces || astrolabe.palaces.length !== 12) return null;
    const flyingPalaces: FlyingPalace[] = astrolabe.palaces.map((p) => ({
      index: p.index,
      name: p.name,
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      majorStars: p.majorStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
      minorStars: p.minorStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
    }));
    return calculateFlyingStars(flyingPalaces);
  }, [astrolabe]);

  const handleCellClick = (index: number) => {
    setInternalSelectedIndex(index);
    if (onSelectPalace) {
      onSelectPalace(index);
    }
  };

  if (!astrolabe || !astrolabe.palaces || astrolabe.palaces.length !== 12) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-slate-800 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <Compass className="w-10 h-10 animate-spin-slow" />
        </div>
        <h3 className="text-lg font-bold text-slate-200">未載入命盤資料</h3>
        <p className="text-sm text-slate-400 max-w-md">
          請於左側輸入出生年、月、日、時辰與性別，並點擊「生成紫微命盤」進行排盤。
        </p>
      </div>
    );
  }

  const { palaces } = astrolabe;

  // 使用 iztro 原生 API 計算三方四正與暗合宮位索引
  const sanfang = astrolabe.surroundedPalaces(selectedIndex);
  const anheIdx = getAnheIndex(selectedIndex);

  // 當前選擇的宮位資料
  const selectedPalace = sanfang.target;
  const oppositePalace = sanfang.opposite;
  const careerPalace = sanfang.career;
  const wealthPalace = sanfang.wealth;
  const anhePalace = palaces[anheIdx];

  // 計算特定宮位相對於 selectedIndex 的角色
  const getPalaceRole = (index: number) => {
    if (index === sanfang.target.index) return 'target';
    if (index === sanfang.opposite.index) return 'opposite';
    if (index === sanfang.career.index) return 'career';
    if (index === sanfang.wealth.index) return 'wealth';
    if (index === anheIdx) return 'anhe';
    return null;
  };

  // 取得宮位的飛星四化標記
  const getFlyingBadges = (index: number): FlyingMutagenBadge[] => {
    if (!flyingResult) return [];
    const labels = getPalaceMutagenLabels(index, flyingResult);
    return labels.map((l) => ({
      star: l.star,
      type: l.type,
      source: l.source,
      fromPalace: l.fromPalace,
    }));
  };

  // 取得選中宮位的飛星四化詳情
  const getSelectedFlyingDetail = () => {
    if (!flyingResult) return null;
    return flyingResult.palaces[selectedIndex] ?? null;
  };

  const selectedFlyingDetail = getSelectedFlyingDetail();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 4x4 宮位網格陣列 */}
      <div className="grid grid-cols-4 grid-rows-4 gap-2 aspect-square w-full max-w-[800px] mx-auto p-3 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-2xl relative">
        {/* 外圍 12 宮位 */}
        {palaces.map((palace, index) => {
          const { row, col } = getGridPosition(index);
          const role = getPalaceRole(index);
          const isSelected = index === selectedIndex;
          const flyingBadges = getFlyingBadges(index);

          return (
            <div
              key={`palace-grid-${index}-${palace.earthlyBranch}`}
              style={{
                gridRowStart: row + 1,
                gridColumnStart: col + 1,
              }}
            >
              <PalaceCell
                palace={palace}
                isSelected={isSelected}
                role={role}
                flyingBadges={flyingBadges}
                onClick={() => handleCellClick(index)}
              />
            </div>
          );
        })}

        {/* 中央 2x2 中樞盤頭 (Grid Row 2..3, Col 2..3即 1..2, 1..2 zero-based) */}
        <div
          className="bg-slate-900/90 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between overflow-hidden shadow-inner backdrop-blur-md"
          style={{
            gridRow: '2 / span 2',
            gridColumn: '2 / span 2',
          }}
        >
          {/* 中樞資訊標頭 */}
          <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-200">紫微斗數命盤中樞</h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  {astrolabe.gender === 'female' ? '坤造 (女)' : '乾造 (男)'} · {astrolabe.fiveElementsClass || '五行局'}
                </p>
              </div>
            </div>
            {selectedPalace && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {selectedPalace.heavenlyStem}{selectedPalace.earthlyBranch} · {selectedPalace.name}
              </span>
            )}
          </div>

          {/* 命盤基本參數 */}
          <div className="grid grid-cols-2 gap-2 my-2 text-xs">
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">陽曆生日</span>
              <span className="font-mono text-slate-200 font-medium truncate block">
                {astrolabe.solarDate || '—'}
              </span>
            </div>
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">農曆生日</span>
              <span className="font-mono text-slate-200 font-medium truncate block">
                {astrolabe.lunarDate || '—'}
              </span>
            </div>
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">命主 / 身主</span>
              <span className="text-amber-300 font-semibold truncate block">
                {astrolabe.soul || '—'} / {astrolabe.body || '—'}
              </span>
            </div>
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
              <span className="text-[10px] text-slate-400 block">生肖 / 星座</span>
              <span className="text-slate-200 font-medium truncate block">
                {astrolabe.zodiac || '—'} / {astrolabe.sign || '—'}
              </span>
            </div>
          </div>

          {/* 當前點擊宮位之三方四正速覽 */}
          {selectedPalace && (
            <div className="border-t border-slate-800 pt-2 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3 text-amber-400" />
                  三方四正與暗合宮位
                </span>
                <span className="text-[10px] text-slate-400">點擊外圍宮位切換</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="bg-rose-950/30 border border-rose-500/30 rounded p-1.5 flex items-center justify-between text-rose-200">
                  <span className="font-semibold text-rose-400">對宮:</span>
                  <span>
                    {oppositePalace.heavenlyStem}{oppositePalace.earthlyBranch} · {oppositePalace.name}
                  </span>
                </div>
                <div className="bg-emerald-950/30 border border-emerald-500/30 rounded p-1.5 flex items-center justify-between text-emerald-200">
                  <span className="font-semibold text-emerald-400">暗合:</span>
                  <span>
                    {anhePalace.heavenlyStem}{anhePalace.earthlyBranch} · {anhePalace.name}
                  </span>
                </div>
                <div className="bg-sky-950/30 border border-sky-500/30 rounded p-1.5 flex items-center justify-between text-sky-200">
                  <span className="font-semibold text-sky-400">事業:</span>
                  <span>
                    {careerPalace.heavenlyStem}{careerPalace.earthlyBranch} · {careerPalace.name}
                  </span>
                </div>
                <div className="bg-cyan-950/30 border border-cyan-500/30 rounded p-1.5 flex items-center justify-between text-cyan-200">
                  <span className="font-semibold text-cyan-400">財帛:</span>
                  <span>
                    {wealthPalace.heavenlyStem}{wealthPalace.earthlyBranch} · {wealthPalace.name}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 點擊宮位詳情面板 (Palace Detail Panel) */}
      {selectedPalace && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 font-bold font-mono">
                {selectedPalace.heavenlyStem}{selectedPalace.earthlyBranch}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  【{selectedPalace.name}】詳情面板
                  {selectedPalace.isBodyPalace && (
                    <span className="px-2 py-0.5 rounded text-xs bg-purple-500/30 text-purple-300 border border-purple-500/50">
                      身宮
                    </span>
                  )}
                  {selectedPalace.isOriginalPalace && (
                    <span className="px-2 py-0.5 rounded text-xs bg-amber-500/30 text-amber-300 border border-amber-500/50">
                      來因宮
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  大限歲數：{selectedPalace.decadal?.range ? `${selectedPalace.decadal.range[0]} - ${selectedPalace.decadal.range[1]} 歲` : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                地支：{selectedPalace.earthlyBranch}宮 (位次 {selectedIndex})
              </span>
            </div>
          </div>

          {/* 宮位內星曜詳細分組 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 主星 */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                本宮主星
              </h4>
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedPalace.majorStars.length > 0 ? (
                  selectedPalace.majorStars.map((star, i) => (
                    <StarTag
                      key={`detail-major-${i}`}
                      name={star.name}
                      brightness={star.brightness}
                      mutagen={star.mutagen}
                      type="major"
                      vertical={false}
                    />
                  ))
                ) : (
                  <span className="text-xs text-slate-500">無主星 (空宮，借對宮 {oppositePalace.name} 主星星曜)</span>
                )}
              </div>
            </div>

            {/* 輔星 (吉星與煞星) */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                輔星 (吉星/煞星)
              </h4>
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedPalace.minorStars.length > 0 ? (
                  selectedPalace.minorStars.map((star, i) => (
                    <StarTag
                      key={`detail-minor-${i}`}
                      name={star.name}
                      brightness={star.brightness}
                      mutagen={star.mutagen}
                      type="minor"
                      vertical={false}
                    />
                  ))
                ) : (
                  <span className="text-xs text-slate-500">無輔星</span>
                )}
              </div>
            </div>

            {/* 雜曜與神煞 */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                雜曜與神煞
              </h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedPalace.adjectiveStars.length > 0 ? (
                  selectedPalace.adjectiveStars.map((star, i) => (
                    <span
                      key={`detail-adj-${i}`}
                      className="px-1.5 py-0.5 rounded text-xs bg-slate-800/60 border border-slate-700/50 text-slate-300"
                    >
                      {star.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">無雜曜</span>
                )}
              </div>
            </div>
          </div>

          {/* 飛星四化詳情面板 */}
          {selectedFlyingDetail && (
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                飛星四化 (本宮天干：{selectedFlyingDetail.heavenlyStem})
              </h4>

              {/* 飛出：本宮天干四化 → 飛入各宮 */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-slate-400 font-medium">▸ 飛出 (本宮四化飛入)</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {selectedFlyingDetail.flyingOut.map((fly, i) => (
                    <div
                      key={`out-${i}`}
                      className={`px-2 py-1 rounded text-[11px] border ${
                        fly.targetPalaceIndex === selectedIndex
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                          : 'bg-slate-800/50 border-slate-700/50 text-slate-300'
                      }`}
                    >
                      <span className="font-bold">{fly.star}</span>
                      <span className="text-slate-400"> 化</span>
                      <span className={`font-bold ${
                        fly.type === '祿' ? 'text-emerald-400' :
                        fly.type === '權' ? 'text-rose-400' :
                        fly.type === '科' ? 'text-sky-400' :
                        'text-purple-400'
                      }`}>{fly.type}</span>
                      <span className="text-slate-500 text-[10px]"> → {fly.targetPalaceName}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 飛入：從其他宮位飛入此宮的四化 */}
              {selectedFlyingDetail.flyingIn.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-400 font-medium">▸ 飛入 (從其他宮位飛來)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFlyingDetail.flyingIn.map((fly, i) => (
                      <div
                        key={`in-${i}`}
                        className="px-2 py-1 rounded text-[11px] border border-dashed bg-slate-800/30 border-slate-600/50 text-slate-300"
                      >
                        <span className="font-bold">{fly.star}</span>
                        <span className="text-slate-400"> 化</span>
                        <span className={`font-bold ${
                          fly.type === '祿' ? 'text-emerald-400' :
                          fly.type === '權' ? 'text-rose-400' :
                          fly.type === '科' ? 'text-sky-400' :
                          'text-purple-400'
                        }`}>{fly.type}</span>
                        <span className="text-slate-500 text-[10px]"> ← {fly.sourcePalaceName}({fly.sourceStem})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
