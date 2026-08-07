/** Fixed model name used by the V3 evaluation set. The adapter is injectable so
 * unit tests and offline runs do not need to make a network request. */
export const DEFAULT_V3_MODEL = 'gpt-5.6-luna';

export type V3Group = 'A' | 'B' | 'C';

export interface V3TestCase {
  id: string;
  question: string;
  expectedFacts: string[];
  expectedCitations: string[];
  group: V3Group;
}

export interface V3Result {
  testCaseId: string;
  inputTokens: number;
  outputTokens: number;
  factualAccuracy: number;
  citationRate: number;
  unsupportedRate: number;
  contradictionRate: number;
}

export interface V3ModelResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export type V3ModelRunner = (question: string, modelName: string) => V3ModelResponse | Promise<V3ModelResponse>;

/**
 * A transport-neutral model adapter. `generate` is the preferred method;
 * `run` and `complete` are accepted to make adapters for existing clients
 * easy to pass into the evaluator.
 */
export interface V3ModelAdapter {
  model?: string;
  generate?: V3ModelRunner;
  run?: V3ModelRunner;
  complete?: V3ModelRunner;
}

export type V3Model = V3ModelRunner | V3ModelAdapter;

const V3_TEST_CASES: readonly V3TestCase[] = Object.freeze([
  {
    id: 'A-01',
    question: '命宮主星為紫微時，基本性格與人生主軸如何？',
    expectedFacts: ['紫微', '領導', '責任感'],
    expectedCitations: ['palace-ming', 'star-ziwei'],
    group: 'A',
  },
  {
    id: 'A-02',
    question: '命宮主星為天機時，性格上的思考與行動特質是什麼？',
    expectedFacts: ['天機', '思考', '變通'],
    expectedCitations: ['palace-ming', 'star-tianji'],
    group: 'A',
  },
  {
    id: 'A-03',
    question: '命宮主星為太陽時，基本性格如何展現？',
    expectedFacts: ['太陽', '主動', '照顧'],
    expectedCitations: ['palace-ming', 'star-taiyang'],
    group: 'A',
  },
  {
    id: 'A-04',
    question: '命宮主星為武曲時，個人的性格優勢與盲點是什麼？',
    expectedFacts: ['武曲', '執行力', '務實'],
    expectedCitations: ['palace-ming', 'star-wuqu'],
    group: 'A',
  },
  {
    id: 'A-05',
    question: '命宮主星為天府時，內在性格與處事風格如何？',
    expectedFacts: ['天府', '穩定', '資源'],
    expectedCitations: ['palace-ming', 'star-tianfu'],
    group: 'A',
  },
  {
    id: 'B-01',
    question: '官祿宮主星為武曲時，事業發展與工作表現如何？',
    expectedFacts: ['武曲', '執行力', '財務'],
    expectedCitations: ['palace-career', 'star-wuqu'],
    group: 'B',
  },
  {
    id: 'B-02',
    question: '官祿宮主星為天府時，適合如何累積事業資源？',
    expectedFacts: ['天府', '穩健', '管理'],
    expectedCitations: ['palace-career', 'star-tianfu'],
    group: 'B',
  },
  {
    id: 'B-03',
    question: '官祿宮主星為廉貞時，職場責任與發展趨勢是什麼？',
    expectedFacts: ['廉貞', '原則', '管理'],
    expectedCitations: ['palace-career', 'star-lianzhen'],
    group: 'B',
  },
  {
    id: 'B-04',
    question: '官祿宮主星為天機時，工作規劃與職涯變化如何？',
    expectedFacts: ['天機', '規劃', '變化'],
    expectedCitations: ['palace-career', 'star-tianji'],
    group: 'B',
  },
  {
    id: 'B-05',
    question: '官祿宮主星為太陽時，事業中的承擔與發揮方式是什麼？',
    expectedFacts: ['太陽', '主動', '承擔'],
    expectedCitations: ['palace-career', 'star-taiyang'],
    group: 'B',
  },
  {
    id: 'C-01',
    question: '夫妻宮主星為太陰時，感情互動與婚姻需求如何？',
    expectedFacts: ['太陰', '細膩', '安全感'],
    expectedCitations: ['palace-spouse', 'star-taiyin'],
    group: 'C',
  },
  {
    id: 'C-02',
    question: '夫妻宮主星為天相時，伴侶關係中的相處模式如何？',
    expectedFacts: ['天相', '協調', '公平'],
    expectedCitations: ['palace-spouse', 'star-tianxiang'],
    group: 'C',
  },
  {
    id: 'C-03',
    question: '夫妻宮主星為天同時，感情中的親密與承諾如何經營？',
    expectedFacts: ['天同', '包容', '享受'],
    expectedCitations: ['palace-spouse', 'star-tiantong'],
    group: 'C',
  },
  {
    id: 'C-04',
    question: '夫妻宮主星為貪狼時，感情吸引力與互動特質是什麼？',
    expectedFacts: ['貪狼', '魅力', '互動'],
    expectedCitations: ['palace-spouse', 'star-tanlang'],
    group: 'C',
  },
  {
    id: 'C-05',
    question: '夫妻宮主星為七殺時，婚姻關係中的獨立與磨合如何？',
    expectedFacts: ['七殺', '獨立', '果斷'],
    expectedCitations: ['palace-spouse', 'star-qisha'],
    group: 'C',
  },
]);

export { V3_TEST_CASES };

function normalizeForMatch(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/gu, '');
}

function hitRate(values: string[], formatHit: (value: string) => boolean): number {
  if (values.length === 0) return 0;
  return values.filter(formatHit).length / values.length;
}

function splitStatements(output: string): string[] {
  return output
    .split(/(?:[。！？!?；;]+\s*(?!\[[a-z0-9][a-z0-9_-]*\])|\n+)/iu)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const NEGATION_PREFIXES = ['不是', '並非', '沒有', '無', '缺乏', '欠缺', '不具備', '不具', '不'];

function hasNegatedFact(statement: string, fact: string): boolean {
  let factIndex = statement.indexOf(fact);
  while (factIndex >= 0) {
    const precedingText = statement.slice(Math.max(0, factIndex - 5), factIndex);
    if (NEGATION_PREFIXES.some((prefix) => precedingText.endsWith(prefix))) return true;
    factIndex = statement.indexOf(fact, factIndex + fact.length);
  }
  return false;
}

function hasExpectedCitationMarker(statement: string, expectedCitations: string[]): boolean {
  return expectedCitations.some((citation) => statement.includes(`[${normalizeForMatch(citation)}]`));
}

function contradictsExpectedFact(statement: string, expectedFacts: string[]): boolean {
  const normalizedStatement = normalizeForMatch(statement);
  return expectedFacts.some((fact) => hasNegatedFact(normalizedStatement, normalizeForMatch(fact)));
}

/** Calculate deterministic text metrics for one V3 model response. */
export function calculateV3Metrics(
  testCase: V3TestCase,
  responseText: string
): Pick<V3Result, 'factualAccuracy' | 'citationRate' | 'unsupportedRate' | 'contradictionRate'> {
  const normalizedOutput = normalizeForMatch(responseText);
  const statements = splitStatements(responseText);
  const factualAccuracy = hitRate(testCase.expectedFacts, (fact) => {
    const normalizedFact = normalizeForMatch(fact);
    return statements.some((statement) => {
      const normalizedStatement = normalizeForMatch(statement);
      return normalizedStatement.includes(normalizedFact) && !hasNegatedFact(normalizedStatement, normalizedFact);
    });
  });
  const citationRate = hitRate(testCase.expectedCitations, (citation) =>
    normalizedOutput.includes(`[${normalizeForMatch(citation)}]`)
  );
  const unsupportedRate = statements.length === 0
    ? 0
    : statements.filter((statement) => !hasExpectedCitationMarker(normalizeForMatch(statement), testCase.expectedCitations)).length /
      statements.length;
  const contradictionRate = statements.length === 0
    ? 0
    : statements.filter((statement) => contradictsExpectedFact(statement, testCase.expectedFacts)).length / statements.length;

  return { factualAccuracy, citationRate, unsupportedRate, contradictionRate };
}

function getModelRunner(model: V3Model): { run: V3ModelRunner; modelName: string } {
  if (typeof model === 'function') return { run: model, modelName: DEFAULT_V3_MODEL };
  if (model.generate) return { run: model.generate.bind(model), modelName: model.model ?? DEFAULT_V3_MODEL };
  if (model.run) return { run: model.run.bind(model), modelName: model.model ?? DEFAULT_V3_MODEL };
  if (model.complete) return { run: model.complete.bind(model), modelName: model.model ?? DEFAULT_V3_MODEL };
  throw new Error('V3 model adapter must provide generate, run, or complete');
}

/**
 * Evaluate fixed V3 questions against an injected model adapter.
 *
 * The model adapter owns transport, authentication, and tokenizer usage
 * reporting; the evaluator passes its selected model name to each call. This
 * keeps the evaluator deterministic and makes `DEFAULT_V3_MODEL` explicit and
 * configurable.
 */
export async function evaluateV3(testCases: V3TestCase[], model: V3Model): Promise<V3Result[]> {
  const { run: runModel, modelName } = getModelRunner(model);
  const results: V3Result[] = [];

  for (const testCase of testCases) {
    const response = await runModel(testCase.question, modelName);
    const metrics = calculateV3Metrics(testCase, response.text);
    results.push({
      testCaseId: testCase.id,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      ...metrics,
    });
  }

  return results;
}
