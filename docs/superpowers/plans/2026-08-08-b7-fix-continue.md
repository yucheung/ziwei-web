# B7 Fix 續跑 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 B7b 專題解讀與流分析圖接入 App，重寫非恆真的合盤四化互動規則，並把敏感度邊界實際送進專題 LLM 請求；Fix #6（昌曲規則）依需求跳過。

**Architecture:** App 以目前 astrolabe 建立顯示用分析圖、canonical 規則圖與運限摘要，將它們分別傳給 `FortuneChart`、`SpecialTopicPanel` 與既有面板。合盤四化規則只在雙方四化落於相同 canonical 宮位時產生結果；專題設定取得對應 `AssertionBoundary`，同時放入 deterministic user prompt 與 LLM system message。

**Tech Stack:** React 19, TypeScript, Vite, Vitest + Testing Library, iztro 2.5.8, existing i18n/rule/LLM pipeline.

## Global Constraints

- Fix #6（`starCompatibility.ts` 昌曲規則）不實作；該檔案維持目前範圍。
- Test 必須使用 `npm test`，不得使用全域 `vitest` 或 `npx vitest`。
- 完成 gate 為 `npm test` 全綠且 `npm run build` exit 0；修改的 TypeScript 檔案須通過 ESLint。
- 任何新增 UI 文案必須同步存在 `src/i18n/zh-TW.ts` 與 `src/i18n/zh-CN.ts`，不可在元件硬編碼 locale。
- LLM 只接收 analyzed/canonical chart、已驗證規則與明確敏感度邊界；不得把未驗證推論放入確定性排盤層。
- JSON/prompt 的 chart payload 不帶 `generatedAt`，維持既有 deterministic 特性。

---

### Task 1: App 接入 B7b 元件

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: `analyzeChart`, `canonicalizeAstrolabeForReading`, `evaluateRules`, `getHoroscopeSummary`, current `astrolabe`, `iztroLanguage`, and existing `activeTab` state.
- Produces: lazy-loaded `FortuneChart` rendered with `AnalyzedChart + HoroscopeSummary`; lazy-loaded `SpecialTopicPanel` rendered with canonical `AnalyzedChart + RuleResult[]`.

- [ ] **Step 1: Write failing App integration assertions.**

  Extend the existing tab-navigation test so the fortunes tab must render both the existing `運限大盤分析` and `大限流分析圖`, and the reading tab must render both the existing `AI 多模型命盤結構化解讀` and `AI 專題命盤解讀`.

  ```tsx
  fireEvent.click(await screen.findByRole('tab', { name: /大限流年運限/i }));
  expect(await screen.findByText(/大限流分析圖/i)).toBeInTheDocument();

  fireEvent.click(await screen.findByRole('tab', { name: /AI 智能命盤解讀/i }));
  expect(await screen.findByText('AI 專題命盤解讀')).toBeInTheDocument();
  ```

- [ ] **Step 2: Run the focused integration test and verify RED.**

  Run `npm test -- src/App.integration.test.tsx`.

  Expected: the new assertions fail because `App.tsx` currently renders only `FortunePanel` and `ReadingPanel`.

- [ ] **Step 3: Build the three App-level derived inputs.**

  Import `analyzeChart`, `canonicalizeAstrolabeForReading`, `evaluateRules`, `getHoroscopeSummary`, and their types. Add memoized values with these behaviors:

  ```tsx
  const analyzedChart = useMemo(
    () => astrolabe ? analyzeChart(astrolabe, iztroLanguage) : null,
    [astrolabe, iztroLanguage],
  );
  const canonicalAnalyzedChart = useMemo(
    () => astrolabe
      ? analyzeChart(canonicalizeAstrolabeForReading(astrolabe, iztroLanguage), 'zh-TW')
      : null,
    [astrolabe, iztroLanguage],
  );
  const ruleResults = useMemo(
    () => canonicalAnalyzedChart ? evaluateRules(canonicalAnalyzedChart) : [],
    [canonicalAnalyzedChart],
  );
  const horoscope = useMemo(() => {
    if (!astrolabe) return null;
    try {
      return getHoroscopeSummary(astrolabe, undefined, iztroLanguage);
    } catch {
      return null;
    }
  }, [astrolabe, iztroLanguage]);
  ```

  The canonical chart is used for rules/citations so zh-CN display names cannot erase knowledge lookups; the display-locale chart is used with the matching horoscope locale for `FortuneChart` themes.

- [ ] **Step 4: Render the B7b components in the existing tabs.**

  Add lazy imports for `FortuneChart` and `SpecialTopicPanel`. In the fortunes panel, keep `FortunePanel` and render `FortuneChart` when both `analyzedChart` and `horoscope` are available. In the reading panel, keep `ReadingPanel` and render `SpecialTopicPanel` when `canonicalAnalyzedChart` is available, passing `ruleResults`. Use existing translated labels only; no new UI strings are needed.

- [ ] **Step 5: Run the focused test and refactor while green.**

  Run `npm test -- src/App.integration.test.tsx`. The new assertions and all existing App integration tests must pass.

### Task 2: Rewrite mutagen interaction rules so they are non-tautological

**Files:**
- Modify: `src/lib/matchRules/mutagenInteraction.ts`
- Modify: `src/lib/matchRules/matchRules.test.ts`

**Interfaces:**
- Consumes: `AnalyzedChart.mutagens.entries`, `canonicalMutagen`, `canonicalPalaceName`, and existing match evidence helpers.
- Produces: `mutagen-double-lu` and `mutagen-lu-ji` results only when the required mutagen pair is found in the same canonical palace; result metadata remains `MatchRuleResult` compatible.

- [ ] **Step 1: Add a failing regression fixture for the false-positive case.**

  Extend the test chart factory with an optional `mutagenIndex`/`mutagenStars` location so markers can be placed outside 命宮 without changing the soul palace. Add this assertion:

  ```ts
  expect(ruleIds(
    makeChart({ mingStars: [star('廉貞', '祿')] }),
    makeChart({ mutagenIndex: 2, mutagenStars: [star('天機', '祿')] }),
  )).not.toContain('mutagen-double-lu');
  ```

  The existing positive cases must explicitly keep both matching marker entries in the same palace, and a reversed 祿/忌 pair must still be covered.

- [ ] **Step 2: Run the focused rule test and verify RED.**

  Run `npm test -- src/lib/matchRules/matchRules.test.ts`.

  Expected: the new negative assertion fails because the current implementation matches any chart that merely has a 化祿 entry on each side.

- [ ] **Step 3: Implement pair matching by canonical palace.**

  Replace the broad `findMutagen`/rule-id switch with deterministic helpers that collect the requested mutagen entries, canonicalize each entry's `palaceName`, and select the first pair whose canonical palace names are equal. Define rule conditions explicitly with `samePalace: true`; evaluate both `(祿, 忌)` and `(忌, 祿)` for the reversible rule. Build evidence from the exact selected entry/index on each chart and clone conclusions as today. Do not infer a result from mutagen presence alone.

- [ ] **Step 4: Run focused tests and the full rule suite.**

  Run `npm test -- src/lib/matchRules/matchRules.test.ts src/lib/matchRules/sensitivity.test.ts`. The positive interactions, the new negative case, deterministic ordering, and sensitivity metadata must pass.

### Task 3: Connect sensitivity boundaries to the special-topic LLM path

**Files:**
- Modify: `src/lib/matchRules/sensitivity.ts`
- Modify: `src/lib/specialTopics.ts`
- Modify: `src/components/SpecialTopicPanel.tsx`
- Test: `src/lib/specialTopics.test.ts`
- Test: `src/components/SpecialTopicPanel.test.tsx`

**Interfaces:**
- Consumes: `AssertionBoundary` constants from `sensitivity.ts`, special-topic sensitivity config, existing `callLLMStream` messages.
- Produces: `SpecialTopicPromptPlan.boundary` and `SpecialTopicPromptPlan.sensitivityInstruction`; high-sensitivity plans include allowed/forbidden phrasing plus the required disclaimer in both the deterministic user prompt and the LLM system message.

- [ ] **Step 1: Write failing prompt/component tests.**

  In `specialTopics.test.ts`, build a wealth plan and assert its boundary is `WEALTH_BOUNDARY`, its prompt includes `保證獲利`, `禁止`, and the boundary disclaimer, and its system instruction is non-empty. In `SpecialTopicPanel.test.tsx`, select `財運`, generate a mocked reading, and assert the captured system message contains the wealth forbidden phrase and disclaimer.

  ```ts
  const plan = buildSpecialTopicPrompt(makeChart(), 'wealth');
  expect(plan.boundary).toBe(WEALTH_BOUNDARY);
  expect(plan.userPrompt).toContain('保證獲利');
  expect(plan.userPrompt).toContain(WEALTH_BOUNDARY.disclaimer);
  expect(plan.sensitivityInstruction).toContain('禁止');
  ```

- [ ] **Step 2: Run the focused tests and verify RED.**

  Run `npm test -- src/lib/specialTopics.test.ts src/components/SpecialTopicPanel.test.tsx`.

  Expected: the tests fail because the current prompt plan does not expose a boundary/instruction and the panel sends only the generic localized system prompt.

- [ ] **Step 3: Expose topic boundary lookup and format an explicit instruction.**

  Add a pure exported lookup in `sensitivity.ts` that returns the topic boundary for high sensitivity and the generic boundary for unknown high topics. Add optional `boundaryTopic`/`boundary` metadata to `SpecialTopicConfig`, map `wealth` to `WEALTH_BOUNDARY`, `relationship` to `MARRIAGE_BOUNDARY`, and `health` to `HEALTH_BOUNDARY`; medium topics remain without a high-sensitivity boundary. Extend `SpecialTopicPromptPlan` with `boundary?: AssertionBoundary` and `sensitivityInstruction: string`.

  The instruction must deterministically enumerate the boundary's allowed phrasing, forbidden phrasing, and disclaimer. Add it to the `【敏感度邊界】` section of `userPrompt` for high topics and return the same instruction for the LLM system message.

- [ ] **Step 4: Send the instruction as an LLM system message.**

  In `SpecialTopicPanel`, construct the system message as the existing translated `specialTopic.systemPrompt` followed by `promptPlan.sensitivityInstruction` when non-empty. Keep the user message as `promptPlan.userPrompt`; do not add random or timestamp fields.

- [ ] **Step 5: Run focused tests and verify both locales remain available.**

  Run `npm test -- src/lib/specialTopics.test.ts src/components/SpecialTopicPanel.test.tsx`. Existing topic-selection, streaming, citations, bilingual labels, and new sensitivity assertions must pass.

### Task 4: Full verification

**Files:**
- Verify: all files modified by Tasks 1–3.

- [ ] **Step 1: Run the requested full test gate.**

  Run `npm test` and record the exact pass/fail count and exit code.

- [ ] **Step 2: Run the requested production build.**

  Run `npm run build` and record the exit code.

- [ ] **Step 3: Run ESLint on modified TypeScript files.**

  Run `npx eslint src/App.tsx src/App.integration.test.tsx src/lib/matchRules/mutagenInteraction.ts src/lib/matchRules/matchRules.test.ts src/lib/matchRules/sensitivity.ts src/lib/specialTopics.ts src/lib/specialTopics.test.ts src/components/SpecialTopicPanel.tsx src/components/SpecialTopicPanel.test.tsx` and record the exact output.

- [ ] **Step 4: Inspect the final diff.**

  Run `git diff --check`, confirm Fix #6 remains untouched, and report changed files, test count, build/lint results, and commit SHA when applicable.
