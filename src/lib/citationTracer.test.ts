import { describe, expect, it } from 'vitest';
import type { AnalyzedChart } from './chartAnalyzer';
import { traceCitations } from './citationTracer';

function makeSummary(overrides: Partial<AnalyzedChart> = {}): AnalyzedChart {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-08-07T00:00:00.000Z',
    outputLocale: 'zh-TW',
    birthData: { date: '2000-08-16', timeIndex: 2, gender: 'male' },
    palaces: [
      {
        index: 0,
        name: '命宮',
        heavenlyStem: '甲',
        earthlyBranch: '子',
        isBodyPalace: false,
        isOriginalPalace: false,
        majorStars: [{ starName: '紫微' }],
        minorStars: [],
        adjectiveStars: [],
      },
    ],
    mutagens: {
      entries: [{ palaceIndex: 0, palaceName: '命宮', starName: '太陽', mutagen: '祿' }],
    },
    patterns: { patterns: [] },
    ...overrides,
  };
}

describe('citationTracer', () => {
  it('traces known palace, major-star, and mutagen fields to static knowledge', () => {
    expect(traceCitations(makeSummary())).toEqual([
      {
        knowledgeId: 'palace-ming',
        field: 'palaces[0].name',
        source: 'iztro-sanhe-v1',
        confidence: 'high',
      },
      {
        knowledgeId: 'star-ziwei',
        field: 'palaces[0].majorStars[0]',
        source: 'iztro-sanhe-v1',
        confidence: 'high',
      },
      {
        knowledgeId: 'star-taiyang',
        field: 'mutagens.entries[0]',
        source: 'iztro-sanhe-v1',
        confidence: 'high',
      },
    ]);
  });

  it('does not cite unknown stars or palace names', () => {
    expect(
      traceCitations(
        makeSummary({
          palaces: [
            {
              index: 0,
              name: '未知宮位',
              heavenlyStem: '甲',
              earthlyBranch: '子',
              isBodyPalace: false,
              isOriginalPalace: false,
              majorStars: [{ starName: '未知星曜' }],
              minorStars: [],
              adjectiveStars: [],
            },
          ],
          mutagens: {
            entries: [{ palaceIndex: 0, palaceName: '未知宮位', starName: '未知星曜', mutagen: '祿' }],
          },
        })
      )
    ).toEqual([]);
  });
});
