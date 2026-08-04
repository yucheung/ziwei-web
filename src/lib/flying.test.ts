import { describe, it, expect } from 'vitest';
import {
  MUTAGEN_TABLE,
  getMutagenByStem,
  findStarPalaceIndex,
  calculateFlyingOut,
  calculateFlyingStars,
  getPalaceMutagenLabels,
  type FlyingPalace,
} from './flying';
import { getChart } from './astro';

// ── 十天干四化表查表測試 ──────────────────────────────────────

describe('十天干四化表 (MUTAGEN_TABLE)', () => {
  it('has all 10 heavenly stems', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    stems.forEach((stem) => {
      expect(MUTAGEN_TABLE[stem]).toBeDefined();
      expect(MUTAGEN_TABLE[stem]).toHaveLength(4);
    });
  });

  it('甲干: 廉貞化祿, 破軍化權, 武曲化科, 太陽化忌', () => {
    const entries = MUTAGEN_TABLE['甲'];
    expect(entries[0]).toEqual({ star: '廉貞', type: '祿' });
    expect(entries[1]).toEqual({ star: '破軍', type: '權' });
    expect(entries[2]).toEqual({ star: '武曲', type: '科' });
    expect(entries[3]).toEqual({ star: '太陽', type: '忌' });
  });

  it('乙干: 天機化祿, 天梁化權, 紫微化科, 太陰化忌', () => {
    const entries = MUTAGEN_TABLE['乙'];
    expect(entries[0]).toEqual({ star: '天機', type: '祿' });
    expect(entries[1]).toEqual({ star: '天梁', type: '權' });
    expect(entries[2]).toEqual({ star: '紫微', type: '科' });
    expect(entries[3]).toEqual({ star: '太陰', type: '忌' });
  });

  it('丙干: 天同化祿, 天機化權, 文昌化科, 廉貞化忌', () => {
    const entries = MUTAGEN_TABLE['丙'];
    expect(entries[0]).toEqual({ star: '天同', type: '祿' });
    expect(entries[1]).toEqual({ star: '天機', type: '權' });
    expect(entries[2]).toEqual({ star: '文昌', type: '科' });
    expect(entries[3]).toEqual({ star: '廉貞', type: '忌' });
  });

  it('丁干: 太陰化祿, 天同化權, 天機化科, 巨門化忌', () => {
    const entries = MUTAGEN_TABLE['丁'];
    expect(entries[0]).toEqual({ star: '太陰', type: '祿' });
    expect(entries[1]).toEqual({ star: '天同', type: '權' });
    expect(entries[2]).toEqual({ star: '天機', type: '科' });
    expect(entries[3]).toEqual({ star: '巨門', type: '忌' });
  });

  it('戊干: 貪狼化祿, 太陰化權, 右弼化科, 天機化忌', () => {
    const entries = MUTAGEN_TABLE['戊'];
    expect(entries[0]).toEqual({ star: '貪狼', type: '祿' });
    expect(entries[1]).toEqual({ star: '太陰', type: '權' });
    expect(entries[2]).toEqual({ star: '右弼', type: '科' });
    expect(entries[3]).toEqual({ star: '天機', type: '忌' });
  });

  it('己干: 武曲化祿, 貪狼化權, 天梁化科, 文曲化忌', () => {
    const entries = MUTAGEN_TABLE['己'];
    expect(entries[0]).toEqual({ star: '武曲', type: '祿' });
    expect(entries[1]).toEqual({ star: '貪狼', type: '權' });
    expect(entries[2]).toEqual({ star: '天梁', type: '科' });
    expect(entries[3]).toEqual({ star: '文曲', type: '忌' });
  });

  it('庚干: 太陽化祿, 武曲化權, 太陰化科, 天同化忌', () => {
    const entries = MUTAGEN_TABLE['庚'];
    expect(entries[0]).toEqual({ star: '太陽', type: '祿' });
    expect(entries[1]).toEqual({ star: '武曲', type: '權' });
    expect(entries[2]).toEqual({ star: '太陰', type: '科' });
    expect(entries[3]).toEqual({ star: '天同', type: '忌' });
  });

  it('辛干: 巨門化祿, 太陽化權, 文曲化科, 文昌化忌', () => {
    const entries = MUTAGEN_TABLE['辛'];
    expect(entries[0]).toEqual({ star: '巨門', type: '祿' });
    expect(entries[1]).toEqual({ star: '太陽', type: '權' });
    expect(entries[2]).toEqual({ star: '文曲', type: '科' });
    expect(entries[3]).toEqual({ star: '文昌', type: '忌' });
  });

  it('壬干: 天梁化祿, 紫微化權, 左輔化科, 武曲化忌', () => {
    const entries = MUTAGEN_TABLE['壬'];
    expect(entries[0]).toEqual({ star: '天梁', type: '祿' });
    expect(entries[1]).toEqual({ star: '紫微', type: '權' });
    expect(entries[2]).toEqual({ star: '左輔', type: '科' });
    expect(entries[3]).toEqual({ star: '武曲', type: '忌' });
  });

  it('癸干: 破軍化祿, 巨門化權, 太陰化科, 貪狼化忌', () => {
    const entries = MUTAGEN_TABLE['癸'];
    expect(entries[0]).toEqual({ star: '破軍', type: '祿' });
    expect(entries[1]).toEqual({ star: '巨門', type: '權' });
    expect(entries[2]).toEqual({ star: '太陰', type: '科' });
    expect(entries[3]).toEqual({ star: '貪狼', type: '忌' });
  });
});

// ── getMutagenByStem 查表函式 ──────────────────────────────────

describe('getMutagenByStem', () => {
  it('returns correct entries for known stems', () => {
    const result = getMutagenByStem('甲');
    expect(result).toHaveLength(4);
    expect(result[0].star).toBe('廉貞');
    expect(result[0].type).toBe('祿');
  });

  it('returns empty array for unknown stem', () => {
    expect(getMutagenByStem('子')).toEqual([]);
    expect(getMutagenByStem('')).toEqual([]);
  });
});

// ── findStarPalaceIndex 星曜宮位查找 ──────────────────────────

describe('findStarPalaceIndex', () => {
  const mockPalaces: FlyingPalace[] = [
    {
      index: 0,
      name: '遷移',
      heavenlyStem: '戊',
      earthlyBranch: '寅',
      majorStars: [{ name: '武曲' }, { name: '天相' }],
      minorStars: [],
    },
    {
      index: 1,
      name: '疾厄',
      heavenlyStem: '己',
      earthlyBranch: '卯',
      majorStars: [{ name: '天同' }, { name: '天梁' }],
      minorStars: [{ name: '文昌' }],
    },
    {
      index: 2,
      name: '財帛',
      heavenlyStem: '庚',
      earthlyBranch: '辰',
      majorStars: [],
      minorStars: [],
    },
  ];

  it('finds star in majorStars', () => {
    expect(findStarPalaceIndex(mockPalaces, '武曲')).toBe(0);
    expect(findStarPalaceIndex(mockPalaces, '天同')).toBe(1);
  });

  it('finds star in minorStars', () => {
    expect(findStarPalaceIndex(mockPalaces, '文昌')).toBe(1);
  });

  it('returns -1 for star not found', () => {
    expect(findStarPalaceIndex(mockPalaces, '紫微')).toBe(-1);
  });
});

// ── calculateFlyingOut 飛出計算 ──────────────────────────────

describe('calculateFlyingOut', () => {
  it('calculates correct flying out for 甲 stem', () => {
    // Create 12 mock palaces with known star positions
    const mockPalaces = createMockPalaces();
    // Palace index 6 has stem 甲, stars: 廉貞 and 太陰
    const palace = mockPalaces[6];
    expect(palace.heavenlyStem).toBe('甲');

    const result = calculateFlyingOut(palace, mockPalaces);

    expect(result).toHaveLength(4);
    // 甲: 廉貞化祿 → 廉貞在 palace 6 (same palace)
    expect(result[0]).toMatchObject({
      star: '廉貞',
      type: '祿',
      targetPalaceIndex: 6,
      targetPalaceName: '命宮',
    });
    // 甲: 破軍化權 → 破軍在 palace 3
    expect(result[1]).toMatchObject({
      star: '破軍',
      type: '權',
      targetPalaceIndex: 3,
      targetPalaceName: '子女',
    });
    // 甲: 武曲化科 → 武曲在 palace 0
    expect(result[2]).toMatchObject({
      star: '武曲',
      type: '科',
      targetPalaceIndex: 0,
      targetPalaceName: '遷移',
    });
    // 甲: 太陽化忌 → 太陽在 palace 4
    expect(result[3]).toMatchObject({
      star: '太陽',
      type: '忌',
      targetPalaceIndex: 4,
      targetPalaceName: '夫妻',
    });
  });
});

// ── calculateFlyingStars 完整飛星計算 ─────────────────────────

describe('calculateFlyingStars (integration with iztro chart)', () => {
  it('produces 12 palace results from real chart', () => {
    const chart = getChart({
      date: '2000-08-16',
      timeIndex: 1,
      gender: 'male',
      config: { algorithm: 'default' },
    });

    const flyingPalaces: FlyingPalace[] = chart.palaces.map((p) => ({
      index: p.index,
      name: p.name,
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      majorStars: p.majorStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
      minorStars: p.minorStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
    }));

    const result = calculateFlyingStars(flyingPalaces);

    // Should have results for all 12 palaces
    expect(result.palaces).toHaveLength(12);

    // Each palace should have 4 flyingOut entries (one per mutagen)
    result.palaces.forEach((p) => {
      expect(p.flyingOut).toHaveLength(4);
      // Each flyingOut should have a valid star name and type
      p.flyingOut.forEach((f) => {
        expect(f.star).toBeTruthy();
        expect(['祿', '權', '科', '忌']).toContain(f.type);
      });
    });
  });

  it('flyingIn entries are consistent with other palaces flyingOut', () => {
    const chart = getChart({
      date: '2000-08-16',
      timeIndex: 1,
      gender: 'male',
      config: { algorithm: 'default' },
    });

    const flyingPalaces: FlyingPalace[] = chart.palaces.map((p) => ({
      index: p.index,
      name: p.name,
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      majorStars: p.majorStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
      minorStars: p.minorStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
    }));

    const result = calculateFlyingStars(flyingPalaces);

    // Count total flying out
    const totalFlyingOut = result.palaces.reduce(
      (sum, p) =>
        sum + p.flyingOut.filter((f) => f.targetPalaceIndex >= 0).length,
      0,
    );

    // Count total flying in
    const totalFlyingIn = result.palaces.reduce(
      (sum, p) => sum + p.flyingIn.length,
      0,
    );

    // They must match (every flyingOut has exactly one flyingIn target)
    expect(totalFlyingIn).toBe(totalFlyingOut);
  });

  it('stem 甲 palace produces correct four transformations', () => {
    const chart = getChart({
      date: '2000-08-16',
      timeIndex: 1,
      gender: 'male',
      config: { algorithm: 'default' },
    });

    const flyingPalaces: FlyingPalace[] = chart.palaces.map((p) => ({
      index: p.index,
      name: p.name,
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      majorStars: p.majorStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
      minorStars: p.minorStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
    }));

    // Find palace with stem 甲
    const jiaPalace = flyingPalaces.find((p) => p.heavenlyStem === '甲');
    expect(jiaPalace).toBeDefined();

    const result = calculateFlyingStars(flyingPalaces);
    const jiaResult = result.palaces.find(
      (p) => p.heavenlyStem === '甲',
    )!;

    // 甲干四化: 廉貞化祿, 破軍化權, 武曲化科, 太陽化忌
    const flyingStars = jiaResult.flyingOut.map((f) => f.star);
    expect(flyingStars).toContain('廉貞');
    expect(flyingStars).toContain('破軍');
    expect(flyingStars).toContain('武曲');
    expect(flyingStars).toContain('太陽');

    const luan = jiaResult.flyingOut.find((f) => f.type === '祿');
    expect(luan?.star).toBe('廉貞');
  });
});

// ── getPalaceMutagenLabels 標記取得 ───────────────────────────

describe('getPalaceMutagenLabels', () => {
  it('returns correct labels for a palace with flyingIn', () => {
    const chart = getChart({
      date: '2000-08-16',
      timeIndex: 1,
      gender: 'male',
      config: { algorithm: 'default' },
    });

    const flyingPalaces: FlyingPalace[] = chart.palaces.map((p) => ({
      index: p.index,
      name: p.name,
      heavenlyStem: p.heavenlyStem,
      earthlyBranch: p.earthlyBranch,
      majorStars: p.majorStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
      minorStars: p.minorStars.map((s) => ({ name: s.name, mutagen: s.mutagen })),
    }));

    const flyingResult = calculateFlyingStars(flyingPalaces);

    // Check labels for each palace
    for (let i = 0; i < 12; i++) {
      const labels = getPalaceMutagenLabels(i, flyingResult);
      // Labels should be an array
      expect(Array.isArray(labels)).toBe(true);
      // Each label should have star, type, source
      labels.forEach((label) => {
        expect(label.star).toBeTruthy();
        expect(['祿', '權', '科', '忌']).toContain(label.type);
        expect(['native', 'flying']).toContain(label.source);
      });
    }
  });
});

// ── 測試用 mock 宮位資料 ─────────────────────────────────────

/**
 * 建立符合 2000-08-16 丑時 男 命盤的模擬宮位資料
 * (天干地支與星曜位置對應 iztro default 排盤)
 */
function createMockPalaces(): FlyingPalace[] {
  return [
    {
      index: 0, name: '遷移', heavenlyStem: '戊', earthlyBranch: '寅',
      majorStars: [{ name: '武曲' }, { name: '天相' }],
      minorStars: [],
    },
    {
      index: 1, name: '疾厄', heavenlyStem: '己', earthlyBranch: '卯',
      majorStars: [{ name: '天同' }, { name: '天梁' }],
      minorStars: [],
    },
    {
      index: 2, name: '財帛', heavenlyStem: '庚', earthlyBranch: '辰',
      majorStars: [{ name: '天同' }, { name: '巨門' }],
      minorStars: [],
    },
    {
      index: 3, name: '子女', heavenlyStem: '辛', earthlyBranch: '巳',
      majorStars: [{ name: '武曲' }, { name: '破軍' }],
      minorStars: [],
    },
    {
      index: 4, name: '夫妻', heavenlyStem: '壬', earthlyBranch: '午',
      majorStars: [{ name: '太陽' }],
      minorStars: [],
    },
    {
      index: 5, name: '兄弟', heavenlyStem: '癸', earthlyBranch: '未',
      majorStars: [],
      minorStars: [],
    },
    {
      index: 6, name: '命宮', heavenlyStem: '甲', earthlyBranch: '申',
      majorStars: [{ name: '廉貞' }, { name: '太陰' }],
      minorStars: [],
    },
    {
      index: 7, name: '父母', heavenlyStem: '乙', earthlyBranch: '酉',
      majorStars: [{ name: '紫微' }, { name: '天機' }],
      minorStars: [],
    },
    {
      index: 8, name: '福德', heavenlyStem: '丙', earthlyBranch: '戌',
      majorStars: [{ name: '天府' }],
      minorStars: [],
    },
    {
      index: 9, name: '田宅', heavenlyStem: '丁', earthlyBranch: '亥',
      majorStars: [{ name: '貪狼' }],
      minorStars: [],
    },
    {
      index: 10, name: '官祿', heavenlyStem: '戊', earthlyBranch: '子',
      majorStars: [{ name: '太陰' }, { name: '貪狼' }],
      minorStars: [],
    },
    {
      index: 11, name: '僕役', heavenlyStem: '己', earthlyBranch: '丑',
      majorStars: [{ name: '巨門' }],
      minorStars: [],
    },
  ];
}
