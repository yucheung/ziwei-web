import { Solar } from 'lunar-typescript';

/** 天干→五行 */
export const GAN_WUXING: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土',
  己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};

/** 地支→五行 */
export const ZHI_WUXING: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火',
  午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/** 五行→顏色 CSS class（Tailwind 用，提供 light & dark 雙模式） */
export const WUXING_COLORS: Record<string, string> = {
  '木': 'text-emerald-600 dark:text-emerald-400',
  '火': 'text-rose-600 dark:text-rose-400',
  '土': 'text-amber-600 dark:text-amber-400',
  '金': 'text-slate-600 dark:text-slate-300',
  '水': 'text-blue-600 dark:text-blue-400',
};

/** 一柱 = 天干 + 地支 */
export interface Pillar {
  gan: string;
  zhi: string;
  ganWuXing: string;
  zhiWuXing: string;
}

/** 四柱結構 */
export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  time: Pillar;
  /** 納音 (年柱) */
  yearNaYin: string;
  monthNaYin: string;
  dayNaYin: string;
  timeNaYin: string;
}

/**
 * 從 Solar datetime 計算四柱八字
 */
export function calculateFourPillars(
  year: number,
  month: number,
  day: number,
  hour: number = 12,
  minute: number = 0,
  second: number = 0,
): FourPillars {
  const solar = Solar.fromYmdHms(year, month, day, hour, minute, second);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const makePillar = (gan: string, zhi: string): Pillar => ({
    gan,
    zhi,
    ganWuXing: GAN_WUXING[gan] ?? '土',
    zhiWuXing: ZHI_WUXING[zhi] ?? '土',
  });

  return {
    year: makePillar(ec.getYearGan(), ec.getYearZhi()),
    month: makePillar(ec.getMonthGan(), ec.getMonthZhi()),
    day: makePillar(ec.getDayGan(), ec.getDayZhi()),
    time: makePillar(ec.getTimeGan(), ec.getTimeZhi()),
    yearNaYin: ec.getYearNaYin(),
    monthNaYin: ec.getMonthNaYin(),
    dayNaYin: ec.getDayNaYin(),
    timeNaYin: ec.getTimeNaYin(),
  };
}

/** 六十甲子納音對照表 (以「干支」為 key) */
const NAYIN_60: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金', '丙寅': '爐中火', '丁卯': '爐中火',
  '戊辰': '大林木', '己巳': '大林木', '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '劍鋒金', '癸酉': '劍鋒金', '甲戌': '山頭火', '乙亥': '山頭火',
  '丙子': '澗下水', '丁丑': '澗下水', '戊寅': '城頭土', '己卯': '城頭土',
  '庚辰': '白蠟金', '辛巳': '白蠟金', '壬午': '楊柳木', '癸未': '楊柳木',
  '甲申': '泉中水', '乙酉': '泉中水', '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹靂火', '己丑': '霹靂火', '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '長流水', '癸巳': '長流水', '甲午': '沙中金', '乙未': '沙中金',
  '丙申': '山下火', '丁酉': '山下火', '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土', '壬寅': '金箔金', '癸卯': '金箔金',
  '甲辰': '覆燈火', '乙巳': '覆燈火', '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驛土', '己酉': '大驛土', '庚戌': '釵釧金', '辛亥': '釵釧金',
  '壬子': '桑柘木', '癸丑': '桑柘木', '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土', '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木', '壬戌': '大海水', '癸亥': '大海水',
};

/**
 * 依天干地支查詢納音
 */
export function getNaYin(gan: string, zhi: string): string {
  return NAYIN_60[`${gan}${zhi}`] ?? '';
}

/**
 * 從既有的干支四柱 (如 iztro astrolabe.rawDates.chineseDate) 直接組出 FourPillars
 * 不重新計算日期，避免與已顯示的命盤資料 (含真太陽時/農曆校正) 產生分歧。
 */
export function buildFourPillarsFromGanZhi(
  yearly: readonly [string, string],
  monthly: readonly [string, string],
  daily: readonly [string, string],
  hourly: readonly [string, string],
): FourPillars {
  const makePillar = ([gan, zhi]: readonly [string, string]): Pillar => ({
    gan,
    zhi,
    ganWuXing: GAN_WUXING[gan] ?? '土',
    zhiWuXing: ZHI_WUXING[zhi] ?? '土',
  });

  return {
    year: makePillar(yearly),
    month: makePillar(monthly),
    day: makePillar(daily),
    time: makePillar(hourly),
    yearNaYin: getNaYin(...yearly),
    monthNaYin: getNaYin(...monthly),
    dayNaYin: getNaYin(...daily),
    timeNaYin: getNaYin(...hourly),
  };
}

/**
 * 從時間索引 (0-12) 計算四柱
 */
export function calculateFourPillarsFromTimeIndex(
  year: number,
  month: number,
  day: number,
  timeIndex: number,
): FourPillars {
  // 時辰索引 0=早子(0-1時), 1=丑(1-3), ..., 12=晚子(23-24)
  // 對應小時: 0->0, 1->2, 2->4, ..., 11->22, 12->23
  let hour: number;
  if (timeIndex === 0) {
    hour = 0;
  } else if (timeIndex === 12) {
    hour = 23;
  } else {
    hour = timeIndex * 2 - 1;
  }

  return calculateFourPillars(year, month, day, hour);
}
