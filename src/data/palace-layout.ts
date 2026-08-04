/**
 * 12 地支標準順序 (以 寅 為索引 0 起算)
 * iztro 的 palaces 陣列即是以 寅 為 0, 卯 為 1, ..., 丑 為 11 的地支固定位陣列。
 */
export const EARTHLY_BRANCHES = [
  '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'
] as const;

export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number];

/**
 * 4x4 網格位置結構
 * 傳統紫微斗數命盤佈局（外圍 12 宮，中間 2x2 為盤頭中樞）：
 * 
 * 巳 (0,0)  午 (0,1)  未 (0,2)  申 (0,3)
 * 辰 (1,0)  [ 中宮 (1..2, 1..2) ]  酉 (1,3)
 * 卯 (2,0)                         戌 (2,3)
 * 寅 (3,0)  丑 (3,1)  子 (3,2)  亥 (3,3)
 */
export interface GridPosition {
  row: number; // 0-based index (0 top to 3 bottom)
  col: number; // 0-based index (0 left to 3 right)
}

/**
 * 地支索引 (0..11, 0=寅) 到 4x4 網格座標 (row 0..3, col 0..3) 的對照表
 */
export const PALACE_GRID_MAP: Record<number, GridPosition> = {
  0:  { row: 3, col: 0 }, // 寅 (左下)
  1:  { row: 2, col: 0 }, // 卯 (左中下)
  2:  { row: 1, col: 0 }, // 辰 (左中上)
  3:  { row: 0, col: 0 }, // 巳 (左上)
  4:  { row: 0, col: 1 }, // 午 (上中左)
  5:  { row: 0, col: 2 }, // 未 (上中右)
  6:  { row: 0, col: 3 }, // 申 (右上)
  7:  { row: 1, col: 3 }, // 酉 (右中上)
  8:  { row: 2, col: 3 }, // 戌 (右中下)
  9:  { row: 3, col: 3 }, // 亥 (右下)
  10: { row: 3, col: 2 }, // 子 (下中右)
  11: { row: 3, col: 1 }, // 丑 (下中左)
};

/**
 * 六合暗合宮位對照表 (Key: 0..11 寅..丑, Value: 0..11 異宮地支)
 * 寅(0)-亥(9), 卯(1)-戌(8), 辰(2)-酉(7), 巳(3)-申(6), 午(4)-未(5), 子(10)-丑(11)
 */
export const ANHE_INDEX_MAP: Record<number, number> = {
  0: 9,   // 寅 <-> 亥
  1: 8,   // 卯 <-> 戌
  2: 7,   // 辰 <-> 酉
  3: 6,   // 巳 <-> 申
  4: 5,   // 午 <-> 未
  5: 4,   // 未 <-> 午
  6: 3,   // 申 <-> 巳
  7: 2,   // 酉 <-> 辰
  8: 1,   // 戌 <-> 卯
  9: 0,   // 亥 <-> 寅
  10: 11, // 子 <-> 丑
  11: 10, // 丑 <-> 子
};



/**
 * 取得暗合宮位索引
 */
export function getAnheIndex(targetIndex: number): number {
  const normIndex = ((targetIndex % 12) + 12) % 12;
  return ANHE_INDEX_MAP[normIndex];
}

/**
 * 依據地支名稱 ('寅'..'丑') 或 數字索引 (0..11) 取得 4x4 網格座標
 */
export function getGridPosition(branchOrIndex: EarthlyBranch | number): GridPosition {
  if (typeof branchOrIndex === 'number') {
    const normIndex = ((branchOrIndex % 12) + 12) % 12;
    return PALACE_GRID_MAP[normIndex];
  }
  const index = EARTHLY_BRANCHES.indexOf(branchOrIndex);
  if (index >= 0) {
    return PALACE_GRID_MAP[index];
  }
  return { row: 0, col: 0 };
}
