import { astro } from 'iztro';
import type { Config, AstroType } from 'iztro/lib/data/types/astro';
import { Lunar, LunarYear } from 'lunar-typescript';

export type { Config, AstroType };

/** 預設流派：中州派 */
export const DEFAULT_ALGORITHM: NonNullable<Config['algorithm']> = 'zhongzhou';

/**
 * 預設斗數設定 (中州派)
 */
export const DEFAULT_CONFIG: Config = {
  algorithm: DEFAULT_ALGORITHM,
};

/**
 * 城市經度對照表（用於真太陽時校正）
 */
export const CITY_LONGITUDES: Record<string, number> = {
  '台北': 121.56,
  '臺北': 121.56,
  'Taipei': 121.56,
  '新北': 121.46,
  'New Taipei': 121.46,
  '基隆': 121.74,
  'Keelung': 121.74,
  '桃園': 121.30,
  'Taoyuan': 121.30,
  '新竹': 120.96,
  'Hsinchu': 120.96,
  '苗栗': 120.82,
  'Miaoli': 120.82,
  '台中': 120.68,
  '臺中': 120.68,
  'Taichung': 120.68,
  '彰化': 120.54,
  'Changhua': 120.54,
  '南投': 120.68,
  'Nantou': 120.68,
  '雲林': 120.53,
  'Yunlin': 120.53,
  '嘉義': 120.45,
  'Chiayi': 120.45,
  '台南': 120.20,
  '臺南': 120.20,
  'Tainan': 120.20,
  '高雄': 120.31,
  'Kaohsiung': 120.31,
  '屏東': 120.48,
  'Pingtung': 120.48,
  '宜蘭': 121.75,
  'Yilan': 121.75,
  '花蓮': 121.60,
  'Hualien': 121.60,
  '台東': 121.15,
  '臺東': 121.15,
  'Taitung': 121.15,
  '澎湖': 119.56,
  'Penghu': 119.56,
  '金門': 118.32,
  'Kinmen': 118.32,
  '馬祖': 119.94,
  'Matsu': 119.94,
  '香港': 114.17,
  'Hong Kong': 114.17,
  '澳門': 113.54,
  'Macau': 113.54,
  '北京': 116.40,
  'Beijing': 116.40,
  '上海': 121.47,
  'Shanghai': 121.47,
  '廣州': 113.26,
  'Guangzhou': 113.26,
  '深圳': 114.05,
  'Shenzhen': 114.05,
  '成都': 104.06,
  'Chengdu': 104.06,
  '杭州': 120.15,
  'Hangzhou': 120.15,
  '東京': 139.69,
  'Tokyo': 139.69,
};

/**
 * 12 時辰名稱對照
 */
export const CHINESE_TIME_NAMES = [
  '早子時 (00:00-01:00)',
  '丑時 (01:00-03:00)',
  '寅時 (03:00-05:00)',
  '卯時 (05:00-07:00)',
  '辰時 (07:00-09:00)',
  '巳時 (09:00-11:00)',
  '午時 (11:00-13:00)',
  '未時 (13:00-15:00)',
  '申時 (15:00-17:00)',
  '酉時 (17:00-19:00)',
  '戌時 (19:00-21:00)',
  '亥時 (21:00-23:00)',
  '晚子時 (23:00-24:00)',
];

export type Gender = 'male' | 'female' | '男' | '女' | '乾' | '坤' | '乾造' | '坤造';

export interface GetChartOptions {
  /** 日期字串 (如 "2000-08-16", "2000/8/16", "89-08-16", "民國89年8月16日") 或 Date 物件 */
  date: string | Date;
  /** 時辰索引 (0=早子, 1=丑, ..., 11=亥, 12=晚子) 或 小時數(0..23) 或 "HH:mm" 時間字串 */
  timeIndex: number | string;
  /** 性別 */
  gender: Gender;
  /** 是否為陰曆/農曆 (預設 false) */
  isLunar?: boolean;
  /** 是否為閏月 (農曆專用，預設 false) */
  isLeapMonth?: boolean;
  /** 時區 offset (單位：小時，預設 8) */
  timeZone?: number;
  /** 經度 (數字 e.g. 121.56 或 城市名 e.g. "台北") */
  longitude?: number | string;
  /** 語言設定 ('zh-CN' | 'zh-TW' | 'en-US', 預設 'zh-CN') */
  language?: string;
  /** 是否修正閏月 (iztro 預設 true) */
  fixLeap?: boolean;
  /** iztro Config：四化/亮度/流派/晚子時/年界等 */
  config?: Config;
  /** 星盤類型：heaven(天盤) / earth(地盤) / human(人盤)，預設 'heaven' */
  astroType?: AstroType;
}

export interface ParsedDate {
  year: number;
  month: number;
  day: number;
  isMinguo: boolean;
  formattedDateStr: string; // "YYYY-M-D"
}

export interface TrueSolarTimeResult {
  offsetMinutes: number;           // 總校正分鐘數 (經度時差 + 均時差)
  longitudeOffsetMinutes?: number; // 經度時差 (分鐘)
  equationOfTimeMinutes?: number;  // 均時差 (分鐘)
  longitude: number;               // 經度
  standardMeridian: number;        // 標準經線
}

/**
 * 計算均時差 (Equation of Time, EOT) 單位：分鐘
 * 根據西元陽曆 (solarYear, solarMonth, solarDay) 計算
 */
export function calculateEquationOfTime(year: number, month: number, day: number): number {
  const now = new Date(Date.UTC(year, month - 1, day));
  const start = new Date(Date.UTC(year, 0, 0));
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Spencer (1971) 均時差公式 (單位：分鐘)
  const gamma = ((2 * Math.PI) / 365) * (dayOfYear - 1);
  const eotMinutes =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  return eotMinutes;
}

/**
 * 解析並驗證日期 (支援西元 / 民國年 / Date 物件 / 各種字串格式)
 * 當 isLunar 為 true 時，採用農曆天數與閏月驗證，避免陽曆 Date 誤拒農曆合法日期 (例如農曆二月三十或閏月)
 */
export function parseAndValidateDate(
  dateInput: string | Date,
  isLunar: boolean = false,
  isLeapMonth: boolean = false
): ParsedDate {
  if (!dateInput) {
    throw new Error('日期不可為空');
  }

  let year: number;
  let month: number;
  let day: number;
  let isMinguo = false;

  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      throw new Error('無效的 Date 物件');
    }
    year = dateInput.getFullYear();
    month = dateInput.getMonth() + 1;
    day = dateInput.getDate();
  } else if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (!trimmed) {
      throw new Error('日期字串不可為空');
    }

    // 檢查是否包含民國字樣，例如 "民國89年8月16日" 或 "ROC 89-08-16"
    const minguoMatch = trimmed.match(/(?:民國|ROC\s*)?(\d{2,3})[.\-/年](\d{1,2})[.\-/月](\d{1,2})日?/i);
    const containsMinguoPrefix = /民國|ROC/i.test(trimmed);

    if (containsMinguoPrefix && minguoMatch) {
      const rawYear = parseInt(minguoMatch[1], 10);
      year = rawYear + 1911;
      month = parseInt(minguoMatch[2], 10);
      day = parseInt(minguoMatch[3], 10);
      isMinguo = true;
    } else {
      // 標準 ISO 或 YYYY-MM-DD 或 YYYY/MM/DD 或 89-08-16
      const partsMatch = trimmed.match(/^(\d{2,4})[.\-/年](\d{1,2})[.\-/月](\d{1,2})日?$/);
      if (!partsMatch) {
        throw new Error(`無法解析日期格式: "${dateInput}"`);
      }

      const p1 = parseInt(partsMatch[1], 10);
      const p2 = parseInt(partsMatch[2], 10);
      const p3 = parseInt(partsMatch[3], 10);

      // 如果第一位數字 <= 120，視為民國年 (例如 "89-08-16")
      if (p1 <= 120) {
        year = p1 + 1911;
        isMinguo = true;
      } else {
        year = p1;
      }
      month = p2;
      day = p3;
    }
  } else {
    throw new Error('日期必須為字串或 Date 物件');
  }

  // 驗證範圍
  if (isNaN(year) || year < 1900 || year > 2100) {
    throw new Error(`年份超出範圍 (1900-2100): ${year}`);
  }
  if (isNaN(month) || month < 1 || month > 12) {
    throw new Error(`月份超出範圍 (1-12): ${month}`);
  }

  if (isLunar) {
    const ly = LunarYear.fromYear(year);
    const lunarMonth = ly.getMonth(isLeapMonth ? -month : month);
    if (!lunarMonth) {
      if (isLeapMonth) {
        throw new Error(`農曆 ${year}年 無閏${month}月`);
      } else {
        throw new Error(`農曆 ${year}年 無${month}月`);
      }
    }
    const daysInMonth = lunarMonth.getDayCount();
    if (isNaN(day) || day < 1 || day > daysInMonth) {
      throw new Error(`日期 農曆${month}月${isLeapMonth ? '(閏)' : ''}${day}日 無效，該月只有 ${daysInMonth} 天`);
    }
  } else {
    const daysInMonth = new Date(year, month, 0).getDate();
    if (isNaN(day) || day < 1 || day > daysInMonth) {
      throw new Error(`日期 ${month}月${day}日 無效，該月只有 ${daysInMonth} 天`);
    }
  }

  return {
    year,
    month,
    day,
    isMinguo,
    formattedDateStr: `${year}-${month}-${day}`,
  };
}

/**
 * 規範化性別
 */
export function normalizeGender(gender: Gender): 'male' | 'female' {
  if (!gender) {
    throw new Error('性別不可為空');
  }
  const g = String(gender).trim().toLowerCase();
  if (g === 'male' || g === 'm' || g === '男' || g === '乾' || g === '乾造') {
    return 'male';
  }
  if (g === 'female' || g === 'f' || g === '女' || g === '坤' || g === '坤造') {
    return 'female';
  }
  throw new Error(`無法辨識的性別: "${gender}"`);
}

/**
 * 計算真太陽時經度與時差 (分鐘)
 * 包含經度時差與均時差 (Equation of Time)
 */
export function getTrueSolarTimeCorrection(
  longitude?: number | string,
  timeZone: number = 8,
  dateInput?: string | Date | { year: number; month: number; day: number },
  isLunar: boolean = false,
  isLeapMonth: boolean = false
): TrueSolarTimeResult | null {
  if (longitude === undefined || longitude === null || longitude === '') {
    return null;
  }

  let lngNum: number;
  if (typeof longitude === 'number') {
    lngNum = longitude;
  } else if (typeof longitude === 'string') {
    const trimmed = longitude.trim();
    if (CITY_LONGITUDES[trimmed] !== undefined) {
      lngNum = CITY_LONGITUDES[trimmed];
    } else {
      lngNum = parseFloat(trimmed);
      if (isNaN(lngNum)) {
        throw new Error(`無法辨識的城市名稱或經度數字: "${longitude}"`);
      }
    }
  } else {
    return null;
  }

  if (lngNum < -180 || lngNum > 180) {
    throw new Error(`經度數值超出範圍 (-180 ~ 180): ${lngNum}`);
  }

  const standardMeridian = timeZone * 15;
  const longitudeOffsetMinutes = (lngNum - standardMeridian) * 4;

  let equationOfTimeMinutes = 0;

  if (dateInput !== undefined && dateInput !== null) {
    let sYear: number;
    let sMonth: number;
    let sDay: number;

    if (
      typeof dateInput === 'object' &&
      !(dateInput instanceof Date) &&
      'year' in dateInput &&
      'month' in dateInput &&
      'day' in dateInput
    ) {
      sYear = dateInput.year;
      sMonth = dateInput.month;
      sDay = dateInput.day;
    } else {
      const parsed = parseAndValidateDate(dateInput as string | Date, isLunar, isLeapMonth);
      sYear = parsed.year;
      sMonth = parsed.month;
      sDay = parsed.day;
    }

    if (isLunar) {
      const lunarObj = Lunar.fromYmd(sYear, isLeapMonth ? -sMonth : sMonth, sDay);
      const solarObj = lunarObj.getSolar();
      sYear = solarObj.getYear();
      sMonth = solarObj.getMonth();
      sDay = solarObj.getDay();
    }

    equationOfTimeMinutes = calculateEquationOfTime(sYear, sMonth, sDay);
  }

  const offsetMinutes = longitudeOffsetMinutes + equationOfTimeMinutes;

  return {
    offsetMinutes,
    longitudeOffsetMinutes,
    equationOfTimeMinutes,
    longitude: lngNum,
    standardMeridian,
  };
}

/**
 * 解析與計算時辰 (0..12)
 */
export function normalizeTimeIndex(
  timeInput: number | string,
  solarTimeOffsetMinutes: number = 0
): {
  timeIndex: number;
  adjustedDateOffsetDays: number;
  timeName: string;
} {
  let timeIndex: number;
  let adjustedDateOffsetDays = 0;

  if (typeof timeInput === 'number') {
    if (!Number.isInteger(timeInput) || timeInput < 0 || timeInput > 12) {
      throw new Error(`時辰索引必須為 0 到 12 之間的整數: ${timeInput}`);
    }
    timeIndex = timeInput;
  } else if (typeof timeInput === 'string') {
    const trimmed = timeInput.trim();

    // 如果傳入純數字字串 "0" ~ "12"
    if (/^\d{1,2}$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (num >= 0 && num <= 12) {
        timeIndex = num;
        return {
          timeIndex,
          adjustedDateOffsetDays,
          timeName: CHINESE_TIME_NAMES[timeIndex] || `時辰${timeIndex}`,
        };
      }
    }

    // 解析 "HH:mm" 或 "HH:mm:ss"
    const clockMatch = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
    if (clockMatch) {
      let hour = parseInt(clockMatch[1], 10);
      const minute = parseInt(clockMatch[2], 10);

      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        throw new Error(`時間數值無效: "${timeInput}"`);
      }

      // 套用真太陽時校正 (分鐘)
      if (solarTimeOffsetMinutes !== 0) {
        let totalMinutes = hour * 60 + minute + Math.round(solarTimeOffsetMinutes);
        if (totalMinutes < 0) {
          totalMinutes += 24 * 60;
          adjustedDateOffsetDays = -1;
        } else if (totalMinutes >= 24 * 60) {
          totalMinutes -= 24 * 60;
          adjustedDateOffsetDays = 1;
        }
        hour = Math.floor(totalMinutes / 60);
      }

      // 依小時轉為時辰
      if (hour === 23) {
        timeIndex = 12; // 晚子時
      } else if (hour === 0) {
        timeIndex = 0; // 早子時
      } else {
        timeIndex = Math.floor((hour + 1) / 2);
      }
    } else {
      throw new Error(`無法解析時辰輸入: "${timeInput}"`);
    }
  } else {
    throw new Error('時辰輸入必須為數字或字串');
  }

  return {
    timeIndex,
    adjustedDateOffsetDays,
    timeName: CHINESE_TIME_NAMES[timeIndex] || `時辰${timeIndex}`,
  };
}

/**
 * 核心排盤封裝函式 getChart
 * 支援傳入 GetChartOptions 物件，或依傳統位置傳參
 */
export function getChart(options: GetChartOptions): ReturnType<typeof astro.bySolar>;
export function getChart(
  solarDate: string | Date,
  timeIndex: number | string,
  gender: Gender,
  isLunar?: boolean,
  timeZone?: number,
  isLeapMonth?: boolean,
  longitude?: number | string
): ReturnType<typeof astro.bySolar>;
export function getChart(
  arg1: GetChartOptions | string | Date,
  arg2?: number | string,
  arg3?: Gender,
  arg4?: boolean,
  arg5?: number,
  arg6?: boolean,
  arg7?: number | string
): ReturnType<typeof astro.bySolar> {
  let opts: GetChartOptions;

  if (typeof arg1 === 'object' && !(arg1 instanceof Date) && 'date' in arg1) {
    opts = arg1;
  } else {
    opts = {
      date: arg1 as string | Date,
      timeIndex: arg2!,
      gender: arg3!,
      isLunar: arg4 ?? false,
      timeZone: arg5 ?? 8,
      isLeapMonth: arg6 ?? false,
      longitude: arg7,
    };
  }

  // 1. 性別驗證
  const normGender = normalizeGender(opts.gender);

  // 1.5 經度校正僅在 timeIndex 為精確時間字串 (例如 "14:30") 時才會生效
  //     (見 normalizeTimeIndex：時辰索引數字分支完全不套用 solarTimeOffsetMinutes)。
  //     若呼叫端同時提供 longitude 與時辰索引數字，校正會被靜默忽略，
  //     產生使用者未預期、且未被告知的錯誤命盤，因此明確拋出錯誤而非靜默略過。
  const hasLongitude = opts.longitude !== undefined && opts.longitude !== null && opts.longitude !== '';
  const timeIndexIsNumericSlot =
    typeof opts.timeIndex === 'number' ||
    (typeof opts.timeIndex === 'string' && /^\d{1,2}$/.test(opts.timeIndex.trim()));
  if (hasLongitude && timeIndexIsNumericSlot) {
    throw new Error(
      '已提供經度 (longitude) 但 timeIndex 為時辰索引數字，真太陽時校正僅在提供精確時間字串 (例如 "14:30") 時才會生效；請改用精確時間字串，或移除 longitude 參數。'
    );
  }

  const isLunar = opts.isLunar ?? false;
  let isLeapMonth = opts.isLeapMonth ?? false;
  const timeZone = opts.timeZone ?? 8;

  // 2. 日期解析與驗證 (包含農曆與閏月校驗)
  const parsedDate = parseAndValidateDate(opts.date, isLunar, isLeapMonth);

  // 3. 真太陽時校正計算 (經度時差 + 均時差)
  const solarTimeCorrection = getTrueSolarTimeCorrection(
    opts.longitude,
    timeZone,
    parsedDate,
    isLunar,
    isLeapMonth
  );
  const timeOffsetMinutes = solarTimeCorrection ? solarTimeCorrection.offsetMinutes : 0;

  // 4. 時辰解析
  const { timeIndex, adjustedDateOffsetDays } = normalizeTimeIndex(opts.timeIndex, timeOffsetMinutes);

  // 5. 如果真太陽時跨日，調整日期 (區分農曆與陽曆)
  let finalYear = parsedDate.year;
  let finalMonth = parsedDate.month;
  let finalDay = parsedDate.day;

  if (adjustedDateOffsetDays !== 0) {
    if (isLunar) {
      const lunarObj = Lunar.fromYmd(
        finalYear,
        isLeapMonth ? -finalMonth : finalMonth,
        finalDay
      );
      const adjustedLunar = lunarObj.next(adjustedDateOffsetDays);
      finalYear = adjustedLunar.getYear();
      const rawMonth = adjustedLunar.getMonth();
      finalMonth = Math.abs(rawMonth);
      isLeapMonth = rawMonth < 0;
      finalDay = adjustedLunar.getDay();
    } else {
      const d = new Date(finalYear, finalMonth - 1, finalDay + adjustedDateOffsetDays);
      finalYear = d.getFullYear();
      finalMonth = d.getMonth() + 1;
      finalDay = d.getDate();
    }
  }

  const fixLeap = opts.fixLeap ?? true;
  const astroType = opts.astroType ?? 'heaven';
  const config = opts.config ?? DEFAULT_CONFIG;

  // 6. 調用 iztro (優先使用 withOptions 以支援 config 與 astroType)
  const option = {
    type: (isLunar ? 'lunar' : 'solar') as 'solar' | 'lunar',
    dateStr: isLunar ? `${finalYear}-${finalMonth}-${finalDay}` : `${finalYear}-${finalMonth}-${finalDay}`,
    timeIndex,
    gender: normGender,
    isLeapMonth,
    fixLeap,
    language: opts.language,
    config,
    astroType,
  };

  return astro.withOptions(option);
}

