import type { AppLocale, IFunctionalAstrolabe, TranslationCategory } from './chartModel';
import { toCanonicalKey, translateKey } from './chartModel';
import type { IFunctionalHoroscope } from 'iztro/lib/astro/FunctionalHoroscope';

/**
 * 十干四化對照表 (祿, 權, 科, 忌)
 */
export const STEM_MUTAGENS: Record<string, { lu: string; quan: string; ke: string; ji: string }> = {
  甲: { lu: '廉貞', quan: '破軍', ke: '武曲', ji: '太陽' },
  乙: { lu: '天機', quan: '天梁', ke: '紫微', ji: '太陰' },
  丙: { lu: '天同', quan: '天機', ke: '文昌', ji: '廉貞' },
  丁: { lu: '太陰', quan: '天同', ke: '天機', ji: '巨門' },
  戊: { lu: '貪狼', quan: '太陰', ke: '右弼', ji: '天機' },
  己: { lu: '武曲', quan: '貪狼', ke: '天梁', ji: '文曲' },
  庚: { lu: '太陽', quan: '武曲', ke: '太陰', ji: '天同' },
  辛: { lu: '巨門', quan: '太陽', ke: '文曲', ji: '文昌' },
  壬: { lu: '天梁', quan: '紫微', ke: '左輔', ji: '武曲' },
  癸: { lu: '破軍', quan: '巨門', ke: '太陰', ji: '貪狼' },
};

/**
 * 取得指定天干的四化星曜
 */
export function getMutagensByStem(stem: string): { lu: string; quan: string; ke: string; ji: string } {
  return (
    STEM_MUTAGENS[stem] || {
      lu: '-',
      quan: '-',
      ke: '-',
      ji: '-',
    }
  );
}

/**
 * 語系無關版本：`stem` 可能是任何顯示語言 (例如英文模式下的 'jia')。
 * 先轉回 zh-TW canonical key 查表，查表結果 (星曜名稱) 再轉回同一顯示語言，
 * 確保回傳值與呼叫端其餘欄位 (皆來自同一顯示語言的 astrolabe) 一致。
 * 修復根因 C1：STEM_MUTAGENS 為繁體中文 key，英文模式下若直接以英文天干查表會全部失敗。
 */
function getMutagensByStemForLocale(
  stem: string,
  locale: AppLocale,
): { lu: string; quan: string; ke: string; ji: string } {
  const canonicalStem = toCanonicalKey(stem, 'stem', locale);
  const zhResult = getMutagensByStem(canonicalStem);
  if (locale === 'zh-TW') return zhResult;
  return {
    lu: translateKey(zhResult.lu, 'star', locale),
    quan: translateKey(zhResult.quan, 'star', locale),
    ke: translateKey(zhResult.ke, 'star', locale),
    ji: translateKey(zhResult.ji, 'star', locale),
  };
}

export interface DecadalItem {
  index: number; // 宮位在 astrolabe.palaces 的 0..11 索引
  palaceName: string; // 宮位原名 (例如 命宮)
  heavenlyStem: string; // 天干
  earthlyBranch: string; // 地支
  stemBranch: string; // 干支 (例如 壬午)
  range: [number, number]; // 歲數範圍 [startAge, endAge]
  rangeText: string; // 歲數文字 (例如 "3 - 12 歲")
  majorStars: string[]; // 宮位主星名稱
  mutagen: {
    lu: string;
    quan: string;
    ke: string;
    ji: string;
  };
  isCurrent: boolean; // 是否為指定年齡所在大限
}

export interface ScopeStars {
  decadalStars: string[]; // 大限流曜 (例如 ['運祿', '運馬'])
  yearlyStars: string[]; // 流年流曜 (例如 ['流祿', '流羊'])
  monthlyStars?: string[]; // 流月流曜 (例如 ['月祿', '月羊'])
  dailyStars?: string[]; // 流日流曜 (例如 ['日鉞', '日陀'])
  hourlyStars?: string[]; // 流時流曜 (例如 ['時祿', '時陀'])
  suiqianStar?: string; // 歲前十二神
  jiangqianStar?: string; // 將前十二神
}

export interface HoroscopeSummary {
  solarDate: string; // 查詢日期 (西元 "YYYY-MM-DD")
  lunarDate: string; // 農曆日期 (例如 "二〇二六年六月廿二")
  nominalAge: number; // 虛歲 (例如 27)
  decadal: {
    index: number; // 大限命宮在原盤的宮位索引 (0..11)
    name: string; // 大限命宮在原盤的宮位名稱 (例如 "福德")
    stemBranch: string; // 大限干支 (例如 "甲申")
    mutagen: {
      lu: string;
      quan: string;
      ke: string;
      ji: string;
    };
    palaceNames: string[]; // 大限 12 宮位重新排名的名稱
  };
  yearly: {
    index: number; // 流年命宮在原盤的宮位索引 (0..11)
    name: string; // 流年命宮在原盤的宮位名稱 (例如 "命宮")
    stemBranch: string; // 流年干支 (例如 "丙午")
    mutagen: {
      lu: string;
      quan: string;
      ke: string;
      ji: string;
    };
    palaceNames: string[]; // 流年 12 宮位重新排名的名稱
  };
  monthly: {
    index: number;
    name: string; // 固定為 "流月"
    stemBranch: string; // 流月干支 (例如 "乙未")
    mutagen: {
      lu: string;
      quan: string;
      ke: string;
      ji: string;
    };
    palaceNames: string[];
  };
  daily: {
    index: number;
    name: string; // 固定為 "流日"
    stemBranch: string; // 流日干支 (例如 "庚戌")
    mutagen: {
      lu: string;
      quan: string;
      ke: string;
      ji: string;
    };
    palaceNames: string[];
  };
  hourly: {
    index: number;
    name: string; // 固定為 "流時"
    stemBranch: string; // 流時干支 (例如 "丙子")
    mutagen: {
      lu: string;
      quan: string;
      ke: string;
      ji: string;
    };
    palaceNames: string[];
  };
  palaceScopeStars: Record<number, ScopeStars>; // 0..11 各宮位對應的流曜與十二神
  decadalTable: DecadalItem[]; // 大限 10 年表格 (12 大限)
  rawHoroscope: IFunctionalHoroscope;
}

/**
 * 取得大限表格 (12 個大限，依起始歲數從小到大排序)
 *
 * 根因 C1 修復：本函式以宮位天干 (heavenlyStem) 查表 STEM_MUTAGENS，
 * 該表以繁體中文為 key。傳入的 astrolabe 可以是任何顯示語言排盤 (例如英文模式下
 * heavenlyStem 為 'jia')，本函式會透過 `locale` 參數將天干轉回 zh-TW canonical key
 * 查表，並將查表結果轉回 `locale` 對應的顯示字串，確保英文模式下大限表格四化計算正確。
 */
export function getDecadalTable(
  astrolabe: IFunctionalAstrolabe | null,
  currentAge?: number,
  locale: AppLocale = 'zh-TW',
): DecadalItem[] {
  if (!astrolabe || !Array.isArray(astrolabe.palaces)) {
    return [];
  }

  const items: DecadalItem[] = astrolabe.palaces.map((palace, index) => {
    const range: [number, number] = palace.decadal?.range ?? ([0, 0] as [number, number]);
    const heavenlyStem = palace.decadal?.heavenlyStem || palace.heavenlyStem || '';
    const earthlyBranch = palace.decadal?.earthlyBranch || palace.earthlyBranch || '';
    const stemBranch = `${heavenlyStem}${earthlyBranch}`;

    const majorStars = Array.isArray(palace.majorStars)
      ? palace.majorStars.map((star) => star.name || String(star))
      : [];

    const mutagen = getMutagensByStemForLocale(heavenlyStem, locale);

    const isCurrent =
      typeof currentAge === 'number' && currentAge >= range[0] && currentAge <= range[1];

    return {
      index,
      palaceName: palace.name,
      heavenlyStem,
      earthlyBranch,
      stemBranch,
      range,
      rangeText: `${range[0]} - ${range[1]} 歲`,
      majorStars,
      mutagen,
      isCurrent,
    };
  });

  // 依起始歲數從小到大排序
  return items.sort((a, b) => a.range[0] - b.range[0]);
}

/**
 * 解析並封裝指定日期 (targetDate) 的 iztro 運限資料 (大限/流年/流曜)
 *
 * 根因 C1 修復：內部以 STEM_MUTAGENS (繁體中文 key) 查表大限/流年/流月/
 * 流日/流時的四化 fallback (當 iztro 原生 horoscope() 未附帶 mutagen 陣列時)。
 * 傳入的 astrolabe 可以是任何顯示語言排盤，透過 `locale` 參數確保 fallback 查表
 * 與最終回傳值皆與該 astrolabe 的顯示語言一致。
 */
export function getHoroscopeSummary(
  astrolabe: IFunctionalAstrolabe | null,
  targetDateInput?: string | Date,
  locale: AppLocale = 'zh-TW',
  timeIndex?: number,
): HoroscopeSummary {
  if (!astrolabe || typeof astrolabe.horoscope !== 'function') {
    throw new Error('無效的 Astrolabe 物件');
  }

  let dateStr: string;
  if (!targetDateInput) {
    const now = new Date();
    dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  } else if (targetDateInput instanceof Date) {
    dateStr = `${targetDateInput.getFullYear()}-${String(
      targetDateInput.getMonth() + 1
    ).padStart(2, '0')}-${String(targetDateInput.getDate()).padStart(2, '0')}`;
  } else {
    dateStr = String(targetDateInput).trim();
  }

  const h: IFunctionalHoroscope =
    typeof timeIndex === 'number' ? astrolabe.horoscope(dateStr, timeIndex) : astrolabe.horoscope(dateStr);

  // 根因 C4 修復：iztro 的 setLanguage 為行程全域狀態 (見 astro.js:144)。
  // 若在本次呼叫之前，行程內其他地方 (例如 MatchPanel 的 getCanonicalAstrolabe)
  // 曾以不同 language 呼叫過 getChart()，全域語系會被改變，導致 h.horoscope()
  // 內部產生的流曜/神煞/宮名字串語系與傳入的 astrolabe 顯示語言不一致。
  // 透過「反查回 zh-TW canonical key 再轉回 locale」，使輸出與該全域狀態徹底無關。
  const normalizeScopeText = (display: string, category: TranslationCategory): string =>
    translateKey(toCanonicalKey(display, category, 'zh-CN'), category, locale);

  const nominalAge = h.age.nominalAge ?? 0;

  // 大限四化
  const decadalMutagenArr: string[] = (h.decadal.mutagen || []).map((s) => normalizeScopeText(s, 'star'));
  const decadalMutagenObj = {
    lu: decadalMutagenArr[0] || getMutagensByStemForLocale(h.decadal.heavenlyStem, locale).lu,
    quan: decadalMutagenArr[1] || getMutagensByStemForLocale(h.decadal.heavenlyStem, locale).quan,
    ke: decadalMutagenArr[2] || getMutagensByStemForLocale(h.decadal.heavenlyStem, locale).ke,
    ji: decadalMutagenArr[3] || getMutagensByStemForLocale(h.decadal.heavenlyStem, locale).ji,
  };

  // 流年四化
  const yearlyMutagenArr: string[] = (h.yearly.mutagen || []).map((s) => normalizeScopeText(s, 'star'));
  const yearlyMutagenObj = {
    lu: yearlyMutagenArr[0] || getMutagensByStemForLocale(h.yearly.heavenlyStem, locale).lu,
    quan: yearlyMutagenArr[1] || getMutagensByStemForLocale(h.yearly.heavenlyStem, locale).quan,
    ke: yearlyMutagenArr[2] || getMutagensByStemForLocale(h.yearly.heavenlyStem, locale).ke,
    ji: yearlyMutagenArr[3] || getMutagensByStemForLocale(h.yearly.heavenlyStem, locale).ji,
  };

  // 流月四化
  const monthlyMutagenArr: string[] = (h.monthly.mutagen || []).map((s) => normalizeScopeText(s, 'star'));
  const monthlyMutagenObj = {
    lu: monthlyMutagenArr[0] || getMutagensByStemForLocale(h.monthly.heavenlyStem, locale).lu,
    quan: monthlyMutagenArr[1] || getMutagensByStemForLocale(h.monthly.heavenlyStem, locale).quan,
    ke: monthlyMutagenArr[2] || getMutagensByStemForLocale(h.monthly.heavenlyStem, locale).ke,
    ji: monthlyMutagenArr[3] || getMutagensByStemForLocale(h.monthly.heavenlyStem, locale).ji,
  };

  // 流日四化
  const dailyMutagenArr: string[] = (h.daily.mutagen || []).map((s) => normalizeScopeText(s, 'star'));
  const dailyMutagenObj = {
    lu: dailyMutagenArr[0] || getMutagensByStemForLocale(h.daily.heavenlyStem, locale).lu,
    quan: dailyMutagenArr[1] || getMutagensByStemForLocale(h.daily.heavenlyStem, locale).quan,
    ke: dailyMutagenArr[2] || getMutagensByStemForLocale(h.daily.heavenlyStem, locale).ke,
    ji: dailyMutagenArr[3] || getMutagensByStemForLocale(h.daily.heavenlyStem, locale).ji,
  };

  // 流時四化
  const hourlyMutagenArr: string[] = (h.hourly.mutagen || []).map((s) => normalizeScopeText(s, 'star'));
  const hourlyMutagenObj = {
    lu: hourlyMutagenArr[0] || getMutagensByStemForLocale(h.hourly.heavenlyStem, locale).lu,
    quan: hourlyMutagenArr[1] || getMutagensByStemForLocale(h.hourly.heavenlyStem, locale).quan,
    ke: hourlyMutagenArr[2] || getMutagensByStemForLocale(h.hourly.heavenlyStem, locale).ke,
    ji: hourlyMutagenArr[3] || getMutagensByStemForLocale(h.hourly.heavenlyStem, locale).ji,
  };

  // 大限/流年命宮名稱 (astrolabe.palaces 為建盤時固化，語言與 astrolabe 一致，此處統一防禦正規化)
  const decadalPalaceName = normalizeScopeText(astrolabe.palaces[h.decadal.index]?.name || '', 'palace');
  const yearlyPalaceName = normalizeScopeText(astrolabe.palaces[h.yearly.index]?.name || '', 'palace');

  // 各宮位對應流曜與神煞
  const palaceScopeStars: Record<number, ScopeStars> = {};
  for (let i = 0; i < 12; i++) {
    const decStars: string[] = (h.decadal.stars?.[i] || []).map((s) => normalizeScopeText(s.name, 'star'));
    const yrStars: string[] = (h.yearly.stars?.[i] || []).map((s) => normalizeScopeText(s.name, 'star'));
    const moStars: string[] = (h.monthly.stars?.[i] || []).map((s) => normalizeScopeText(s.name, 'star'));
    const daStars: string[] = (h.daily.stars?.[i] || []).map((s) => normalizeScopeText(s.name, 'star'));
    const hoStars: string[] = (h.hourly.stars?.[i] || []).map((s) => normalizeScopeText(s.name, 'star'));
    const suiqianRaw = h.yearly.yearlyDecStar.suiqian12?.[i];
    const jiangqianRaw = h.yearly.yearlyDecStar.jiangqian12?.[i];
    const suiqian = suiqianRaw ? normalizeScopeText(suiqianRaw, 'star') : suiqianRaw;
    const jiangqian = jiangqianRaw ? normalizeScopeText(jiangqianRaw, 'star') : jiangqianRaw;

    palaceScopeStars[i] = {
      decadalStars: decStars,
      yearlyStars: yrStars,
      monthlyStars: moStars,
      dailyStars: daStars,
      hourlyStars: hoStars,
      suiqianStar: suiqian,
      jiangqianStar: jiangqian,
    };
  }

  // 大限表格
  const decadalTable = getDecadalTable(astrolabe, nominalAge, locale);

  return {
    solarDate: h.solarDate || dateStr,
    lunarDate: h.lunarDate || '',
    nominalAge,
    decadal: {
      index: h.decadal?.index ?? 0,
      name: decadalPalaceName,
      stemBranch: `${h.decadal?.heavenlyStem || ''}${h.decadal?.earthlyBranch || ''}`,
      mutagen: decadalMutagenObj,
      palaceNames: (h.decadal?.palaceNames || []).map((n) => normalizeScopeText(n, 'palace')),
    },
    yearly: {
      index: h.yearly?.index ?? 0,
      name: yearlyPalaceName,
      stemBranch: `${h.yearly?.heavenlyStem || ''}${h.yearly?.earthlyBranch || ''}`,
      mutagen: yearlyMutagenObj,
      palaceNames: (h.yearly?.palaceNames || []).map((n) => normalizeScopeText(n, 'palace')),
    },
    monthly: {
      index: h.monthly?.index ?? 0,
      name: h.monthly?.name || '流月',
      stemBranch: `${h.monthly?.heavenlyStem || ''}${h.monthly?.earthlyBranch || ''}`,
      mutagen: monthlyMutagenObj,
      palaceNames: (h.monthly?.palaceNames || []).map((n) => normalizeScopeText(n, 'palace')),
    },
    daily: {
      index: h.daily?.index ?? 0,
      name: h.daily?.name || '流日',
      stemBranch: `${h.daily?.heavenlyStem || ''}${h.daily?.earthlyBranch || ''}`,
      mutagen: dailyMutagenObj,
      palaceNames: (h.daily?.palaceNames || []).map((n) => normalizeScopeText(n, 'palace')),
    },
    hourly: {
      index: h.hourly?.index ?? 0,
      name: h.hourly?.name || '流時',
      stemBranch: `${h.hourly?.heavenlyStem || ''}${h.hourly?.earthlyBranch || ''}`,
      mutagen: hourlyMutagenObj,
      palaceNames: (h.hourly?.palaceNames || []).map((n) => normalizeScopeText(n, 'palace')),
    },
    palaceScopeStars,
    decadalTable,
    rawHoroscope: h,
  };
}
