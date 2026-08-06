import { describe, it, expect } from 'vitest';
import { getChart } from './astro';
import {
  getMutagensByStem,
  getDecadalTable,
  getHoroscopeSummary,
  STEM_MUTAGENS,
} from './fortunes';

describe('fortunes.ts - 紫微斗數運限與四化計算', () => {
  it('should return correct heavenly stem mutagens for all 10 stems', () => {
    expect(getMutagensByStem('甲')).toEqual({
      lu: '廉貞',
      quan: '破軍',
      ke: '武曲',
      ji: '太陽',
    });
    expect(getMutagensByStem('丙')).toEqual({
      lu: '天同',
      quan: '天機',
      ke: '文昌',
      ji: '廉貞',
    });
    expect(getMutagensByStem('癸')).toEqual({
      lu: '破軍',
      quan: '巨門',
      ke: '太陰',
      ji: '貪狼',
    });
    expect(getMutagensByStem('未知')).toEqual({
      lu: '-',
      quan: '-',
      ke: '-',
      ji: '-',
    });
    expect(Object.keys(STEM_MUTAGENS)).toHaveLength(10);
  });

  it('should generate a sorted 12 decadal table for 2000-8-16 2時 男 (zh-TW)', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    const decadalTable = getDecadalTable(astrolabe, 27);
    expect(decadalTable).toHaveLength(12);

    // Verify sorted by age range ascending
    for (let i = 0; i < decadalTable.length - 1; i++) {
      expect(decadalTable[i].range[0]).toBeLessThan(decadalTable[i + 1].range[0]);
    }

    // Verify first decadal (3-12 歲, 命宮 壬午)
    const firstDecadal = decadalTable[0];
    expect(firstDecadal.range).toEqual([3, 12]);
    expect(firstDecadal.palaceName).toBe('命宮');
    expect(firstDecadal.stemBranch).toBe('壬午');
    expect(firstDecadal.mutagen.lu).toBe('天梁');
    expect(firstDecadal.mutagen.ji).toBe('武曲');
    expect(firstDecadal.isCurrent).toBe(false);

    // Verify current decadal (23-32 歲, 福德宮 甲申) for age 27
    const currentDecadal = decadalTable.find((item) => item.isCurrent);
    expect(currentDecadal).toBeDefined();
    expect(currentDecadal?.range).toEqual([23, 32]);
    expect(currentDecadal?.palaceName).toBe('福德');
    expect(currentDecadal?.stemBranch).toBe('甲申');
  });

  it('should generate accurate HoroscopeSummary for 2026-08-04 (zh-TW)', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    const summary = getHoroscopeSummary(astrolabe, '2026-08-04');

    expect(summary.solarDate).toBe('2026-8-4');
    expect(summary.nominalAge).toBe(27);

    // Decadal check: 甲申大限
    expect(summary.decadal.stemBranch).toBe('甲申');
    expect(summary.decadal.name).toBe('福德');
    expect(summary.decadal.mutagen.lu).toBe('廉貞'); // 廉貞化祿
    expect(summary.decadal.mutagen.ji).toBe('太陽'); // 太陽化忌

    // Yearly check: 2026 丙午流年
    expect(summary.yearly.stemBranch).toBe('丙午');
    expect(summary.yearly.name).toBe('命宮');
    expect(summary.yearly.mutagen.lu).toBe('天同'); // 天同化祿
    expect(summary.yearly.mutagen.ji).toBe('廉貞'); // 廉貞化忌

    // Scope Stars check: palaces should have decadal and yearly stars
    expect(summary.palaceScopeStars).toBeDefined();
    expect(Object.keys(summary.palaceScopeStars)).toHaveLength(12);

    // Verify some flow stars exist (e.g. 運祿, 運羊, 流祿, 流羊, 歲前十二神...)
    const allDecadalStars = Object.values(summary.palaceScopeStars).flatMap((p) => p.decadalStars);
    const allYearlyStars = Object.values(summary.palaceScopeStars).flatMap((p) => p.yearlyStars);

    expect(allDecadalStars.some((s) => s.includes('祿') || s.includes('羊') || s.includes('馬'))).toBe(true);
    expect(allYearlyStars.some((s) => s.includes('祿') || s.includes('羊') || s.includes('馬'))).toBe(true);
  });

  it('should throw error when invalid astrolabe is provided', () => {
    expect(() => getHoroscopeSummary(null as any)).toThrow('無效的 Astrolabe 物件');
    expect(() => getHoroscopeSummary({} as any)).toThrow('無效的 Astrolabe 物件');
  });

  it('should return monthly/daily/hourly data with correct structure for 2026-08-04', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    const summary = getHoroscopeSummary(astrolabe, '2026-08-04');

    // Monthly (流月) check
    expect(summary.monthly).toBeDefined();
    expect(summary.monthly.index).toBeGreaterThanOrEqual(0);
    expect(summary.monthly.index).toBeLessThan(12);
    expect(summary.monthly.name).toBe('流月');
    expect(summary.monthly.stemBranch).toMatch(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
    expect(summary.monthly.mutagen).toHaveProperty('lu');
    expect(summary.monthly.mutagen).toHaveProperty('quan');
    expect(summary.monthly.mutagen).toHaveProperty('ke');
    expect(summary.monthly.mutagen).toHaveProperty('ji');
    expect(summary.monthly.palaceNames).toHaveLength(12);

    // Daily (流日) check
    expect(summary.daily).toBeDefined();
    expect(summary.daily.index).toBeGreaterThanOrEqual(0);
    expect(summary.daily.index).toBeLessThan(12);
    expect(summary.daily.name).toBe('流日');
    expect(summary.daily.stemBranch).toMatch(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
    expect(summary.daily.mutagen).toHaveProperty('lu');
    expect(summary.daily.mutagen).toHaveProperty('quan');
    expect(summary.daily.mutagen).toHaveProperty('ke');
    expect(summary.daily.mutagen).toHaveProperty('ji');
    expect(summary.daily.palaceNames).toHaveLength(12);

    // Hourly (流時) check
    expect(summary.hourly).toBeDefined();
    expect(summary.hourly.index).toBeGreaterThanOrEqual(0);
    expect(summary.hourly.index).toBeLessThan(12);
    expect(summary.hourly.name).toBe('流時');
    expect(summary.hourly.stemBranch).toMatch(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
    expect(summary.hourly.mutagen).toHaveProperty('lu');
    expect(summary.hourly.mutagen).toHaveProperty('quan');
    expect(summary.hourly.mutagen).toHaveProperty('ke');
    expect(summary.hourly.mutagen).toHaveProperty('ji');
    expect(summary.hourly.palaceNames).toHaveLength(12);
  });

  it('should include monthly/daily/hourly stars in palaceScopeStars', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    const summary = getHoroscopeSummary(astrolabe, '2026-08-04');

    // Verify palaceScopeStars has monthly/daily/hourly star arrays
    for (let i = 0; i < 12; i++) {
      const stars = summary.palaceScopeStars[i];
      expect(stars).toBeDefined();
      expect(Array.isArray(stars.monthlyStars)).toBe(true);
      expect(Array.isArray(stars.dailyStars)).toBe(true);
      expect(Array.isArray(stars.hourlyStars)).toBe(true);
    }

    // Verify some monthly stars exist across palaces
    const allMonthlyStars = Object.values(summary.palaceScopeStars).flatMap((p) => p.monthlyStars || []);
    const allDailyStars = Object.values(summary.palaceScopeStars).flatMap((p) => p.dailyStars || []);
    const allHourlyStars = Object.values(summary.palaceScopeStars).flatMap((p) => p.hourlyStars || []);

    expect(allMonthlyStars.length).toBeGreaterThan(0);
    expect(allDailyStars.length).toBeGreaterThan(0);
    expect(allHourlyStars.length).toBeGreaterThan(0);

    // Verify flow star naming convention (月/日/時 prefix)
    expect(allMonthlyStars.some((s) => s.includes('月'))).toBe(true);
    expect(allDailyStars.some((s) => s.includes('日'))).toBe(true);
    expect(allHourlyStars.some((s) => s.includes('時'))).toBe(true);
  });

  it('should produce consistent monthly/daily/hourly mutagen from heavenly stems', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    const summary = getHoroscopeSummary(astrolabe, '2026-08-04');

    // Verify monthly mutagen matches STEM_MUTAGENS lookup
    const monthlyStem = summary.monthly.stemBranch.charAt(0);
    const expectedMonthly = STEM_MUTAGENS[monthlyStem];
    expect(summary.monthly.mutagen.lu).toBe(expectedMonthly.lu);
    expect(summary.monthly.mutagen.quan).toBe(expectedMonthly.quan);
    expect(summary.monthly.mutagen.ke).toBe(expectedMonthly.ke);
    expect(summary.monthly.mutagen.ji).toBe(expectedMonthly.ji);

    // Verify daily mutagen matches STEM_MUTAGENS lookup
    const dailyStem = summary.daily.stemBranch.charAt(0);
    const expectedDaily = STEM_MUTAGENS[dailyStem];
    expect(summary.daily.mutagen.lu).toBe(expectedDaily.lu);
    expect(summary.daily.mutagen.quan).toBe(expectedDaily.quan);
    expect(summary.daily.mutagen.ke).toBe(expectedDaily.ke);
    expect(summary.daily.mutagen.ji).toBe(expectedDaily.ji);

    // Verify hourly mutagen matches STEM_MUTAGENS lookup
    const hourlyStem = summary.hourly.stemBranch.charAt(0);
    const expectedHourly = STEM_MUTAGENS[hourlyStem];
    expect(summary.hourly.mutagen.lu).toBe(expectedHourly.lu);
    expect(summary.hourly.mutagen.quan).toBe(expectedHourly.quan);
    expect(summary.hourly.mutagen.ke).toBe(expectedHourly.ke);
    expect(summary.hourly.mutagen.ji).toBe(expectedHourly.ji);
  });

  it('forwards an explicit timeIndex to astrolabe.horoscope() to compute the correct 流時 (hourly) result', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    // 子時 (index 0) vs 午時 (index 6) must resolve to different hourly earthly branches
    const summaryZi = getHoroscopeSummary(astrolabe, '2026-08-04', 'zh-TW', 0);
    const summaryWu = getHoroscopeSummary(astrolabe, '2026-08-04', 'zh-TW', 6);

    expect(summaryZi.hourly.stemBranch.endsWith('子')).toBe(true);
    expect(summaryWu.hourly.stemBranch.endsWith('午')).toBe(true);
    expect(summaryZi.hourly.stemBranch).not.toBe(summaryWu.hourly.stemBranch);
  });

  it('produces pure zh-CN output even after iztro global language leaks to zh-TW (根因 C4 regression, setLanguage 行程全域洩漏)', () => {
    // 模擬 App 以 zh-CN 建盤
    const astrolabeCN = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-CN',
    });

    // 模擬 MatchPanel 的 getCanonicalAstrolabe 稍後以 zh-TW 呼叫 getChart()，
    // 導致 iztro 全域 i18next 語系被改為 zh-TW (astro.js:144 setLanguage 為行程全域狀態)
    getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    const summary = getHoroscopeSummary(astrolabeCN, '2026-08-04', 'zh-CN');

    // 大限/流年命宮名稱與四化應為簡體，不受全域語系洩漏影響
    expect(summary.yearly.name).toBe('命宫');
    expect(summary.decadal.mutagen.lu).toBe('廉贞');
    expect(summary.decadal.mutagen.ji).toBe('太阳');
    expect(summary.yearly.mutagen.ji).toBe('廉贞');

    // 大限/流年重新排名的 12 宮位名稱也應為簡體
    expect(summary.decadal.palaceNames).toContain('命宫');
    expect(summary.decadal.palaceNames).toContain('财帛');
    expect(summary.decadal.palaceNames).not.toContain('命宮');
    expect(summary.decadal.palaceNames).not.toContain('財帛');

    // 各宮流曜/神煞應全為簡體字形，不應混入繁體字形
    const allStars = Object.values(summary.palaceScopeStars).flatMap((p) => [
      ...p.decadalStars,
      ...p.yearlyStars,
      ...(p.monthlyStars || []),
      ...(p.dailyStars || []),
      ...(p.hourlyStars || []),
      ...(p.suiqianStar ? [p.suiqianStar] : []),
      ...(p.jiangqianStar ? [p.jiangqianStar] : []),
    ]);
    const joined = allStars.join('');
    expect(joined).toContain('禄'); // 簡體「運祿/流祿」等
    // 繁體專屬字形不應殘留 (祿/馬/鸞/鉞/龍/歲/喪/貫/將/奏/飛 為對應簡體 禄/马/鸾/钺/龙/岁/丧/贯/将/奏/飞 的繁體字形)
    expect(joined).not.toMatch(/[祿馬鸞鉞龍歲喪貫]/);
  });

  it('keeps pure zh-TW output even after iztro global language leaks to zh-CN (reverse-direction regression protection)', () => {
    const astrolabeTW = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    // 模擬全域語系被其他呼叫翻成 zh-CN
    getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-CN',
    });

    const summary = getHoroscopeSummary(astrolabeTW, '2026-08-04', 'zh-TW');

    expect(summary.yearly.name).toBe('命宮');
    expect(summary.decadal.mutagen.lu).toBe('廉貞');
    expect(summary.decadal.mutagen.ji).toBe('太陽');

    const allStars = Object.values(summary.palaceScopeStars).flatMap((p) => [
      ...p.decadalStars,
      ...p.yearlyStars,
    ]);
    const joined = allStars.join('');
    expect(joined).toContain('祿');
    expect(joined).not.toMatch(/[马鸾钺龙岁丧贯]/);
  });

  it('leaves 流時 (hourly) result unchanged when timeIndex is omitted (regression protection)', () => {
    const astrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 2,
      gender: 'male',
      language: 'zh-TW',
    });

    // Previously the code never passed a timeIndex argument at all; explicit index 0
    // (早子時, matching the implicit midnight-derived default) must produce an identical result.
    const summaryDefault = getHoroscopeSummary(astrolabe, '2026-08-04', 'zh-TW');
    const summaryExplicitZero = getHoroscopeSummary(astrolabe, '2026-08-04', 'zh-TW', 0);

    expect(summaryDefault.hourly.stemBranch).toBe(summaryExplicitZero.hourly.stemBranch);
    expect(summaryDefault.hourly.index).toBe(summaryExplicitZero.hourly.index);
  });
});
