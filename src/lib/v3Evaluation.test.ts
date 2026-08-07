import { describe, expect, it } from 'vitest';
import {
  DEFAULT_V3_MODEL,
  V3_TEST_CASES,
  calculateV3Metrics,
  evaluateV3,
  type V3Model,
} from './v3Evaluation';

describe('v3Evaluation', () => {
  it('provides 15 fixed test cases across the three evaluation groups', () => {
    expect(DEFAULT_V3_MODEL).toBe('gpt-5.6-luna');
    expect(V3_TEST_CASES).toHaveLength(15);
    expect(Object.isFrozen(V3_TEST_CASES)).toBe(true);
    expect(V3_TEST_CASES.map((testCase) => testCase.group)).toEqual([
      'A', 'A', 'A', 'A', 'A',
      'B', 'B', 'B', 'B', 'B',
      'C', 'C', 'C', 'C', 'C',
    ]);

    for (const testCase of V3_TEST_CASES) {
      expect(testCase.id).toMatch(/^[ABC]-\d{2}$/);
      expect(testCase.question.length).toBeGreaterThan(0);
      expect(testCase.expectedFacts.length).toBeGreaterThan(0);
      expect(testCase.expectedCitations.length).toBeGreaterThan(0);
    }
  });

  it('calculates factual, citation, unsupported, and contradiction rates', async () => {
    const testCase = {
      id: 'A-metrics',
      question: '命宮主星為紫微時，性格如何？',
      expectedFacts: ['紫微', '領導力'],
      expectedCitations: ['star-ziwei', 'palace-ming'],
      group: 'A' as const,
    };
    const model: V3Model = async (question) => {
      expect(question).toBe(testCase.question);
      return {
        text: '紫微帶來領導力 [star-ziwei]。命宮主題是性格 [palace-ming]。這段沒有知識來源。沒有領導力。',
        inputTokens: 17,
        outputTokens: 23,
      };
    };

    await expect(evaluateV3([testCase], model)).resolves.toEqual([
      {
        testCaseId: 'A-metrics',
        inputTokens: 17,
        outputTokens: 23,
        factualAccuracy: 1,
        citationRate: 1,
        unsupportedRate: 0.5,
        contradictionRate: 0.25,
      },
    ]);
  });

  it('does not count a negated fact or an unknown citation as supported evidence', () => {
    const testCase = {
      id: 'A-negated',
      question: '命宮主星為紫微時，性格如何？',
      expectedFacts: ['紫微'],
      expectedCitations: ['star-ziwei'],
      group: 'A' as const,
    };

    expect(calculateV3Metrics(testCase, '不是紫微。[fake-source]')).toEqual({
      factualAccuracy: 0,
      citationRate: 0,
      unsupportedRate: 1,
      contradictionRate: 1,
    });
  });

  it('passes the selected model name and preserves adapter method context', async () => {
    const testCase = V3_TEST_CASES[0];
    class Adapter {
      model = 'test-model';
      calls: Array<[string, string]> = [];

      generate(question: string, modelName: string) {
        this.calls.push([question, modelName]);
        return { text: '[star-ziwei] 紫微', inputTokens: 3, outputTokens: 4 };
      }
    }
    const adapter = new Adapter();

    await evaluateV3([testCase], adapter);

    expect(adapter.calls).toEqual([[testCase.question, 'test-model']]);
  });
});
