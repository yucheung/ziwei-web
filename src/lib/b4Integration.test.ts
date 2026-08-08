import { describe, expect, it } from 'vitest';
import { getChart } from './astro';
import { analyzeChart, type AnalyzedChart } from './chartAnalyzer';
import { formatKnowledgeSource, traceCitations } from './citationTracer';
import { buildReadingPrompt } from './prompts';
import { getAllStarKnowledge, getStarKnowledge } from './starKnowledge';

describe('B4 citation integration', () => {
  it('carries a real chart through analysis and citations into the final prompt', () => {
    const chart = getChart({ date: '2000-08-16', timeIndex: 2, gender: 'male', language: 'zh-TW' });
    const analyzed = analyzeChart(chart, 'zh-TW', { generatedAt: '2026-08-07T00:00:00.000Z' });
    const citations = traceCitations(analyzed);
    const { systemPrompt } = buildReadingPrompt(chart, { type: 'overall', locale: 'zh-TW' });

    expect(analyzed.palaces).toHaveLength(12);
    expect(citations.length).toBeGreaterThan(0);
    expect(systemPrompt).toContain('## 知識來源');
    for (const citation of citations) {
      expect(systemPrompt).toContain(
        `- [${citation.knowledgeId}] ${formatKnowledgeSource(citation.source, 'zh-TW')} — ${citation.field} (${citation.confidence})`
      );
    }
  });

  it('has a knowledge entry for every star in the v1 knowledge set', () => {
    const entries = getAllStarKnowledge();

    expect(entries).toHaveLength(27);
    for (const entry of entries) {
      expect(getStarKnowledge(entry.starName)).toEqual(entry);
    }
  });

  it('traces all 27 known stars when they occur in structured summary data', () => {
    const entries = getAllStarKnowledge();
    const summary: AnalyzedChart = {
      schemaVersion: '1.0',
      generatedAt: '2026-08-07T00:00:00.000Z',
      outputLocale: 'zh-TW',
      birthData: { date: '2000-08-16', timeIndex: 2, gender: 'male' },
      palaces: entries.map((entry, index) => ({
        index,
        name: '命宮',
        heavenlyStem: '甲',
        earthlyBranch: '子',
        isBodyPalace: false,
        isOriginalPalace: false,
        majorStars: [{ starName: entry.starName }],
        minorStars: [],
        adjectiveStars: [],
      })),
      mutagens: { entries: [] },
      patterns: { patterns: [] },
    };
    const starCitations = traceCitations(summary).filter((citation) => citation.field.includes('.majorStars['));

    expect(starCitations).toHaveLength(entries.length);
    expect(starCitations.map((citation) => citation.knowledgeId)).toEqual(
      entries.map((entry) => entry.knowledgeId)
    );
  });

  it('traces every known major star present in a real chart', () => {
    const chart = getChart({ date: '2000-08-16', timeIndex: 2, gender: 'male', language: 'zh-TW' });
    const analyzed = analyzeChart(chart, 'zh-TW', { generatedAt: '2026-08-07T00:00:00.000Z' });
    const citations = traceCitations(analyzed);
    const citedFields = new Set(citations.map((citation) => citation.field));

    for (const [palaceIndex, palace] of analyzed.palaces.entries()) {
      for (const [starIndex, star] of palace.majorStars.entries()) {
        expect(getStarKnowledge(star.starName)).toBeDefined();
        expect(citedFields).toContain(`palaces[${palaceIndex}].majorStars[${starIndex}]`);
      }
    }
  });
});
