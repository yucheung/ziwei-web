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
  // Group A: 命宮主星性格（14 主星 + 4 常見雙星組合）
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
    question: '命宮主星為天同時，個人的性格特質與處事態度為何？',
    expectedFacts: ['天同', '隨和', '享受'],
    expectedCitations: ['palace-ming', 'star-tiantong'],
    group: 'A',
  },
  {
    id: 'A-06',
    question: '命宮主星為廉貞時，性格風格與為人處世特點是什麼？',
    expectedFacts: ['廉貞', '原則', '愛憎分明'],
    expectedCitations: ['palace-ming', 'star-lianzhen'],
    group: 'A',
  },
  {
    id: 'A-07',
    question: '命宮主星為天府時，內在性格與處事風格如何？',
    expectedFacts: ['天府', '穩定', '資源'],
    expectedCitations: ['palace-ming', 'star-tianfu'],
    group: 'A',
  },
  {
    id: 'A-08',
    question: '命宮主星為太陰時，情感特質與心理傾向如何？',
    expectedFacts: ['太陰', '細膩', '內斂'],
    expectedCitations: ['palace-ming', 'star-taiyin'],
    group: 'A',
  },
  {
    id: 'A-09',
    question: '命宮主星為貪狼時，性格特質與慾望驅動力為何？',
    expectedFacts: ['貪狼', '多才多藝', '社交'],
    expectedCitations: ['palace-ming', 'star-tanlang'],
    group: 'A',
  },
  {
    id: 'A-10',
    question: '命宮主星為巨門時，溝通表達與思維模式如何？',
    expectedFacts: ['巨門', '口才', '觀察'],
    expectedCitations: ['palace-ming', 'star-jumen'],
    group: 'A',
  },
  {
    id: 'A-11',
    question: '命宮主星為天相對個人的處事風格與人際態度有何影響？',
    expectedFacts: ['天相', '協調', '謹慎'],
    expectedCitations: ['palace-ming', 'star-tianxiang'],
    group: 'A',
  },
  {
    id: 'A-12',
    question: '命宮主星為天梁時，處事原則與長者風範如何展現？',
    expectedFacts: ['天梁', '庇蔭', '原則'],
    expectedCitations: ['palace-ming', 'star-tianliang'],
    group: 'A',
  },
  {
    id: 'A-13',
    question: '命宮主星為七殺時，性格上的決斷力與行動風格為何？',
    expectedFacts: ['七殺', '果斷', '魄力'],
    expectedCitations: ['palace-ming', 'star-qisha'],
    group: 'A',
  },
  {
    id: 'A-14',
    question: '命宮主星為破軍時，創新突破與變革傾向如何？',
    expectedFacts: ['破軍', '開創', '變革'],
    expectedCitations: ['palace-ming', 'star-pojun'],
    group: 'A',
  },
  {
    id: 'A-15',
    question: '命宮為紫微天府同宮時，個人的格局特質與性格平衡如何？',
    expectedFacts: ['紫微', '天府', '穩重'],
    expectedCitations: ['palace-ming', 'star-ziwei', 'star-tianfu'],
    group: 'A',
  },
  {
    id: 'A-16',
    question: '命宮為廉貞七殺同宮時，行動力與性格張力如何展現？',
    expectedFacts: ['廉貞', '七殺', '衝勁'],
    expectedCitations: ['palace-ming', 'star-lianzhen', 'star-qisha'],
    group: 'A',
  },
  {
    id: 'A-17',
    question: '命宮為武曲七殺同宮時，執行效率與果敢特質為何？',
    expectedFacts: ['武曲', '七殺', '剛毅'],
    expectedCitations: ['palace-ming', 'star-wuqu', 'star-qisha'],
    group: 'A',
  },
  {
    id: 'A-18',
    question: '命宮為太陽太陰同宮（日月同宮）時，內外性格如何協調？',
    expectedFacts: ['太陽', '太陰', '調和'],
    expectedCitations: ['palace-ming', 'star-taiyang', 'star-taiyin'],
    group: 'A',
  },

  // Group B: 宮位主題（官祿、夫妻、財帛、遷移、疾厄、田宅等重點宮位）
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
    id: 'B-06',
    question: '夫妻宮主星為太陰時，感情互動與婚姻需求如何？',
    expectedFacts: ['太陰', '細膩', '安全感'],
    expectedCitations: ['palace-spouse', 'star-taiyin'],
    group: 'B',
  },
  {
    id: 'B-07',
    question: '夫妻宮主星為天相時，伴侶關係中的相處模式如何？',
    expectedFacts: ['天相', '協調', '公平'],
    expectedCitations: ['palace-spouse', 'star-tianxiang'],
    group: 'B',
  },
  {
    id: 'B-08',
    question: '夫妻宮主星為貪狼時，感情吸引力與互動特質是什麼？',
    expectedFacts: ['貪狼', '魅力', '互動'],
    expectedCitations: ['palace-spouse', 'star-tanlang'],
    group: 'B',
  },
  {
    id: 'B-09',
    question: '夫妻宮主星為七殺時，婚姻關係中的獨立與磨合如何？',
    expectedFacts: ['七殺', '獨立', '果斷'],
    expectedCitations: ['palace-spouse', 'star-qisha'],
    group: 'B',
  },
  {
    id: 'B-10',
    question: '財帛宮主星為武曲時，求財模式與理財風格為何？',
    expectedFacts: ['武曲', '求財', '務實'],
    expectedCitations: ['palace-wealth', 'star-wuqu'],
    group: 'B',
  },
  {
    id: 'B-11',
    question: '財帛宮主星為天府時，資產守成與財富累積特點是什麼？',
    expectedFacts: ['天府', '積蓄', '穩健'],
    expectedCitations: ['palace-wealth', 'star-tianfu'],
    group: 'B',
  },
  {
    id: 'B-12',
    question: '財帛宮主星為太陰時，財務規劃與資金流動傾向如何？',
    expectedFacts: ['太陰', '積累', '長遠'],
    expectedCitations: ['palace-wealth', 'star-taiyin'],
    group: 'B',
  },
  {
    id: 'B-13',
    question: '遷移宮主星為天機時，外出適應力與外部際遇如何？',
    expectedFacts: ['天機', '適應', '出外'],
    expectedCitations: ['palace-migration', 'star-tianji'],
    group: 'B',
  },
  {
    id: 'B-14',
    question: '遷移宮主星為太陽時，在外部環境的能見度與拓展性如何？',
    expectedFacts: ['太陽', '拓展', '名聲'],
    expectedCitations: ['palace-migration', 'star-taiyang'],
    group: 'B',
  },
  {
    id: 'B-15',
    question: '疾厄宮主星為巨門時，身心健康與生活調理需注意何處？',
    expectedFacts: ['巨門', '呼吸', '消化'],
    expectedCitations: ['palace-health', 'star-jumen'],
    group: 'B',
  },
  {
    id: 'B-16',
    question: '疾厄宮主星為天梁時，健康體質與復原力特點為何？',
    expectedFacts: ['天梁', '解厄', '保養'],
    expectedCitations: ['palace-health', 'star-tianliang'],
    group: 'B',
  },
  {
    id: 'B-17',
    question: '田宅宮主星為紫微時，居家環境與不動產置產傾向如何？',
    expectedFacts: ['紫微', '家宅', '不動產'],
    expectedCitations: ['palace-property', 'star-ziwei'],
    group: 'B',
  },
  {
    id: 'B-18',
    question: '田宅宮主星為太陰時，家庭氛圍與房地產購置考量是什麼？',
    expectedFacts: ['太陰', '溫馨', '置產'],
    expectedCitations: ['palace-property', 'star-taiyin'],
    group: 'B',
  },

  // Group C: 運限/四化/綜合（大限、流年、生年四化、三方四正綜合判斷）
  {
    id: 'C-01',
    question: '武曲在財帛宮化祿時，對財務進帳與事業收益有何影響？',
    expectedFacts: ['武曲', '化祿', '財源'],
    expectedCitations: ['palace-wealth', 'star-wuqu'],
    group: 'C',
  },
  {
    id: 'C-02',
    question: '破軍在官祿宮化權時，在職場開創與決策主導上的表現為何？',
    expectedFacts: ['破軍', '化權', '去舊換新'],
    expectedCitations: ['palace-career', 'star-pojun'],
    group: 'C',
  },
  {
    id: 'C-03',
    question: '天梁在命宮化科時，個人的名譽聲望與貴人化解能力如何？',
    expectedFacts: ['天梁', '化科', '逢凶化吉'],
    expectedCitations: ['palace-ming', 'star-tianliang'],
    group: 'C',
  },
  {
    id: 'C-04',
    question: '天機在命宮化忌時，心理思慮與處事應變需注意什麼？',
    expectedFacts: ['天機', '化忌', '鑽牛角尖'],
    expectedCitations: ['palace-ming', 'star-tianji'],
    group: 'C',
  },
  {
    id: 'C-05',
    question: '財帛宮逢祿存且會照化祿時，財富結構與資產穩定度如何？',
    expectedFacts: ['祿存', '化祿', '豐厚'],
    expectedCitations: ['palace-wealth', 'star-lucun'],
    group: 'C',
  },
  {
    id: 'C-06',
    question: '命宮廉貞逢擎羊同度時，性格衝突與情緒管理有何考驗？',
    expectedFacts: ['廉貞', '擎羊', '衝動'],
    expectedCitations: ['palace-ming', 'star-lianzhen', 'star-qingyang'],
    group: 'C',
  },
  {
    id: 'C-07',
    question: '行運大限進入官祿宮且主星為紫微時，該十年的事業格局與承擔如何？',
    expectedFacts: ['紫微', '大限', '獨當一面'],
    expectedCitations: ['palace-career', 'star-ziwei'],
    group: 'C',
  },
  {
    id: 'C-08',
    question: '大限命宮行至破軍坐守之宮位時，人生變革與開拓轉折為何？',
    expectedFacts: ['破軍', '大限', '大破大立'],
    expectedCitations: ['palace-ming', 'star-pojun'],
    group: 'C',
  },
  {
    id: 'C-09',
    question: '大限夫妻宮走入貪狼坐守之位時，感情發展與人際社交有何變化？',
    expectedFacts: ['貪狼', '大限', '桃花'],
    expectedCitations: ['palace-spouse', 'star-tanlang'],
    group: 'C',
  },
  {
    id: 'C-10',
    question: '大限財帛宮見武曲天府同宮時，該階段的資金累積與投資取向如何？',
    expectedFacts: ['武曲', '天府', '財富'],
    expectedCitations: ['palace-wealth', 'star-wuqu', 'star-tianfu'],
    group: 'C',
  },
  {
    id: 'C-11',
    question: '流年命宮行至天同坐守時，該年度的心境調節與生活節奏如何？',
    expectedFacts: ['天同', '流年', '調適'],
    expectedCitations: ['palace-ming', 'star-tiantong'],
    group: 'C',
  },
  {
    id: 'C-12',
    question: '流年官祿宮逢太陽化祿時，當年度的工作表現與能見度如何？',
    expectedFacts: ['太陽', '化祿', '展現'],
    expectedCitations: ['palace-career', 'star-taiyang'],
    group: 'C',
  },
  {
    id: 'C-13',
    question: '流年遷移宮逢天機坐守時，外出走動、出差或變動機會如何？',
    expectedFacts: ['天機', '流年', '奔波'],
    expectedCitations: ['palace-migration', 'star-tianji'],
    group: 'C',
  },
  {
    id: 'C-14',
    question: '命宮三方四正會照左輔、右弼時，外在助力與團隊合作優勢為何？',
    expectedFacts: ['左輔', '右弼', '貴人扶持'],
    expectedCitations: ['palace-ming', 'star-zuofu', 'star-youbi'],
    group: 'C',
  },
  {
    id: 'C-15',
    question: '官祿宮三方四正會照文昌、文曲時，學術考試與專業發揮如何？',
    expectedFacts: ['文昌', '文曲', '才華'],
    expectedCitations: ['palace-career', 'star-wenchang', 'star-wenqu'],
    group: 'C',
  },
  {
    id: 'C-16',
    question: '財帛宮三方四正會見天魁、天鉞時，求財過程中的貴人提攜機會如何？',
    expectedFacts: ['天魁', '天鉞', '機遇'],
    expectedCitations: ['palace-wealth', 'star-tiankui', 'star-tianyue'],
    group: 'C',
  },
  {
    id: 'C-17',
    question: '命宮三方四正見火星、鈴星會照時，情緒爆發與突發波折需如何防範？',
    expectedFacts: ['火星', '鈴星', '急躁'],
    expectedCitations: ['palace-ming', 'star-huoxing', 'star-lingxing'],
    group: 'C',
  },
  {
    id: 'C-18',
    question: '命宮太陰與遷移宮太陽本對宮交會時，內在情感與外在展現如何平衡？',
    expectedFacts: ['太陰', '太陽', '剛柔並濟'],
    expectedCitations: ['palace-ming', 'palace-migration', 'star-taiyin', 'star-taiyang'],
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
