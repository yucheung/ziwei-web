import { describe, expect, it } from 'vitest';
import type { Config } from '../astro';
import { getChart } from '../astro';
import { analyzeChart } from '../chartAnalyzer';
import { getRuleResults } from './engine';
import { PATTERN_RULES } from './patterns';

const NORMAL_CONFIG: Config = { algorithm: 'zhongzhou', yearDivide: 'normal', dayDivide: 'forward' };
const EXACT_CONFIG: Config = { algorithm: 'zhongzhou', yearDivide: 'exact', dayDivide: 'forward' };

interface GoldenFixture {
  name: string;
  date: string;
  timeIndex: number | string;
  gender: 'male' | 'female';
  longitude?: number;
  config: Config;
  expectedRuleIds: string[];
}

/**
 * Rule golden fixtures deliberately reuse the B1-4 dates and add a second
 * fixed birth date/time sweep to exercise more of the supported pattern
 * catalog. Every iztro call supplies the full config because its config()
 * values are module-global when omitted.
 */
const FIXTURES: GoldenFixture[] = [
  {
    name: 'early-zi', date: '2023-05-15', timeIndex: 0, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-jumen-huaQuan', 'four-transformation-pojun-huaLu',
      'four-transformation-taiyin-huaKe', 'four-transformation-tanlang-huaJi',
      'pattern-kui-yue-clamp-ming', 'pattern-tianfu-si', 'pattern-yang-liang-chang-lu', 'pattern-ziwei-hai',
    ],
  },
  {
    name: 'late-zi', date: '2023-05-15', timeIndex: 12, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-jumen-huaQuan', 'four-transformation-pojun-huaLu',
      'four-transformation-taiyin-huaKe', 'four-transformation-tanlang-huaJi',
      'pattern-kui-yue-clamp-ming', 'pattern-ri-yue-same-palace', 'pattern-tianfu-system-ming',
      'pattern-tianfu-zi', 'pattern-ziwei-chen', 'pattern-ziwei-system-ming', 'pattern-ziwei-tianxiang-same-palace',
    ],
  },
  {
    name: 'li-chun-afternoon', date: '2024-02-04', timeIndex: '15:00', gender: 'male', config: EXACT_CONFIG,
    expectedRuleIds: [
      'four-transformation-lianzhen-huaLu', 'four-transformation-pojun-huaQuan',
      'four-transformation-taiyang-huaJi', 'four-transformation-wuqu-huaKe',
      'pattern-tianfu-chen', 'pattern-tianfu-system-ming', 'pattern-ziwei-zi',
    ],
  },
  {
    name: 'li-chun-evening', date: '2024-02-04', timeIndex: '17:00', gender: 'male', config: EXACT_CONFIG,
    expectedRuleIds: [
      'four-transformation-lianzhen-huaLu', 'four-transformation-pojun-huaQuan',
      'four-transformation-taiyang-huaJi', 'four-transformation-wuqu-huaKe',
      'pattern-chang-qu-same-palace', 'pattern-tianfu-chen', 'pattern-tianfu-system-ming',
      'pattern-ziwei-system-ming', 'pattern-ziwei-zi',
    ],
  },
  {
    name: 'new-year-eve', date: '2024-02-09', timeIndex: 6, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-jumen-huaQuan', 'four-transformation-pojun-huaLu',
      'four-transformation-taiyin-huaKe', 'four-transformation-tanlang-huaJi',
      'pattern-tianfu-xu', 'pattern-ziwei-wu',
    ],
  },
  {
    name: 'lunar-new-year', date: '2024-02-10', timeIndex: 6, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-lianzhen-huaLu', 'four-transformation-pojun-huaQuan',
      'four-transformation-taiyang-huaJi', 'four-transformation-wuqu-huaKe',
      'pattern-tianfu-si', 'pattern-tianfu-system-ming', 'pattern-ziwei-hai', 'pattern-ziwei-system-ming',
    ],
  },
  {
    name: 'leap-month', date: '2023-04-10', timeIndex: 6, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-jumen-huaQuan', 'four-transformation-pojun-huaLu',
      'four-transformation-taiyin-huaKe', 'four-transformation-tanlang-huaJi',
      'pattern-ji-yue-tong-liang', 'pattern-tianfu-si', 'pattern-tianfu-system-ming',
      'pattern-ziwei-hai', 'pattern-ziwei-system-ming',
    ],
  },
  {
    name: 'solar-time-before-boundary', date: '2023-05-15', timeIndex: '12:55', gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-jumen-huaQuan', 'four-transformation-pojun-huaLu',
      'four-transformation-taiyin-huaKe', 'four-transformation-tanlang-huaJi',
      'pattern-tianfu-yin', 'pattern-ziwei-system-ming', 'pattern-ziwei-tianfu-same-palace', 'pattern-ziwei-yin',
    ],
  },
  {
    name: 'solar-time-after-boundary', date: '2023-05-15', timeIndex: '12:55', gender: 'male', longitude: 121.56, config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-jumen-huaQuan', 'four-transformation-pojun-huaLu',
      'four-transformation-taiyin-huaKe', 'four-transformation-tanlang-huaJi',
      'pattern-sha-po-lang', 'pattern-tianfu-system-ming', 'pattern-tianfu-wei', 'pattern-ziwei-system-ming',
      'pattern-ziwei-tanlang-same-palace', 'pattern-ziwei-you',
    ],
  },
  {
    name: 'yang-male-forward', date: '2024-05-15', timeIndex: 6, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-lianzhen-huaLu', 'four-transformation-pojun-huaQuan',
      'four-transformation-taiyang-huaJi', 'four-transformation-wuqu-huaKe', 'pattern-san-qi-jia-hui',
      'pattern-sha-po-lang', 'pattern-tianfu-system-ming', 'pattern-tianfu-you',
      'pattern-ziwei-pojun-same-palace', 'pattern-ziwei-system-ming', 'pattern-ziwei-wei',
      'pattern-zuo-you-same-palace',
    ],
  },
  {
    name: 'yang-female-reverse', date: '2024-05-15', timeIndex: 6, gender: 'female', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-lianzhen-huaLu', 'four-transformation-pojun-huaQuan',
      'four-transformation-taiyang-huaJi', 'four-transformation-wuqu-huaKe', 'pattern-san-qi-jia-hui',
      'pattern-sha-po-lang', 'pattern-tianfu-system-ming', 'pattern-tianfu-you',
      'pattern-ziwei-pojun-same-palace', 'pattern-ziwei-system-ming', 'pattern-ziwei-wei',
      'pattern-zuo-you-same-palace',
    ],
  },
  {
    name: 'empty-palace', date: '2024-05-02', timeIndex: 6, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-lianzhen-huaLu', 'four-transformation-pojun-huaQuan',
      'four-transformation-taiyang-huaJi', 'four-transformation-wuqu-huaKe',
      'pattern-tianfu-hai', 'pattern-yang-liang-chang-lu', 'pattern-ziwei-si',
    ],
  },
  {
    name: 'midday-2023', date: '2023-05-15', timeIndex: 6, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-jumen-huaQuan', 'four-transformation-pojun-huaLu',
      'four-transformation-taiyin-huaKe', 'four-transformation-tanlang-huaJi',
      'pattern-tianfu-yin', 'pattern-ziwei-system-ming', 'pattern-ziwei-tianfu-same-palace', 'pattern-ziwei-yin',
    ],
  },
  {
    name: 'next-day-2023', date: '2023-05-16', timeIndex: 6, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-jumen-huaQuan', 'four-transformation-pojun-huaLu',
      'four-transformation-taiyin-huaKe', 'four-transformation-tanlang-huaJi',
      'pattern-tianfu-yin', 'pattern-ziwei-system-ming', 'pattern-ziwei-tianfu-same-palace', 'pattern-ziwei-yin',
    ],
  },
  {
    name: 'sweep-2000-early-zi', date: '2000-08-16', timeIndex: 0, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-taiyang-huaLu', 'four-transformation-taiyin-huaKe',
      'four-transformation-tiantong-huaJi', 'four-transformation-wuqu-huaQuan', 'pattern-ji-yue-tong-liang',
      'pattern-tianfu-system-ming', 'pattern-tianfu-wei', 'pattern-yang-tuo-clamp-ming',
      'pattern-ziwei-system-ming', 'pattern-ziwei-tanlang-same-palace', 'pattern-ziwei-you',
    ],
  },
  {
    name: 'sweep-2000-chou', date: '2000-08-16', timeIndex: 1, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-taiyang-huaLu', 'four-transformation-taiyin-huaKe',
      'four-transformation-tiantong-huaJi', 'four-transformation-wuqu-huaQuan', 'pattern-tianfu-xu', 'pattern-ziwei-wu',
    ],
  },
  {
    name: 'sweep-2000-yin', date: '2000-08-16', timeIndex: 2, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-taiyang-huaLu', 'four-transformation-taiyin-huaKe',
      'four-transformation-tiantong-huaJi', 'four-transformation-wuqu-huaQuan', 'pattern-tianfu-xu',
      'pattern-ziwei-system-ming', 'pattern-ziwei-wu',
    ],
  },
  {
    name: 'sweep-2000-mao', date: '2000-08-16', timeIndex: 3, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-taiyang-huaLu', 'four-transformation-taiyin-huaKe',
      'four-transformation-tiantong-huaJi', 'four-transformation-wuqu-huaQuan', 'pattern-chang-qu-same-palace',
      'pattern-tianfu-chou', 'pattern-tianfu-system-ming', 'pattern-ziwei-mao', 'pattern-ziwei-tanlang-same-palace',
    ],
  },
  {
    name: 'sweep-2000-chen', date: '2000-08-16', timeIndex: 4, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-taiyang-huaLu', 'four-transformation-taiyin-huaKe',
      'four-transformation-tiantong-huaJi', 'four-transformation-wuqu-huaQuan', 'pattern-tianfu-chou',
      'pattern-tianfu-system-ming', 'pattern-ziwei-mao', 'pattern-ziwei-tanlang-same-palace',
    ],
  },
  {
    name: 'sweep-2000-si', date: '2000-08-16', timeIndex: 5, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-taiyang-huaLu', 'four-transformation-taiyin-huaKe',
      'four-transformation-tiantong-huaJi', 'four-transformation-wuqu-huaQuan', 'pattern-tianfu-system-ming',
      'pattern-tianfu-yin', 'pattern-ziwei-tianfu-same-palace', 'pattern-ziwei-yin',
    ],
  },
  {
    name: 'sweep-2000-wu', date: '2000-08-16', timeIndex: 7, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-taiyang-huaLu', 'four-transformation-taiyin-huaKe',
      'four-transformation-tiantong-huaJi', 'four-transformation-wuqu-huaQuan', 'pattern-tianfu-chou',
      'pattern-tianfu-system-ming', 'pattern-ziwei-mao', 'pattern-ziwei-tanlang-same-palace',
    ],
  },
  {
    name: 'sweep-2000-shen', date: '2000-08-16', timeIndex: 8, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-taiyang-huaLu', 'four-transformation-taiyin-huaKe',
      'four-transformation-tiantong-huaJi', 'four-transformation-wuqu-huaQuan', 'pattern-tianfu-chou',
      'pattern-ziwei-mao', 'pattern-ziwei-system-ming', 'pattern-ziwei-tanlang-same-palace',
    ],
  },
  {
    name: 'sweep-2000-you', date: '2000-08-16', timeIndex: 9, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-taiyang-huaLu', 'four-transformation-taiyin-huaKe',
      'four-transformation-tiantong-huaJi', 'four-transformation-wuqu-huaQuan', 'pattern-chang-qu-same-palace',
      'pattern-tianfu-yin', 'pattern-ziwei-system-ming', 'pattern-ziwei-tianfu-same-palace', 'pattern-ziwei-yin',
    ],
  },
  {
    name: 'sweep-2000-xu', date: '2000-08-16', timeIndex: 10, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-taiyang-huaLu', 'four-transformation-taiyin-huaKe',
      'four-transformation-tiantong-huaJi', 'four-transformation-wuqu-huaQuan', 'pattern-tianfu-yin',
      'pattern-ziwei-system-ming', 'pattern-ziwei-tianfu-same-palace', 'pattern-ziwei-yin',
    ],
  },
  {
    name: 'sweep-2000-hai', date: '2000-08-16', timeIndex: 11, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-taiyang-huaLu', 'four-transformation-taiyin-huaKe',
      'four-transformation-tiantong-huaJi', 'four-transformation-wuqu-huaQuan', 'pattern-sha-po-lang',
      'pattern-tianfu-system-ming', 'pattern-tianfu-wei', 'pattern-ziwei-system-ming',
      'pattern-ziwei-tanlang-same-palace', 'pattern-ziwei-you',
    ],
  },
  {
    name: 'sweep-2000-late-zi', date: '2000-08-16', timeIndex: 12, gender: 'male', config: NORMAL_CONFIG,
    expectedRuleIds: [
      'four-transformation-taiyang-huaLu', 'four-transformation-taiyin-huaKe',
      'four-transformation-tiantong-huaJi', 'four-transformation-wuqu-huaQuan', 'pattern-ri-yue-same-palace',
      'pattern-sha-po-lang', 'pattern-tianfu-system-ming', 'pattern-tianfu-wu',
      'pattern-yang-tuo-clamp-ming', 'pattern-ziwei-tianxiang-same-palace', 'pattern-ziwei-xu',
    ],
  },
];

describe('rule golden v2', () => {
  it('matches deterministic rule IDs for 26 known chart configurations', () => {
    const fixtureInputs = FIXTURES.map(({ name: _name, expectedRuleIds: _expectedRuleIds, ...input }) =>
      JSON.stringify(input)
    );
    expect(FIXTURES).toHaveLength(26);
    expect(new Set(fixtureInputs).size).toBe(26);

    const detectedPatternIds = new Set<string>();

    for (const fixture of FIXTURES) {
      const { name: _name, expectedRuleIds, ...options } = fixture;
      const chart = getChart({ ...options, language: 'zh-TW' });
      const analyzed = analyzeChart(chart, 'zh-TW', { generatedAt: '2026-08-07T00:00:00.000Z' });
      const actualRuleIds = getRuleResults(analyzed).map((result) => result.ruleId);

      expect(actualRuleIds, `${fixture.name} rule IDs`).toEqual(expectedRuleIds);
      actualRuleIds
        .filter((ruleId) => ruleId.startsWith('pattern-'))
        .forEach((ruleId) => detectedPatternIds.add(ruleId));
    }

    const coverage = detectedPatternIds.size / PATTERN_RULES.length;
    expect(
      coverage,
      `pattern coverage ${detectedPatternIds.size}/${PATTERN_RULES.length} = ${(coverage * 100).toFixed(1)}%`
    ).toBeGreaterThanOrEqual(0.8);
  });
});
