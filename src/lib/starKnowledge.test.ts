import { describe, expect, it } from 'vitest';
import { getAllStarKnowledge, getStarKnowledge } from './starKnowledge';

const STAR_GROUPS = {
  major: ['紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍'],
  auspicious: ['文昌', '文曲', '左輔', '右弼', '天魁', '天鉞', '祿存'],
  inauspicious: ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'],
} as const;

const ALL_STAR_NAMES = Object.values(STAR_GROUPS).flat();

describe('starKnowledge', () => {
  it('contains the 27 canonical stars with stable provenance and attributes', () => {
    const entries = getAllStarKnowledge();

    expect(entries).toHaveLength(27);
    expect(entries.map((entry) => entry.starName)).toEqual(ALL_STAR_NAMES);

    for (const [starType, starNames] of Object.entries(STAR_GROUPS)) {
      expect(entries.filter((entry) => entry.starType === starType).map((entry) => entry.starName)).toEqual(starNames);
    }

    expect(new Set(entries.map((entry) => entry.knowledgeId)).size).toBe(27);
    for (const entry of entries) {
      expect(entry.source).toMatchObject({
        library: 'iztro-sanhe-v1',
        status: expect.stringMatching(/^(collected|source_checked|cross_supported|human_approved|disputed)$/u),
      });
      expect(['human', 'opus', null]).toContain(entry.source.reviewedBy);
      expect(entry.school).toBe(entry.starName === '紫微' ? 'classical_ziwei' : 'sanhe');
      expect(entry.ruleSetVersion).toBe('sanhe-v1');
      expect(entry.attributes.element).toMatch(/^[木火土金水]$/);
      expect(entry.attributes.brightnessRange.length).toBeGreaterThan(0);
      expect(entry.attributes.brightnessRange.every((brightness) => typeof brightness === 'string')).toBe(true);
      expect(entry.attributes.category.length).toBeGreaterThan(0);
    }
  });

  it('looks up a canonical zh-TW star with its static attributes', () => {
    const entry = getStarKnowledge('紫微');

    expect(entry).toMatchObject({
      starName: '紫微',
      starType: 'major',
      knowledgeId: 'star-ziwei',
      source: expect.objectContaining({ library: 'iztro-sanhe-v1' }),
      school: 'classical_ziwei',
      ruleSetVersion: 'sanhe-v1',
      attributes: {
        element: '土',
        category: '紫微系',
      },
    });
    expect(entry?.source).toMatchObject({ school: 'classical_ziwei' });
    expect(entry?.source.reference).toContain('wikisource.org');
    expect(entry?.source.page).toBe('卷一·諸星問答論');
    expect(entry?.attributes.confidence).toBeLessThan(1);
    expect(entry?.attributes.brightnessRange).toEqual(expect.arrayContaining(['廟', '旺']));
  });

  it('resolves 祿存 to the stable star-lucun knowledge ID', () => {
    expect(getStarKnowledge('祿存')).toMatchObject({
      starName: '祿存',
      starType: 'auspicious',
      knowledgeId: 'star-lucun',
      attributes: { category: '六吉星' },
    });
  });

  it('returns undefined for an unknown star', () => {
    expect(getStarKnowledge('不存在的星曜')).toBeUndefined();
  });

  it('includes at least one explicitly human-approved source example', () => {
    expect(getAllStarKnowledge().some((entry) =>
      entry.source.reviewedBy === 'human' && entry.source.status === 'human_approved'
    )).toBe(true);
  });
});
