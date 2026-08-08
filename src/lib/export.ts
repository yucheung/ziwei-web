import html2canvas from 'html2canvas';
import { translate } from '../i18n';
import type { Locale, TranslationKey } from '../i18n';
import { toCanonicalKey, translateKey, type AppLocale, type TranslationCategory } from './chartModel';
import type { CalendarType } from './chartConfig';
import type { GetChartOptions } from './astro';

/**
 * iztro 星盤與宮位資料型別定義 (相容 iztro FunctionalAstrolabe)
 */
export interface ExportStarInfo {
  name: string;
  type?: string;
  brightness?: string;
  mutagen?: string;
}

export interface ExportPalaceInfo {
  name: string;
  isBodyPalace?: boolean;
  isOriginalPalace?: boolean;
  heavenlyStem?: string;
  earthlyBranch?: string;
  majorStars?: ExportStarInfo[];
  minorStars?: ExportStarInfo[];
  adjectiveStars?: ExportStarInfo[];
  changsheng12?: string;
  boshi12?: string;
  suijian12?: string;
  jiangqian12?: string;
  decadal?: {
    range?: [number, number] | number[];
  };
  ages?: number[];
}

export interface ExportAstrolabe {
  solarDate?: string;
  lunarDate?: string;
  /** Frozen chart inputs added by the App export boundary; raw iztro objects may omit them. */
  calendarType?: CalendarType;
  isLeapMonth?: boolean;
  astroType?: string;
  algorithm?: string;
  yearDivide?: string;
  dayDivide?: string;
  longitude?: number;
  chineseDate?: string;
  time?: string;
  timeRange?: string;
  gender?: string;
  fiveElementsClass?: string;
  soul?: string;
  body?: string;
  earthlyBranchOfSoulPalace?: string;
  earthlyBranchOfBodyPalace?: string;
  palaces: ExportPalaceInfo[];
}

/**
 * 輔助函式：逸出 CSV 欄位中的特殊字元 (雙引號、逗號、換行)
 */
export function escapeCsvField(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function starToken(s: ExportStarInfo, appLocale: AppLocale): string {
  const name = translateKey(s.name, 'star', appLocale);
  const brightness = s.brightness ? `(${translateKey(s.brightness, 'brightness', appLocale)})` : '';
  const mutagen = s.mutagen ? `[${translateKey(s.mutagen, 'mutagen', appLocale)}]` : '';
  return `${name}${brightness}${mutagen}`;
}

/**
 * 1. 生成命盤 CSV 字串
 * 包含：基本資訊標頭 + 12 宮位詳細星曜與柱位資料
 * 回傳附帶 BOM (\uFEFF) 以使 Excel 能正常顯示 Unicode / 中文
 */
export function generateChartCsv(astrolabe: ExportAstrolabe, locale: Locale = 'zh-TW'): string {
  const appLocale: AppLocale = locale === 'zh-CN' ? 'zh-CN' : 'zh-TW';
  const tr = (key: TranslationKey) => translate(locale, key);
  const lines: string[] = [];

  // UTF-8 BOM
  const bom = '\uFEFF';

  // 基本資訊段落
  lines.push(tr('export.csvBasicHeader'));
  lines.push(`${tr('export.solarLabel')},${escapeCsvField(astrolabe.solarDate)}`);
  lines.push(`${tr('export.lunarLabel')},${escapeCsvField(astrolabe.lunarDate)}`);
  lines.push(`${tr('export.chineseDateLabel')},${escapeCsvField(astrolabe.chineseDate)}`);
  lines.push(`${tr('export.gender')},${escapeCsvField(translateKey(astrolabe.gender || '', 'gender', appLocale))}`);
  lines.push(`${tr('export.fiveElementsClass')},${escapeCsvField(translateKey(astrolabe.fiveElementsClass || '', 'fiveElementsClass', appLocale))}`);
  lines.push(`${tr('export.soulStar')},${escapeCsvField(translateKey(astrolabe.soul || '', 'star', appLocale))}`);
  lines.push(`${tr('export.bodyStar')},${escapeCsvField(translateKey(astrolabe.body || '', 'star', appLocale))}`);
  lines.push('');

  // 12 宮位標頭
  lines.push(tr('export.csvPalaceHeader'));
  const headers = [
    tr('export.palaceName'),
    tr('export.heavenlyStem'),
    tr('export.earthlyBranch'),
    tr('chart.bodyPalace'),
    tr('export.majorStars'),
    tr('export.minorStars'),
    tr('export.adjStars'),
    tr('export.changsheng12'),
    tr('export.boshi12'),
    tr('export.decadalRange'),
  ];
  lines.push(headers.map(escapeCsvField).join(','));

  if (Array.isArray(astrolabe.palaces)) {
    for (const palace of astrolabe.palaces) {
      const majorStr = (palace.majorStars || [])
        .map((s) => starToken(s, appLocale))
        .join(' ');

      const minorStr = (palace.minorStars || [])
        .map((s) => starToken(s, appLocale))
        .join(' ');

      const adjStr = (palace.adjectiveStars || [])
        .map((s) => translateKey(s.name, 'star', appLocale))
        .join(' ');

      let decadalStr = '';
      if (palace.decadal?.range) {
        decadalStr = `${palace.decadal.range[0]} - ${palace.decadal.range[1]} ${tr('export.yearsUnit')}`;
      }

      const row = [
        translateKey(palace.name, 'palace', appLocale),
        translateKey(palace.heavenlyStem || '', 'stem', appLocale),
        translateKey(palace.earthlyBranch || '', 'branch', appLocale),
        palace.isBodyPalace ? tr('export.yes') : tr('export.no'),
        majorStr || tr('export.noMajorStar'),
        minorStr,
        adjStr,
        translateKey(palace.changsheng12 || '', 'star', appLocale),
        translateKey(palace.boshi12 || '', 'star', appLocale),
        decadalStr,
      ];

      lines.push(row.map(escapeCsvField).join(','));
    }
  }

  return bom + lines.join('\r\n');
}

/** 別名相容 exportChartToCsv */
export const exportChartToCsv = generateChartCsv;

/**
 * 2. 生成命盤摘要文字 (純文字，適合複製貼上至 Telegram / Line / WeChat / 社群)
 */
export function generateChartSummaryText(astrolabe: ExportAstrolabe, locale: Locale = 'zh-TW'): string {
  const appLocale: AppLocale = locale === 'zh-CN' ? 'zh-CN' : 'zh-TW';
  const tr = (key: TranslationKey) => translate(locale, key);
  const lines: string[] = [];

  lines.push(tr('export.summaryTitle'));
  lines.push(`\u{1F4C5} ${tr('export.solarLabel')}：${astrolabe.solarDate || tr('export.unknown')}`);
  lines.push(`\u{1F319} ${tr('export.lunarLabel')}：${astrolabe.lunarDate || tr('export.unknown')}`);
  lines.push(`\u{1F4DC} ${tr('export.baziLabel')}：${astrolabe.chineseDate || tr('export.unknown')}`);
  lines.push(`\u{1F52E} ${tr('export.fiveElementsClassLabel')}：${translateKey(astrolabe.fiveElementsClass || '', 'fiveElementsClass', appLocale) || tr('export.unknown')} | ${tr('export.gender')}：${translateKey(astrolabe.gender || '', 'gender', appLocale) || tr('export.unknown')}`);
  lines.push(`✨ ${tr('export.soulStar')}：${translateKey(astrolabe.soul || '', 'star', appLocale) || tr('export.none')} | ${tr('export.bodyStar')}：${translateKey(astrolabe.body || '', 'star', appLocale) || tr('export.none')}`);
  lines.push('----------------------------------------');
  lines.push(`\u{1F3DB}️【${tr('export.overviewTitle')}】`);

  if (Array.isArray(astrolabe.palaces)) {
    for (const palace of astrolabe.palaces) {
      const stemBranch = `${translateKey(palace.heavenlyStem || '', 'stem', appLocale)}${translateKey(palace.earthlyBranch || '', 'branch', appLocale)}`;
      const bodyTag = palace.isBodyPalace ? ` [${tr('chart.bodyPalace')}]` : '';

      const majorFormatted = (palace.majorStars || []).length > 0
        ? (palace.majorStars || [])
            .map((s) => starToken(s, appLocale))
            .join(' ')
        : tr('export.noMajorStar');

      const minorFormatted = (palace.minorStars || []).length > 0
        ? ` | ${tr('export.minorStarsPrefix')}` + (palace.minorStars || [])
            .map((s) => starToken(s, appLocale))
            .join(' ')
        : '';

      const decadalFormatted = palace.decadal?.range
        ? ` (${tr('export.decadal')} ${palace.decadal.range[0]}~${palace.decadal.range[1]}${tr('export.yearsUnit')})`
        : '';

      lines.push(`• ${translateKey(palace.name, 'palace', appLocale)} (${stemBranch})${bodyTag}${decadalFormatted}: ${majorFormatted}${minorFormatted}`);
    }
  }

  lines.push('----------------------------------------');
  lines.push(`\u{1F4A1} ${tr('export.generatedBy')}`);

  return lines.join('\n');
}

/**
 * 3. 生成命盤 JSON 快照 (確定性：同一輸入兩次呼叫 JSON.stringify byte 相等)
 * 不含任何時間戳 (generatedAt) 或隨機值，鍵順序固定。
 */
export interface ChartJsonSettings {
  school?: string;
  yearBoundary?: string;
  trueSolarTime?: { enabled?: boolean; longitude?: number };
  lateZiHandling?: string;
  iztroVersion?: string;
  [key: string]: unknown;
}

export interface ChartJsonHoroscope {
  fiveDimensional?: Record<string, unknown>;
  temporal?: Record<string, unknown>;
}

export interface ExportChartInput {
  timeIndex?: GetChartOptions['timeIndex'];
  isLunar?: boolean;
  longitude?: number;
  solarDate?: string;
  lunarDate?: string;
  calendarType?: CalendarType;
  isLeapMonth?: boolean;
  astroType?: string;
  algorithm?: string;
  yearDivide?: string;
  dayDivide?: string;
}

export interface GenerateChartJsonOptions {
  locale?: AppLocale;
  settings?: ChartJsonSettings;
  /** 運限資料 (若呼叫端已計算，供 JSON 匯出保留；未提供則匯出時省略此鍵) */
  horoscope?: ChartJsonHoroscope;
  /**
   * 呼叫端排盤時使用的原始輸入，用於補足 iztro astrolabe 不會保留的
   * timeIndex、longitude 與流派設定；兩種日期也可由呼叫端提供原始值。
   * `gender` 仍取自 astrolabe，因為它是排盤實際採用且已正規化的值。
   */
  input?: ExportChartInput;
}

function canonicalizeExportKey(value: string, category: TranslationCategory, sourceLocale: AppLocale): string {
  const canonical = toCanonicalKey(value, category, sourceLocale);
  if (canonical !== value) return canonical;

  // Be defensive when callers pass an astrolabe whose language differs from
  // the locale argument; this keeps the export canonical at this boundary.
  const alternateLocale: AppLocale = sourceLocale === 'zh-CN' ? 'zh-TW' : 'zh-CN';
  return toCanonicalKey(value, category, alternateLocale);
}

function canonicalizeExportValue(value: string, category: TranslationCategory, sourceLocale: AppLocale): string {
  return translateKey(canonicalizeExportKey(value, category, sourceLocale), category, 'zh-TW');
}

function starToJson(s: ExportStarInfo, sourceLocale: AppLocale): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: canonicalizeExportValue(s.name, 'star', sourceLocale),
  };
  if (s.type !== undefined) out.type = s.type;
  if (s.brightness !== undefined) {
    out.brightness = canonicalizeExportValue(s.brightness, 'brightness', sourceLocale);
  }
  if (s.mutagen !== undefined) {
    out.mutagen = canonicalizeExportValue(s.mutagen, 'mutagen', sourceLocale);
  }
  return out;
}

export function generateChartJson(astrolabe: ExportAstrolabe, options: GenerateChartJsonOptions = {}): string {
  const sourceLocale: AppLocale = options.locale === 'zh-CN' ? 'zh-CN' : 'zh-TW';

  const palaces = Array.isArray(astrolabe.palaces) ? astrolabe.palaces : [];

  const chartPalaces = palaces.map((p) => ({
    name: canonicalizeExportValue(p.name, 'palace', sourceLocale),
    heavenlyStem: canonicalizeExportValue(p.heavenlyStem || '', 'stem', sourceLocale),
    earthlyBranch: canonicalizeExportValue(p.earthlyBranch || '', 'branch', sourceLocale),
    isBodyPalace: !!p.isBodyPalace,
    isOriginalPalace: !!p.isOriginalPalace,
    majorStars: (p.majorStars || []).map((s) => starToJson(s, sourceLocale)),
    minorStars: (p.minorStars || []).map((s) => starToJson(s, sourceLocale)),
    adjectiveStars: (p.adjectiveStars || []).map((s) => canonicalizeExportValue(s.name, 'star', sourceLocale)),
    changsheng12: canonicalizeExportValue(p.changsheng12 || '', 'star', sourceLocale),
    boshi12: canonicalizeExportValue(p.boshi12 || '', 'star', sourceLocale),
    suijian12: canonicalizeExportValue(p.suijian12 || '', 'star', sourceLocale),
    jiangqian12: canonicalizeExportValue(p.jiangqian12 || '', 'star', sourceLocale),
    decadal: {
      range: p.decadal?.range ? [p.decadal.range[0], p.decadal.range[1]] : undefined,
    },
    ages: p.ages || [],
  }));

  const yearPillar = (astrolabe.chineseDate || '').split(' ')[0] || '';
  const input = options.input;
  const isLunar = input?.isLunar ?? (astrolabe.calendarType === 'lunar');

  const result: Record<string, unknown> = {
    schemaVersion: 'zhChart-v1',
    locale: 'zh-TW',
  };

  if (options.settings) {
    result.settings = options.settings;
  }

  // Both date representations and all chart settings are emitted in a fixed
  // order. Raw iztro astrolabes do not retain every input, so stable defaults
  // keep direct callers backward-compatible while App supplies frozen values.
  result.input = {
    solarDate: input?.solarDate ?? astrolabe.solarDate ?? '',
    lunarDate: input?.lunarDate ?? astrolabe.lunarDate ?? '',
    calendarType: astrolabe.calendarType ?? input?.calendarType ?? (isLunar ? 'lunar' : 'solar'),
    isLeapMonth: astrolabe.isLeapMonth ?? input?.isLeapMonth ?? false,
    astroType: astrolabe.astroType ?? input?.astroType ?? 'heaven',
    algorithm: astrolabe.algorithm ?? input?.algorithm ?? 'zhongzhou',
    yearDivide: astrolabe.yearDivide ?? input?.yearDivide ?? 'normal',
    dayDivide: astrolabe.dayDivide ?? input?.dayDivide ?? 'forward',
    timeIndex: input?.timeIndex,
    gender: canonicalizeExportValue(astrolabe.gender || '', 'gender', sourceLocale),
    isLunar,
    longitude: astrolabe.longitude ?? input?.longitude,
  };

  if (options.horoscope) {
    result.horoscope = options.horoscope;
  }

  result.chart = {
    fiveElementsClass: canonicalizeExportValue(astrolabe.fiveElementsClass || '', 'fiveElementsClass', sourceLocale),
    soulStar: canonicalizeExportValue(astrolabe.soul || '', 'star', sourceLocale),
    bodyStar: canonicalizeExportValue(astrolabe.body || '', 'star', sourceLocale),
    heavenlyStem: canonicalizeExportValue(yearPillar.charAt(0) || '', 'stem', sourceLocale),
    earthlyBranch: canonicalizeExportValue(yearPillar.charAt(1) || '', 'branch', sourceLocale),
    palaces: chartPalaces,
  };

  result.determinism = true;

  return JSON.stringify(result);
}

/**
 * 4. 命盤分享卡 (html2canvas → PNG Base64 / Canvas)
 */
export interface ShareCardOptions {
  scale?: number;
  backgroundColor?: string | null;
  useCORS?: boolean;
  logging?: boolean;
}

export async function exportElementToCanvas(
  element: HTMLElement,
  options: ShareCardOptions = {}
): Promise<HTMLCanvasElement> {
  if (!element) {
    throw new Error('Export element is required');
  }

  const defaultOptions = {
    scale: 2,
    backgroundColor: '#020617', // slate-950
    useCORS: true,
    logging: false,
    ...options,
  };

  return await html2canvas(element, defaultOptions);
}

export async function exportShareCardToDataUrl(
  element: HTMLElement,
  options: ShareCardOptions = {}
): Promise<string> {
  const canvas = await exportElementToCanvas(element, options);
  return canvas.toDataURL('image/png');
}

/**
 * 5. 觸發瀏覽器下載檔案 Helper
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string = 'text/plain;charset=utf-8'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  let blob: Blob;
  if (content instanceof Blob) {
    blob = content;
  } else {
    blob = new Blob([content], { type: mimeType });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadChartCsv(astrolabe: ExportAstrolabe, filename?: string, locale: Locale = 'zh-TW'): void {
  const csvContent = generateChartCsv(astrolabe, locale);
  const fname = filename || `ziwei_astrolabe_${astrolabe.solarDate || 'chart'}.csv`;
  downloadFile(csvContent, fname, 'text/csv;charset=utf-8');
}

export function downloadChartSummaryText(astrolabe: ExportAstrolabe, filename?: string, locale: Locale = 'zh-TW'): void {
  const summaryContent = generateChartSummaryText(astrolabe, locale);
  const fname = filename || `ziwei_summary_${astrolabe.solarDate || 'chart'}.txt`;
  downloadFile(summaryContent, fname, 'text/plain;charset=utf-8');
}

export interface DownloadChartJsonOptions {
  settings?: ChartJsonSettings;
  input?: GenerateChartJsonOptions['input'];
  horoscope?: ChartJsonHoroscope;
  filename?: string;
}

export function downloadChartJson(
  astrolabe: ExportAstrolabe,
  options: DownloadChartJsonOptions = {},
  locale: Locale = 'zh-TW'
): void {
  const appLocale: AppLocale = locale === 'zh-CN' ? 'zh-CN' : 'zh-TW';
  const jsonContent = generateChartJson(astrolabe, {
    locale: appLocale,
    settings: options.settings,
    input: options.input,
    horoscope: options.horoscope,
  });
  const fname = options.filename || `ziwei_astrolabe_${astrolabe.solarDate || 'chart'}.json`;
  downloadFile(jsonContent, fname, 'application/json;charset=utf-8');
}

export async function downloadShareCardImage(
  element: HTMLElement,
  filename?: string,
  options?: ShareCardOptions
): Promise<void> {
  const dataUrl = await exportShareCardToDataUrl(element, options);
  const fname = filename || `ziwei_share_card_${Date.now()}.png`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fname;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
