# B6 Review Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing chart-share codec into the App, prevent print CSS from hiding chart controls/content, and make `FortunePeriod.palaceNames` a required shared rule type.

**Architecture:** Keep URL encoding/decoding in `src/lib/shareUrl.ts`; App owns the share/restore lifecycle because it owns the active chart configuration and chart regeneration callback. Share UI lives beside the existing export controls and is marked `no-print`; print CSS targets only explicit navigation/no-print selectors. Move the existing fortune period contracts into `rules/types.ts` and re-export them from `fortune.ts` so current imports remain compatible.

**Tech Stack:** React 19, TypeScript, Vitest + Testing Library, lz-string, Tailwind CSS, CSS `@media print`.

## Global Constraints

- Use `npm test` (not global `vitest`) for all test runs.
- Build must pass with `npm run build`.
- Modified TypeScript files must pass `npx eslint <modified files>` with zero errors.
- Every new user-facing string must be present in both `zh-TW` and `zh-CN`.
- Shared URLs contain birth data; copying requires the localized privacy confirmation.
- Do not add AI/LLM behavior to the deterministic chart/rules layer.

---

### Task 1: App URL sharing and restoration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/i18n/zh-TW.ts`
- Modify: `src/i18n/zh-CN.ts`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Consumes: `createShareUrl(birthData, reading)` and `decodeShareUrl(url)` from `src/lib/shareUrl.ts`; existing `activeBirthData` and `handleLoadChart` App state flow.
- Produces: localized `share.button`, `share.copySuccess`, `share.privacyWarning`, and `share.restoreConfirm` UI; a share button that writes a deterministic URL to `navigator.clipboard`; one-time URL restore on initial mount.

- [ ] **Step 1: Write failing integration tests**

  Add tests that (a) accept the privacy confirmation, click `分享`, verify clipboard receives a URL decodable to the active birth data, and verify `已複製分享連結`; and (b) put a valid `?s=` URL in `window.history`, render the App, verify `window.confirm` receives `偵測到分享連結，是否載入？`, and verify the form/chart state is restored after confirmation.

- [ ] **Step 2: Run the targeted tests and confirm the expected failure**

  Run `npm test -- src/App.integration.test.tsx`.

  Expected: the new tests fail because the App does not render a `分享` button and does not inspect the `s` query parameter.

- [ ] **Step 3: Add both locale dictionaries**

  Add these keys with the exact requested Traditional/Simplified Chinese values:

  ```ts
  // zh-TW
  'share.button': '分享',
  'share.copySuccess': '已複製分享連結',
  'share.privacyWarning': '此 URL 包含出生資料，請確認後再分享',
  'share.restoreConfirm': '偵測到分享連結，是否載入？',

  // zh-CN
  'share.button': '分享',
  'share.copySuccess': '已复制分享链接',
  'share.privacyWarning': '此 URL 包含出生资料，请确认后再分享',
  'share.restoreConfirm': '检测到分享链接，是否加载？',
  ```

- [ ] **Step 4: Implement the minimal App wiring**

  Import `useEffect`, `Share2`, `createShareUrl`, and `decodeShareUrl`. Add a share status state and a one-time ref guard. The click handler must:

  ```ts
  if (!activeBirthData || !window.confirm(t('share.privacyWarning'))) return;
  const url = createShareUrl(activeBirthData, '');
  await navigator.clipboard.writeText(url);
  setShareStatus(t('share.copySuccess'));
  ```

  Add the button beside the existing export buttons, with the enclosing export panel marked `no-print`. After `handleLoadChart` is available, add a mount effect that reads `window.location.search`, calls `decodeShareUrl(window.location.href)`, asks the exact localized restore confirmation, and passes `payload.birthData` to `handleLoadChart` when accepted. Ignore absent or invalid payloads and guard against React Strict Mode duplicate prompts.

- [ ] **Step 5: Run the targeted tests and refactor only while green**

  Run `npm test -- src/App.integration.test.tsx`. Expected: the new sharing and restoration tests pass, with all existing App integration tests still passing.

### Task 2: Print CSS selector regression

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles/print.css`
- Test: `src/styles/print.test.ts`

**Interfaces:**
- Consumes: the export panel's `no-print` class and the existing chart/reading `main` DOM.
- Produces: print rules that do not globally hide chart-grid buttons and explicitly keep chart/reading content visible.

- [ ] **Step 1: Write a failing CSS regression test**

  Read `print.css` as a fixture and assert that the print block contains `header button`, `nav button`, `.no-print button`, and `visibility: visible`, while it has no standalone global `button` selector. This captures the review blocker without requiring a browser print engine.

- [ ] **Step 2: Run the CSS test and confirm it fails against the global selector**

  Run `npm test -- src/styles/print.test.ts`.

  Expected: failure because the current CSS contains the standalone `button,` selector and no visibility rule.

- [ ] **Step 3: Apply the minimal CSS/App fix**

  Replace the global `button` hide rule with `header button, nav button, .no-print button`; keep the explicit container-level navigation/no-print hides; add `visibility: visible !important` for `main`, chart grid, and tab-panel content. Mark the export/share panel `no-print` so its controls do not appear in printed output while the chart grid and reading remain printable.

- [ ] **Step 4: Run the CSS test and relevant component tests**

  Run `npm test -- src/styles/print.test.ts src/components/ChartGrid.test.tsx src/components/ReadingPanel.test.tsx`. Expected: all pass.

### Task 3: Shared required `FortunePeriod` contract

**Files:**
- Modify: `src/lib/rules/types.ts`
- Modify: `src/lib/rules/fortune.ts`
- Test: `src/lib/rules/fortune.test.ts`

**Interfaces:**
- Consumes: existing HoroscopeSummary scope objects, whose `palaceNames` arrays are already populated by `getHoroscopeSummary`.
- Produces: `FortunePeriodType`, `FortunePeriodOptions`, and `FortunePeriod` from `rules/types.ts`, with `palaceNames: string[]` required; `fortune.ts` continues to re-export the types for existing callers.

- [ ] **Step 1: Add a type-source regression test**

  Import `FortunePeriod` from `./types` and construct a representative period with `palaceNames: PALACE_NAMES`; assert the field is preserved. The test must compile against the new shared type and continue to exercise `evaluateFortune` through the existing type exported by `fortune.ts`.

- [ ] **Step 2: Run the targeted test and confirm the expected failure**

  Run `npm test -- src/lib/rules/fortune.test.ts`.

  Expected: failure during module/type transform because `./types` does not yet export `FortunePeriod`.

- [ ] **Step 3: Move the fortune period contracts and retain compatibility**

  Define the three contracts in `rules/types.ts`, with `palaceNames: string[]` (not optional). Import them in `fortune.ts` and re-export the type names from there. Keep `fortunePeriodFromHoroscopeSummary` returning `scope.palaceNames` and `createFortunePeriod` delegating through that adapter; do not add an empty fallback that would hide missing upstream data.

- [ ] **Step 4: Run the fortune tests**

  Run `npm test -- src/lib/rules/fortune.test.ts`. Expected: all existing direct-construction and HoroscopeSummary adapter tests pass.

### Task 4: Full verification

**Files:**
- Verify: all modified files from Tasks 1–3.

- [ ] **Step 1: Run the full test suite**

  Run `npm test` and record the total passed test count and exit code.

- [ ] **Step 2: Run the production build**

  Run `npm run build` and record the exit code.

- [ ] **Step 3: Run ESLint on modified source files**

  Run `npx eslint src/App.tsx src/App.integration.test.tsx src/i18n/zh-TW.ts src/i18n/zh-CN.ts src/styles/print.css src/styles/print.test.ts src/lib/rules/types.ts src/lib/rules/fortune.ts src/lib/rules/fortune.test.ts` (or the equivalent file list accepted by the configured ESLint parser) and record the result.

- [ ] **Step 4: Review the diff and report exact outcomes**

  Confirm no unrelated files changed, check `git diff --check`, report the three fixes, test count, build/lint results, and commit SHA if a commit was created.
