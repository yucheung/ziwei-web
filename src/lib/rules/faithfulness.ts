import { toCanonicalKey, translateKey } from '../chartModel';
import { getAllStarKnowledge } from '../starKnowledge';
import type { Evidence, RuleResult } from './types';

export interface FaithfulnessResult {
  ruleId: string;
  llmClaim: string;
  ruleConclusion: string;
  faithful: boolean;
  evidence: Evidence[];
}

type ClaimKind = 'transformation' | 'palace' | 'pattern' | 'fortune' | 'rule';
type RuleLike = RuleResult & {
  periodLabel?: string;
  periodType?: 'decadal' | 'annual' | 'monthly';
  palace?: string;
};

interface Claim {
  kind: ClaimKind;
  text: string;
  start: number;
  stars: string[];
  mutagen?: string;
  palace?: string;
  periodLabel?: string;
  ruleId?: string;
}

interface RuleFacts {
  result: RuleLike;
  stars: Set<string>;
  mutagens: Set<string>;
  palaces: Set<string>;
  periodLabel?: string;
}

const PALACE_NAMES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
const STAR_NAMES = getAllStarKnowledge()
  .map((entry) => entry.starName)
  .sort((left, right) => right.length - left.length || left.localeCompare(right));

function displayVariants(value: string, category: 'star' | 'palace' | 'mutagen'): string[] {
  return [...new Set([value, translateKey(value, category, 'zh-CN')])];
}

function findOccurrences(
  text: string,
  values: string[],
  category: 'star' | 'palace' | 'mutagen'
): Array<{ value: string; start: number; end: number }> {
  const occurrences: Array<{ value: string; start: number; end: number }> = [];
  for (const value of values) {
    for (const display of displayVariants(value, category)) {
      let start = text.indexOf(display);
      while (start >= 0) {
        occurrences.push({ value, start, end: start + display.length });
        start = text.indexOf(display, start + display.length);
      }
    }
  }

  return occurrences
    .sort((left, right) => left.start - right.start || right.end - left.end || left.value.localeCompare(right.value))
    .filter((occurrence, index, all) =>
      index === 0
      || all[index - 1]?.start !== occurrence.start
      || all[index - 1]?.end !== occurrence.end
      || all[index - 1]?.value !== occurrence.value
    );
}

function clauseAt(text: string, index: number): string {
  const boundaries = ['。', '！', '？', '!', '?', '；', ';', '\n'];
  const previous = Math.max(...boundaries.map((boundary) => text.lastIndexOf(boundary, index - 1)), -1);
  const next = boundaries
    .map((boundary) => text.indexOf(boundary, index))
    .filter((position) => position >= 0)
    .sort((left, right) => left - right)[0];
  return text.slice(previous + 1, next === undefined ? text.length : next + 1).trim();
}

function parseMutagenAfter(text: string, end: number): string | undefined {
  const suffix = text.slice(end).match(/^\s*化?\s*([祿禄權权科忌])/u)?.[1];
  if (!suffix) return undefined;
  return toCanonicalKey(suffix, 'mutagen', 'zh-CN');
}

function palaceInText(text: string): string | undefined {
  const occurrence = findOccurrences(text, PALACE_NAMES, 'palace')[0];
  return occurrence ? toCanonicalKey(occurrence.value, 'palace', 'zh-TW') : undefined;
}

function normalizedText(text: string): string {
  let normalized = text;
  for (const starName of STAR_NAMES) {
    for (const display of displayVariants(starName, 'star')) normalized = normalized.split(display).join(starName);
  }
  for (const palaceName of PALACE_NAMES) {
    for (const display of displayVariants(palaceName, 'palace')) normalized = normalized.split(display).join(palaceName);
  }
  for (const mutagen of ['祿', '權', '科', '忌']) {
    for (const display of displayVariants(mutagen, 'mutagen')) normalized = normalized.split(display).join(mutagen);
  }
  return normalized.replace(/\s+/gu, '');
}

function addClaim(claims: Claim[], claim: Claim): void {
  const key = [
    claim.kind,
    claim.text,
    claim.ruleId ?? '',
    claim.stars.join(','),
    claim.mutagen ?? '',
    claim.palace ?? '',
    claim.periodLabel ?? '',
  ].join('|');
  const duplicate = claims.some((existing) => [
    existing.kind,
    existing.text,
    existing.ruleId ?? '',
    existing.stars.join(','),
    existing.mutagen ?? '',
    existing.palace ?? '',
    existing.periodLabel ?? '',
  ].join('|') === key);
  if (!duplicate) claims.push(claim);
}

function parseClaims(llmOutput: string, ruleResults: RuleLike[]): Claim[] {
  const claims: Claim[] = [];
  const starOccurrences = findOccurrences(llmOutput, STAR_NAMES, 'star');

  for (const occurrence of starOccurrences) {
    const text = clauseAt(llmOutput, occurrence.start);
    const mutagen = parseMutagenAfter(llmOutput, occurrence.end);
    const palace = palaceInText(text);
    if (mutagen) {
      addClaim(claims, {
        kind: 'transformation', text, start: occurrence.start, stars: [occurrence.value], mutagen, palace,
      });
    } else if (palace) {
      addClaim(claims, { kind: 'palace', text, start: occurrence.start, stars: [occurrence.value], palace });
    }
  }

  const clauses = llmOutput
    .split(/(?<=[。！？!?；;\n])/u)
    .map((text) => text.trim())
    .filter(Boolean);
  for (const text of clauses) {
    const start = llmOutput.indexOf(text);
    const stars = [...new Set(findOccurrences(text, STAR_NAMES, 'star').map((occurrence) => occurrence.value))];
    if (stars.length >= 2 && /(同宮|同宫|三方|四正|夾|夹|格)/u.test(text)) {
      addClaim(claims, { kind: 'pattern', text, start, stars, palace: palaceInText(text) });
    }
  }

  for (const result of ruleResults) {
    const ruleName = result.ruleName;
    const normalizedRuleName = normalizedText(ruleName);
    if (normalizedText(llmOutput).includes(normalizedRuleName)) {
      const start = normalizedText(llmOutput).indexOf(normalizedRuleName);
      const sentence = clauseAt(llmOutput, start);
      const hasStructuredClaim = findOccurrences(sentence, STAR_NAMES, 'star').length > 0;
      if (!hasStructuredClaim) {
        addClaim(claims, { kind: 'rule', text: sentence, start, stars: [], ruleId: result.ruleId });
      }
    }

    if (result.periodLabel) {
      const start = llmOutput.indexOf(result.periodLabel);
      if (start >= 0) {
        addClaim(claims, {
          kind: 'fortune',
          text: clauseAt(llmOutput, start),
          start,
          stars: [],
          periodLabel: result.periodLabel,
        });
      }
    }
  }

  const periodLabels = llmOutput.match(/(?:大限\s*\d+\s*[-～至]\s*\d+|流年\s*\d{4}|流月\s*[子丑寅卯辰巳午未申酉戌亥\w]+月)/gu) ?? [];
  for (const periodLabel of periodLabels) {
    const start = llmOutput.indexOf(periodLabel);
    addClaim(claims, { kind: 'fortune', text: clauseAt(llmOutput, start), start, stars: [], periodLabel: periodLabel.replace(/\s+/gu, ' ') });
  }

  return claims.sort((left, right) => left.start - right.start || left.kind.localeCompare(right.kind));
}

function factsFor(result: RuleLike): RuleFacts {
  const texts = [result.ruleName, ...result.evidence.flatMap((item) => [item.value, item.field, item.reasoning])];
  const stars = new Set<string>();
  const mutagens = new Set<string>();
  const palaces = new Set<string>();

  for (const text of texts) {
    for (const occurrence of findOccurrences(text, STAR_NAMES, 'star')) {
      stars.add(occurrence.value);
      const mutagen = parseMutagenAfter(text, occurrence.end);
      if (mutagen) mutagens.add(mutagen);
    }
    for (const occurrence of findOccurrences(text, PALACE_NAMES, 'palace')) {
      palaces.add(toCanonicalKey(occurrence.value, 'palace', 'zh-TW'));
    }
  }

  if (result.palace) palaces.add(toCanonicalKey(result.palace, 'palace', 'zh-TW'));

  return {
    result,
    stars,
    mutagens,
    palaces,
    periodLabel: result.periodLabel,
  };
}

function compatiblePalace(claim: Claim, facts: RuleFacts): boolean {
  return !claim.palace || facts.palaces.has(claim.palace);
}

function exactMatch(claim: Claim, facts: RuleFacts): boolean {
  if (claim.ruleId) return claim.ruleId === facts.result.ruleId;
  if (claim.kind === 'transformation') {
    return facts.stars.has(claim.stars[0] ?? '')
      && facts.mutagens.has(claim.mutagen ?? '')
      && compatiblePalace(claim, facts);
  }
  if (claim.kind === 'palace') {
    return facts.stars.has(claim.stars[0] ?? '') && compatiblePalace(claim, facts);
  }
  if (claim.kind === 'pattern') {
    return claim.stars.every((starName) => facts.stars.has(starName)) && compatiblePalace(claim, facts);
  }
  if (claim.kind === 'fortune') {
    return Boolean(facts.periodLabel && claim.periodLabel && facts.periodLabel.replace(/\s+/gu, '') === claim.periodLabel.replace(/\s+/gu, ''));
  }
  return false;
}

function contradictionMatch(claim: Claim, facts: RuleFacts): boolean {
  if (claim.kind === 'transformation') {
    return facts.stars.has(claim.stars[0] ?? '')
      && facts.mutagens.size > 0
      && !facts.mutagens.has(claim.mutagen ?? '')
      && compatiblePalace(claim, facts);
  }
  if (claim.kind === 'palace') {
    return facts.stars.has(claim.stars[0] ?? '')
      && facts.palaces.size > 0
      && !facts.palaces.has(claim.palace ?? '');
  }
  return false;
}

function conclusionFor(facts: RuleFacts): string {
  const context = [facts.periodLabel, facts.result.palace].filter(Boolean);
  return context.length > 0 ? `${facts.result.ruleName}（${context.join('，')}）` : facts.result.ruleName;
}

function unsupportedRuleId(claim: Claim): string {
  const input = `${claim.kind}|${claim.text}|${claim.stars.join(',')}|${claim.mutagen ?? ''}|${claim.palace ?? ''}|${claim.periodLabel ?? ''}`;
  let hash = 0;
  for (const character of input) hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  return `unsupported-${hash.toString(16)}`;
}

/** Compare explicit model claims with deterministic rule conclusions and evidence. */
export function compareFaithfulness(llmOutput: string, ruleResults: RuleResult[]): FaithfulnessResult[] {
  const matchedResults = ruleResults.filter((result) => result.matched).map((result) => result as RuleLike);
  const facts = matchedResults.map(factsFor);
  const claims = parseClaims(llmOutput, matchedResults);

  return claims.map((claim): FaithfulnessResult => {
    const faithful = facts.find((candidate) => exactMatch(claim, candidate));
    if (faithful) {
      return {
        ruleId: faithful.result.ruleId,
        llmClaim: claim.text,
        ruleConclusion: conclusionFor(faithful),
        faithful: true,
        evidence: [...faithful.result.evidence],
      };
    }

    const contradiction = facts.find((candidate) => contradictionMatch(claim, candidate));
    if (contradiction) {
      return {
        ruleId: contradiction.result.ruleId,
        llmClaim: claim.text,
        ruleConclusion: conclusionFor(contradiction),
        faithful: false,
        evidence: [...contradiction.result.evidence],
      };
    }

    return {
      ruleId: unsupportedRuleId(claim),
      llmClaim: claim.text,
      ruleConclusion: `沒有規則支持：${claim.text}`,
      faithful: false,
      evidence: [],
    };
  });
}
