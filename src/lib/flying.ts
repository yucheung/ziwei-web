/**
 * 飛星四化 (Flying Star Four Transformations)
 *
 * 自研四化計算引擎 — iztro 無此獨立 API。
 * 根據宮位天干查表取得四化星（祿/權/科/忌），
 * 再找出該星所在宮位，完成「飛入」標記。
 * 遞迴飛行：從某宮位天干出發 → 四化星飛入其所在宮位 →
 *          再以該宮位天干繼續飛，形成飛星鏈。
 */

// ── 十天干四化表 ──────────────────────────────────────────────

/** 四化類型 */
export type MutagenType = '祿' | '權' | '科' | '忌';

/** 單顆四化星紀錄 */
export interface MutagenEntry {
  star: string;
  type: MutagenType;
}

/**
 * 十天干 → 四化星對照表
 * 甲:廉貞化祿, 破軍化權, 武曲化科, 太陽化忌
 * 乙:天機化祿, 天梁化權, 紫微化科, 太陰化忌
 * 丙:天同化祿, 天機化權, 文昌化科, 廉貞化忌
 * 丁:太陰化祿, 天同化權, 天機化科, 巨門化忌
 * 戊:貪狼化祿, 太陰化權, 右弼化科, 天機化忌
 * 己:武曲化祿, 貪狼化權, 天梁化科, 文曲化忌
 * 庚:太陽化祿, 武曲化權, 太陰化科, 天同化忌
 * 辛:巨門化祿, 太陽化權, 文曲化科, 文昌化忌
 * 壬:天梁化祿, 紫微化權, 左輔化科, 武曲化忌
 * 癸:破軍化祿, 巨門化權, 太陰化科, 貪狼化忌
 */
export const MUTAGEN_TABLE: Record<string, MutagenEntry[]> = {
  '甲': [
    { star: '廉貞', type: '祿' },
    { star: '破軍', type: '權' },
    { star: '武曲', type: '科' },
    { star: '太陽', type: '忌' },
  ],
  '乙': [
    { star: '天機', type: '祿' },
    { star: '天梁', type: '權' },
    { star: '紫微', type: '科' },
    { star: '太陰', type: '忌' },
  ],
  '丙': [
    { star: '天同', type: '祿' },
    { star: '天機', type: '權' },
    { star: '文昌', type: '科' },
    { star: '廉貞', type: '忌' },
  ],
  '丁': [
    { star: '太陰', type: '祿' },
    { star: '天同', type: '權' },
    { star: '天機', type: '科' },
    { star: '巨門', type: '忌' },
  ],
  '戊': [
    { star: '貪狼', type: '祿' },
    { star: '太陰', type: '權' },
    { star: '右弼', type: '科' },
    { star: '天機', type: '忌' },
  ],
  '己': [
    { star: '武曲', type: '祿' },
    { star: '貪狼', type: '權' },
    { star: '天梁', type: '科' },
    { star: '文曲', type: '忌' },
  ],
  '庚': [
    { star: '太陽', type: '祿' },
    { star: '武曲', type: '權' },
    { star: '太陰', type: '科' },
    { star: '天同', type: '忌' },
  ],
  '辛': [
    { star: '巨門', type: '祿' },
    { star: '太陽', type: '權' },
    { star: '文曲', type: '科' },
    { star: '文昌', type: '忌' },
  ],
  '壬': [
    { star: '天梁', type: '祿' },
    { star: '紫微', type: '權' },
    { star: '左輔', type: '科' },
    { star: '武曲', type: '忌' },
  ],
  '癸': [
    { star: '破軍', type: '祿' },
    { star: '巨門', type: '權' },
    { star: '太陰', type: '科' },
    { star: '貪狼', type: '忌' },
  ],
};

// ── 類型 ──────────────────────────────────────────────────────

/** 簡化宮位介面（只要飛星計算需要的欄位） */
export interface FlyingPalace {
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: Array<{ name: string; mutagen?: string }>;
  minorStars: Array<{ name: string; mutagen?: string }>;
}

/** 單一宮位的飛入結果 */
export interface PalaceFlyingResult {
  /** 宮位在 palaces 陣列中的索引 */
  palaceIndex: number;
  /** 宮位名稱 (e.g. 命宮) */
  palaceName: string;
  /** 該宮位的天干 */
  heavenlyStem: string;
  /** 此宮位天干產生的四化 → 各飛入哪個宮位 */
  flyingOut: Array<{
    star: string;
    type: MutagenType;
    /** 飛入的宮位索引 (若該星不在任何宮位則為 -1) */
    targetPalaceIndex: number;
    /** 飛入的宮位名稱 */
    targetPalaceName: string;
  }>;
  /** 有哪些飛星從其他宮位飛入此宮位 */
  flyingIn: Array<{
    star: string;
    type: MutagenType;
    /** 來源宮位天干 */
    sourceStem: string;
    /** 來源宮位名稱 */
    sourcePalaceName: string;
    /** 來源宮位索引 */
    sourcePalaceIndex: number;
  }>;
}

/** 完整飛星計算結果 */
export interface FlyingStarsResult {
  /** 每個宮位的飛星結果 (陣列長度 = 12) */
  palaces: PalaceFlyingResult[];
}

// ── 核心計算函式 ──────────────────────────────────────────────

/**
 * 查表取得某天干的四化星
 */
export function getMutagenByStem(stem: string): MutagenEntry[] {
  return MUTAGEN_TABLE[stem] ?? [];
}

/**
 * 在宮位陣列中找出某顆星所在的宮位索引
 * 搜尋主星 (majorStars) 與輔星 (minorStars)
 * 回傳第一個找到的宮位索引，找不到回傳 -1
 */
export function findStarPalaceIndex(
  palaces: FlyingPalace[],
  starName: string,
): number {
  for (const p of palaces) {
    if (p.majorStars.some((s) => s.name === starName)) return p.index;
    if (p.minorStars.some((s) => s.name === starName)) return p.index;
  }
  return -1;
}

/**
 * 計算某宮位天干的四化飛出結果
 * 回傳四顆星各自飛入的宮位
 */
export function calculateFlyingOut(
  palace: FlyingPalace,
  palaces: FlyingPalace[],
): PalaceFlyingResult['flyingOut'] {
  const stem = palace.heavenlyStem;
  const entries = getMutagenByStem(stem);

  return entries.map((entry) => {
    const targetIdx = findStarPalaceIndex(palaces, entry.star);
    const targetPalace = targetIdx >= 0 ? palaces[targetIdx] : null;
    return {
      star: entry.star,
      type: entry.type,
      targetPalaceIndex: targetIdx,
      targetPalaceName: targetPalace?.name ?? '未知',
    };
  });
}

/**
 * 計算所有宮位的飛入結果 (哪些星飛入了此宮位)
 */
export function calculateAllFlyingIn(
  palaces: FlyingPalace[],
): PalaceFlyingResult['flyingIn'][] {
  // 先算每個宮位的飛出
  const allFlyingOut = palaces.map((p) => calculateFlyingOut(p, palaces));

  // 初始化每個宮位的飛入陣列
  const flyingInResults: PalaceFlyingResult['flyingIn'][][] = palaces.map(
    () => [],
  );

  // 將飛出結果映射到目標宮位的飛入
  for (let srcIdx = 0; srcIdx < palaces.length; srcIdx++) {
    const srcPalace = palaces[srcIdx];
    for (const fly of allFlyingOut[srcIdx]) {
      if (fly.targetPalaceIndex >= 0) {
        flyingInResults[fly.targetPalaceIndex].push({
          star: fly.star,
          type: fly.type,
          sourceStem: srcPalace.heavenlyStem,
          sourcePalaceName: srcPalace.name,
          sourcePalaceIndex: srcIdx,
        });
      }
    }
  }

  return flyingInResults;
}

/**
 * 完整飛星四化計算
 * 依序計算每個宮位天干的四化飛出與飛入
 */
export function calculateFlyingStars(
  palaces: FlyingPalace[],
): FlyingStarsResult {
  const allFlyingIn = calculateAllFlyingIn(palaces);

  const results: PalaceFlyingResult[] = palaces.map((p, idx) => ({
    palaceIndex: p.index,
    palaceName: p.name,
    heavenlyStem: p.heavenlyStem,
    flyingOut: calculateFlyingOut(p, palaces),
    flyingIn: allFlyingIn[idx],
  }));

  return { palaces: results };
}

/**
 * 取得宮位上的所有四化標記（含本宮天干四化 + 飛入四化）
 * 回傳格式供 UI 渲染使用
 */
export interface PalaceMutagenLabel {
  star: string;
  type: MutagenType;
  /** 'native' = 本宮天干四化產生; 'flying' = 從其他宮位飛入 */
  source: 'native' | 'flying';
  /** 飛入時的來源宮位名稱 */
  fromPalace?: string;
}

/**
 * 取得某宮位上的所有四化標記
 */
export function getPalaceMutagenLabels(
  palaceIndex: number,
  flyingResult: FlyingStarsResult,
): PalaceMutagenLabel[] {
  const data = flyingResult.palaces[palaceIndex];
  if (!data) return [];

  const labels: PalaceMutagenLabel[] = [];

  // 飛出（本宮天干的四化飛入其他宮位，不在此宮位顯示）
  // 但本宮天干的四化若恰好落在本宮，也要標記
  for (const fly of data.flyingOut) {
    if (fly.targetPalaceIndex === palaceIndex) {
      labels.push({
        star: fly.star,
        type: fly.type,
        source: 'native',
      });
    }
  }

  // 飛入（從其他宮位飛入此宮位的四化）
  for (const fly of data.flyingIn) {
    labels.push({
      star: fly.star,
      type: fly.type,
      source: 'flying',
      fromPalace: fly.sourcePalaceName,
    });
  }

  return labels;
}
