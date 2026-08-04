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
  palaceScopeStars: Record<number, ScopeStars>; // 0..11 各宮位對應的流曜與十二神
  decadalTable: DecadalItem[]; // 大限 10 年表格 (12 大限)
  rawHoroscope: any;
}

/**
 * 取得大限表格 (12 個大限，依起始歲數從小到大排序)
 */
export function getDecadalTable(astrolabe: any, currentAge?: number): DecadalItem[] {
  if (!astrolabe || !Array.isArray(astrolabe.palaces)) {
    return [];
  }

  const items: DecadalItem[] = astrolabe.palaces.map((palace: any, index: number) => {
    const range: [number, number] = palace.decadal?.range || [0, 0];
    const heavenlyStem = palace.decadal?.heavenlyStem || palace.heavenlyStem || '';
    const earthlyBranch = palace.decadal?.earthlyBranch || palace.earthlyBranch || '';
    const stemBranch = `${heavenlyStem}${earthlyBranch}`;

    const majorStars = Array.isArray(palace.majorStars)
      ? palace.majorStars.map((star: any) => star.name || String(star))
      : [];

    const mutagen = getMutagensByStem(heavenlyStem);

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
 */
export function getHoroscopeSummary(
  astrolabe: any,
  targetDateInput?: string | Date
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

  const h = astrolabe.horoscope(dateStr);

  const nominalAge = h.age?.nominalAge ?? 0;

  // 大限四化
  const decadalMutagenArr: string[] = h.decadal?.mutagen || [];
  const decadalMutagenObj = {
    lu: decadalMutagenArr[0] || getMutagensByStem(h.decadal?.heavenlyStem).lu,
    quan: decadalMutagenArr[1] || getMutagensByStem(h.decadal?.heavenlyStem).quan,
    ke: decadalMutagenArr[2] || getMutagensByStem(h.decadal?.heavenlyStem).ke,
    ji: decadalMutagenArr[3] || getMutagensByStem(h.decadal?.heavenlyStem).ji,
  };

  // 流年四化
  const yearlyMutagenArr: string[] = h.yearly?.mutagen || [];
  const yearlyMutagenObj = {
    lu: yearlyMutagenArr[0] || getMutagensByStem(h.yearly?.heavenlyStem).lu,
    quan: yearlyMutagenArr[1] || getMutagensByStem(h.yearly?.heavenlyStem).quan,
    ke: yearlyMutagenArr[2] || getMutagensByStem(h.yearly?.heavenlyStem).ke,
    ji: yearlyMutagenArr[3] || getMutagensByStem(h.yearly?.heavenlyStem).ji,
  };

  // 大限/流年命宮名稱
  const decadalPalaceName = astrolabe.palaces[h.decadal?.index]?.name || '';
  const yearlyPalaceName = astrolabe.palaces[h.yearly?.index]?.name || '';

  // 各宮位對應流曜與神煞
  const palaceScopeStars: Record<number, ScopeStars> = {};
  for (let i = 0; i < 12; i++) {
    const decStars: string[] = (h.decadal?.stars[i] || []).map((s: any) => s.name);
    const yrStars: string[] = (h.yearly?.stars[i] || []).map((s: any) => s.name);
    const suiqian = h.yearly?.yearlyDecStar?.suiqian12?.[i];
    const jiangqian = h.yearly?.yearlyDecStar?.jiangqian12?.[i];

    palaceScopeStars[i] = {
      decadalStars: decStars,
      yearlyStars: yrStars,
      suiqianStar: suiqian,
      jiangqianStar: jiangqian,
    };
  }

  // 大限表格
  const decadalTable = getDecadalTable(astrolabe, nominalAge);

  return {
    solarDate: h.solarDate || dateStr,
    lunarDate: h.lunarDate || '',
    nominalAge,
    decadal: {
      index: h.decadal?.index ?? 0,
      name: decadalPalaceName,
      stemBranch: `${h.decadal?.heavenlyStem || ''}${h.decadal?.earthlyBranch || ''}`,
      mutagen: decadalMutagenObj,
      palaceNames: h.decadal?.palaceNames || [],
    },
    yearly: {
      index: h.yearly?.index ?? 0,
      name: yearlyPalaceName,
      stemBranch: `${h.yearly?.heavenlyStem || ''}${h.yearly?.earthlyBranch || ''}`,
      mutagen: yearlyMutagenObj,
      palaceNames: h.yearly?.palaceNames || [],
    },
    palaceScopeStars,
    decadalTable,
    rawHoroscope: h,
  };
}
