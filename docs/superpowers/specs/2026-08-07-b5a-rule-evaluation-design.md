# B5a Rule Evaluation Design

## Goal

Add the first deterministic B5 rule-evaluation layer for four transformations and
三合派 patterns. The public evaluators return only rules that matched the
`AnalyzedChart`; `RuleResult.matched` remains in the result shape and is always
`true` for returned values.

## Public API

```ts
evaluateFourTransformations(chart: AnalyzedChart): RuleResult[]
evaluatePatterns(chart: AnalyzedChart): PatternResult[]
getRuleResults(chart: AnalyzedChart): RuleResult[]
```

`getRuleResults` concatenates the two evaluators, removes duplicate `ruleId`
values, and sorts by descending confidence. No non-matching rule is returned.

## Rule data and provenance

Rules are static TypeScript data with `school: 'sanhe'` and
`ruleSetVersion: 'sanhe-v1'`. Four transformations use the 14 B4 major-star
knowledge entries and expose 56 base rules (14 stars × 4 transformations).
Patterns use the same canonical `star-*` and `palace-*` knowledge IDs. Every
matched condition emits evidence containing `knowledgeId`, source field path,
source, observed value, and a human-readable reasoning string.

## Chart facts and year stem

The B3 chart contract intentionally has no `yearStem` field. The evaluator
recovers it in this order:

1. Match the complete source mutagen set against the existing ten-stem table
   when available.
2. Derive the heavenly stem from the Gregorian year in `birthData.date`.
3. Use the first palace's `heavenlyStem` as a deterministic fixture fallback.

Source mutagen markers are authoritative for an individual star. The evaluator
also accepts zh-CN display strings by canonicalizing stars, palaces, branches,
and mutagens before applying predicates.

## Pattern scope

The v1 pattern catalog includes branch-position rules for the 紫微 and 天府
systems, common same-palace combinations, 三方四正 combinations, and 命宮
system rules. Pattern detection is structural only; interpretation text is
stored as static conclusions and no LLM or probabilistic inference is used.

## Testing

Tests cover the 56-rule catalog, year-stem/source-mutagen matching, evidence
paths and IDs, non-matching exclusion, representative pattern predicates,
engine deduplication/sorting, and a real `getChart()` → `analyzeChart()` →
`getRuleResults()` integration path.
