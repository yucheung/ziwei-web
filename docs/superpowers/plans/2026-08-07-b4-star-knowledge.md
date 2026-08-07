# B4 Star Knowledge Base + Evidence Tracing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a v1 star knowledge base with provenance, palace主题 knowledge, evidence tracing in structured summaries, and V3 evaluation tests.

**Architecture:** `src/lib/starKnowledge.ts` defines typed knowledge entries for 14 major stars + 6 auspicious + 6 inauspicious stars. Each entry carries `knowledgeId`, `source`, `school`, `ruleSetVersion`. `src/lib/palaceKnowledge.ts` provides palace主题 knowledge (e.g., 命宮 = personality, 夫妻宮 = marriage). `src/lib/citationTracer.ts` traces structured summary fields back to knowledge entries. `src/lib/prompts.ts` integrates citations into the system prompt. V3 tests evaluate LLM output quality with fixed model + fixed question set.

**Tech Stack:** TypeScript, iztro 2.5.8, React/Vite project types, Vitest, ESLint.

## Global Constraints

- All knowledge entries must have `knowledgeId`, `source`, `school`, `ruleSetVersion`.
- Knowledge base is static JSON, not LLM-generated.
- Citations must be traceable: each fact in structured summary links to a knowledge entry.
- V3 tests use a fixed model (not random free router).
- i18n: all UI labels zh-TW + zh-CN.
- Use `npm test` (not global `vitest`) for tests, `npm run build` for build, ESLint for lint.

---

### Task 1: Star Knowledge Base v1

- [ ] Create `src/lib/starKnowledge.ts`
- [ ] Define `StarKnowledgeEntry` interface: `{ starName, starType, knowledgeId, source, school, ruleSetVersion, attributes }`
- [ ] Define `StarType`: `'major' | 'auspicious' | 'inauspicious'`
- [ ] Add 14 major stars (紫微、天機、太陽、武曲、天同、廉貞、天府、太陰、貪狼、巨門、天相、天梁、七殺、破軍)
- [ ] Add 6 auspicious stars (文昌、文曲、左輔、右弼、天魁、天鉞)
- [ ] Add 6 inauspicious stars (擎羊、陀羅、火星、鈴星、地空、地劫)
- [ ] Each entry: `source: 'iztro-sanhe-v1'`, `school: 'sanhe'`, `ruleSetVersion: 'sanhe-v1'`
- [ ] Attributes: `element` (五行), `brightness` (廟旺利陷 range), `category` (紫微系/天府系)
- [ ] Export `getStarKnowledge(starName)` lookup function
- [ ] Export `getAllStarKnowledge()` for iteration
- [ ] Unit tests: all 26 stars present, lookup works, unknown star returns undefined

### Task 2: Palace Knowledge v1

- [ ] Create `src/lib/palaceKnowledge.ts`
- [ ] Define `PalaceKnowledgeEntry`: `{ palaceName, knowledgeId, source, school, ruleSetVersion, themes, bodyPart, lifeDomain }`
- [ ] 12 palaces: 命宮、兄弟、夫妻、子女、財帛、疾厄、遷移、交友、官祿、田宅、福德、父母
- [ ] Themes: array of strings describing the palace's interpretive focus
- [ ] Body part: traditional Chinese medicine association
- [ ] Life domain: modern categorization (personality, relationships, career, etc.)
- [ ] Export `getPalaceKnowledge(palaceName)` lookup
- [ ] Unit tests: all 12 palaces present, themes non-empty

### Task 3: Citation Tracer

- [ ] Create `src/lib/citationTracer.ts`
- [ ] Define `Citation`: `{ knowledgeId, field, source, confidence }`
- [ ] Define `CitationTracer` class/functions that map structured summary fields → citations
- [ ] Trace `palaces[i].majorStars[j]` → star knowledge entry
- [ ] Trace `palaces[i].name` → palace knowledge entry
- [ ] Trace `mutagens.entries[k]` → star knowledge entry
- [ ] Export `traceCitations(summary: AnalyzedChart): Citation[]`
- [ ] Unit tests: known stars produce citations, unknown stars produce empty citations

### Task 4: Integrate Citations into Prompt

- [ ] Modify `serializeStructuredSummary` in `src/lib/prompts.ts`
- [ ] Append `## 知識來源` section with citation list after structured JSON
- [ ] Each citation: `[knowledgeId] source — school (ruleSetVersion)`
- [ ] zh-TW and zh-CN variants for section header
- [ ] Prompt tests: verify citation section present, format correct
- [ ] Snapshot tests: golden prompt includes citations

### Task 5: V3 Evaluation Framework

- [ ] Create `src/lib/v3Evaluation.ts`
- [ ] Define `V3TestCase`: `{ question, expectedFacts, expectedCitations, model }`
- [ ] Define `V3Result`: `{ inputTokens, outputTokens, factualAccuracy, citationRate, unsupportedRate, contradictionRate }`
- [ ] Create 3 test groups (A/B/C) with 5 questions each
- [ ] Group A: 基本性格（命宮主星）
- [ ] Group B: 事業趨勢（官祿宮）
- [ ] Group C: 感情婚姻（夫妻宮）
- [ ] Fixed model: `gpt-5.6-luna` (or configurable)
- [ ] Evaluation function: compare LLM output against expected facts
- [ ] Unit tests: test case structure valid, evaluation metrics calculated correctly

### Task 6: Integration Tests

- [ ] End-to-end test: chart → analyzeChart → traceCitations → buildReadingPrompt
- [ ] Verify citations appear in final prompt
- [ ] Verify no knowledge base entries are missing for known stars
- [ ] Build + lint clean
- [ ] All tests pass (362+ existing + new)
