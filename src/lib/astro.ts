import { astro } from 'iztro';

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
}

export interface ParsedDate {
  year: number;
  month: number;
  day: number;
  isMinguo: boolean;
  formattedDateStr: string; // "YYYY-M-D"
}

export interface TrueSolarTimeResult {
  offsetMinutes: number;
  longitude: number;
  standardMeridian: number;
}

/**
 * 解析並驗證日期 (支援西元 / 民國年 / Date 物件 / 各種字串格式)
 */
export function parseAndValidateDate(dateInput: string | Date): ParsedDate {
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

  const daysInMonth = new Date(year, month, 0).getDate();
  if (isNaN(day) || day < 1 || day > daysInMonth) {
    throw new Error(`日期 ${month}月${day}日 無效，該月只有 ${daysInMonth} 天`);
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
 */
export function getTrueSolarTimeCorrection(
  longitude?: number | string,
  timeZone: number = 8
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
  const offsetMinutes = (lngNum - standardMeridian) * 4;

  return {
    offsetMinutes,
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
      let minute = parseInt(clockMatch[2], 10);

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
        minute = totalMinutes % 60;
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

  // 2. 真太陽時校正計算
  const timeZone = opts.timeZone ?? 8;
  const solarTimeCorrection = getTrueSolarTimeCorrection(opts.longitude, timeZone);
  const timeOffsetMinutes = solarTimeCorrection ? solarTimeCorrection.offsetMinutes : 0;

  // 3. 時辰解析
  const { timeIndex, adjustedDateOffsetDays } = normalizeTimeIndex(opts.timeIndex, timeOffsetMinutes);

  // 4. 日期解析與驗證
  const parsedDate = parseAndValidateDate(opts.date);

  // 如果真太陽時跨日，調整日期
  let finalYear = parsedDate.year;
  let finalMonth = parsedDate.month;
  let finalDay = parsedDate.day;

  if (adjustedDateOffsetDays !== 0) {
    const d = new Date(finalYear, finalMonth - 1, finalDay + adjustedDateOffsetDays);
    finalYear = d.getFullYear();
    finalMonth = d.getMonth() + 1;
    finalDay = d.getDate();
  }

  const finalSolarDateStr = `${finalYear}-${finalMonth}-${finalDay}`;
  const isLunar = opts.isLunar ?? false;
  const isLeapMonth = opts.isLeapMonth ?? false;
  const fixLeap = opts.fixLeap ?? true;

  // 5. 調用 iztro
  if (isLunar) {
    // iztro byLunar 格式為 "YYYY-M-D"
    const lunarDateStr = `${finalYear}-${finalMonth}-${finalDay}`;
    return astro.byLunar(lunarDateStr, timeIndex, normGender, isLeapMonth, fixLeap, opts.language);
  } else {
    return astro.bySolar(finalSolarDateStr, timeIndex, normGender, fixLeap, opts.language);
  }
}
