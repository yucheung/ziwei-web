import { describe, expect, it } from 'vitest';
import type { Evidence, RuleResult } from './types';
import { compareFaithfulness } from './faithfulness';

function evidence(knowledgeId: string, field: string, value: string): Evidence {
  return {
    knowledgeId,
    field,
    source: 'iztro-sanhe-v1',
    value,
    reasoning: `${value} 的規則證據。`,
  };
}

const lianzhenLu: RuleResult = {
  ruleId: 'four-transformation-lianzhen-huaLu',
  ruleName: '廉貞化祿',
  matched: true,
  confidence: 0.9,
  evidence: [
    evidence('star-lianzhen', 'palaces[0].majorStars[0]', '廉貞化祿'),
    evidence('palace-ming', 'palaces[0].name', '命宮'),
  ],
};

const ziweiTianfu: RuleResult = {
  ruleId: 'pattern-ziwei-tianfu-same-palace',
  ruleName: '紫府同宮格',
  matched: true,
  confidence: 0.9,
  evidence: [
    evidence('star-ziwei', 'palaces[0].majorStars[0]', '紫微'),
    evidence('star-tianfu', 'palaces[0].majorStars[1]', '天府'),
    evidence('palace-ming', 'palaces[0].name', '命宮'),
  ],
};

const annualFortune = {
  ruleId: 'four-transformation-taiyang-huaJi',
  ruleName: '太陽化忌',
  matched: true,
  confidence: 0.9,
  periodType: 'annual' as const,
  periodLabel: '流年 2026',
  palace: '遷移',
  evidence: [
    evidence('star-taiyang', 'fortune.annual.stars[0]', '太陽'),
    evidence('palace-migration', 'fortune.annual.palace', '遷移'),
  ],
};

describe('faithfulness comparison', () => {
  it('marks a claim matching a rule conclusion as faithful with its evidence', () => {
    const result = compareFaithfulness('廉貞化祿落在命宮，資源主題較容易被引動。', [lianzhenLu]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ruleId: 'four-transformation-lianzhen-huaLu',
      llmClaim: '廉貞化祿落在命宮，資源主題較容易被引動。',
      ruleConclusion: '廉貞化祿',
      faithful: true,
    });
    expect(result[0].evidence).toEqual(lianzhenLu.evidence);
  });

  it('flags a contradictory transformation and retains the conflicting rule evidence', () => {
    const result = compareFaithfulness('廉貞化忌落在命宮。', [lianzhenLu]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ruleId: 'four-transformation-lianzhen-huaLu',
      llmClaim: '廉貞化忌落在命宮。',
      ruleConclusion: '廉貞化祿',
      faithful: false,
    });
    expect(result[0].evidence).toEqual(lianzhenLu.evidence);
  });

  it('flags an unsupported star claim without fabricating evidence', () => {
    const result = compareFaithfulness('天府化祿落在財帛宮。', [lianzhenLu]);

    expect(result).toHaveLength(1);
    expect(result[0].faithful).toBe(false);
    expect(result[0].ruleId).toMatch(/^unsupported-/u);
    expect(result[0].ruleConclusion).toContain('沒有規則支持');
    expect(result[0].evidence).toEqual([]);
  });

  it('matches multiple claims, simplified Chinese, and leaves unrelated prose alone', () => {
    const result = compareFaithfulness('廉贞化禄落在命宫；紫微與天府同宮。今日宜整理資料。', [lianzhenLu, ziweiTianfu]);

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.ruleId)).toEqual([
      'four-transformation-lianzhen-huaLu',
      'pattern-ziwei-tianfu-same-palace',
    ]);
    expect(result.every((item) => item.faithful)).toBe(true);
  });

  it('matches a fortune label against a FortuneResult-shaped rule result', () => {
    const result = compareFaithfulness('流年 2026 會引動遷移宮的事件。', [annualFortune]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ruleId: 'four-transformation-taiyang-huaJi',
      ruleConclusion: '太陽化忌（流年 2026，遷移）',
      faithful: true,
    });
    expect(result[0].evidence).toEqual(annualFortune.evidence);
  });
});
