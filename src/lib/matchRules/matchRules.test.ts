import { describe, expect, it } from 'vitest';
import type { AnalyzedChart, AnalyzedPalace, AnalyzedStar } from '../chartAnalyzer';
import {
  BRANCH_RELATION_RULES,
  evaluateMatch,
  MUTAGEN_INTERACTION_RULES,
  PALACE_OVERLAP_RULES,
  STAR_COMPATIBILITY_RULES,
} from './index';

const PALACE_NAMES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

interface ChartFixtureOptions {
  mingBranch?: string;
  mingIndex?: number;
  mingStars?: AnalyzedStar[];
  mutagenIndex?: number;
  mutagenStars?: AnalyzedStar[];
}

function star(starName: string, mutagen?: string): AnalyzedStar {
  return mutagen ? { starName, mutagen } : { starName };
}

function palace(index: number, name: string, earthlyBranch: string, majorStars: AnalyzedStar[]): AnalyzedPalace {
  return {
    index,
    name,
    heavenlyStem: STEMS[index % STEMS.length] ?? '甲',
    earthlyBranch,
    isBodyPalace: false,
    isOriginalPalace: false,
    majorStars,
    minorStars: [],
    adjectiveStars: [],
  };
}

function makeChart({
  mingBranch = '子',
  mingIndex = 0,
  mingStars = [],
  mutagenIndex,
  mutagenStars = [],
}: ChartFixtureOptions = {}): AnalyzedChart {
  const palaces = Array.from({ length: 12 }, (_, index) => {
    const palaceName = PALACE_NAMES[(index - mingIndex + 12) % 12] ?? '命宮';
    const branch = index === mingIndex ? mingBranch : BRANCHES[index] ?? '子';
    const majorStars = index === mutagenIndex ? mutagenStars : index === mingIndex ? mingStars : [];
    return palace(index, palaceName, branch, majorStars);
  });

  return {
    schemaVersion: '1.0',
    generatedAt: '2026-08-07T00:00:00.000Z',
    outputLocale: 'zh-TW',
    birthData: { date: '2000-01-01', timeIndex: 0, gender: 'male' },
    palaces,
    mutagens: {
      entries: palaces.flatMap((currentPalace) => currentPalace.majorStars.flatMap((currentStar) =>
        currentStar.mutagen
          ? [{
              palaceIndex: currentPalace.index,
              palaceName: currentPalace.name,
              starName: currentStar.starName,
              mutagen: currentStar.mutagen,
            }]
          : []
      )),
    },
    patterns: { patterns: [] },
  };
}

function ruleIds(chartA: AnalyzedChart, chartB: AnalyzedChart): string[] {
  return evaluateMatch(chartA, chartB).map((result) => result.ruleId);
}

const MATCH_RULES = [
  ...STAR_COMPATIBILITY_RULES,
  ...PALACE_OVERLAP_RULES,
  ...MUTAGEN_INTERACTION_RULES,
  ...BRANCH_RELATION_RULES,
];

describe('B7a match-rule engine', () => {
  it('uses the match-specific condition and conclusion type contracts', () => {
    expect(new Set(MATCH_RULES.flatMap((rule) => rule.conditions.map((condition) => condition.type)))).toEqual(
      new Set(['starRelationship', 'palaceOverlap', 'mutagenInteraction', 'branchRelation'])
    );
    expect(new Set(MATCH_RULES.flatMap((rule) => rule.conclusions.map((conclusion) => conclusion.type)))).toEqual(
      new Set(['compatibility', 'dynamic', 'challenge'])
    );
  });

  it('accepts analyzed charts and returns evidence-backed matched results only', () => {
    const results = evaluateMatch(
      makeChart({ mingStars: [star('紫微'), star('廉貞', '祿')] }),
      makeChart({ mingStars: [star('天府'), star('太陽', '忌')] })
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.matched)).toBe(true);
    expect(results.every((result) => result.conclusions.length > 0)).toBe(true);
    expect(results.flatMap((result) => result.evidence)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        knowledgeId: expect.any(String),
        field: expect.stringMatching(/^chart[AB]\./u),
        source: 'iztro-sanhe-v1',
        value: expect.any(String),
        reasoning: expect.any(String),
      }),
    ]));
    expect(results.flatMap((result) => result.conclusions)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: expect.stringMatching(/^(compatibility|dynamic|challenge)$/u),
        description: expect.any(String),
        confidence: expect.any(Number),
        sensitivity: expect.any(String),
      }),
    ]));
  });

  it('finds representative 紫微+天府 and 太陽+太陰命宮 pair rules', () => {
    expect(ruleIds(
      makeChart({ mingStars: [star('紫微')] }),
      makeChart({ mingStars: [star('天府')] })
    )).toContain('star-ziwei-tianfu');

    expect(ruleIds(
      makeChart({ mingStars: [star('太陽')] }),
      makeChart({ mingStars: [star('太陰')] })
    )).toContain('star-taiyang-taiyin');
  });

  it('finds same 命宮 branch and cross-chart 三方四正 overlap', () => {
    expect(ruleIds(makeChart({ mingBranch: '子' }), makeChart({ mingBranch: '子' }))).toContain(
      'palace-same-ming-branch'
    );
    expect(ruleIds(makeChart(), makeChart({ mingIndex: 2 }))).toContain('palace-surrounded-overlap');
  });

  it('finds 雙祿 and 祿忌 mutagen interactions', () => {
    expect(ruleIds(
      makeChart({ mutagenIndex: 0, mutagenStars: [star('廉貞', '祿')] }),
      makeChart({ mutagenIndex: 0, mutagenStars: [star('天機', '祿')] })
    )).toContain('mutagen-double-lu');

    expect(ruleIds(
      makeChart({ mutagenIndex: 0, mutagenStars: [star('廉貞', '祿')] }),
      makeChart({ mutagenIndex: 0, mutagenStars: [star('太陽', '忌')] })
    )).toContain('mutagen-lu-ji');

    expect(ruleIds(
      makeChart({ mutagenIndex: 0, mutagenStars: [star('廉貞', '忌')] }),
      makeChart({ mutagenIndex: 0, mutagenStars: [star('太陽', '祿')] })
    )).toContain('mutagen-lu-ji');

    expect(ruleIds(
      makeChart({ mingStars: [star('廉貞', '祿')] }),
      makeChart({ mutagenIndex: 2, mutagenStars: [star('天機', '祿')] }),
    )).not.toContain('mutagen-double-lu');

    expect(ruleIds(
      makeChart({ mingStars: [star('廉貞', '祿')] }),
      makeChart({ mutagenIndex: 2, mutagenStars: [star('太陽', '忌')] }),
    )).not.toContain('mutagen-lu-ji');

    expect(ruleIds(
      makeChart({ mutagenIndex: 2, mutagenStars: [star('太陽', '忌')] }),
      makeChart({ mingStars: [star('廉貞', '祿')] }),
    )).not.toContain('mutagen-lu-ji');
  });

  it('marks the specific double-lu wealth conclusion as high sensitivity', () => {
    const conclusion = MUTAGEN_INTERACTION_RULES
      .find((rule) => rule.ruleId === 'mutagen-double-lu')
      ?.conclusions[0];

    expect(conclusion).toMatchObject({ sensitivity: 'high', topic: '財富' });
  });

  it.each([
    ['六合', '子', '丑', 'branch-liuhe'],
    ['三合', '申', '子', 'branch-sanhe'],
    ['六沖', '子', '午', 'branch-liuchong'],
    ['三刑', '寅', '巳', 'branch-sanxing'],
    ['六害', '子', '未', 'branch-liuhai'],
  ])('detects %s', (_label, branchA, branchB, expectedRuleId) => {
    expect(ruleIds(
      makeChart({ mingBranch: branchA }),
      makeChart({ mingBranch: branchB })
    )).toContain(expectedRuleId);
  });

  it('is deterministic, non-mutating, deduplicated, and confidence-then-id sorted', () => {
    const chartA = makeChart({ mingStars: [star('紫微'), star('廉貞', '祿')] });
    const chartB = makeChart({ mingIndex: 2, mingStars: [star('天府'), star('太陽', '忌')] });
    const chartABefore = structuredClone(chartA);
    const chartBBefore = structuredClone(chartB);

    const first = evaluateMatch(chartA, chartB);
    const second = evaluateMatch(chartA, chartB);

    expect(second).toEqual(first);
    expect(chartA).toEqual(chartABefore);
    expect(chartB).toEqual(chartBBefore);
    expect(new Set(first.map((result) => result.ruleId)).size).toBe(first.length);
    expect(first).toEqual([...first].sort(
      (left, right) => right.confidence - left.confidence || left.ruleId.localeCompare(right.ruleId)
    ));
  });
});
