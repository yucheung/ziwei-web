import React from 'react';
import { useTranslation, type TranslationKey } from '../i18n';
import { translateKey, type AppLocale } from '../lib/chartModel';

export type StarCategory = 'major' | 'minor' | 'adjective' | 'helper' | 'soft' | 'mutagen';

export interface StarTagProps {
  /** 星曜名稱 (例如: "紫微", "武曲", "文昌", "擎羊") */
  name: string;
  /** 星曜亮度 (例如: "廟", "旺", "得", "利", "平", "不", "陷") */
  brightness?: string;
  /** 四化標記 (例如: "祿", "權", "科", "忌" 或 "化祿", "化權") */
  mutagen?: string;
  /** 星曜類別 (主星/吉煞/小星) */
  type?: StarCategory;
  /** 尺寸: sm (預設) 或 md */
  size?: 'sm' | 'md';
  /** 直排/橫排 (預設 直排 true) */
  vertical?: boolean;
  /** 額外 CSS class */
  className?: string;
}

/** 14 主星集合 */
const MAJOR_STARS = new Set([
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞',
  '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'
]);

/** 煞星 (警示色) */
const MALEVOLENT_STARS = new Set([
  '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫', '天刑', '陰煞'
]);

/** 六吉星 + 祿存 + 天馬 */
const LUCKY_STARS = new Set([
  '文昌', '文曲', '左輔', '右弼', '天魁', '天鉞', '祿存', '天馬'
]);

/** 四化單字元 → 生年四化既有 i18n key (用於 title 顯示，例如 en 模式顯示 'Lu (Prosperity)') */
const MUTAGEN_TITLE_KEY: Record<string, TranslationKey> = {
  '祿': 'fortune.lu',
  '權': 'fortune.quan',
  '科': 'fortune.ke',
  '忌': 'fortune.ji',
};

/** 僅含 CJK 統一表意文字的字串才適合逐字直排；英文/羅馬拼音等應整段單行顯示 */
const isCjkOnly = (s: string): boolean => /^[一-鿿㐀-䶿]+$/.test(s);

export const StarTag: React.FC<StarTagProps> = ({
  name,
  brightness,
  mutagen,
  type,
  size = 'sm',
  vertical = true,
  className = '',
}) => {
  const { t, locale } = useTranslation();
  const appLocale: AppLocale = locale === 'zh-CN' ? 'zh-CN' : 'zh-TW';

  // 顯示用字串：name/brightness 皆為 chartModel ACL 的 zh-TW canonical key，
  // 邏輯比對 (MAJOR_STARS.has(name) 等) 一律沿用未翻譯的 canonical `name`/`brightness`。
  const displayName = translateKey(name, 'star', appLocale);
  const displayBrightness = brightness ? translateKey(brightness, 'brightness', appLocale) : undefined;

  // 自動判斷分類 (若未傳入 type)
  const category: StarCategory = type || (
    MAJOR_STARS.has(name)
      ? 'major'
      : MALEVOLENT_STARS.has(name)
      ? 'minor'
      : LUCKY_STARS.has(name)
      ? 'helper'
      : 'adjective'
  );

  // 四化標記色彩樣式
  const getMutagenStyle = (m?: string) => {
    if (!m) return '';
    const cleanM = m.replace('化', '');
    switch (cleanM) {
      case '祿':
        return 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/50 shadow-emerald-950/50';
      case '權':
        return 'bg-rose-500/25 text-rose-700 dark:text-rose-300 border-rose-500/50 shadow-rose-950/50';
      case '科':
        return 'bg-sky-500/25 text-sky-700 dark:text-sky-300 border-sky-500/50 shadow-sky-950/50';
      case '忌':
        return 'bg-purple-600/35 text-purple-800 dark:text-purple-200 border-purple-500/50 shadow-purple-950/50';
      default:
        return 'bg-slate-200 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600';
    }
  };

  // 亮度標記色彩樣式 (廟紅/旺橙/得黃/利藍/平灰/陷暗)
  // 同時處理繁體(廟)與簡體(庙)字元
  const getBrightnessStyle = (b?: string) => {
    if (!b) return 'text-slate-500 dark:text-slate-400';
    switch (b) {
      case '廟':
      case '庙':
        return 'text-rose-600 dark:text-rose-400 font-bold';
      case '旺':
        return 'text-orange-600 dark:text-orange-400 font-medium';
      case '得':
        return 'text-amber-600 dark:text-yellow-400';
      case '利':
        return 'text-blue-600 dark:text-blue-400';
      case '平':
        return 'text-slate-500 dark:text-slate-400';
      case '不':
        return 'text-slate-400 dark:text-slate-500';
      case '陷':
        return 'text-slate-600 dark:text-slate-600 font-semibold';
      default:
        return 'text-slate-500 dark:text-slate-400';
    }
  };

  // 星曜名稱文字色彩
  const getStarNameStyle = () => {
    switch (category) {
      case 'major':
        return 'font-bold text-amber-800 dark:text-amber-200 group-hover:text-amber-900 dark:group-hover:text-amber-100 drop-shadow-xs';
      case 'minor':
        return MALEVOLENT_STARS.has(name)
          ? 'font-semibold text-rose-600 dark:text-rose-400'
          : 'font-medium text-cyan-700 dark:text-cyan-300';
      case 'helper':
        return 'font-medium text-sky-700 dark:text-sky-300';
      case 'adjective':
        return 'text-slate-500 dark:text-slate-400 text-[11px] font-normal';
      default:
        return 'text-slate-700 dark:text-slate-300';
    }
  };

  const cleanMutagen = mutagen ? mutagen.replace('化', '') : undefined;
  const displayMutagen = cleanMutagen ? translateKey(cleanMutagen, 'mutagen', appLocale) : undefined;
  const mutagenTitleKey = cleanMutagen ? MUTAGEN_TITLE_KEY[cleanMutagen] : undefined;

  if (vertical) {
    return (
      <div
        className={`inline-flex flex-col items-center select-none group leading-tight ${className}`}
        title={`${displayName}${displayBrightness ? ` (${displayBrightness})` : ''}${mutagenTitleKey ? ` [${t(mutagenTitleKey)}]` : ''}`}
      >
        {/* 四化標記 (若有) */}
        {displayMutagen && (
          <span
            className={`px-0.5 py-0.2 rounded text-[10px] font-bold border shadow-xs mb-0.5 ${getMutagenStyle(
              cleanMutagen
            )}`}
          >
            {displayMutagen}
          </span>
        )}

        {/* 星曜名稱 (直排；僅 CJK 字串逐字直排，非 CJK 如英文星名整段單行顯示) */}
        <div className={`flex flex-col items-center tracking-tighter ${getStarNameStyle()}`}>
          {isCjkOnly(displayName) ? (
            displayName.split('').map((char, idx) => (
              <span key={idx} className={size === 'md' ? 'text-sm' : 'text-xs'}>
                {char}
              </span>
            ))
          ) : (
            <span className={size === 'md' ? 'text-sm' : 'text-xs'}>{displayName}</span>
          )}
        </div>

        {/* 亮度 (若有) */}
        {displayBrightness && (
          <span className={`text-[10px] mt-0.5 leading-none ${getBrightnessStyle(brightness)}`}>
            {displayBrightness}
          </span>
        )}
      </div>
    );
  }

  // 橫排（Pill Badge 樣式）
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs leading-none select-none ${
        category === 'major'
          ? 'bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200'
          : category === 'minor' && MALEVOLENT_STARS.has(name)
          ? 'bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300'
          : 'bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
      } ${className}`}
    >
      <span className={getStarNameStyle()}>{displayName}</span>
      {displayBrightness && <span className={`text-[10px] ${getBrightnessStyle(brightness)}`}>{displayBrightness}</span>}
      {displayMutagen && (
        <span className={`px-1 py-0.2 rounded text-[10px] font-bold border ${getMutagenStyle(cleanMutagen)}`}>
          {displayMutagen}
        </span>
      )}
    </span>
  );
};
