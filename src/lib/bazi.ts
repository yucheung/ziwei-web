import { Solar, Lunar } from 'lunar-typescript';

/** 天干 */
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

/** 地支 */
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

/** 五行 */
const WU_XING = ['木', '火', '土', '金', '水'] as const;

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

/** 五行→顏色 CSS class（Tailwind 用） */
export const WUXING_COLORS: Record<string, string> = {
  '木': 'text-green-400',
  '火': 'text-red-400',
  '土': 'text-yellow-400',
  '金': 'text-slate-300',
  '水': 'text-blue-400',
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
