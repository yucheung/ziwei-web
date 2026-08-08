# B8 Seal Small Fixes Implementation Plan

> **For agentic workers:** Use inline execution for these two focused fixes; do not create a commit.

**Goal:** Make classical/reference-backed citations credit the ancient source first and keep the HistoryPanel URL test constructor-safe.

**Architecture:** Preserve the existing generic `library [status]` formatter for sources without a reference. For reference-backed sources, render the reference as the primary provenance, include the optional school and localized review label, and retain the library as a `via` attribution. The HistoryPanel test will install static URL helpers on a class derived from the native constructor.

**Tech Stack:** TypeScript, React, Vitest, Testing Library.

## Global Constraints

- i18n 雙語一致：任何新增 UI 文案必須同時進 zh-TW 與 zh-CN（及 en 若適用）。不得硬編碼 'zh-TW'/'zh-CN'。canonical key 一律 zh-TW。
- JSON 匯出確定性：不帶時間戳/隨機性，固定鍵順序。
- 使用 `npm test`，不可使用 `npx vitest`；完成前跑 `npm test`、`npm run build`、修改檔案 eslint。
- 不改 `.hermes/`，不引入 LLM/AI 到確定性排盤層；不建立 commit。

### Task 1: Reference-first citation formatting

**Files:**
- Modify: `src/lib/starKnowledge.ts`
- Modify: `src/lib/citationTracer.ts`
- Test: `src/lib/citationTracer.test.ts`
- Test: `src/lib/starKnowledge.test.ts`
- Test: `src/lib/prompts.test.ts`
- Update: `src/lib/__snapshots__/prompts.test.ts.snap` if the deterministic citation line changes

- [x] Add a failing assertion that the 紫微 source carries `classical_ziwei` provenance and formats as reference-first with `— via iztro-sanhe-v1`; add a fallback assertion that a source without a reference keeps the library-first format.
- [x] Run the focused citation/star/prompt tests and observe the expected formatting failure.
- [x] Add optional source-level school metadata, mark the human-approved 紫微 source as `classical_ziwei`, and make `formatKnowledgeSource()` use `[reference + page] (school/status/reviewer) — via library` only when a reference exists; retain the current library/status format otherwise.
- [x] Update only assertions/snapshots that reflect the new rendered citation and run the focused tests again.

### Task 2: Constructor-safe URL stub

**Files:**
- Modify: `src/components/HistoryPanel.test.tsx`

- [x] Add a constructor assertion after the export test stub so the old plain-object URL mock fails with `URL is not a constructor`.
- [x] Replace the stub with `vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }));` and keep the successful export assertions.
- [x] Run `npm test -- src/components/HistoryPanel.test.tsx` and confirm there is no unhandled error.

### Final verification

- [x] Run `npm test` and record the complete Vitest test count and zero failures/unhandled errors.
- [x] Run `npm run build` and record exit 0.
- [x] Run ESLint on every modified source/test file and record zero errors.
