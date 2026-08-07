import { describe, it, expect } from 'vitest';
import { getChart } from './astro';
import {
  buildChartModel,
  canonicalizeFlyingPalaces,
  canonicalizeAstrolabeForReading,
  findSoulPalaceIndex,
  getCanonicalAstrolabe,
  getSurroundingPalaces,
  toCanonicalKey,
  toGenderKey,
  translateKey,
  type FlyingPalaceLike,
  type ReadingAstrolabeLike,
} from './chartModel';
import { calculateFlyingStars } from './flying';
import { getDecadalTable } from './fortunes';

/**
 * 跨語系等價性測試 (根因 C1)：同一命盤在 zh-TW 與 zh-CN 顯示語言下，
 * 12宮主星、四化落宮、大限起訖、命宮定位等「計算」結果必須等價
 * (差異只允許出現在顯示字串，不可出現在計算邏輯)。
 */

interface Fixture {
  label: string;
  date: string;
  timeIndex: number;
  gender: 'male' | 'female';
}

const FIXTURES: Fixture[] = [
  { label: '2000-08-16 丑時 男', date: '2000-08-16', timeIndex: 2, gender: 'male' },
  { label: '1995-03-21 午時 女', date: '1995-03-21', timeIndex: 6, gender: 'female' },
  { label: '1988-11-02 早子時 男', date: '1988-11-02', timeIndex: 0, gender: 'male' },
];

function toFlyingPalaces(astrolabe: any): FlyingPalaceLike[] {
  return astrolabe.palaces.map((p: any) => ({
    index: p.index,
    name: p.name,
    heavenlyStem: p.heavenlyStem,
    earthlyBranch: p.earthlyBranch,
    majorStars: p.majorStars.map((s: any) => ({ name: s.name, mutagen: s.mutagen })),
    minorStars: p.minorStars.map((s: any) => ({ name: s.name, mutagen: s.mutagen })),
  }));
}

describe('chartModel.ts - 跨語系 (zh-TW / zh-CN) 等價性測試', () => {
  for (const fixture of FIXTURES) {
    const zhAstro = getChart({
      date: fixture.date,
      timeIndex: fixture.timeIndex,
      gender: fixture.gender,
      language: 'zh-TW',
    });
    const cnAstro = getChart({
      date: fixture.date,
      timeIndex: fixture.timeIndex,
      gender: fixture.gender,
      language: 'zh-CN',
    });

    describe(fixture.label, () => {
      it('12 宮主星 / 天干地支 (canonical) 相同', () => {
        const zhPalaces = toFlyingPalaces(zhAstro);
        const cnPalacesCanonical = canonicalizeFlyingPalaces(toFlyingPalaces(cnAstro), 'zh-CN');

        expect(cnPalacesCanonical).toHaveLength(12);
        for (let i = 0; i < 12; i++) {
          expect(cnPalacesCanonical[i].name).toBe(zhPalaces[i].name);
          expect(cnPalacesCanonical[i].heavenlyStem).toBe(zhPalaces[i].heavenlyStem);
          expect(cnPalacesCanonical[i].earthlyBranch).toBe(zhPalaces[i].earthlyBranch);
          expect(cnPalacesCanonical[i].majorStars.map((s) => s.name)).toEqual(
            zhPalaces[i].majorStars.map((s) => s.name),
          );
        }
      });

      it('四化落宮 (flying stars) 結果相同', () => {
        const zhFlying = calculateFlyingStars(toFlyingPalaces(zhAstro) as any);
        const cnFlyingCanonical = calculateFlyingStars(
          canonicalizeFlyingPalaces(toFlyingPalaces(cnAstro), 'zh-CN') as any,
        );

        for (let i = 0; i < 12; i++) {
          const zhOut = zhFlying.palaces[i].flyingOut.map((f) => `${f.star}${f.type}->${f.targetPalaceIndex}`);
          const cnOut = cnFlyingCanonical.palaces[i].flyingOut.map(
            (f) => `${f.star}${f.type}->${f.targetPalaceIndex}`,
          );
          expect(cnOut).toEqual(zhOut);
          expect(cnFlyingCanonical.palaces[i].flyingIn.length).toBe(zhFlying.palaces[i].flyingIn.length);
        }
      });

      it('命宮定位 (soul palace index) 相同', () => {
        const zhIdx = findSoulPalaceIndex(zhAstro as any);
        const cnIdx = findSoulPalaceIndex(cnAstro as any);
        expect(cnIdx).toBe(zhIdx);
        expect(zhAstro.palaces[zhIdx].name).toBe('命宮');
      });

      it('大限起訖 (decadal range) 相同，且四化星曜互為翻譯對應', () => {
        const zhTable = getDecadalTable(zhAstro, undefined, 'zh-TW');
        const cnTable = getDecadalTable(cnAstro, undefined, 'zh-CN');

        expect(cnTable).toHaveLength(zhTable.length);
        for (let i = 0; i < zhTable.length; i++) {
          expect(cnTable[i].range).toEqual(zhTable[i].range);
          expect(zhTable[i].mutagen.lu).not.toBe('-');
          expect(toCanonicalKey(cnTable[i].mutagen.lu, 'star', 'zh-CN')).toBe(zhTable[i].mutagen.lu);
          expect(toCanonicalKey(cnTable[i].mutagen.quan, 'star', 'zh-CN')).toBe(zhTable[i].mutagen.quan);
          expect(toCanonicalKey(cnTable[i].mutagen.ke, 'star', 'zh-CN')).toBe(zhTable[i].mutagen.ke);
          expect(toCanonicalKey(cnTable[i].mutagen.ji, 'star', 'zh-CN')).toBe(zhTable[i].mutagen.ji);
        }
      });
    });
  }
});

describe('canonicalizeAstrolabeForReading (A-3: LLM ACL 介接)', () => {
  for (const fixture of FIXTURES) {
    const zhAstro = getChart({
      date: fixture.date,
      timeIndex: fixture.timeIndex,
      gender: fixture.gender,
      language: 'zh-TW',
    });
    const cnAstro = getChart({
      date: fixture.date,
      timeIndex: fixture.timeIndex,
      gender: fixture.gender,
      language: 'zh-CN',
    });

    it(`${fixture.label}: zh-CN astrolabe 還原後與 zh-TW astrolabe 語意等價`, () => {
      const canonical = canonicalizeAstrolabeForReading(cnAstro as unknown as ReadingAstrolabeLike, 'zh-CN');

      expect(canonical.soul).toBe((zhAstro as any).soul);
      expect(canonical.body).toBe((zhAstro as any).body);

      for (let i = 0; i < 12; i++) {
        const zhPalace = (zhAstro as any).palaces[i];
        const palace = canonical.palaces[i];
        expect(palace.name).toBe(zhPalace.name);
        expect(palace.heavenlyStem).toBe(zhPalace.heavenlyStem);
        expect(palace.earthlyBranch).toBe(zhPalace.earthlyBranch);
        expect(palace.majorStars!.map((s) => s.name)).toEqual(
          zhPalace.majorStars.map((s: any) => s.name),
        );
        expect(palace.majorStars!.map((s) => s.brightness)).toEqual(
          zhPalace.majorStars.map((s: any) => s.brightness || undefined),
        );
        expect(palace.majorStars!.map((s) => s.mutagen)).toEqual(
          zhPalace.majorStars.map((s: any) => s.mutagen || undefined),
        );
      }
    });

    it(`${fixture.label}: 還原後的四化/亮度皆為 zh-TW canonical 字形 (非簡體)`, () => {
      const canonical = canonicalizeAstrolabeForReading(cnAstro as unknown as ReadingAstrolabeLike, 'zh-CN');

      const allStars = canonical.palaces.flatMap((p) => [...(p.majorStars || []), ...(p.minorStars || [])]);
      const mutagens = allStars.map((s) => s.mutagen).filter(Boolean);
      const brightnesses = allStars.map((s) => s.brightness).filter(Boolean);

      expect(mutagens.length).toBeGreaterThan(0);
      for (const m of mutagens) {
        expect(['祿', '權', '科', '忌']).toContain(m);
      }
      expect(brightnesses.length).toBeGreaterThan(0);
      for (const b of brightnesses) {
        expect(['廟', '旺', '得', '利', '平', '不', '陷']).toContain(b);
      }
    });
  }

  it('zh-TW 來源已是 canonical，轉換為 identity（不改變任何欄位）', () => {
    const zhAstro = getChart({ date: '2000-08-16', timeIndex: 2, gender: 'male', language: 'zh-TW' });
    const canonical = canonicalizeAstrolabeForReading(zhAstro as unknown as ReadingAstrolabeLike, 'zh-TW');

    expect(canonical.soul).toBe((zhAstro as any).soul);
    expect(canonical.palaces[0].name).toBe((zhAstro as any).palaces[0].name);
  });
});

describe('toGenderKey (B-4: 中宮/合盤性別語系無關判斷)', () => {
  it('辨識各顯示語言的性別字串 (繁簡字形相同)', () => {
    expect(toGenderKey('女', 'zh-TW')).toBe('female');
    expect(toGenderKey('男', 'zh-TW')).toBe('male');
    expect(toGenderKey('女', 'zh-CN')).toBe('female');
    expect(toGenderKey('男', 'zh-CN')).toBe('male');
  });

  it('空值或無法辨識的字串回傳 undefined', () => {
    expect(toGenderKey(undefined, 'zh-TW')).toBeUndefined();
    expect(toGenderKey('', 'zh-TW')).toBeUndefined();
    expect(toGenderKey('unknown', 'zh-CN')).toBeUndefined();
    expect(toGenderKey('female', 'zh-TW')).toBeUndefined();
  });

  it('對實際 iztro 輸出有效 (zh-TW 與 zh-CN 排盤結果一致)', () => {
    const zhAstro = getChart({ date: '2000-08-16', timeIndex: 2, gender: 'female', language: 'zh-TW' });
    const cnAstro = getChart({ date: '2000-08-16', timeIndex: 2, gender: 'female', language: 'zh-CN' });
    expect(toGenderKey((zhAstro as any).gender, 'zh-TW')).toBe('female');
    expect(toGenderKey((cnAstro as any).gender, 'zh-CN')).toBe('female');
  });
});

/**
 * 對映表完整性：以 iztro 實際輸出為準，驗證 chartModel.ts 靜態對映表對每一個
 * 會出現在盤面上的字串都能 zh-TW → zh-CN → zh-TW 無損往返。
 * 這是「REVERSE_DICTS 反查唯一」這項設計前提的實測依據。
 */
describe('zh-TW ↔ zh-CN 對映表往返一致性', () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.label}: 星曜/宮位/亮度/四化/干支 往返還原無損`, () => {
      const zhAstro = getChart({ ...fixture, language: 'zh-TW' }) as any;
      const cnAstro = getChart({ ...fixture, language: 'zh-CN' }) as any;

      const checked = { count: 0 };
      const check = (zhVal: string, cnVal: string, category: Parameters<typeof toCanonicalKey>[1]) => {
        if (!zhVal) return;
        expect(translateKey(zhVal, category, 'zh-CN')).toBe(cnVal);
        expect(toCanonicalKey(cnVal, category, 'zh-CN')).toBe(zhVal);
        checked.count++;
      };

      check(zhAstro.soul, cnAstro.soul, 'star');
      check(zhAstro.body, cnAstro.body, 'star');
      check(zhAstro.zodiac, cnAstro.zodiac, 'zodiac');
      check(zhAstro.fiveElementsClass, cnAstro.fiveElementsClass, 'fiveElementsClass');

      for (let i = 0; i < 12; i++) {
        const zhP = zhAstro.palaces[i];
        const cnP = cnAstro.palaces[i];
        check(zhP.name, cnP.name, 'palace');
        check(zhP.heavenlyStem, cnP.heavenlyStem, 'stem');
        check(zhP.earthlyBranch, cnP.earthlyBranch, 'branch');

        for (const group of ['majorStars', 'minorStars', 'adjectiveStars'] as const) {
          zhP[group].forEach((zhStar: any, j: number) => {
            const cnStar = cnP[group][j];
            check(zhStar.name, cnStar.name, 'star');
            check(zhStar.brightness, cnStar.brightness, 'brightness');
            check(zhStar.mutagen, cnStar.mutagen, 'mutagen');
          });
        }
      }

      expect(checked.count).toBeGreaterThan(100);
    });
  }
});

/**
 * B2 V2: buildChartModel — 將 IFunctionalAstrolabe (zh-TW canonical) 轉為 ChartModel。
 */
describe('buildChartModel', () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.label}: 12 宮位欄位與原始 astrolabe 完全對應`, () => {
      const astrolabe = getCanonicalAstrolabe({
        date: fixture.date,
        timeIndex: fixture.timeIndex,
        gender: fixture.gender,
      });
      const model = buildChartModel(astrolabe);

      expect(model.palaces).toHaveLength(12);
      for (let i = 0; i < 12; i++) {
        const p = astrolabe.palaces[i];
        const m = model.palaces[i];
        expect(m.index).toBe(p.index);
        expect(m.palaceKey).toBe(p.name);
        expect(m.stemKey).toBe(p.heavenlyStem);
        expect(m.branchKey).toBe(p.earthlyBranch);
        expect(m.isBodyPalace).toBe(p.isBodyPalace);
        expect(m.isOriginalPalace).toBe(p.isOriginalPalace);
        expect(m.majorStars.map((s) => s.starKey)).toEqual(p.majorStars.map((s) => s.name));
        expect(m.majorStars.map((s) => s.mutagenKey)).toEqual(
          p.majorStars.map((s) => s.mutagen || undefined),
        );
        expect(m.majorStars.map((s) => s.brightnessKey)).toEqual(
          p.majorStars.map((s) => s.brightness || undefined),
        );
        // minorStars 的 mutagenKey 也必須正確標記（native 四化來源）
        expect(m.minorStars.map((s) => s.starKey)).toEqual(p.minorStars.map((s) => s.name));
        expect(m.minorStars.map((s) => s.mutagenKey)).toEqual(
          p.minorStars.map((s) => s.mutagen || undefined),
        );
        if (p.decadal) {
          expect(m.decadeKey).toEqual({
            range: p.decadal.range,
            stemKey: p.decadal.heavenlyStem,
            branchKey: p.decadal.earthlyBranch,
          });
        }
      }

      expect(model.soulKey).toBe(astrolabe.soul);
      expect(model.bodyKey).toBe(astrolabe.body);
      expect(model.fiveElementsKey).toBe(astrolabe.fiveElementsClass);
      expect(model.solarDate).toBe(astrolabe.solarDate);
      expect(model.chineseDate).toBe(astrolabe.chineseDate);
      expect(model.soulPalaceBranchKey).toBe(astrolabe.earthlyBranchOfSoulPalace);
      expect(model.gender).toBe(fixture.gender);
      expect(model.astrolabe).toBe(astrolabe);

      // 生年天干地支必須是四柱 (chineseDate) 的年柱
      expect(astrolabe.chineseDate.startsWith(`${model.yearStemKey}${model.yearBranchKey}`)).toBe(true);
    });
  }
});

/**
 * B2 V2: getSurroundingPalaces — 三方四正 canonical adapter。
 *
 * 與 iztro 內建 astrolabe.surroundedPalaces(index) (真實星盤) 交叉比對，逐一驗證
 * 12 個宮位當作 target 時，opposite/wealth/career 三個位置是否完全一致 (index 與名稱)。
 * 對應公式 (iztro analyzer.js)：對宮 = +6, 官祿位 = +4, 財帛位 = +8 (mod 12)。
 */
describe('getSurroundingPalaces (三方四正 canonical adapter)', () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.label}: 12 個宮位的三方四正與 iztro surroundedPalaces() 一致`, () => {
      const astrolabe = getCanonicalAstrolabe({
        date: fixture.date,
        timeIndex: fixture.timeIndex,
        gender: fixture.gender,
      });
      const model = buildChartModel(astrolabe);

      for (let idx = 0; idx < 12; idx++) {
        const expected = astrolabe.surroundedPalaces(idx);
        const actual = getSurroundingPalaces(model, idx);

        for (const key of ['target', 'opposite', 'wealth', 'career'] as const) {
          expect(actual[key].index).toBe(expected[key].index);
          expect(actual[key].palaceKey).toBe(expected[key].name);
          expect(actual[key].stemKey).toBe(expected[key].heavenlyStem);
          expect(actual[key].branchKey).toBe(expected[key].earthlyBranch);
        }
      }
    });
  }

  it('負索引會正規化為 mod 12 而非拋錯 (與 iztro 原生 surroundedPalaces() 的拋錯行為不同，見 chartModel.ts 文件註記)', () => {
    const astrolabe = getCanonicalAstrolabe({ date: '2000-08-16', timeIndex: 2, gender: 'male' });
    const model = buildChartModel(astrolabe);
    expect(() => getSurroundingPalaces(model, -1)).not.toThrow();
    // -1 應被正規化為 11 (mod 12)，而非拋錯
    expect(getSurroundingPalaces(model, -1).target.index).toBe(11);
  });
});
