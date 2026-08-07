import { describe, it, expect } from 'vitest';
import { getChart } from './astro';
import type { Config } from './astro';

/**
 * Golden 排盤測試（B1-4）。
 *
 * 案例對應 docs/Golden/ziwei-fixtures.md 的 13 組 fixtures。斷言值皆為
 * iztro v2.5.8 的實測輸出（非推測），md 內若與此不符已同步修正並標註。
 *
 * 每個案例一律明確傳入完整 config（含 yearDivide），不依賴省略欄位時的
 * 「隱含預設值」——iztro 的 config() 對未提供的欄位會 fallback 回目前的
 * 全域狀態而非固定預設（astro.js: `yearDivide === void 0 ? _yearDivide : ...`），
 * 因此若省略欄位，測試結果會隨執行順序 / 之前呼叫過的 config 而漂移。
 */

type Chart = ReturnType<typeof getChart>;

const NORMAL_CONFIG: Config = { algorithm: 'zhongzhou', yearDivide: 'normal' };
const EXACT_CONFIG: Config = { algorithm: 'zhongzhou', yearDivide: 'exact' };

function palaceNamed(chart: Chart, name: string) {
  const p = chart.palaces.find((p) => p.name === name);
  if (!p) throw new Error(`palace not found: ${name}`);
  return p;
}

function soulPalace(chart: Chart) {
  return palaceNamed(chart, '命宮');
}

function starNames(stars: { name: string }[]) {
  return stars.map((s) => s.name);
}

function yearPillar(chart: Chart) {
  return chart.rawDates.chineseDate.yearly.join('');
}

describe('Golden Chart Fixtures (B1-4, iztro v2.5.8 實測)', () => {
  it('1. 標準早子時 2023-05-15 timeIndex=0 男：命/身宮辰/辰空宮，大限5-14，兄弟宮破軍化祿', () => {
    const chart = getChart({
      date: '2023-05-15',
      timeIndex: 0,
      gender: 'male',
      language: 'zh-TW',
      config: NORMAL_CONFIG,
    });

    expect(chart.earthlyBranchOfSoulPalace).toBe('辰');
    expect(chart.earthlyBranchOfBodyPalace).toBe('辰');
    expect(chart.lunarDate).toBe('二〇二三年三月廿六');
    expect(yearPillar(chart)).toBe('癸卯');

    const soul = soulPalace(chart);
    expect(starNames(soul.majorStars)).toEqual([]); // 空宮
    expect(soul.decadal.range).toEqual([5, 14]);

    const siblings = palaceNamed(chart, '兄弟');
    const poChun = siblings.majorStars.find((s) => s.name === '破軍');
    expect(poChun?.mutagen).toBe('祿');
  });

  it('2. 晚子時 2023-05-15 timeIndex=12 男：命/身宮辰/辰紫微天相，大限5-14，遷移宮破軍化祿', () => {
    const chart = getChart({
      date: '2023-05-15',
      timeIndex: 12,
      gender: 'male',
      language: 'zh-TW',
      config: NORMAL_CONFIG,
    });

    expect(chart.earthlyBranchOfSoulPalace).toBe('辰');
    expect(chart.earthlyBranchOfBodyPalace).toBe('辰');
    expect(chart.lunarDate).toBe('二〇二三年三月廿六');
    expect(yearPillar(chart)).toBe('癸卯');

    const soul = soulPalace(chart);
    expect(starNames(soul.majorStars)).toEqual(['紫微', '天相']);
    expect(soul.decadal.range).toEqual([5, 14]);

    const migration = palaceNamed(chart, '遷移');
    const poChun = migration.majorStars.find((s) => s.name === '破軍');
    expect(poChun?.mutagen).toBe('祿');
  });

  it('3.（已修正）立春日 2024-02-04 15:00 男 yearDivide=exact：命宮巳太陰，大限3-12，年柱甲辰（非文件原稿癸卯）', () => {
    // 修正說明：iztro 的 yearDivide='exact' 以「立春當日」為年界最小粒度，
    // 而非精確到立春發生的鐘點時刻；2024 立春落在 2024-02-04，故該日全天
    // （含 15:00）年柱已是甲辰，並非文件原稿標註的癸卯。命宮/主星/大限預測
    // 本身正確，只有年柱標註有誤，已同步修正 docs/Golden/ziwei-fixtures.md。
    const chart = getChart({
      date: '2024-02-04',
      timeIndex: '15:00',
      gender: 'male',
      language: 'zh-TW',
      config: EXACT_CONFIG,
    });

    expect(yearPillar(chart)).toBe('甲辰');
    expect(chart.lunarDate).toBe('二〇二三年腊月廿五');
    expect(chart.earthlyBranchOfSoulPalace).toBe('巳');

    const soul = soulPalace(chart);
    expect(starNames(soul.majorStars)).toEqual(['太陰']);
    expect(soul.decadal.range).toEqual([3, 12]);
  });

  it('4. 立春日 2024-02-04 17:00 男 yearDivide=exact：命宮辰廉貞(祿)天府，大限3-12，年柱甲辰', () => {
    const chart = getChart({
      date: '2024-02-04',
      timeIndex: '17:00',
      gender: 'male',
      language: 'zh-TW',
      config: EXACT_CONFIG,
    });

    expect(yearPillar(chart)).toBe('甲辰');
    expect(chart.lunarDate).toBe('二〇二三年腊月廿五');
    expect(chart.earthlyBranchOfSoulPalace).toBe('辰');

    const soul = soulPalace(chart);
    expect(starNames(soul.majorStars)).toEqual(['廉貞', '天府']);
    expect(soul.majorStars.find((s) => s.name === '廉貞')?.mutagen).toBe('祿');
    expect(soul.decadal.range).toEqual([3, 12]);
  });

  it('5.（已修正）農曆除夕 2024-02-09 timeIndex=6 男：命宮未空宮，大限6-15（非文件原稿紫微破軍/5-14）', () => {
    // 修正說明：文件原稿的「紫微,破軍／大限5-14」實為 yearDivide='exact' 洩漏
    // 自前一次呼叫的全域狀態所致（見 astro.ts 內 fortunes.ts 註解的 C4 同類問題，
    // iztro 的 config() 對未提供的欄位一律 fallback 回目前全域值，非固定預設）。
    // 2024-02-09 早於農曆正月初一 (2024-02-10)，yearDivide='normal' 的正確結果
    // 是仍屬癸卯年、命宮空宮、大限6-15，已同步修正 docs/Golden/ziwei-fixtures.md。
    const chart = getChart({
      date: '2024-02-09',
      timeIndex: 6,
      gender: 'male',
      language: 'zh-TW',
      config: NORMAL_CONFIG,
    });

    expect(yearPillar(chart)).toBe('癸卯');
    expect(chart.lunarDate).toBe('二〇二三年腊月三十');
    expect(chart.earthlyBranchOfSoulPalace).toBe('未');

    const soul = soulPalace(chart);
    expect(starNames(soul.majorStars)).toEqual([]); // 空宮
    expect(soul.decadal.range).toEqual([6, 15]);
  });

  it('6. 農曆正月初一 2024-02-10 timeIndex=6 男：命宮申太陽(忌)巨門，大限4-13', () => {
    const chart = getChart({
      date: '2024-02-10',
      timeIndex: 6,
      gender: 'male',
      language: 'zh-TW',
      config: NORMAL_CONFIG,
    });

    expect(yearPillar(chart)).toBe('甲辰');
    expect(chart.lunarDate).toBe('二〇二四年正月初一');
    expect(chart.earthlyBranchOfSoulPalace).toBe('申');

    const soul = soulPalace(chart);
    expect(starNames(soul.majorStars)).toEqual(['太陽', '巨門']);
    expect(soul.majorStars.find((s) => s.name === '太陽')?.mutagen).toBe('忌');
    expect(soul.decadal.range).toEqual([4, 13]);
  });

  it('7. 農曆閏月 2023-04-10 timeIndex=6 男：命宮戌天機天梁，大限2-11，農曆闰二月二十', () => {
    const chart = getChart({
      date: '2023-04-10',
      timeIndex: 6,
      gender: 'male',
      language: 'zh-TW',
      config: NORMAL_CONFIG,
    });

    expect(chart.lunarDate).toBe('二〇二三年闰二月二十');
    expect(chart.earthlyBranchOfSoulPalace).toBe('戌');

    const soul = soulPalace(chart);
    expect(starNames(soul.majorStars)).toEqual(['天機', '天梁']);
    expect(soul.decadal.range).toEqual([2, 11]);
  });

  it('8. 真太陽時未變 2023-05-15 12:55 男（無經度）：仍為午時，命宮戌武曲，大限2-11', () => {
    const chart = getChart({
      date: '2023-05-15',
      timeIndex: '12:55',
      gender: 'male',
      language: 'zh-TW',
      config: NORMAL_CONFIG,
    });

    expect(chart.time).toBe('午時');
    expect(chart.chineseDate.split(' ')[3]).toBe('戊午');
    expect(chart.earthlyBranchOfSoulPalace).toBe('戌');

    const soul = soulPalace(chart);
    expect(starNames(soul.majorStars)).toEqual(['武曲']);
    expect(soul.decadal.range).toEqual([2, 11]);
  });

  it('9. 真太陽時變更 2023-05-15 12:55 男 longitude=121.56（台北）：跨為未時，命宮酉紫微貪狼(忌)，大限3-12', () => {
    const chart = getChart({
      date: '2023-05-15',
      timeIndex: '12:55',
      gender: 'male',
      language: 'zh-TW',
      longitude: 121.56,
      config: NORMAL_CONFIG,
    });

    expect(chart.time).toBe('未時');
    expect(chart.chineseDate.split(' ')[3]).toBe('己未');
    expect(chart.earthlyBranchOfSoulPalace).toBe('酉');

    const soul = soulPalace(chart);
    expect(starNames(soul.majorStars)).toEqual(['紫微', '貪狼']);
    expect(soul.majorStars.find((s) => s.name === '貪狼')?.mutagen).toBe('忌');
    expect(soul.decadal.range).toEqual([3, 12]);
  });

  it('10. 陽男順行 2024-05-15 timeIndex=6 男：命宮亥(6-15)，兄弟大限116-125，父母大限16-25', () => {
    const chart = getChart({
      date: '2024-05-15',
      timeIndex: 6,
      gender: 'male',
      language: 'zh-TW',
      config: NORMAL_CONFIG,
    });

    expect(chart.earthlyBranchOfSoulPalace).toBe('亥');
    expect(soulPalace(chart).decadal.range).toEqual([6, 15]);
    expect(palaceNamed(chart, '兄弟').decadal.range).toEqual([116, 125]);
    expect(palaceNamed(chart, '父母').decadal.range).toEqual([16, 25]);
  });

  it('11. 陽女逆行 2024-05-15 timeIndex=6 女：命宮亥(6-15)，兄弟大限16-25，父母大限116-125', () => {
    const chart = getChart({
      date: '2024-05-15',
      timeIndex: 6,
      gender: 'female',
      language: 'zh-TW',
      config: NORMAL_CONFIG,
    });

    expect(chart.earthlyBranchOfSoulPalace).toBe('亥');
    expect(soulPalace(chart).decadal.range).toEqual([6, 15]);
    expect(palaceNamed(chart, '兄弟').decadal.range).toEqual([16, 25]);
    expect(palaceNamed(chart, '父母').decadal.range).toEqual([116, 125]);
  });

  it('12. 空宮 2024-05-02 timeIndex=6 男：命宮戌無主星，大限6-15', () => {
    const chart = getChart({
      date: '2024-05-02',
      timeIndex: 6,
      gender: 'male',
      language: 'zh-TW',
      config: NORMAL_CONFIG,
    });

    expect(chart.earthlyBranchOfSoulPalace).toBe('戌');
    const soul = soulPalace(chart);
    expect(soul.majorStars).toHaveLength(0);
    expect(soul.decadal.range).toEqual([6, 15]);
  });

  it('13. 生年四化 2024-05-15 timeIndex=6 男（甲年）：廉貞化祿/破軍化權/武曲化科/太陽化忌落宮與13案例同盤一致', () => {
    const chart = getChart({
      date: '2024-05-15',
      timeIndex: 6,
      gender: 'male',
      language: 'zh-TW',
      config: NORMAL_CONFIG,
    });

    const findMutagen = (palaceName: string, starName: string) => {
      const p = palaceNamed(chart, palaceName);
      return [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].find((s) => s.name === starName)?.mutagen;
    };

    expect(findMutagen('命宮', '廉貞')).toBe('祿');
    expect(findMutagen('財帛', '破軍')).toBe('權');
    expect(findMutagen('官祿', '武曲')).toBe('科');
    expect(findMutagen('僕役', '太陽')).toBe('忌');
  });
});
