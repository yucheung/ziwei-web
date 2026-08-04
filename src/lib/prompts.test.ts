import { describe, it, expect } from 'vitest';
import { getChart } from './astro';
import { summarizeAstrolabe, buildReadingPrompt, DEFAULT_SYSTEM_PROMPT } from './prompts';

describe('prompts.ts - Astrolabe Prompt Generator', () => {
  it('should correctly format astrolabe summary into markdown string', () => {
    const chart = getChart({
      date: '2000-08-16',
      timeIndex: 2, // 寅時
      gender: 'male',
    });

    const summary = summarizeAstrolabe(chart);

    expect(summary).toContain('# 命盤基本資訊');
    expect(summary).toContain('# 十二宮位星曜配置');
    expect(summary).toContain('命宮');
    expect(summary).toContain('西元生日: 2000-8-16');
    expect(summary).toContain('性別: 男');
  });

  it('should generate overall reading prompt correctly', () => {
    const chart = getChart({
      date: '1995-05-20',
      timeIndex: 6, // 午時
      gender: 'female',
    });

    const { systemPrompt, userPrompt } = buildReadingPrompt(chart, {
      type: 'overall',
      customInstructions: '關注轉職與創業者',
    });

    expect(systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
    expect(userPrompt).toContain('以下為待解讀的紫微斗數命盤資料');
    expect(userPrompt).toContain('【解讀重點：命格總覽與特質】');
    expect(userPrompt).toContain('【使用者補充問題/關注焦點】:');
    expect(userPrompt).toContain('關注轉職與創業者');
  });

  it('should generate mutagens and special patterns prompts correctly', () => {
    const chart = getChart({
      date: '1988-10-10',
      timeIndex: 4,
      gender: 'male',
    });

    const mutagensPrompt = buildReadingPrompt(chart, { type: 'mutagens' });
    expect(mutagensPrompt.userPrompt).toContain('生年四化與關鍵能量');
    expect(mutagensPrompt.userPrompt).toContain('化祿宮位');

    const patternsPrompt = buildReadingPrompt(chart, { type: 'patterns' });
    expect(patternsPrompt.userPrompt).toContain('特殊格局與吉凶組合');
  });

  it('should handle empty or null astrolabe gracefully', () => {
    const summary = summarizeAstrolabe(null);
    expect(summary).toBe('【無命盤資料】');
  });
});
