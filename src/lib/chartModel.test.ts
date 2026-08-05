import { describe, it, expect } from 'vitest';
import { getChart } from './astro';
import {
  canonicalizeFlyingPalaces,
  findSoulPalaceIndex,
  toCanonicalKey,
  type FlyingPalaceLike,
} from './chartModel';
import { calculateFlyingStars } from './flying';
import { getDecadalTable } from './fortunes';

/**
 * 跨語系等價性測試 (根因 C1)：同一命盤在 zh-TW 與 en-US 顯示語言下，
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

describe('chartModel.ts - 跨語系 (zh-TW / en-US) 等價性測試', () => {
  for (const fixture of FIXTURES) {
    const zhAstro = getChart({
      date: fixture.date,
      timeIndex: fixture.timeIndex,
      gender: fixture.gender,
      language: 'zh-TW',
    });
    const enAstro = getChart({
      date: fixture.date,
      timeIndex: fixture.timeIndex,
      gender: fixture.gender,
      language: 'en-US',
    });

    describe(fixture.label, () => {
      it('12 宮主星 / 天干地支 (canonical) 相同', () => {
        const zhPalaces = toFlyingPalaces(zhAstro);
        const enPalacesCanonical = canonicalizeFlyingPalaces(toFlyingPalaces(enAstro), 'en');

        expect(enPalacesCanonical).toHaveLength(12);
        for (let i = 0; i < 12; i++) {
          expect(enPalacesCanonical[i].name).toBe(zhPalaces[i].name);
          expect(enPalacesCanonical[i].heavenlyStem).toBe(zhPalaces[i].heavenlyStem);
          expect(enPalacesCanonical[i].earthlyBranch).toBe(zhPalaces[i].earthlyBranch);
          expect(enPalacesCanonical[i].majorStars.map((s) => s.name)).toEqual(
            zhPalaces[i].majorStars.map((s) => s.name),
          );
        }
      });

      it('四化落宮 (flying stars) 結果相同', () => {
        const zhFlying = calculateFlyingStars(toFlyingPalaces(zhAstro) as any);
        const enFlyingCanonical = calculateFlyingStars(
          canonicalizeFlyingPalaces(toFlyingPalaces(enAstro), 'en') as any,
        );

        for (let i = 0; i < 12; i++) {
          const zhOut = zhFlying.palaces[i].flyingOut.map((f) => `${f.star}${f.type}->${f.targetPalaceIndex}`);
          const enOut = enFlyingCanonical.palaces[i].flyingOut.map(
            (f) => `${f.star}${f.type}->${f.targetPalaceIndex}`,
          );
          expect(enOut).toEqual(zhOut);
          expect(enFlyingCanonical.palaces[i].flyingIn.length).toBe(zhFlying.palaces[i].flyingIn.length);
        }
      });

      it('命宮定位 (soul palace index) 相同', () => {
        const zhIdx = findSoulPalaceIndex(zhAstro as any);
        const enIdx = findSoulPalaceIndex(enAstro as any);
        expect(enIdx).toBe(zhIdx);
        expect(zhAstro.palaces[zhIdx].name).toBe('命宮');
      });

      it('大限起訖 (decadal range) 相同，且四化星曜互為翻譯對應', () => {
        const zhTable = getDecadalTable(zhAstro, undefined, 'zh-TW');
        const enTable = getDecadalTable(enAstro, undefined, 'en');

        expect(enTable).toHaveLength(zhTable.length);
        for (let i = 0; i < zhTable.length; i++) {
          expect(enTable[i].range).toEqual(zhTable[i].range);
          expect(zhTable[i].mutagen.lu).not.toBe('-');
          expect(toCanonicalKey(enTable[i].mutagen.lu, 'star', 'en')).toBe(zhTable[i].mutagen.lu);
          expect(toCanonicalKey(enTable[i].mutagen.quan, 'star', 'en')).toBe(zhTable[i].mutagen.quan);
          expect(toCanonicalKey(enTable[i].mutagen.ke, 'star', 'en')).toBe(zhTable[i].mutagen.ke);
          expect(toCanonicalKey(enTable[i].mutagen.ji, 'star', 'en')).toBe(zhTable[i].mutagen.ji);
        }
      });
    });
  }
});
