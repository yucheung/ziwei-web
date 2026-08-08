# B8 Fix 續跑 F1/F2/F3/F5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓真太陽時的精確出生時間完整流入合盤 Person A，讓 MatchPanel 依時間格式顯示正確且可編輯的輸入，並消除數字時辰經度錯誤與 zh-CN 用詞回歸。

**Architecture:** App 的真太陽時狀態以 `preciseTime` 傳給 MatchPanel 的 Person A；MatchPanel 將 `HH:mm` 與 0–12 數字時辰視為兩種互斥 UI/排盤輸入，建立安全的時間與經度選項邊界。App 的規則面板 stale 判定只在真太陽時啟用時比較經度，zh-CN 字典則以測試鎖定大陸用語。

**Tech Stack:** Vite, React 19, TypeScript, Vitest, Testing Library, iztro 2.5.8。

## Global Constraints

- i18n 雙語一致：任何新增 UI 文案必須同時進 zh-TW 與 zh-CN（及 en 若適用）；canonical key 一律 zh-TW。
- 使用 `npm test`，不得使用全域 `npx vitest`。
- 完成前必須通過 `npm test` 與 `npm run build`，修改檔案的 ESLint 也必須為 0 errors。
- JSON 匯出不得含時間戳/隨機性；本次不改動 JSON 匯出邏輯。
- 不引入 LLM / AI 解讀進確定性排盤層。
- git 只修改本次 F1/F2/F3/F5 範圍，不建立不必要的 commit。

---

### Task 1: 以回歸測試固定 F1/F2/F3/F5

**Files:**
- Modify: `src/App.integration.test.tsx`
- Modify: `src/components/MatchPanel.test.tsx`
- Modify: `src/components/RuleInfoPanel.test.tsx`
- Modify: `src/components/SpecialTopicPanel.test.tsx`

**Interfaces:**
- `MatchPersonConfig` 將接受可選的 `preciseTime?: string`。
- MatchPanel 的 Person A/B 時間控制項以 `HH:mm` 顯示 `input[type="time"]`，以數字字串顯示 0–12 的 `select`。

- [x] **Step 1: Write the failing MatchPanel tests.**

  在 `MatchPanel.test.tsx` 加入精確時間、清空後維持 time control、數字時辰經度 fallback 三個行為測試：

  ```tsx
  it('renders a precise Person A time as an editable time input', () => {
    render(
      <I18nProvider defaultLocale="zh-TW">
        <MatchPanel
          initialPersonA={{ ...PERSON_A, timeIndex: 2, preciseTime: '12:55' }}
          initialPersonB={PERSON_B}
        />
      </I18nProvider>,
    );

    const timeInput = screen.getByLabelText('出生時辰', { selector: 'input' }) as HTMLInputElement;
    expect(timeInput).toHaveAttribute('type', 'time');
    expect(timeInput).toHaveValue('12:55');

    fireEvent.change(timeInput, { target: { value: '13:05' } });
    expect(timeInput).toHaveValue('13:05');
  });

  it('drops longitude when a numeric time slot is paired with longitude', () => {
    render(
      <I18nProvider defaultLocale="zh-TW">
        <MatchPanel
          initialPersonA={{ ...PERSON_A, longitude: 121.56 }}
          initialPersonB={PERSON_B}
        />
      </I18nProvider>,
    );

    expect(screen.getByText('合盤規則結果')).toBeInTheDocument();
    expect(document.getElementById('person-a-time')).toHaveProperty('tagName', 'SELECT');
  });
  ```

- [x] **Step 2: Add App stale and precise-time integration regressions.**

  Add one test that enters longitude without precise time and asserts `未同步` is absent, then enters precise time and asserts the stale marker appears. Add one test that enters longitude plus `00:10`, switches to `雙人合盤`, and asserts Person A has an editable time input with value `00:10`.

- [x] **Step 3: Add zh-CN terminology regression assertions.**

  In the existing dictionary-aware tests assert:

  ```ts
  expect(zhCN['rulesInfo.algorithm']).toBe('排盘算法');
  expect(zhCN['specialTopic.systemPrompt']).toContain('用户');
  expect(zhCN['specialTopic.systemPrompt']).not.toContain('使用者');
  ```

- [x] **Step 4: Run the focused tests and verify RED.**

  Run `npm test -- src/components/MatchPanel.test.tsx src/App.integration.test.tsx src/components/RuleInfoPanel.test.tsx src/components/SpecialTopicPanel.test.tsx`.

  The new tests must fail for the existing behavior: Person A has no precise-time prop, MatchPanel always renders a select and numeric-plus-longitude throws during rule evaluation, `isRuleInfoStale` reports unsynced for longitude-only edits, and zh-CN still contains the two incorrect terms.

### Task 2: Implement F1/F2/F3 in App and MatchPanel

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/MatchPanel.tsx`

**Interfaces:**
- `MatchPersonConfig.preciseTime?: string` carries only the exact clock value used by the true-solar-time path.
- A MatchPanel time value is converted to a numeric `0..12` slot only when it is a numeric slot; a precise clock string remains a string.

- [x] **Step 1: Add the precise-time field and initialize MatchPanel state from it.**

  Add `preciseTime?: string` to `MatchPersonConfig`. Initialize `timeA`/`timeB` from `preciseTime` first and fall back to `timeIndex`:

  ```ts
  const [timeA, setTimeA] = useState(String(initialPersonA?.preciseTime ?? initialPersonA?.timeIndex ?? '2'));
  const [timeB, setTimeB] = useState(String(initialPersonB?.preciseTime ?? initialPersonB?.timeIndex ?? '6'));
  ```

- [x] **Step 2: Pass App precise time only while true solar time is active.**

  In the `initialPersonA` object, retain the numeric `timeIndex` fallback and add:

  ```ts
  ...(solarTimeActive ? { preciseTime, longitude: parsedLongitude } : {}),
  ```

  This makes a live true-solar-time form render as `HH:mm` while an ordinary form remains a 0–12 selector.

- [x] **Step 3: Add pure time-shape guards and safe option construction.**

  Use a numeric-slot guard for `^\d{1,2}$` and a precise-time guard for `^\d{2}:\d{2}$`. Build each `GetChartOptions` so longitude is included only for a precise time:

  ```ts
  function isNumericTimeSlot(value: string): boolean {
    return /^\d{1,2}$/.test(value.trim());
  }

  function toGetChartTime(value: string): number | string {
    return isNumericTimeSlot(value) ? Number.parseInt(value, 10) : value;
  }

  const safeLongitudeA = isNumericTimeSlot(timeA) ? undefined : longitudeA;
  ```

  Apply the same rule to Person B. This removes longitude before `getCanonicalAstrolabe` sees a numeric time and prevents iztro’s numeric-time/longitude error.

- [x] **Step 4: Render the correct editable time control.**

  In `renderPersonInputs`, render `<input type="time">` with the existing label/id/value/onChange for a precise-time mode; otherwise render the existing 0–12 `<select>` and its `TIME_KEYS` options. Track the mode independently for Person A and B so clearing a precise-time value does not switch the control to a numeric select. Ensure both controls keep the same `id` so labels and tests remain stable.

- [x] **Step 5: Keep current-chart inheritance format-aware.**

  When `currentBirthData.hour` is a string, set it as the precise time and mark Person A precise-time mode; when it is a number, set it as the numeric slot and mark numeric mode. Presets explicitly reset both persons to numeric mode.

- [x] **Step 6: Run the focused MatchPanel and App tests and verify GREEN.**

  Run `npm test -- src/components/MatchPanel.test.tsx src/App.integration.test.tsx`. Confirm precise time remains editable, numeric time remains a 0–12 select, and numeric-plus-longitude yields rule results rather than the error panel.

### Task 3: Implement F5 stale gating and zh-CN corrections

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/i18n/zh-CN.ts`

- [x] **Step 1: Gate longitude comparison by active true-solar-time state.**

  Keep active/frozen mode changes stale, but compare `parsedLongitude` with `frozenLongitude` only when the current form has true solar time enabled:

  ```ts
  const isRuleInfoStale =
    (config.algorithm ?? 'zhongzhou') !== (frozenConfig.algorithm ?? 'zhongzhou') ||
    (config.yearDivide ?? 'normal') !== (frozenConfig.yearDivide ?? 'normal') ||
    (config.dayDivide ?? 'forward') !== (frozenConfig.dayDivide ?? 'forward') ||
    astroType !== frozenAstroType ||
    solarTimeActive !== frozenSolarTimeActive ||
    (solarTimeActive && parsedLongitude !== frozenLongitude);
  ```

  Do not compare longitude merely because a user typed it while precise time is blank.

- [x] **Step 2: Correct the two zh-CN values.**

  Change only the zh-CN dictionary values:

  ```ts
  'specialTopic.systemPrompt': '...请根据用户提供的资料...';
  'rulesInfo.algorithm': '排盘算法';
  ```

  Keep zh-TW canonical wording unchanged.

- [x] **Step 3: Run the focused regression tests and full test suite.**

  Run `npm test -- src/components/RuleInfoPanel.test.tsx src/components/SpecialTopicPanel.test.tsx src/App.integration.test.tsx`, then `npm test`. All tests must pass with no warnings indicating an unhandled test error.

### Task 4: Final verification and review

**Files:**
- Inspect only the files changed by Tasks 1–3.

- [x] **Step 1: Inspect the diff and verify scope.**

  Run `git diff --check`, `git diff --stat`, and `git status --short`; confirm only the plan and F1/F2/F3/F5 source/test files changed.

- [x] **Step 2: Run the required build.**

  Run `npm run build` and record its real exit code/output.

- [x] **Step 3: Run modified-file ESLint.**

  Run `npx eslint src/App.tsx src/App.integration.test.tsx src/components/MatchPanel.tsx src/components/MatchPanel.test.tsx src/components/RuleInfoPanel.test.tsx src/components/SpecialTopicPanel.test.tsx src/i18n/zh-CN.ts` and record the real exit code. Existing project warnings are acceptable only if the command exits with 0 errors, per project gate.

- [x] **Step 4: Request review and act on findings.**

  Have a reviewer inspect the final diff against the user’s five bullets and this plan. Fix any Critical/Important issue, rerun the affected tests, then rerun `npm test && npm run build` before reporting completion.

## Self-review checklist

- [x] App passes `preciseTime` to Person A only when true solar time is active.
- [x] MatchPanel renders editable `type="time"` for `HH:mm` and 0–12 select for numeric slots.
- [x] Numeric time plus longitude cannot reach `getChart` with longitude.
- [x] `isRuleInfoStale` does not compare longitude while true solar time is inactive.
- [x] zh-CN uses `用户` and `算法`, with regression tests for both.
- [x] `npm test`, `npm run build`, and modified-file ESLint have fresh passing output.
