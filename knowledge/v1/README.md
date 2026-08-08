# Knowledge v1 research layer

This directory is the source-first research boundary for Zi Wei Dou Shu knowledge. It is intentionally separate from `src/`: application code must not import these JSONL files directly.

## Repository layout

- `sources/sources.jsonl`: one edition or access manifestation per `SourceRecord`.
- `claims/pilot-3stars.jsonl`: atomic, independently reviewable assertions.
- `rules/pilot-3stars.jsonl`: deterministic typed predicates linked to claim IDs.
- `reviews/pilot-3stars.jsonl`: append-only validator, model, and human decisions.
- `schemas/`: JSON Schema Draft 2020-12 record contracts.
- `tools/`: deterministic loaders, validators, tests, and negative fixtures.

The four production JSONL files stay empty until Pilot v2 research begins. The legacy files under `docs/research/` are failed-pilot evidence and are never migrated by relabeling.

## Source policy

The cited edition and exact page or image locator are the source of record; a website is only an access channel.

| Tier | Evidence | Formal use |
|---|---|---|
| A | Institutional or academic facsimile | Eligible after page-level verification |
| B | Corrected transcription linked to a facsimile | Eligible after transcription-to-image verification |
| C | Searchable transcription without a verifiable image | Research candidate only |
| D | Partial preview or bibliographic record | Corroboration only |
| E | Blog, unattributed OCR/PDF, repost, or code repository | Discovery lead only |

Modern books without an inspectable, legally accessible page cannot support a `human_approved` claim. Classical material defaults to `tradition: classical_ziwei`, `school: unclassified`, and `schoolAttribution: not_explicit_in_source`.

## Lifecycle and authority

Records progress from candidate/draft through source verification and independent review. Schema validity is not evidence of truth. Only the latest passing human review with all applicable checklist items marked `pass` can authorize `human_approved` status. Model reviews can identify risks but cannot approve a claim or rule.

Human-approved claims require direct, facsimile-checked evidence from a verified Tier A or B source. Prompt-eligible rules can reference only human-approved, prompt-eligible claims.

## Sensitive historical content

Historical claims about longevity, disease, disability, gender roles, deterministic family harm, or fatalism remain available for research fidelity but use `sensitivityLevel: restricted` and `promptEligible: false`. A separate, sourced, human-approved modern interpretation is required before any safe product use; the original historical record remains unchanged.

## Commands

```bash
npm run knowledge:validate
npm test -- knowledge/v1/tools
```

Validation is offline and deterministic. It never fetches URLs; reviewers record source accessibility and quotation matching explicitly.
