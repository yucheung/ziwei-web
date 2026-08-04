import { describe, it, expect } from 'vitest';
import {
  EARTHLY_BRANCHES,
  getSanfangSizhengIndices,
  getAnheIndex,
  getGridPosition,
} from './palace-layout';

describe('palace-layout logic', () => {
  it('contains 12 earthly branches starting from 寅 to 丑', () => {
    expect(EARTHLY_BRANCHES).toHaveLength(12);
    expect(EARTHLY_BRANCHES[0]).toBe('寅');
    expect(EARTHLY_BRANCHES[3]).toBe('巳');
    expect(EARTHLY_BRANCHES[6]).toBe('申');
    expect(EARTHLY_BRANCHES[9]).toBe('亥');
    expect(EARTHLY_BRANCHES[10]).toBe('子');
    expect(EARTHLY_BRANCHES[11]).toBe('丑');
  });

  it('correctly maps 12 palaces to 4x4 matrix coordinates', () => {
    // 巳 (index 3) -> Top-Left (0, 0)
    expect(getGridPosition(3)).toEqual({ row: 0, col: 0 });
    expect(getGridPosition('巳')).toEqual({ row: 0, col: 0 });

    // 午 (index 4) -> (0, 1)
    expect(getGridPosition(4)).toEqual({ row: 0, col: 1 });

    // 未 (index 5) -> (0, 2)
    expect(getGridPosition(5)).toEqual({ row: 0, col: 2 });

    // 申 (index 6) -> Top-Right (0, 3)
    expect(getGridPosition(6)).toEqual({ row: 0, col: 3 });

    // 酉 (index 7) -> (1, 3)
    expect(getGridPosition(7)).toEqual({ row: 1, col: 3 });

    // 戌 (index 8) -> (2, 3)
    expect(getGridPosition(8)).toEqual({ row: 2, col: 3 });

    // 亥 (index 9) -> Bottom-Right (3, 3)
    expect(getGridPosition(9)).toEqual({ row: 3, col: 3 });

    // 子 (index 10) -> (3, 2)
    expect(getGridPosition(10)).toEqual({ row: 3, col: 2 });

    // 丑 (index 11) -> (3, 1)
    expect(getGridPosition(11)).toEqual({ row: 3, col: 1 });

    // 寅 (index 0) -> Bottom-Left (3, 0)
    expect(getGridPosition(0)).toEqual({ row: 3, col: 0 });
    expect(getGridPosition('寅')).toEqual({ row: 3, col: 0 });

    // 卯 (index 1) -> (2, 0)
    expect(getGridPosition(1)).toEqual({ row: 2, col: 0 });

    // 辰 (index 2) -> (1, 0)
    expect(getGridPosition(2)).toEqual({ row: 1, col: 0 });
  });

  it('correctly computes Sanfang Sizheng (三方四正)', () => {
    // For 寅 (0):
    // Opposite: 申 (6)
    // Career: 午 (4)
    // Wealth: 戌 (8)
    const yinSanfang = getSanfangSizhengIndices(0);
    expect(yinSanfang.target).toBe(0);
    expect(yinSanfang.opposite).toBe(6);
    expect(yinSanfang.career).toBe(4);
    expect(yinSanfang.wealth).toBe(8);
    expect(yinSanfang.sizheng).toEqual([0, 4, 6, 8]);

    // For 午 (4):
    // Opposite: 子 (10)
    // Career: 戌 (8)
    // Wealth: 寅 (0)
    const wuSanfang = getSanfangSizhengIndices(4);
    expect(wuSanfang.target).toBe(4);
    expect(wuSanfang.opposite).toBe(10);
    expect(wuSanfang.career).toBe(8);
    expect(wuSanfang.wealth).toBe(0);
    expect(wuSanfang.sizheng).toEqual([4, 8, 10, 0]);
  });

  it('correctly computes Anhe (六合/暗合)', () => {
    expect(getAnheIndex(0)).toBe(9);   // 寅 <-> 亥
    expect(getAnheIndex(9)).toBe(0);   // 亥 <-> 寅
    expect(getAnheIndex(1)).toBe(8);   // 卯 <-> 戌
    expect(getAnheIndex(2)).toBe(7);   // 辰 <-> 酉
    expect(getAnheIndex(3)).toBe(6);   // 巳 <-> 申
    expect(getAnheIndex(4)).toBe(5);   // 午 <-> 未
    expect(getAnheIndex(10)).toBe(11); // 子 <-> 丑
    expect(getAnheIndex(11)).toBe(10); // 丑 <-> 子
  });
});
