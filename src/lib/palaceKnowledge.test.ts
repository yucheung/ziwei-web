import { describe, expect, it } from 'vitest';
import { getPalaceKnowledge } from './palaceKnowledge';

const CANONICAL_PALACES = [
  '命宮',
  '兄弟',
  '夫妻',
  '子女',
  '財帛',
  '疾厄',
  '遷移',
  '僕役',
  '官祿',
  '田宅',
  '福德',
  '父母',
];

describe('palaceKnowledge', () => {
  it('contains knowledge for all canonical AnalyzedChart palaces', () => {
    for (const palaceName of CANONICAL_PALACES) {
      const entry = getPalaceKnowledge(palaceName);

      expect(entry).toMatchObject({ palaceName, knowledgeId: expect.stringMatching(/^palace-/) });
      expect(entry?.source).toBe('iztro-sanhe-v1');
      expect(entry?.school).toBe('sanhe');
      expect(entry?.ruleSetVersion).toBe('sanhe-v1');
      expect(entry?.themes.length).toBeGreaterThan(0);
      expect(entry?.bodyPart.length).toBeGreaterThan(0);
      expect(entry?.lifeDomain.length).toBeGreaterThan(0);
    }
  });

  it('accepts 交友 as the modern alias for iztro canonical 僕役', () => {
    expect(getPalaceKnowledge('交友')).toEqual(getPalaceKnowledge('僕役'));
  });

  it('returns undefined for an unknown palace', () => {
    expect(getPalaceKnowledge('不存在的宮位')).toBeUndefined();
  });
});
