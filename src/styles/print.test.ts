/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const printCss = readFileSync(resolve(process.cwd(), 'src/styles/print.css'), 'utf8');
const printBlock = printCss.slice(printCss.indexOf('@media print'));

describe('print stylesheet', () => {
  it('keeps chart grid and reading content visible without globally hiding buttons', () => {
    expect(printBlock).toContain('header button');
    expect(printBlock).toContain('nav button');
    expect(printBlock).toContain('.no-print button');
    expect(printBlock).not.toMatch(/^\s*button\s*(?:,|\{)/m);
    expect(printBlock).toContain('main [role="grid"]');
    expect(printBlock).toContain('main [role="tabpanel"]');
    expect(printBlock).toContain('visibility: visible !important;');
  });
});
