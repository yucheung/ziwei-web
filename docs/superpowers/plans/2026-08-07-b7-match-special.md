# B7 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Replace MatchPanel's hardcoded templates with a rule-based compatibility system, add special topic readings, and fortune analysis chart. All rules must be traceable; sensitive topics have explicit assertion boundaries.

**Architecture:** `src/lib/matchRules/` directory houses typed compatibility rules (similar to `src/lib/rules/`). Each rule evaluates two charts and produces `MatchRuleResult[]` with evidence chains. Special topic readings use existing LLM pipeline with domain-specific prompts. Fortune analysis chart visualizes decadal/annual progression.

**Tech Stack:** TypeScript, React, Vitest, ESLint, iztro 2.5.8.

## Global Constraints

- Only引用已驗證規則（from B5 rules or new verified rules）
- 敏感議題（婚姻、財富、壽命）需明確斷言邊界
- i18n zh-TW/zh-CN consistent
- Use `npm test`, `npm run build`, ESLint

---

### Task 1: 合盤規則庫

- [ ] Create `src/lib/matchRules/types.ts`
- [ ] Define `MatchRule`: `{ ruleId, ruleName, conditions: MatchCondition[], conclusions: MatchConclusion[], source, school, ruleSetVersion }`
- [ ] Define `MatchCondition`: `{ type: 'starRelationship' | 'palaceOverlap' | 'mutagenInteraction' | 'branchRelation', params: Record<string, any> }`
- [ ] Define `MatchConclusion`: `{ type: 'compatibility' | 'dynamic' | 'challenge', description: string, confidence: number, sensitivity: 'low' | 'medium' | 'high' }`
- [ ] Create `src/lib/matchRules/starCompatibility.ts`
- [ ] Implement star-pair compatibility rules (e.g., 紫微+天府, 太陽+太陰)
- [ ] Create `src/lib/matchRules/palaceOverlap.ts`
- [ ] Implement palace overlap analysis (命宮同宮, 三方四正互見, etc.)
- [ ] Create `src/lib/matchRules/mutagenInteraction.ts`
- [ ] Implement mutagen interaction rules (雙祿, 祿忌交沖, etc.)
- [ ] Create `src/lib/matchRules/branchRelation.ts`
- [ ] Implement earthly branch relations (六合, 三合, 六沖, 刑害)
- [ ] Create `src/lib/matchRules/engine.ts`
- [ ] Combine all match rules, dedup, sort by confidence
- [ ] Export `evaluateMatch(chartA: AnalyzedChart, chartB: AnalyzedChart): MatchRuleResult[]`

### Task 2: 敏感議題斷言邊界

- [ ] Create `src/lib/matchRules/sensitivity.ts`
- [ ] Define `SensitivityLevel`: 'low' | 'medium' | 'high'
- [ ] Define `AssertionBoundary`: `{ topic, level, allowedPhrasing, forbiddenPhrasing, disclaimer }`
- [ ] Topics: 婚姻 compatibility, 財富 outlook, 健康 warnings, 壽命 implications
- [ ] Each conclusion must carry `sensitivity` level
- [ ] High sensitivity conclusions require disclaimer text
- [ ] Export `applySensitivityBoundaries(results: MatchRuleResult[]): MatchRuleResult[]`
- [ ] Unit tests: boundary enforcement

### Task 3: MatchPanel 重構

- [ ] Refactor `src/components/MatchPanel.tsx` to use `evaluateMatch` engine
- [ ] Remove hardcoded template logic
- [ ] Display rule-based results with evidence chains
- [ ] Show sensitivity disclaimers for high-sensitivity conclusions
- [ ] i18n: zh-TW/zh-CN labels
- [ ] Update `src/components/MatchPanel.test.tsx`

### Task 4: 專題解讀

- [ ] Create `src/lib/specialTopics.ts`
- [ ] Define topic types: `career`, `wealth`, `relationship`, `health`, `education`
- [ ] Each topic has specific prompt template and rule subset
- [ ] Export `generateSpecialTopicReading(chart: AnalyzedChart, topic: TopicType): string`
- [ ] Create `src/components/SpecialTopicPanel.tsx`
- [ ] Topic selector UI
- [ ] Reading display with source citations
- [ ] i18n: zh-TW/zh-CN labels

### Task 5: 流分析圖

- [ ] Create `src/components/FortuneChart.tsx`
- [ ] Visualize decadal (大限) progression as timeline
- [ ] Show active stars and mutagens per period
- [ ] Interactive: click period to see details
- [ ] Use existing `getHoroscopeSummary` data
- [ ] i18n: zh-TW/zh-CN labels

### Task 6: Integration Tests

- [ ] E2E: two charts → match evaluation → results display
- [ ] E2E: special topic reading → citations
- [ ] E2E: fortune chart → period selection → details
- [ ] Verify sensitivity disclaimers appear for high-sensitivity topics
