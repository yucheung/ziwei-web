# B8a Rules and Citation Provenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Feed the evaluated matched rules into the main LLM reading and persist them, while upgrading star and citation provenance to structured, conservatively scored sources.

**Architecture:** `App` computes one `RuleResult[]` snapshot and passes it to `ReadingPanel`; the panel gives the same array to the prompt builder and stores it with completed readings. `KnowledgeSource` is exported from the star knowledge module, star entries use structured sources, and `citationTracer` normalizes legacy palace source strings before calculating numeric confidence and exposing the structured source to consumers.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, Vite, iztro 2.5.8.

## Global Constraints

- i18n additions must have zh-TW and zh-CN wording; canonical rule/evidence names remain zh-TW data.
- Keep the existing `RuleResult` API unchanged.
- Only matched rules are included in the main reading system prompt; unmatched rules are excluded.
- `StoredReading.rules` receives the evaluated `RuleResult[]` for the same chart without recomputation or filtering.
- Storage read boundaries normalize legacy/malformed rule arrays by retaining valid `RuleResult` entries and dropping invalid entries.
- `KnowledgeSource` has `library`, optional `reference`/`excerpt`/`page`/`reviewedAt`, `reviewedBy: 'human' | 'opus' | null`, and the five-state `status` union.
- Legacy string sources normalize to `KnowledgeSource`; unknown or unreviewed sources never receive confidence above `0.5`.
- Use `npm test` for Vitest and `npm run build` for compilation/build verification.

---

### Task 1: Main reading rule grounding and persistence

**Files:**
- Modify: `src/lib/prompts.ts`
- Modify: `src/components/ReadingPanel.tsx`
- Modify: `src/lib/storage.ts`
- Modify: `src/App.tsx`
- Test: `src/lib/prompts.test.ts`
- Test: `src/components/ReadingPanel.test.tsx`
- Test: `src/App.integration.test.tsx`
- Test: `src/lib/storage.test.ts` and `src/components/HistoryPanel.test.tsx` when the stricter stored rule type requires fixture updates

**Interfaces:**
- `PromptOptions.rules?: RuleResult[]`
- `ReadingPanelProps.rules?: RuleResult[]`
- `StoredReading.rules: RuleResult[]`

- [ ] **Step 1: Write failing prompt, App, and storage tests**

  Add a prompt case with one matched and one unmatched `RuleResult`; assert the system prompt contains the matched rule name, evidence value/reasoning, and numeric confidence, excludes the unmatched rule, and includes both language-specific grounding instructions. Add a real App integration case that renders `ReadingPanel`, captures the LLM messages after opening the reading tab and generating a reading, and proves the evaluated rules reach the main prompt. Update storage fixtures to use real `RuleResult` values where required and add a legacy-shaped record case.

- [ ] **Step 2: Run the focused tests to verify they fail for the missing behavior**

  Run `npm test -- src/lib/prompts.test.ts src/App.integration.test.tsx src/lib/storage.test.ts` and confirm the new assertions fail because `rules` is not part of the prompt/props yet.

- [ ] **Step 3: Implement the minimal rule flow**

  Filter `options.rules` by `matched`, serialize only rule name, concise evidence key points, and confidence into a localized system-prompt section, and instruct the model to treat only those rules as certain and mark rule-external claims uncertain. Pass `ruleResults` to `ReadingPanel`, pass the prop to `buildReadingPrompt`, save the same `RuleResult[]` in `StoredReading.rules` after a completed response, and normalize legacy stored readings at the storage boundary.

- [ ] **Step 4: Add the ReadingPanel persistence regression test and make the focused suite green**

  Mock the stream completion and assert `saveReading` receives the supplied rules unchanged. Run `npm test -- src/lib/prompts.test.ts src/components/ReadingPanel.test.tsx src/App.integration.test.tsx src/lib/storage.test.ts`.

- [ ] **Step 5: Commit**

  `git add src/App.tsx src/components/ReadingPanel.tsx src/components/ReadingPanel.test.tsx src/App.integration.test.tsx src/lib/prompts.ts src/lib/prompts.test.ts src/lib/storage.ts src/lib/storage.test.ts src/components/HistoryPanel.test.tsx && git commit -m "feat: ground main readings in matched rules"`

### Task 2: Structured knowledge sources and conservative citations

**Files:**
- Modify: `src/lib/starKnowledge.ts`
- Modify: `src/lib/citationTracer.ts`
- Modify: `src/lib/prompts.ts` and `src/lib/specialTopics.ts` to render `source.library`
- Modify: `src/components/SpecialTopicPanel.tsx` to render structured source data
- Modify: `src/lib/__snapshots__/prompts.test.ts.snap` for numeric confidence output
- Test: `src/lib/starKnowledge.test.ts`
- Test: `src/lib/citationTracer.test.ts`
- Test: `src/lib/b4Integration.test.ts` and `src/lib/prompts.test.ts` for structured source output

**Interfaces:**
- `export interface KnowledgeSource`
- `StarKnowledgeEntry.source: KnowledgeSource`
- `Citation.source: KnowledgeSource`
- `Citation.confidence: number` (0–1)
- `normalizeKnowledgeSource(source: KnowledgeSource | string | null | undefined): KnowledgeSource`
- `getKnowledgeSourceConfidence(source: KnowledgeSource): number`

- [ ] **Step 1: Write failing provenance and confidence tests**

  Assert all 27 star entries expose object sources, at least one source fixture can be `human_approved`, legacy palace citations normalize to an object, unknown/unreviewed sources are capped at `0.5`, and known citations expose their source library without `[object Object]` in prompt/UI formatting.

- [ ] **Step 2: Run the focused provenance tests to verify the expected failures**

  Run `npm test -- src/lib/starKnowledge.test.ts src/lib/citationTracer.test.ts src/lib/b4Integration.test.ts src/lib/prompts.test.ts` and confirm the assertions fail against the legacy string-source implementation.

- [ ] **Step 3: Implement structured source normalization and confidence**

  Export the `KnowledgeSource` shape, convert the 27 star source values to objects (keeping unreviewed entries at `status: 'collected'`, with any explicitly reviewed sample carrying its review metadata), normalize palace legacy strings in the tracer, assign numeric confidence using status/review metadata with a hard `0.5` cap for unreviewed sources and a lower conservative score for unknown/disputed sources, and update all citation renderers to use `source.library`.

- [ ] **Step 4: Run the focused provenance suite and update deterministic expectations**

  Run the focused command from Step 2, update only affected citation/prompt snapshots and exact expectations, then rerun the focused command until green.

- [ ] **Step 5: Commit**

  `git add src/lib/starKnowledge.ts src/lib/starKnowledge.test.ts src/lib/citationTracer.ts src/lib/citationTracer.test.ts src/lib/b4Integration.test.ts src/lib/prompts.ts src/lib/prompts.test.ts src/lib/__snapshots__/prompts.test.ts.snap src/lib/specialTopics.ts src/components/SpecialTopicPanel.tsx && git commit -m "feat: add structured knowledge source provenance"`

## Final verification

- [ ] Run `npm test && npm run build` and report the real test count, build exit code, and any lint result requested by the repository gate.
- [ ] Review the complete diff for scope, unchanged `RuleResult` shape, and zh-TW/zh-CN prompt wording before claiming completion.
