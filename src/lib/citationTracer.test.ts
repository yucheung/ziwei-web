import { describe, expect, it } from 'vitest';
import type { AnalyzedChart } from './chartAnalyzer';
import {
  formatKnowledgeSource,
  getKnowledgeSourceConfidence,
  normalizeKnowledgeSource,
  traceCitations,
} from './citationTracer';
import { getStarKnowledge, type KnowledgeSource } from './starKnowledge';

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
        source: {
          library: 'iztro-sanhe-v1',
          reviewedBy: null,
          status: 'collected',
        },
        confidence: 0.5,
      },
      {
        knowledgeId: 'star-ziwei',
        field: 'palaces[0].majorStars[0]',
        source: getStarKnowledge('紫微')!.source,
        confidence: expect.any(Number),
      },
      {
        knowledgeId: 'star-taiyang',
        field: 'mutagens.entries[0]',
        source: getStarKnowledge('太陽')!.source,
        confidence: getKnowledgeSourceConfidence(getStarKnowledge('太陽')!.source),
      },
    ]);
  });

  it('formats status and reference details for zh-TW and zh-CN consumers', () => {
    const source: KnowledgeSource = {
      library: 'iztro-sanhe-v1',
      reference: '《三命通會》卷三',
      page: 'p.45',
      reviewedBy: 'human',
      status: 'human_approved',
    };

    expect(formatKnowledgeSource(source, 'zh-TW')).toBe(
      '《三命通會》卷三 p.45 (已審核/人類) — via iztro-sanhe-v1'
    );
    expect(formatKnowledgeSource({ ...source, status: 'collected', reviewedBy: null }, 'zh-CN'))
      .toContain('未核实');
    expect(formatKnowledgeSource({ library: 'iztro-sanhe-v1', reviewedBy: null, status: 'collected' }, 'zh-TW'))
      .toBe('iztro-sanhe-v1 [未核實（未審核） / collected]');
  });

  it('formats classical references before their library attribution', () => {
    const source = getStarKnowledge('紫微')!.source;

    expect(formatKnowledgeSource(source, 'zh-TW')).toBe(
      `${source.reference} ${source.page} (classical_ziwei, 已審核/人類) — via ${source.library}`
    );
  });

  it('caps partial Wikisource attributes below full confidence', () => {
    const ziweiCitation = traceCitations(makeSummary()).find((citation) => citation.knowledgeId === 'star-ziwei');
    expect(ziweiCitation?.confidence).toBeLessThan(1);
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

  it('normalizes legacy and unknown sources conservatively', () => {
    const legacy = normalizeKnowledgeSource('legacy-library');
    const unknown = normalizeKnowledgeSource(undefined);

    expect(legacy).toEqual({
      library: 'legacy-library',
      reviewedBy: null,
      status: 'collected',
    });
    expect(getKnowledgeSourceConfidence(legacy)).toBeLessThanOrEqual(0.5);
    expect(unknown).toEqual({
      library: 'unknown',
      reviewedBy: null,
      status: 'disputed',
    });
    expect(getKnowledgeSourceConfidence(unknown)).toBeLessThanOrEqual(0.25);
  });

  it.each([
    ['collected', null, 0.5],
    ['source_checked', 'opus', 0.7],
    ['source_checked', null, 0.5],
    ['cross_supported', 'opus', 0.85],
    ['human_approved', 'human', 1],
    ['human_approved', null, 0.5],
    ['disputed', 'human', 0.25],
  ] as Array<[KnowledgeSource['status'], KnowledgeSource['reviewedBy'], number]>)('assigns exact confidence for %s sources reviewed by %s', (status, reviewedBy, expected) => {
    expect(getKnowledgeSourceConfidence({
      library: 'test-library',
      status,
      reviewedBy,
    })).toBe(expected);
  });
});
