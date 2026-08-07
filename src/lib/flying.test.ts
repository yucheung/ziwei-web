import { describe, it, expect } from 'vitest';
import {
  MUTAGEN_TABLE,
  getMutagenByStem,
  findStarPalaceIndex,
  calculateFlyingOut,
  calculateFlyingStars,
  getPalaceMutagenLabels,
  mergeFlyingMutagens,
  type FlyingPalace,
} from './flying';
import { getChart } from './astro';
import { buildChartModel, getCanonicalAstrolabe } from './chartModel';
import { getHoroscopeSummary } from './fortunes';

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

/**
 * B2 2.3: mergeFlyingMutagens — 本命 + 大限 + 流年 疊盤合併
 */
describe('mergeFlyingMutagens (B2 2.3 疊盤合併)', () => {
  it('僅本命層：與各宮星曜的 mutagenKey 完全對應', () => {
    const astrolabe = getCanonicalAstrolabe({ date: '2000-08-16', timeIndex: 2, gender: 'male' });
    const model = buildChartModel(astrolabe);

    const merged = mergeFlyingMutagens(model);
    expect(merged).toHaveLength(12);

    for (const palace of model.palaces) {
      const expectedNative = [...palace.majorStars, ...palace.minorStars]
        .filter((s) => s.mutagenKey)
        .map((s) => ({ star: s.starKey, type: s.mutagenKey, layer: 'native' as const }));
      const actual = merged.find((m) => m.index === palace.index)!;
      expect(actual.badges).toEqual(expectedNative);
    }

    // 本命四化總數必為 4 (祿權科忌各一)
    const allNative = merged.flatMap((m) => m.badges);
    expect(allNative).toHaveLength(4);
    expect(new Set(allNative.map((b) => b.type))).toEqual(new Set(['祿', '權', '科', '忌']));
  });

  it('加入大限層：四化星落宮與 MUTAGEN_TABLE + findStarPalaceIndex 手算一致', () => {
    const astrolabe = getCanonicalAstrolabe({ date: '2000-08-16', timeIndex: 2, gender: 'male' });
    const model = buildChartModel(astrolabe);
    const summary = getHoroscopeSummary(astrolabe, '2024-08-16', 'zh-TW', 4);
    const decadalPalace = model.palaces[summary.decadal.index];
    const decadalStemKey = decadalPalace.decadeKey!.stemKey;

    // 靜態資料一致性：model 內建的大限天干必須等於 iztro horoscope() 算出的大限天干
    expect(decadalStemKey).toBe(summary.rawHoroscope.decadal.heavenlyStem);

    const merged = mergeFlyingMutagens(model, decadalStemKey);
    const decadeBadges = merged.flatMap((m) => m.badges.map((b) => ({ ...b, index: m.index })))
      .filter((b) => b.layer === 'decade');

    expect(decadeBadges).toHaveLength(4);
    for (const entry of getMutagenByStem(decadalStemKey)) {
      const expectedIdx = findStarPalaceIndex(model.palaces.map((p) => ({
        index: p.index,
        name: p.palaceKey,
        heavenlyStem: p.stemKey,
        earthlyBranch: p.branchKey,
        majorStars: p.majorStars.map((s) => ({ name: s.starKey })),
        minorStars: p.minorStars.map((s) => ({ name: s.starKey })),
      })), entry.star);
      const found = decadeBadges.find((b) => b.star === entry.star && b.type === entry.type);
      expect(found?.index).toBe(expectedIdx);
    }
  });

  it('同一宮位可同時帶有本命與大限四化標記 (疊合展示，不互相覆蓋)', () => {
    // 挑選一個生年四化星恰好也在該大限四化落宮範圍內的案例：
    // 逐一嘗試多個日期直到找到本命/大限同宮重疊的情況，驗證疊合設計本身而非特定命例。
    const dates = ['2000-08-16', '1988-11-02', '1995-03-21', '1984-08-16', '1985-08-16', '1988-08-16'];
    let overlapFound = false;

    for (const date of dates) {
      const astrolabe = getCanonicalAstrolabe({ date, timeIndex: 2, gender: 'male' });
      const model = buildChartModel(astrolabe);
      const summary = getHoroscopeSummary(astrolabe, '2024-08-16', 'zh-TW', 4);
      const decadalStemKey = model.palaces[summary.decadal.index].decadeKey!.stemKey;

      const merged = mergeFlyingMutagens(model, decadalStemKey);
      const palaceWithOverlap = merged.find((m) => {
        const layers = new Set(m.badges.map((b) => b.layer));
        return layers.has('native') && layers.has('decade');
      });

      if (palaceWithOverlap) {
        overlapFound = true;
        // 疊合設計：兩筆標記獨立保留，各自標明來源層，而非合併/覆蓋成一筆
        const nativeBadges = palaceWithOverlap.badges.filter((b) => b.layer === 'native');
        const decadeBadges = palaceWithOverlap.badges.filter((b) => b.layer === 'decade');
        expect(nativeBadges.length).toBeGreaterThan(0);
        expect(decadeBadges.length).toBeGreaterThan(0);
        break;
      }
    }

    expect(overlapFound).toBe(true);
  });

  it('流年天干需由呼叫端傳入 (ChartModel 無日期資訊，無法僅靠 index 推導)', () => {
    const astrolabe = getCanonicalAstrolabe({ date: '2000-08-16', timeIndex: 2, gender: 'male' });
    const model = buildChartModel(astrolabe);
    const summary = getHoroscopeSummary(astrolabe, '2024-08-16', 'zh-TW', 4);
    const yearlyStemKey = summary.rawHoroscope.yearly.heavenlyStem;

    const merged = mergeFlyingMutagens(model, undefined, yearlyStemKey);
    const yearBadges = merged.flatMap((m) => m.badges).filter((b) => b.layer === 'year');
    expect(yearBadges).toHaveLength(4);
    expect(new Set(yearBadges.map((b) => b.type))).toEqual(new Set(['祿', '權', '科', '忌']));

    // 未傳入 yearlyStemKey 時，不應產生任何 year 層標記
    const withoutYear = mergeFlyingMutagens(model);
    expect(withoutYear.flatMap((m) => m.badges).filter((b) => b.layer === 'year')).toHaveLength(0);
  });
});
