import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  escapeCsvField,
  generateChartCsv,
  generateChartSummaryText,
  generateChartJson,
  exportElementToCanvas,
  exportShareCardToDataUrl,
  downloadFile,
  downloadChartCsv,
  downloadChartSummaryText,
  downloadChartJson,
  ExportAstrolabe,
} from './export';
import { getChart } from './astro';
import html2canvas from 'html2canvas';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

describe('src/lib/export.ts', () => {
  let sampleAstrolabe: ExportAstrolabe;

  beforeEach(() => {
    // language 必須明示：iztro 的顯示字串在建盤當下就以「全域」語系解析，
    // 省略時會沿用前一個測試設定的語系，斷言將隨測試執行順序而飄移。
    sampleAstrolabe = getChart({
      date: '2000-08-16',
      timeIndex: 1,
      gender: 'male',
      language: 'zh-CN',
      config: { algorithm: 'default' },
    });
  });

  describe('escapeCsvField', () => {
    it('handles undefined and null', () => {
      expect(escapeCsvField(undefined)).toBe('""');
      expect(escapeCsvField(null)).toBe('""');
    });

    it('wraps plain text with quotes', () => {
      expect(escapeCsvField('hello')).toBe('"hello"');
      expect(escapeCsvField(123)).toBe('"123"');
    });

    it('escapes quotes, commas, and newlines correctly', () => {
      expect(escapeCsvField('a,b')).toBe('"a,b"');
      expect(escapeCsvField('a"b')).toBe('"a""b"');
      expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
    });
  });

  describe('generateChartCsv', () => {
    it('generates valid CSV string with UTF-8 BOM', () => {
      const csv = generateChartCsv(sampleAstrolabe);

      // Must start with UTF-8 BOM
      expect(csv.startsWith('\uFEFF')).toBe(true);

      // Basic info section
      expect(csv).toContain('=== 紫微斗數命盤基本資料 ===');
      expect(csv).toContain('"2000-8-16"');
      expect(csv).toContain('"庚辰 甲申 丙午 己丑"');
      expect(csv).toContain('"木三局"');
      expect(csv).toContain('"武曲"');
      expect(csv).toContain('"文昌"');

      // 12 Palaces section
      expect(csv).toContain('=== 十二宮星曜與干支明細 ===');
      expect(csv).toContain('"宮位名稱","天干","地支","身宮"');
      expect(csv).toContain('"命宫"');
      expect(csv).toContain('"未"');
      expect(csv).toContain('"癸"');
      expect(csv).toContain('"迁移"');
      expect(csv).toContain('天同');
      expect(csv).toContain('巨门');
    });

    it('generates zh-CN-locale CSV with simplified headers and values', () => {
      const csv = generateChartCsv(sampleAstrolabe, 'zh-CN');

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).not.toContain('=== 紫微斗數命盤基本資料 ===');
      expect(csv).toContain('=== 紫微斗数命盘基本资料 ===');
      expect(csv).toContain('性别');
      expect(csv).toContain('"男"');
      expect(csv).toContain('"宫位名称","天干","地支","身宫"');
      expect(csv).toContain('"迁移"');
      expect(csv).toContain('巨门');
    });

    it('translates a zh-TW-sourced astrolabe into simplified star/palace names under zh-CN locale', () => {
      const twAstrolabe = getChart({
        date: '2000-08-16',
        timeIndex: 1,
        gender: 'male',
        language: 'zh-TW',
        config: { algorithm: 'default' },
      });

      expect(generateChartCsv(twAstrolabe, 'zh-TW')).toContain('"遷移"');

      const csv = generateChartCsv(twAstrolabe, 'zh-CN');
      expect(csv).toContain('"迁移"');
      expect(csv).not.toContain('"遷移"');
      expect(csv).toContain('巨门');
      expect(csv).not.toContain('巨門');
    });
  });

  describe('generateChartSummaryText', () => {
    it('generates clean Telegram/social share summary text', () => {
      const text = generateChartSummaryText(sampleAstrolabe);

      expect(text).toContain('☯️【紫微斗數命盤摘要】☯️');
      expect(text).toContain('📅 陽曆：2000-8-16');
      expect(text).toContain('📜 八字：庚辰 甲申 丙午 己丑');
      expect(text).toContain('🔮 局數：木三局 | 性別：男');
      expect(text).toContain('✨ 命主：武曲 | 身主：文昌');
      expect(text).toContain('• 命宫');
      expect(text).toContain('• 迁移');
      expect(text).toContain('💡 由 紫微斗數 Web 專業版 自動生成');
    });
  });

  describe('generateChartJson', () => {
    const chartOptions = {
      date: '2000-08-16',
      timeIndex: 1,
      gender: 'male' as const,
      language: 'zh-CN',
      config: { algorithm: 'default' as const },
    };

    it('is deterministic: same GetChartOptions rebuilt across two getChart() calls produce byte-identical JSON', () => {
      const astrolabeA = getChart(chartOptions);
      const astrolabeB = getChart(chartOptions);

      const first = generateChartJson(astrolabeA, { locale: 'zh-TW', input: chartOptions });
      const second = generateChartJson(astrolabeB, { locale: 'zh-TW', input: chartOptions });
      expect(first).toBe(second);
    });

    it('fills input.timeIndex/longitude/isLunar from the passed GetChartOptions, not from the astrolabe object', () => {
      const json = generateChartJson(sampleAstrolabe, {
        locale: 'zh-TW',
        input: { date: '2000-08-16', timeIndex: 1, gender: 'male', isLunar: false, longitude: 121.56 },
      });
      const parsed = JSON.parse(json);

      expect(parsed.input.timeIndex).toBe(1);
      expect(parsed.input.longitude).toBe(121.56);
      expect(parsed.input.isLunar).toBe(false);
    });

    it('omits timeIndex/longitude (undefined) when no input option is passed', () => {
      const json = generateChartJson(sampleAstrolabe, { locale: 'zh-TW' });
      const parsed = JSON.parse(json);

      expect(parsed.input.timeIndex).toBeUndefined();
      expect(parsed.input.longitude).toBeUndefined();
      expect(parsed.input.isLunar).toBe(false);
    });

    it('produces a complete schema with fixed top-level keys and a palaces array', () => {
      const json = generateChartJson(sampleAstrolabe, {
        locale: 'zh-TW',
        settings: { school: 'sanhe', iztroVersion: '2.x' },
      });
      const parsed = JSON.parse(json);

      expect(Object.keys(parsed)).toEqual(['schemaVersion', 'settings', 'input', 'chart', 'determinism']);
      expect(parsed.schemaVersion).toBe('zhChart-v1');
      expect(parsed.settings).toEqual({ school: 'sanhe', iztroVersion: '2.x' });
      expect(parsed.determinism).toBe(true);
      expect(Array.isArray(parsed.chart.palaces)).toBe(true);
      expect(parsed.chart.palaces.length).toBeGreaterThan(0);
    });

    it('omits the settings key entirely when not provided', () => {
      const json = generateChartJson(sampleAstrolabe, { locale: 'zh-TW' });
      const parsed = JSON.parse(json);
      expect(parsed).not.toHaveProperty('settings');
      expect(Object.keys(parsed)).toEqual(['schemaVersion', 'input', 'chart', 'determinism']);
    });

    it('never includes a generatedAt timestamp', () => {
      const json = generateChartJson(sampleAstrolabe, { locale: 'zh-TW' });
      expect(json).not.toContain('generatedAt');
    });

    it('translates palace/star names per locale, consistent with translateKey', () => {
      const twAstrolabe = getChart({
        date: '2000-08-16',
        timeIndex: 1,
        gender: 'male',
        language: 'zh-TW',
        config: { algorithm: 'default' },
      });

      const twJson = generateChartJson(twAstrolabe, { locale: 'zh-TW' });
      expect(twJson).toContain('遷移');
      expect(twJson).not.toContain('迁移');

      const cnJson = generateChartJson(twAstrolabe, { locale: 'zh-CN' });
      expect(cnJson).toContain('迁移');
      expect(cnJson).not.toContain('遷移');
      expect(cnJson).toContain('巨门');
      expect(cnJson).not.toContain('巨門');
    });
  });

  describe('Share Card Export (html2canvas integration)', () => {
    it('calls html2canvas with element and options', async () => {
      const fakeCanvas = {
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,fakeimage'),
      } as unknown as HTMLCanvasElement;

      vi.mocked(html2canvas).mockResolvedValue(fakeCanvas);

      const fakeElement = document.createElement('div');
      fakeElement.id = 'chart-container';

      const canvas = await exportElementToCanvas(fakeElement, { scale: 2 });
      expect(html2canvas).toHaveBeenCalledWith(fakeElement, expect.objectContaining({
        scale: 2,
        backgroundColor: '#020617',
      }));
      expect(canvas).toBe(fakeCanvas);

      const dataUrl = await exportShareCardToDataUrl(fakeElement);
      expect(dataUrl).toBe('data:image/png;base64,fakeimage');
    });

    it('throws error if no element provided', async () => {
      // @ts-expect-error testing missing element argument
      await expect(exportElementToCanvas(null)).rejects.toThrow('Export element is required');
    });
  });

  describe('Download Helpers', () => {
    it('downloadFile executes DOM append and click when window exists', () => {
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fakeurl');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      downloadFile('test content', 'test.txt', 'text/plain');

      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fakeurl');

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('downloadChartCsv and downloadChartSummaryText do not crash', () => {
      expect(() => downloadChartCsv(sampleAstrolabe)).not.toThrow();
      expect(() => downloadChartSummaryText(sampleAstrolabe)).not.toThrow();
    });

    it('downloadChartJson triggers a .json download via downloadFile', () => {
      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fakeurl');
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      downloadChartJson(sampleAstrolabe, { settings: { school: 'sanhe' } });

      expect(createObjectURLSpy).toHaveBeenCalled();
      const [blobArg] = createObjectURLSpy.mock.calls[0];
      expect((blobArg as Blob).type).toBe('application/json;charset=utf-8');
      expect(appendChildSpy).toHaveBeenCalled();
      const link = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
      expect(link.download.endsWith('.json')).toBe(true);

      appendChildSpy.mockRestore();
      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });
  });
});
