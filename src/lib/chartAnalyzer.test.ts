import { describe, expect, it } from 'vitest';
import { getChart } from './astro';
import { analyzeChart } from './chartAnalyzer';

const generatedAt = '2026-08-07T00:00:00.000Z';

describe('chartAnalyzer.ts', () => {
  it('emits the v1 schema with twelve analyzed palaces and non-empty starName values', () => {
    const chart = getChart({ date: '2000-08-16', timeIndex: 2, gender: 'male', language: 'zh-TW' });
    const result = analyzeChart(chart, 'zh-TW', { generatedAt });

    expect(result.schemaVersion).toBe('1.0');
    expect(result.generatedAt).toBe(generatedAt);
    expect(result.locale).toBe('zh-TW');
    expect(result.birthData).toEqual({ date: '2000-8-16', timeIndex: 2, gender: 'male' });
    expect(result.palaces).toHaveLength(12);

    const stars = result.palaces.flatMap((palace) => [
      ...palace.majorStars,
      ...palace.minorStars,
      ...palace.adjectiveStars,
    ]);
    expect(stars.length).toBeGreaterThan(0);
    expect(stars.every((star) => star.starName.length > 0)).toBe(true);
  });

  it('collects only source star mutagens and leaves pattern rules empty', () => {
    const chart = getChart({ date: '2000-08-16', timeIndex: 2, gender: 'male', language: 'zh-TW' });
    const result = analyzeChart(chart, 'zh-TW', { generatedAt });
    const sourceMarkers = chart.palaces.flatMap((palace) =>
      [...palace.majorStars, ...palace.minorStars, ...palace.adjectiveStars]
        .filter((star) => star.mutagen)
        .map((star) => ({
          palaceIndex: palace.index,
          palaceName: palace.name,
          starName: star.name,
          mutagen: star.mutagen,
        }))
    );

    expect(result.mutagens.entries).toEqual(sourceMarkers);
    expect(result.patterns).toEqual({ patterns: [] });
  });

  it.each([
    ['zh-TW' as const, 'male' as const],
    ['zh-CN' as const, 'female' as const],
  ])('supports locale %s and normalized gender %s', (locale, gender) => {
    const chart = getChart({ date: '1995-03-21', timeIndex: 6, gender, language: locale });
    const result = analyzeChart(chart, locale, { generatedAt });

    expect(result.locale).toBe(locale);
    expect(result.birthData.gender).toBe(gender);
    expect(result.palaces).toHaveLength(12);
  });

  it('recovers iztro early and late Zi time indexes', () => {
    const early = analyzeChart(
      getChart({ date: '2000-08-16', timeIndex: 0, gender: 'male', language: 'zh-TW' }),
      'zh-TW',
      { generatedAt }
    );
    const late = analyzeChart(
      getChart({ date: '2000-08-16', timeIndex: 12, gender: 'male', language: 'zh-TW' }),
      'zh-TW',
      { generatedAt }
    );

    expect(early.birthData.timeIndex).toBe(0);
    expect(late.birthData.timeIndex).toBe(12);
  });

  it('is snapshot-stable when generation time is fixed', () => {
    const chart = getChart({ date: '2000-08-16', timeIndex: 2, gender: 'male', language: 'zh-TW' });
    const result = analyzeChart(chart, 'zh-TW', { generatedAt });

    expect(result).toMatchSnapshot();
  });
});
