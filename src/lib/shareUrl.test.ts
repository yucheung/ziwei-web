import { describe, expect, it } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import type { ChartConfig } from './chartConfig';
import { createShareUrl, decodeSharePayload, decodeShareUrl } from './shareUrl';

const birthData: ChartConfig = {
  solarDate: '2000-08-16',
  calendarType: 'solar',
  isLeapMonth: false,
  hour: 2,
  gender: 'male',
  algorithm: 'zhongzhou',
  yearDivide: 'normal',
  dayDivide: 'forward',
  astroType: 'heaven',
};

describe('share URL codec', () => {
  it.each(['', '命盤解讀文字'])('round-trips a chart with %s reading text', (reading) => {
    const url = createShareUrl(birthData, reading, 'https://example.com/ziwei?source=collection#chart');

    expect(new URL(url).searchParams.get('s')).toBeTruthy();
    expect(decodeShareUrl(url)).toEqual({ version: 1, birthData, reading });
    expect(new URL(url).searchParams.get('source')).toBe('collection');
    expect(new URL(url).hash).toBe('#chart');
  });

  it('serializes exactly the version, birth data, and reading without UI or LLM settings', () => {
    const payload = decodeShareUrl(createShareUrl(birthData, '私密解讀', 'https://example.com/ziwei'))!;

    expect(Object.keys(payload)).toEqual(['version', 'birthData', 'reading']);
    expect(payload).not.toHaveProperty('locale');
    expect(payload).not.toHaveProperty('apiKey');
    expect(payload).not.toHaveProperty('llm');
    expect(payload.birthData).not.toHaveProperty('outputLocale');
    expect(payload.birthData).not.toHaveProperty('apiKey');
  });

  it('rejects malformed URLs, invalid compressed data, and invalid birth data', () => {
    const invalidBirthData = compressToEncodedURIComponent(JSON.stringify({
      version: 1,
      birthData: { ...birthData, hour: 13 },
      reading: '',
    }));

    expect(decodeShareUrl('not a url')).toBeNull();
    expect(decodeShareUrl('https://example.com/ziwei?s=not-compressed')).toBeNull();
    expect(decodeShareUrl(`https://example.com/ziwei?s=${invalidBirthData}`)).toBeNull();
    expect(() => decodeSharePayload('not-compressed')).toThrow('Invalid shared chart data');
  });
});
