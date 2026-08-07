# B6 Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build Phase 3 user features: chart collection, reading history, URL sharing, conversational follow-up, and print mode. All without introducing account system. Fix B5 design debt.

**Architecture:** Local-first storage via IndexedDB (via `idb` or raw). URL sharing via compressed JSON in query params (lz-string). History stored per-chart. Follow-up uses existing LLM pipeline with context injection. Print mode via CSS `@media print`.

**Tech Stack:** TypeScript, React, Vitest, ESLint, idb (IndexedDB wrapper), lz-string (compression).

## Global Constraints

- **No account system** — all data local-first
- **Privacy model** — no PII leaves device; URL sharing is opt-in explicit
- **B5 design debt** — fix palaceNames required + fortune star overlay before B6 UI
- Use `npm test` (not global `vitest`), `npm run build`, ESLint.
- i18n zh-TW/zh-CN consistent for all new UI text.

---

### Task 0: B5 Design Debt Fix

- [ ] `src/lib/rules/fortune.ts`: Make `palaceIndex` and `palaceNames` required in `FortunePeriod`
- [ ] Update all callers and tests to provide these fields
- [ ] Fix fortune star overlay: instead of pushing stars into palace majorStars, add mutagen markers to existing stars
- [ ] Update `fortune.test.ts` to reflect corrected behavior
- [ ] Remove dead `本命命宮` alias if no longer produced
- [ ] Verify: `npm test` 全綠, `npm run build` exit 0

### Task 1: Storage Layer

- [ ] Create `src/lib/storage.ts` — IndexedDB wrapper
- [ ] Define `StoredChart`: `{ id, name, birthData, createdAt, updatedAt }`
- [ ] Define `StoredReading`: `{ id, chartId, reading, rules, createdAt }`
- [ ] CRUD: `saveChart`, `getChart`, `listCharts`, `deleteChart`
- [ ] CRUD: `saveReading`, `getReading`, `listReadings`, `deleteReading`
- [ ] Export `clearAll()` for testing
- [ ] Unit tests: full CRUD cycle, list ordering, error handling

### Task 2: Chart Collection (6.1)

- [ ] Create `src/components/CollectionPanel.tsx`
- [ ] List saved charts with name, birth info, date saved
- [ ] Save current chart button
- [ ] Load chart from collection
- [ ] Delete chart with confirmation
- [ ] Rename chart inline
- [ ] i18n: zh-TW/zh-CN labels

### Task 3: URL Sharing (6.2)

- [ ] Create `src/lib/shareUrl.ts`
- [ ] Encode chart config + reading to compressed URL
- [ ] Use lz-string for compression
- [ ] URL format: `?s=<compressed-base64>`
- [ ] Decode: parse URL params, decompress, restore chart state
- [ ] Share button in UI (copy to clipboard)
- [ ] Auto-detect shared URL on page load, offer to restore
- [ ] Privacy warning: "This URL contains birth data. Only share with consent."

### Task 4: Reading History (6.3)

- [ ] Create `src/components/HistoryPanel.tsx`
- [ ] List readings per chart (date, summary, rule count)
- [ ] Click to restore full reading
- [ ] Compare two readings side-by-side (diff view)
- [ ] Export history as JSON
- [ ] i18n: zh-TW/zh-CN labels

### Task 5: Conversational Follow-up (6.4)

- [ ] Create `src/components/FollowUpPanel.tsx`
- [ ] Text input for follow-up question
- [ ] Inject current chart + reading + rules as context
- [ ] Call LLM with follow-up prompt
- [ ] Display response with source citations
- [ ] Conversation history (per session, not persisted)
- [ ] i18n: zh-TW/zh-CN labels

### Task 6: Print Mode (6.5)

- [ ] Create `src/styles/print.css`
- [ ] `@media print` rules: hide interactive elements, optimize layout
- [ ] Print button in UI
- [ ] Include chart, reading, rules, and citations
- [ ] Page break handling
- [ ] Test: `window.print()` triggers correct layout

### Task 7: Integration Tests

- [ ] E2E: save chart → load from collection → share URL → restore from URL
- [ ] E2E: reading history → compare → export
- [ ] E2E: follow-up question → response with citations
- [ ] Verify no PII leaks in URL (optional but recommended)
